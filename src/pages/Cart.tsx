import React, { useState } from 'react';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ThankYouModal from '../components/ThankYouModal';

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
    if (totalItems === 0 || totalItems > 2) return 0;
    return location === 'Inside Dhaka' ? 70 : 110;
  })();

  const finalTotal = Number(total) + deliveryCharge;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
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
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          const productData = productSnap.data();
          const variant = productData.variants?.find((v: any) => v.size === item.size);
          
          if (variant && variant.stock < item.quantity) {
            toast.error(`Sorry, ${item.name} (Size: ${item.size}) is out of stock or has insufficient quantity.`);
            setCheckingOut(false);
            setShowConfirm(false);
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

      await addDoc(collection(db, 'orders'), orderData);
      
      // Deduct stock after order success
      for (const item of cart) {
        const productRef = doc(db, 'products', item.id);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          const updatedVariants = productData.variants?.map((v: any) => {
            if (v.size === item.size) {
              return { ...v, stock: Math.max(0, v.stock - item.quantity) };
            }
            return v;
          });
          await updateDoc(productRef, { variants: updatedVariants });
        }
      }
      
      // Save address to user profile for future use
      if (user && !user.isAnonymous) {
        await updateDoc(doc(db, 'users', user.uid), {
          address: formData,
          lastUpdated: serverTimestamp()
        });
      }
      
      clearCart();
      setShowConfirm(false);
      setShowThankYou(true);
      // Removed immediate navigate('/dashboard'); as the ThankYouModal will handle it
    } catch (error: any) {
      const errInfo = {
        error: error.message,
        operationType: 'create',
        path: 'orders',
        authInfo: {
          userId: user.uid,
          isAnonymous: user.isAnonymous
        }
      };
      console.error("Checkout error:", JSON.stringify(errInfo));
      toast.error('Error placing order: ' + error.message);
    } finally {
      setCheckingOut(false);
    }
  };

  if (cart.length === 0 && !showThankYou) {
    return (
      <div className="pt-40 pb-24 flex flex-col items-center justify-center px-4">
        <ShoppingBag size={64} className="text-white/10 mb-8" />
        <h1 className="text-3xl font-serif mb-4 tracking-widest">YOUR BAG IS EMPTY</h1>
        <p className="text-white/40 mb-10 tracking-widest font-light">EXPLORE OUR COLLECTION TO FIND YOUR STYLE</p>
        <Link to="/" className="bg-gold text-luxury-black px-10 py-4 font-bold tracking-widest hover:brightness-110 transition">
          SHOP NOW
        </Link>
      </div>
    );
  }

  // If thank you is showing but cart was already cleared, show a clean background
  if (showThankYou && cart.length === 0) {
    return (
      <div className="min-h-screen bg-luxury-black flex items-center justify-center">
        <div className="text-center animate-pulse">
          <p className="text-gold tracking-[0.5em] text-xs uppercase">Processing Order...</p>
        </div>
        <ThankYouModal 
          isOpen={showThankYou} 
          onClose={() => setShowThankYou(false)} 
        />
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
        <h1 className="text-4xl font-serif tracking-widest">CHECKOUT</h1>
        <Link to="/" className="text-[10px] tracking-widest text-gold uppercase hover:underline flex items-center gap-2">
          <ArrowLeft size={14} />
          Back to Collection
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Left Side: Order Review */}
        <div className="space-y-12">
          <div className="space-y-6">
            <h3 className="text-[10px] tracking-[0.3em] text-gold uppercase font-bold border-b border-gold/10 pb-2 flex items-center gap-4">
              <span className="w-6 h-6 bg-gold text-luxury-black flex items-center justify-center rounded-sm">1</span>
              Review Items
            </h3>
            <div className="space-y-4">
              {cart.map((item) => (
                <motion.div 
                  layout
                  key={`${item.id}-${item.size}`}
                  className="flex items-center space-x-6 bg-white/5 p-4 border border-gold/5 group"
                >
                  <div className="w-16 h-20 bg-white/5 flex items-center justify-center overflow-hidden">
                    <img 
                      src={item.image || undefined} 
                      alt={item.name} 
                      className="max-w-full max-h-full object-contain block group-hover:scale-110 transition duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-serif truncate pr-4">{item.name}</h3>
                      <button onClick={() => removeFromCart(item.id, item.size)} className="text-white/20 hover:text-red-400 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                       <p className="text-[10px] text-gold tracking-widest uppercase">SIZE: {item.size}</p>
                       <div className="flex items-center space-x-3 border border-white/10 px-2">
                        <button onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)} className="text-white/40 hover:text-white pb-0.5">
                          <Minus size={10} />
                        </button>
                        <span className="text-[10px] font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)} className="text-white/40 hover:text-white pb-0.5">
                          <Plus size={10} />
                        </button>
                      </div>
                      <p className="text-xs text-white/80">৳{item.price * item.quantity}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-[10px] tracking-[0.3em] text-gold uppercase font-bold border-b border-gold/10 pb-2 flex items-center gap-4">
              <span className="w-6 h-6 bg-gold text-luxury-black flex items-center justify-center rounded-sm">2</span>
              Shipping Information
            </h3>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 px-4 py-4 text-xs focus:border-gold outline-none transition rounded-sm no-scrollbar"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 11) setFormData({...formData, phone: val});
                    }}
                    className="w-full bg-white/5 border border-white/10 px-4 py-4 text-xs focus:border-gold outline-none transition rounded-sm no-scrollbar"
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.addressLine}
                  onChange={(e) => setFormData({...formData, addressLine: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 px-4 py-4 text-xs focus:border-gold outline-none transition rounded-sm no-scrollbar"
                  placeholder="House no, Road no, Area, etc."
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-4">Delivery Location *</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Inside Dhaka', price: 70 },
                    { label: 'Outside Dhaka', price: 110 }
                  ].map(loc => (
                    <button
                      key={loc.label}
                      type="button"
                      onClick={() => setLocation(loc.label as any)}
                      className={`py-4 px-2 border transition-all duration-300 flex flex-col items-center justify-center gap-1 rounded-sm ${location === loc.label ? 'bg-gold text-luxury-black border-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]' : 'border-white/10 text-white/40 hover:border-gold/30'}`}
                    >
                      <span className="text-[10px] font-bold tracking-widest uppercase">{loc.label}</span>
                      <span className="text-[9px] opacity-60">{totalItems > 2 ? 'FREE' : `৳${loc.price}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Order Summary sticky */}
        <div className="lg:sticky lg:top-32">
          <div className="bg-white/5 border border-gold/10 p-8 md:p-10 relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 -z-10 blur-3xl rounded-full" />
            <h2 className="text-xl font-serif mb-10 tracking-[0.2em] uppercase">Order Summary</h2>
            
            <div className="space-y-6 mb-10">
              <div className="flex justify-between text-xs tracking-widest text-white/40 uppercase">
                <span>Items Subtotal</span>
                <span className="text-white">৳{total}</span>
              </div>
              <div className="flex justify-between text-xs tracking-widest text-white/40 uppercase">
                <span>Shipping ({location})</span>
                <span className={deliveryCharge === 0 ? 'text-gold font-bold' : 'text-white'}>
                  {deliveryCharge === 0 ? 'FREE' : `৳${deliveryCharge}`}
                </span>
              </div>
              
              {totalItems <= 2 && (
                <div className="p-3 bg-gold/5 border border-gold/10 text-[10px] text-center">
                  <p className="text-gold tracking-[0.1em] uppercase">
                    Add <span className="font-bold underline">{3 - totalItems} more {3 - totalItems === 1 ? 'item' : 'items'}</span> for FREE delivery
                  </p>
                </div>
              )}

              <div className="h-px bg-gold/10 w-full my-6" />
              
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-1">Total to Pay</span>
                  <span className="text-3xl font-serif tracking-widest text-gold font-bold">৳{finalTotal}</span>
                </div>
                <div className="text-[10px] text-white/20 tracking-tighter uppercase italic">
                  Incl. all taxes
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!formData.fullName || !formData.phone || !formData.addressLine) {
                  toast.error('Please fill in required name, phone and street address');
                  return;
                }
                setShowConfirm(true);
              }}
              className="w-full bg-gold text-luxury-black py-5 font-bold tracking-[0.3em] uppercase hover:brightness-110 active:scale-[0.98] transition-all duration-300 flex items-center justify-center space-x-3 shadow-xl shadow-gold/10"
            >
              <span>Place Your Order</span>
              <ArrowRight size={18} />
            </button>
            
            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
              <div className="flex items-center gap-3 text-white/30">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] tracking-widest uppercase">Secure SSL Encrypted Checkout</span>
              </div>
              <p className="text-[9px] text-white/20 leading-relaxed uppercase tracking-widest text-center">
                BY PLACING THIS ORDER, YOU AGREE TO OUR TERMS OF SERVICE AND PRIVACY POLICY.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-luxury-black border border-gold/20 p-8 max-w-lg w-full shadow-2xl"
            >
              <h2 className="text-2xl font-serif mb-6 tracking-widest text-center">CONFIRM YOUR ORDER</h2>
              
              <div className="space-y-6 mb-8">
                <div className="bg-white/5 p-4 border border-white/5">
                  <p className="text-[10px] tracking-widest text-gold uppercase mb-3">Delivery To:</p>
                  <div className="text-sm space-y-1 text-white/80">
                    <p className="font-bold text-white">{formData.fullName}</p>
                    <p>{formData.phone}</p>
                    <p>{formData.addressLine}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40 uppercase tracking-widest">Items Total</span>
                    <span>৳{total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40 uppercase tracking-widest">Delivery Charge</span>
                    <span>৳{deliveryCharge}</span>
                  </div>
                  <div className="flex justify-between text-xl font-serif border-t border-gold/20 pt-4 mt-4">
                    <span className="tracking-widest">GRAND TOTAL</span>
                    <span className="text-gold">৳{finalTotal}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="py-4 border border-white/10 text-white/60 tracking-widest text-[10px] uppercase hover:bg-white/5 transition"
                >
                  Edit Details
                </button>
                <button 
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="py-4 bg-gold text-luxury-black font-bold tracking-widest text-[10px] uppercase hover:brightness-110 transition disabled:opacity-50"
                >
                  {checkingOut ? 'PLACING ORDER...' : 'CONFIRM & PLACE'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
    return <p className="text-[8px] text-orange-400 animate-pulse uppercase tracking-widest font-bold">Only {stock} left!</p>;
  }
  return null;
}
