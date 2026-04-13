import React, { useState } from 'react';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState<'Inside Dhaka' | 'Outside Dhaka'>('Inside Dhaka');

  const deliveryCharge = cart.reduce((acc, item) => {
    if (item.deliveryType === 'Free') return acc;
    const charge = location === 'Inside Dhaka' ? (item.insideDhaka || 0) : (item.outsideDhaka || 0);
    return acc + charge;
  }, 0);

  const finalTotal = total + deliveryCharge;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }
    // With anonymous auth, user is always present, but we check if they are guest
    if (cart.length === 0) return;

    setCheckingOut(true);
    try {
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        products: cart,
        total: finalTotal,
        deliveryCharge,
        location,
        status: 'Placed',
        address,
        phone,
        createdAt: serverTimestamp(),
        createdAtISO: new Date().toISOString()
      });
      
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
      <h1 className="text-4xl font-serif mb-12 tracking-widest text-center">SHOPPING BAG</h1>
      
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
                <p className="text-gold text-xs tracking-widest mb-4 uppercase">SIZE: {item.size}</p>
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
          <div className="bg-white/5 border border-gold/10 p-8 sticky top-32">
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

            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Delivery Location</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Inside Dhaka', 'Outside Dhaka'].map(loc => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocation(loc as any)}
                      className={`py-2 text-[10px] tracking-widest uppercase border transition ${location === loc ? 'bg-gold text-luxury-black border-gold' : 'border-white/10 text-white/40'}`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Shipping Address</label>
                <textarea
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition h-24 resize-none"
                  placeholder="Street, City, Zip Code"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition"
                  placeholder="+1 234 567 890"
                />
              </div>
              <button
                type="submit"
                disabled={checkingOut}
                className="w-full bg-gold text-luxury-black py-4 font-bold tracking-[0.2em] hover:brightness-110 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{checkingOut ? 'PROCESSING...' : 'PLACE ORDER'}</span>
                {!checkingOut && <ArrowRight size={18} />}
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
    </div>
  );
}
