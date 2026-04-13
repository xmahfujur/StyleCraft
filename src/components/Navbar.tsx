import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, LogOut, ShieldCheck, Menu, X, Sun, Moon, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { useTheme } from '../ThemeContext';
import { auth, db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const { cart, removeFromCart, updateQuantity, total, clearCart, isCartOpen, setIsCartOpen } = useCart();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState<'Inside Dhaka' | 'Outside Dhaka'>('Inside Dhaka');

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const deliveryCharge = cart.reduce((acc, item) => {
    if (item.deliveryType === 'Free') return acc;
    const charge = deliveryLocation === 'Inside Dhaka' ? (Number(item.insideDhaka) || 0) : (Number(item.outsideDhaka) || 0);
    return acc + charge;
  }, 0);

  const finalTotal = Number(total) + deliveryCharge;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (cart.length === 0) return;

    try {
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        products: cart,
        total: finalTotal,
        deliveryCharge,
        location: deliveryLocation,
        status: 'Placed',
        address,
        phone,
        createdAt: serverTimestamp()
      });
      
      clearCart();
      toast.success('Order placed successfully!');
      setIsCartOpen(false);
      setIsCheckingOut(false);
      navigate('/dashboard');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-luxury-black/80 backdrop-blur-md border-b border-gold/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center space-x-3">
            <div className="relative h-12 w-auto flex items-center">
              <img 
                src="https://i.ibb.co.com/N6PcCT18/671510935-948788494412125-811881166588617131-n.jpg" 
                alt="StyleCraft Logo" 
                className="h-full w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-2xl font-serif font-bold tracking-widest text-gold hidden sm:block">STYLECRAFT</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className={`text-sm tracking-widest hover:text-gold transition ${location.pathname === '/' ? 'text-gold' : 'text-white/70'}`}>COLLECTION</Link>
            {isAdmin && (
              <Link to="/admin" className="flex items-center space-x-1 text-sm tracking-widest text-gold hover:brightness-125 transition">
                <ShieldCheck size={16} />
                <span>ADMIN</span>
              </Link>
            )}
            <div className="flex items-center space-x-6 border-l border-gold/20 pl-8">
              <button onClick={() => setIsCartOpen(true)} className="relative group">
                <ShoppingBag size={22} className="group-hover:text-gold transition" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gold text-luxury-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
              {user && !user.isAnonymous ? (
                <div className="flex items-center space-x-4">
                  <Link to="/dashboard">
                    <User size={22} className="hover:text-gold transition" />
                  </Link>
                  <button onClick={() => auth.signOut()} className="hover:text-red-400 transition">
                    <LogOut size={22} />
                  </button>
                </div>
              ) : (
                <Link to="/login" className="text-sm tracking-widest border border-gold/30 px-4 py-2 hover:bg-gold hover:text-luxury-black transition">
                  LOGIN
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center space-x-4">
             <button onClick={() => setIsCartOpen(true)} className="relative">
                <ShoppingBag size={22} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gold text-luxury-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-luxury-black border-b border-gold/10 px-4 py-8 space-y-6"
          >
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="block text-lg tracking-widest text-center">COLLECTION</Link>
            {isAdmin && <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block text-lg tracking-widest text-gold text-center">ADMIN PANEL</Link>}
            {user && !user.isAnonymous ? (
              <>
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block text-lg tracking-widest text-center">DASHBOARD</Link>
                <button onClick={() => { auth.signOut(); setIsMenuOpen(false); }} className="block w-full text-lg tracking-widest text-red-400 text-center">LOGOUT</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block text-lg tracking-widest text-center text-gold">LOGIN</Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-luxury-black border-l border-gold/20 z-[70] flex flex-col shadow-2xl h-screen"
            >
              {/* Header - Fixed Top */}
              <div className="p-6 border-b border-gold/10 flex justify-between items-center bg-luxury-black z-10">
                <h2 className="text-xl font-serif tracking-widest">YOUR BAG</h2>
                <button onClick={() => setIsCartOpen(false)} className="text-white/40 hover:text-white transition">
                  <X size={24} />
                </button>
              </div>

              {/* Cart Items / Form Section - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <ShoppingBag size={48} className="text-white/10 mb-4" />
                    <p className="text-white/40 tracking-widest uppercase text-sm">Your bag is empty</p>
                  </div>
                ) : (
                  <div className="space-y-8 pb-4">
                    {!isCheckingOut ? (
                      <div className="space-y-6">
                        {cart.map((item) => (
                          <div key={`${item.id}-${item.size}`} className="flex space-x-4 bg-white/5 p-4 border border-white/5">
                            <img src={item.image || undefined} className="w-16 h-20 object-cover" referrerPolicy="no-referrer" />
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <h3 className="text-sm font-serif">{item.name}</h3>
                                <button onClick={() => removeFromCart(item.id, item.size)} className="text-white/20 hover:text-red-400">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <p className="text-[10px] text-gold tracking-widest uppercase mt-1">SIZE: {item.size}</p>
                              <div className="flex justify-between items-center mt-3">
                                <div className="flex items-center space-x-3 border border-white/10 px-2 py-1">
                                  <button onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)} className="text-white/40 hover:text-white">
                                    <Minus size={12} />
                                  </button>
                                  <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)} className="text-white/40 hover:text-white">
                                    <Plus size={12} />
                                  </button>
                                </div>
                                <p className="text-xs">৳{item.price * item.quantity}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <button 
                          type="button" 
                          onClick={() => setIsCheckingOut(false)}
                          className="text-[10px] tracking-widest text-gold uppercase hover:underline flex items-center"
                        >
                          ← Back to Bag
                        </button>
                        
                        <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
                          <div>
                            <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Delivery Location</label>
                            <div className="grid grid-cols-2 gap-2">
                              {['Inside Dhaka', 'Outside Dhaka'].map(loc => (
                                <button
                                  key={loc}
                                  type="button"
                                  onClick={() => setDeliveryLocation(loc as any)}
                                  className={`py-2 text-[10px] tracking-widest uppercase border transition ${deliveryLocation === loc ? 'bg-gold text-luxury-black border-gold' : 'border-white/10 text-white/40'}`}
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
                              className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition h-32 resize-none text-white"
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
                              className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition text-white"
                              placeholder="+880 1XXX XXXXXX"
                            />
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer - Fixed Bottom */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-gold/10 bg-luxury-black space-y-4 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-white/40 tracking-widest uppercase">
                      <span>Subtotal</span>
                      <span>৳{total}</span>
                    </div>
                    {isCheckingOut && (
                      <div className="flex justify-between text-xs text-white/40 tracking-widest uppercase">
                        <span>Shipping</span>
                        <span>{deliveryCharge === 0 ? 'FREE' : `৳${deliveryCharge}`}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-serif border-t border-white/5 pt-2">
                      <span>TOTAL</span>
                      <span className="text-gold">৳{isCheckingOut ? finalTotal : total}</span>
                    </div>
                  </div>

                  {!isCheckingOut ? (
                    <button 
                      onClick={() => setIsCheckingOut(true)}
                      className="w-full bg-gold text-luxury-black py-4 font-bold tracking-[0.2em] hover:brightness-110 transition flex items-center justify-center space-x-2"
                    >
                      <span>CHECKOUT NOW</span>
                      <ArrowRight size={18} />
                    </button>
                  ) : (
                    <button 
                      form="checkout-form"
                      type="submit"
                      className="w-full bg-gold text-luxury-black py-4 font-bold tracking-[0.2em] hover:brightness-110 transition flex items-center justify-center space-x-2"
                    >
                      <span>CONFIRM ORDER</span>
                      <ArrowRight size={18} />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
