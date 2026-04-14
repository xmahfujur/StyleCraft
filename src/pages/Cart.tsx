import React, { useState } from 'react';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    altPhone: '',
    email: '',
    addressLine: '',
    area: '',
    city: 'Dhaka',
    state: 'Dhaka',
    postalCode: '',
    country: 'Bangladesh',
    instructions: ''
  });

  const [location, setLocation] = useState<'Inside Dhaka' | 'Outside Dhaka'>('Inside Dhaka');

  // Autofill from profile if available
  React.useEffect(() => {
    if (profile?.address) {
      setFormData(prev => ({
        ...prev,
        ...profile.address,
        fullName: profile.address.fullName || profile.name || '',
        email: profile.address.email || profile.email || ''
      }));
      if (profile.address.city === 'Dhaka') {
        setLocation('Inside Dhaka');
      } else {
        setLocation('Outside Dhaka');
      }
    } else if (profile) {
      setFormData(prev => ({
        ...prev,
        fullName: profile.name || '',
        email: profile.email || ''
      }));
    }
  }, [profile]);

  const divisions = [
    'Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'
  ];

  const commonCities: Record<string, string[]> = {
    'Dhaka': ['Dhaka', 'Gazipur', 'Narayanganj', 'Savar', 'Tangail'],
    'Chattogram': ['Chattogram', 'Cox\'s Bazar', 'Cumilla', 'Feni'],
    'Rajshahi': ['Rajshahi', 'Bogura', 'Pabna'],
    'Khulna': ['Khulna', 'Jashore', 'Kushtia'],
    'Barishal': ['Barishal', 'Bhola', 'Patuakhali'],
    'Sylhet': ['Sylhet', 'Moulvibazar', 'Habiganj'],
    'Rangpur': ['Rangpur', 'Dinajpur', 'Gaibandha'],
    'Mymensingh': ['Mymensingh', 'Jamalpur', 'Netrokona']
  };

  const deliveryCharge = cart.reduce((acc, item) => {
    if (item.deliveryType === 'Free') return acc;
    const charge = location === 'Inside Dhaka' ? (Number(item.insideDhaka) || 0) : (Number(item.outsideDhaka) || 0);
    return acc + charge;
  }, 0);

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
      if (!formData.fullName || !formData.phone || !formData.addressLine || !formData.area || !formData.city || !formData.postalCode) {
        toast.error('Please fill in all required fields');
        setCheckingOut(false);
        return;
      }

      const phoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        toast.error('Please enter a valid Bangladesh phone number');
        setCheckingOut(false);
        return;
      }

      if (!/^\d+$/.test(formData.postalCode)) {
        toast.error('Postal code must be numeric');
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

      const orderData = {
        userId: user.uid,
        products: cart,
        total: finalTotal,
        deliveryCharge,
        location,
        status: 'Placed',
        shippingAddress: formData,
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
      toast.success('Order placed successfully!');
      navigate('/dashboard');
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

  if (cart.length === 0) {
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

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
        <h1 className="text-4xl font-serif tracking-widest">SHOPPING BAG</h1>
        <Link to="/" className="text-[10px] tracking-widest text-gold uppercase hover:underline flex items-center gap-2">
          <ArrowLeft size={14} />
          Continue Shopping
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-2 space-y-8">
          {cart.map((item) => (
            <motion.div 
              layout
              key={`${item.id}-${item.size}`}
              className="flex items-center space-x-6 bg-white/5 p-6 border border-gold/5"
            >
              <div className="w-24 h-32 bg-white/5 flex items-center justify-center overflow-hidden">
                <img 
                  src={item.image || undefined} 
                  alt={item.name} 
                  className="max-w-full max-h-full object-contain block"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-serif">{item.name}</h3>
                  <button onClick={() => removeFromCart(item.id, item.size)} className="text-white/20 hover:text-red-400 transition">
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-gold text-xs tracking-widest uppercase">SIZE: {item.size}</p>
                  {/* Low Stock Warning */}
                  <StockWarning productId={item.id} size={item.size} />
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4 border border-white/10 px-3 py-1">
                    <button onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)} className="text-white/40 hover:text-white transition">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)} className="text-white/40 hover:text-white transition">
                      <Plus size={14} />
                    </button>
                  </div>
                  <p className="text-white/80 font-light">৳{item.price * item.quantity}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white/5 border border-gold/10 p-8 sticky-checkout">
            <h2 className="text-xl font-serif mb-8 tracking-widest">ORDER SUMMARY</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm text-white/60">
                <span>Subtotal</span>
                <span>৳{total}</span>
              </div>
              <div className="flex justify-between text-sm text-white/60">
                <span>Shipping ({location})</span>
                <span className={deliveryCharge === 0 ? 'text-gold' : 'text-white'}>
                  {deliveryCharge === 0 ? 'Free' : `৳${deliveryCharge}`}
                </span>
              </div>
              <div className="h-px bg-gold/20 w-full my-4" />
              <div className="flex justify-between text-lg font-bold">
                <span className="tracking-widest">TOTAL</span>
                <span className="text-gold">৳{finalTotal}</span>
              </div>
            </div>

            <form onSubmit={handleCheckout} className="space-y-8">
              {/* Personal Info Section */}
              <div className="space-y-4">
                <h3 className="text-[10px] tracking-[0.3em] text-gold uppercase font-bold border-b border-gold/10 pb-2">1. Personal Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition"
                        placeholder="01XXXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Alt. Phone (Optional)</label>
                      <input
                        type="tel"
                        value={formData.altPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 11) setFormData({...formData, altPhone: val});
                        }}
                        className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition"
                        placeholder="Alternative number"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
              </div>

              {/* Address Info Section */}
              <div className="space-y-4">
                <h3 className="text-[10px] tracking-[0.3em] text-gold uppercase font-bold border-b border-gold/10 pb-2">2. Delivery Address</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Delivery Location</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Inside Dhaka', 'Outside Dhaka'].map(loc => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => {
                            setLocation(loc as any);
                            if (loc === 'Inside Dhaka') {
                              setFormData(prev => ({ ...prev, city: 'Dhaka', state: 'Dhaka' }));
                            }
                          }}
                          className={`py-2 text-[10px] tracking-widest uppercase border transition ${location === loc ? 'bg-gold text-luxury-black border-gold' : 'border-white/10 text-white/40'}`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Street Address *</label>
                    <input
                      type="text"
                      required
                      value={formData.addressLine}
                      onChange={(e) => setFormData({...formData, addressLine: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition"
                      placeholder="House no, Road no, Block, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Area / Locality *</label>
                    <input
                      type="text"
                      required
                      value={formData.area}
                      onChange={(e) => setFormData({...formData, area: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition"
                      placeholder="e.g. Dhanmondi, Banani, Agrabad"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Division / State *</label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value, city: commonCities[e.target.value][0]})}
                        className="w-full bg-luxury-black border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition"
                      >
                        {divisions.map(div => (
                          <option key={div} value={div}>{div}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">City *</label>
                      <select
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full bg-luxury-black border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition"
                      >
                        {commonCities[formData.state]?.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Postal Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.postalCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setFormData({...formData, postalCode: val});
                        }}
                        className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition"
                        placeholder="1209"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Country</label>
                      <input
                        type="text"
                        disabled
                        value={formData.country}
                        className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm opacity-50 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info Section */}
              <div className="space-y-4">
                <h3 className="text-[10px] tracking-[0.3em] text-gold uppercase font-bold border-b border-gold/10 pb-2">3. Additional Information</h3>
                <div>
                  <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Delivery Instructions (Optional)</label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition h-24 resize-none"
                    placeholder="Any special notes for the delivery person..."
                  />
                </div>
              </div>

              {/* Formatted Summary */}
              {formData.fullName && formData.phone && formData.addressLine && (
                <div className="bg-gold/5 border border-gold/20 p-4 rounded-sm space-y-2">
                  <p className="text-[8px] tracking-widest text-gold uppercase mb-2">Delivery Summary Preview:</p>
                  <div className="text-xs text-white/80 space-y-1 font-light">
                    <p className="font-bold text-white">{formData.fullName}</p>
                    <p>{formData.phone}</p>
                    <p>{formData.addressLine}, {formData.area}</p>
                    <p>{formData.city}, {formData.postalCode}</p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!formData.fullName || !formData.phone || !formData.addressLine || !formData.area || !formData.city || !formData.postalCode) {
                    toast.error('Please fill in all required fields');
                    return;
                  }
                  setShowConfirm(true);
                }}
                className="w-full bg-gold text-luxury-black py-4 font-bold tracking-[0.2em] hover:brightness-110 transition flex items-center justify-center space-x-2"
              >
                <span>PROCEED TO CONFIRM</span>
                <ArrowRight size={18} />
              </button>
            </form>
            
            {user?.isAnonymous && (
              <p className="mt-4 text-[10px] text-center text-white/30 tracking-widest">
                CHECKING OUT AS GUEST
              </p>
            )}
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
                    <p>{formData.addressLine}, {formData.area}</p>
                    <p>{formData.city}, {formData.state} - {formData.postalCode}</p>
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
