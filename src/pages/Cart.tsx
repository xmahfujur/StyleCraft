import React, { useState } from 'react';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import ThankYouModal from '../components/ThankYouModal';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (!auth.currentUser) return; // Should already be checked
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser.uid,
      email: auth.currentUser.email,
      emailVerified: auth.currentUser.emailVerified,
      isAnonymous: auth.currentUser.isAnonymous,
      tenantId: auth.currentUser.tenantId,
      providerInfo: auth.currentUser.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    addressLine: '',
  });

  const [location, setLocation] = useState<'Inside Dhaka' | 'Outside Dhaka'>('Inside Dhaka');

  // Safety scroll reset for mobile
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Autofill from profile if available
  React.useEffect(() => {
    if (profile?.address) {
      setFormData(prev => ({
        ...prev,
        ...profile.address,
        fullName: profile.address.fullName || profile.name || '',
      }));
      if (profile.address.city === 'Dhaka') {
        setLocation('Inside Dhaka');
      } else {
        setLocation('Outside Dhaka');
      }
    } else if (profile && !user?.isAnonymous) {
      setFormData(prev => ({
        ...prev,
        fullName: profile.name || '',
      }));
    }
  }, [profile, user]);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  
  const deliveryCharge = (() => {
    if (totalItems === 0 || totalItems >= 2) return 0;
    return location === 'Inside Dhaka' ? 70 : 110;
  })();

  const finalTotal = Number(total) + deliveryCharge;

  const handleCheckout = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }
    if (cart.length === 0) return;

    setCheckingOut(true);
    try {
      // Validation
      if (!formData.fullName || !formData.phone || !formData.addressLine) {
        toast.error('Please fill in required name, phone and street address');
        setCheckingOut(false);
        return;
      }

      const phoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        toast.error('Please enter a valid Bangladesh phone number');
        setCheckingOut(false);
        return;
      }

      // Validate stock before placing order
      for (const item of cart) {
        const productRef = doc(db, 'products', item.id);
        let productSnap;
        try {
          productSnap = await getDoc(productRef);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.GET, `products/${item.id}`);
        }
        
        if (productSnap?.exists()) {
          const productData = productSnap.data();
          const variant = productData.variants?.find((v: any) => v.size === item.size);
          
          if (variant && variant.stock < item.quantity) {
            toast.error(`Sorry, ${item.name} (Size: ${item.size}) is out of stock or has insufficient quantity.`);
            setCheckingOut(false);
            return;
          }
        }
      }

      // Construct flat address string for required Firestore field
      const addressString = [
        formData.addressLine,
        'Bangladesh'
      ].filter(Boolean).join(', ');

      const orderData = {
        userId: user.uid,
        products: cart,
        total: finalTotal,
        deliveryCharge,
        location,
        status: 'Placed',
        address: addressString, // Required by rules
        phone: formData.phone, // Required by rules
        shippingAddress: {
          ...formData,
          country: 'Bangladesh'
        },
        createdAt: serverTimestamp(),
        createdAtISO: new Date().toISOString()
      };

      try {
        await addDoc(collection(db, 'orders'), orderData);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, 'orders');
      }
      
      // Deduct stock after order success
      for (const item of cart) {
        const productRef = doc(db, 'products', item.id);
        let productSnap;
        try {
          productSnap = await getDoc(productRef);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.GET, `products/${item.id}`);
        }
        if (productSnap?.exists()) {
          const productData = productSnap.data();
          const updatedVariants = productData.variants?.map((v: any) => {
            if (v.size === item.size) {
              return { ...v, stock: Math.max(0, v.stock - item.quantity) };
            }
            return v;
          });
          try {
            await updateDoc(productRef, { variants: updatedVariants });
          } catch (err: any) {
            handleFirestoreError(err, OperationType.UPDATE, `products/${item.id}`);
          }
        }
      }
      
      // Save address to user profile for future use
      if (user && !user.isAnonymous) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            address: formData,
            lastUpdated: serverTimestamp()
          });
        } catch (err: any) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        }
      }
      
      clearCart();
      setShowThankYou(true);
      // Removed immediate navigate('/dashboard'); as the ThankYouModal will handle it
    } catch (error: any) {
      console.error("Checkout process error:", error.message);
      toast.error('Error placing order. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  if (cart.length === 0 && !showThankYou) {
    return (
      <div className="pt-40 pb-24 flex flex-col items-center justify-center px-4 bg-white">
        <ShoppingBag size={64} className="text-black/10 mb-8" />
        <h1 className="text-3xl font-serif mb-4 tracking-widest text-black">YOUR BAG IS EMPTY</h1>
        <p className="text-black/40 mb-10 tracking-widest font-light">EXPLORE OUR COLLECTION TO FIND YOUR STYLE</p>
        <Link to="/" className="bg-black text-white px-10 py-4 font-bold tracking-widest hover:bg-black/80 transition rounded-sm">
          SHOP NOW
        </Link>
      </div>
    );
  }

  // If thank you is showing but cart was already cleared, show a clean background
  if (showThankYou && cart.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center animate-pulse">
          <p className="text-black tracking-[0.5em] text-xs uppercase">Processing Order...</p>
        </div>
        <ThankYouModal 
          isOpen={showThankYou} 
          onClose={() => setShowThankYou(false)} 
        />
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 bg-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
        <h1 className="text-2xl md:text-4xl font-serif tracking-widest text-black">CHECKOUT</h1>
        <Link to="/" className="text-xs tracking-widest text-black hover:text-red-600 uppercase hover:underline flex items-center gap-2 font-bold">
          <ArrowLeft size={14} />
          Back to Collection
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Left Side: Order Review */}
        <div className="space-y-12">
          <div className="space-y-6">
            <h3 className="text-xs tracking-[0.3em] text-black uppercase font-bold border-b border-black/5 pb-2 flex items-center gap-4">
              <span className="w-6 h-6 bg-black text-white flex items-center justify-center rounded-sm text-xs font-bold">1</span>
              Review Items
            </h3>
            <div className="space-y-4">
              {cart.map((item) => (
                <motion.div 
                  layout
                  key={`${item.id}-${item.size}`}
                  className="flex items-center space-x-4 md:space-x-6 bg-black/5 p-4 md:p-6 border border-black/5 group rounded-2xl md:rounded-[2rem] shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="w-16 md:w-24 h-20 md:h-32 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 border border-black/5 rounded-xl shadow-inner">
                    <img 
                      src={item.image || null} 
                      alt={item.name} 
                      className="max-w-full max-h-full object-contain block group-hover:scale-110 transition duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm md:text-base font-serif truncate pr-4 text-black uppercase tracking-wider font-bold">{item.name}</h3>
                      <button onClick={() => removeFromCart(item.id, item.size)} className="p-1 md:p-0 text-black/20 hover:text-red-500 transition flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-2 gap-2">
                       <div className="flex items-center gap-3">
                         <p className="text-xs text-black/60 tracking-widest uppercase font-bold">SIZE: {item.size}</p>
                         <StockWarning productId={item.id} size={item.size} />
                       </div>
                       <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-4">
                         <div className="flex items-center space-x-2 md:space-x-3 border border-black/10 px-1.5 md:px-2 py-0.5 md:py-1">
                          <button onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)} className="text-black/40 hover:text-black p-1">
                            <Minus size={10} />
                          </button>
                          <span className="text-xs font-bold w-6 text-center text-black">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)} className="text-black/40 hover:text-black p-1">
                            <Plus size={10} />
                          </button>
                        </div>
                        <p className="text-xs text-black font-bold">৳{item.price * item.quantity}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-xs tracking-[0.3em] text-black uppercase font-bold border-b border-black/5 pb-2 flex items-center gap-4">
              <span className="w-6 h-6 bg-black text-white flex items-center justify-center rounded-sm text-xs font-bold">2</span>
              Shipping Information
            </h3>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs tracking-widest text-black/40 uppercase mb-2 font-bold">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full bg-black/5 border border-black/10 px-6 py-4 text-xs font-bold tracking-widest focus:border-black outline-none transition rounded-full no-scrollbar text-black"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest text-black/40 uppercase mb-2 font-bold">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 11) setFormData({...formData, phone: val});
                    }}
                    className="w-full bg-black/5 border border-black/10 px-6 py-4 text-xs font-bold tracking-widest focus:border-black outline-none transition rounded-full no-scrollbar text-black"
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-widest text-black/40 uppercase mb-2 font-bold">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.addressLine}
                  onChange={(e) => setFormData({...formData, addressLine: e.target.value})}
                  className="w-full bg-black/5 border border-black/10 px-6 py-4 text-xs font-bold tracking-widest focus:border-black outline-none transition rounded-full no-scrollbar text-black"
                  placeholder="House no, Road no, Area, etc."
                />
              </div>

              <div>
                <label className="block text-xs tracking-widest text-black/40 uppercase mb-4 font-bold">Delivery Location *</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Inside Dhaka', price: 70 },
                    { label: 'Outside Dhaka', price: 110 }
                  ].map(loc => (
                    <button
                      key={loc.label}
                      type="button"
                      onClick={() => setLocation(loc.label as any)}
                      className={`py-4 px-2 border transition-all duration-300 flex flex-col items-center justify-center gap-1 rounded-xl ${location === loc.label ? 'bg-black text-white border-black font-black shadow-lg scale-105' : 'border-black/10 text-black/40 hover:border-black hover:bg-black/5'}`}
                    >
                      <span className="text-xs font-bold tracking-widest uppercase">{loc.label}</span>
                      <span className="text-xs opacity-60 font-bold">{totalItems >= 2 ? 'FREE' : `৳${loc.price}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Order Summary sticky */}
        <div className="lg:sticky lg:top-32">
          <div className="bg-white border-4 border-black p-8 md:p-12 relative rounded-[2.5rem] shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-serif mb-10 tracking-widest uppercase text-black font-bold">Summary</h2>
            
            <div className="space-y-6 mb-10">
              <div className="flex justify-between text-xs md:text-sm tracking-widest text-black/40 uppercase font-bold">
                <span>Items Subtotal</span>
                <span className="text-black">৳{total}</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm tracking-widest text-black/40 uppercase font-bold">
                <span>Shipping ({location})</span>
                <span className={deliveryCharge === 0 ? 'text-red-600 font-bold' : 'text-black font-bold'}>
                  {deliveryCharge === 0 ? 'FREE' : `৳${deliveryCharge}`}
                </span>
              </div>
              
              {totalItems < 2 && (
                <div className="p-4 bg-red-600/5 border border-red-600/20 text-xs text-center rounded-[1.5rem]">
                  <p className="text-red-600 tracking-[0.1em] uppercase font-black">
                    Add <span className="font-black underline">{2 - totalItems} more {2 - totalItems === 1 ? 'item' : 'items'}</span> for FREE delivery
                  </p>
                </div>
              )}

              <div className="h-px bg-black/5 w-full my-6" />
              
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-xs tracking-[0.3em] text-black/30 uppercase mb-1 font-bold">Total to Pay</span>
                  <span className="text-3xl font-serif tracking-widest text-red-600 font-bold">৳{finalTotal}</span>
                </div>
                <div className="text-[12px] text-black/40 tracking-tighter uppercase italic">
                  Incl. all taxes
                </div>
              </div>
            </div>

            <button
              onClick={() => handleCheckout()}
              disabled={checkingOut}
              className="w-full bg-black text-white py-6 font-black tracking-[0.3em] uppercase hover:bg-black/80 active:scale-[0.98] transition-all duration-300 flex items-center justify-center space-x-3 rounded-full shadow-xl"
            >
              <span>{checkingOut ? 'Placing Order...' : 'Place Your Order'}</span>
              <ArrowRight size={18} />
            </button>
            
            <div className="mt-8 pt-8 border-t border-black/5 space-y-4">
              <div className="flex items-center gap-3 text-black/30">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs tracking-widest uppercase font-bold">Secure SSL Encrypted Checkout</span>
              </div>
              <p className="text-xs text-black/20 leading-relaxed uppercase tracking-widest text-center font-bold">
                BY PLACING THIS ORDER, YOU AGREE TO OUR TERMS OF SERVICE AND PRIVACY POLICY.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ThankYouModal 
        isOpen={showThankYou} 
        onClose={() => setShowThankYou(false)} 
        orderAmount={finalTotal}
        contentIds={cart.map(item => item.id)}
      />
    </div>
  );
}

// Helper component for stock warning
function StockWarning({ productId, size }: { productId: string, size: string }) {
  const [stock, setStock] = useState<number | null>(null);

  React.useEffect(() => {
    const fetchStock = async () => {
      const docSnap = await getDoc(doc(db, 'products', productId));
      if (docSnap.exists()) {
        const variant = docSnap.data().variants?.find((v: any) => v.size === size);
        if (variant) setStock(variant.stock);
      }
    };
    fetchStock();
  }, [productId, size]);

  if (stock !== null && stock > 0 && stock <= 5) {
    return <p className="text-[10px] text-orange-400 animate-pulse uppercase tracking-widest font-black">Only {stock} left!</p>;
  }
  return null;
}
