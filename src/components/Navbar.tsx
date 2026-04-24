import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, LogOut, ShieldCheck, Menu, X, Sun, Moon, Trash2, Plus, Minus, ArrowRight, Heart } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { useWishlist } from '../WishlistContext';
import { useTheme } from '../ThemeContext';
import { auth, db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const { cart, removeFromCart, updateQuantity, total, clearCart, isCartOpen, setIsCartOpen } = useCart();
  const { wishlist, removeFromWishlist } = useWishlist();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const wishlistCount = wishlist.length;

  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] bg-luxury-black/80 backdrop-blur-md border-b border-gold/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center space-x-3">
            <div className="relative h-12 w-auto flex items-center">
              <img 
                src="https://i.ibb.co.com/GQmPMMjR/image.png" 
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
              <button onClick={() => setIsWishlistOpen(true)} className="relative group">
                <Heart size={20} className="group-hover:text-gold transition" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gold text-luxury-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>
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
             <button onClick={() => setIsWishlistOpen(true)} className="relative">
                <Heart size={20} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gold text-luxury-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>
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
      {/* Wishlist Drawer */}
      <AnimatePresence>
        {isWishlistOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWishlistOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300, duration: 0.3 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-luxury-black border-l border-gold/20 z-[70] flex flex-col shadow-2xl h-screen"
            >
              <div className="p-6 border-b border-gold/10 flex justify-between items-center bg-luxury-black z-10">
                <h2 className="text-xl font-serif tracking-widest uppercase">Your Wishlist</h2>
                <button onClick={() => setIsWishlistOpen(false)} className="text-white/40 hover:text-white transition">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 min-h-0 custom-scrollbar">
                {wishlist.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <Heart size={48} className="text-gold/10 mb-4" />
                    <p className="text-white/40 tracking-widest uppercase text-sm">Wishlist is empty</p>
                    <button 
                      onClick={() => { setIsWishlistOpen(false); navigate('/'); }}
                      className="mt-6 text-[10px] tracking-widest text-gold hover:underline uppercase"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {wishlist.map((item) => (
                      <div key={item.id} className="flex space-x-4 bg-white/5 p-4 border border-white/5 group">
                        <Link to={`/product/${item.id}`} onClick={() => setIsWishlistOpen(false)} className="w-16 h-20 bg-luxury-black overflow-hidden flex items-center justify-center">
                          <img src={item.image || undefined} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        </Link>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <Link to={`/product/${item.id}`} onClick={() => setIsWishlistOpen(false)}>
                               <h3 className="text-sm font-serif group-hover:text-gold transition uppercase tracking-wider">{item.name}</h3>
                            </Link>
                            <button onClick={() => removeFromWishlist(item.id)} className="text-white/20 hover:text-red-400">
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <p className="text-xs text-gold mt-1 uppercase tracking-widest">৳{item.price}</p>
                          <div className="mt-4">
                            <Link 
                              to={`/product/${item.id}`}
                              onClick={() => setIsWishlistOpen(false)}
                              className="text-[10px] tracking-widest text-white/40 border border-white/10 px-4 py-2 hover:bg-gold hover:text-luxury-black hover:border-gold transition block text-center"
                            >
                              VIEW PRODUCT
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
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
              transition={{ type: 'spring', damping: 30, stiffness: 300, duration: 0.3 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-luxury-black border-l border-gold/20 z-[70] flex flex-col shadow-2xl h-screen"
            >
              {/* Header - Fixed Top */}
              <div className="p-6 border-b border-gold/10 flex justify-between items-center bg-luxury-black z-10">
                <h2 className="text-xl font-serif tracking-widest">YOUR BAG</h2>
                <button onClick={() => setIsCartOpen(false)} className="text-white/40 hover:text-white transition">
                  <X size={24} />
                </button>
              </div>

              {/* Cart Items Section - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <ShoppingBag size={48} className="text-white/10 mb-4" />
                    <p className="text-white/40 tracking-widest uppercase text-sm">Your bag is empty</p>
                  </div>
                ) : (
                  <div className="space-y-8 pb-4">
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

                    {/* Size Guide Table */}
                    <div className="mt-12 pt-8 border-t border-gold/10">
                      <div className="flex items-center space-x-2 mb-6">
                        <ShieldCheck size={16} className="text-gold" />
                        <h3 className="text-xs tracking-[0.2em] font-serif text-gold uppercase">Size Guide (European Measurement)</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="border-b border-gold/10">
                              <th className="py-2 tracking-widest text-white/40 uppercase font-light">Size</th>
                              <th className="py-2 tracking-widest text-white/40 uppercase font-light">Chest</th>
                              <th className="py-2 tracking-widest text-white/40 uppercase font-light">Length</th>
                              <th className="py-2 tracking-widest text-white/40 uppercase font-light">Collar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {[
                              { s: 'S', c: '40"', l: '29"', col: '15"' },
                              { s: 'M', c: '42"', l: '30"', col: '15.5"' },
                              { s: 'L', c: '44"', l: '31"', col: '16"' },
                              { s: 'XL', c: '46"', l: '31"', col: '16.5"' },
                              { s: '2XL', c: '48"', l: '31.5"', col: '17"' },
                            ].map((row) => (
                              <tr key={row.s} className="hover:bg-white/5 transition-colors">
                                <td className="py-3 font-bold text-white pr-2">{row.s}</td>
                                <td className="py-3 text-white/60">{row.c}</td>
                                <td className="py-3 text-white/60">{row.l}</td>
                                <td className="py-3 text-white/60">{row.col}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="mt-4 text-[9px] text-white/30 italic tracking-tight">* All measurements are in inches.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer - Fixed Bottom */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-gold/10 bg-luxury-black space-y-4 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] safe-bottom">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-white/40 tracking-widest uppercase">
                      <span>Subtotal</span>
                      <span>৳{total}</span>
                    </div>
                    <div className="flex justify-between text-lg font-serif border-t border-white/5 pt-2">
                      <span>ESTIMATED TOTAL</span>
                      <span className="text-gold">৳{total}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setIsCartOpen(false);
                      navigate('/cart');
                    }}
                    className="w-full bg-gold text-luxury-black py-4 font-bold tracking-[0.2em] hover:brightness-110 transition flex items-center justify-center space-x-2"
                  >
                    <span>CHECKOUT</span>
                    <ArrowRight size={18} />
                  </button>
                  
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="w-full text-[10px] tracking-widest text-white/40 uppercase hover:text-white transition py-2"
                  >
                    Continue Shopping
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
