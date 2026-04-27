import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, User, LogOut, ShieldCheck, Menu, X, Sun, Moon, Trash2, Plus, Minus, ArrowRight, Heart, ChevronDown } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { useWishlist } from '../WishlistContext';
import { useTheme } from '../ThemeContext';
import { auth, db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/category/all?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  useEffect(() => {
    const qCat = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const unsubCat = onSnapshot(qCat, (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qCol = query(collection(db, 'collections'), orderBy('priority', 'desc'));
    const unsubCol = onSnapshot(qCol, (snap) => {
      setCollections(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubCat();
      unsubCol();
    };
  }, []);

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const wishlistCount = wishlist.length;

  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] bg-white/40 backdrop-blur-md border-b border-black/5" onMouseLeave={() => setActiveDropdown(null)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center space-x-3">
            <div className="relative h-12 w-auto flex items-center">
              <img 
                src="https://i.ibb.co.com/C32Kc2j0/Chat-GPT-Image-Apr-27-2026-06-53-56-PM.png" 
                alt="StyleCraft Logo" 
                className="h-full w-auto object-contain brightness-0"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-2xl font-serif font-bold tracking-widest text-black hidden lg:block uppercase">STYLECRAFT</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <div 
              className="relative py-8"
              onMouseEnter={() => setActiveDropdown('collections')}
            >
              <button className={`text-[10px] tracking-[0.3em] font-bold uppercase transition flex items-center gap-1 ${location.pathname.includes('/collection') ? 'text-black' : 'text-black/60 hover:text-black'}`}>
                COLLECTIONS
                <ChevronDown size={10} />
              </button>
              <AnimatePresence>
                {activeDropdown === 'collections' && (
                   <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 w-64 bg-white border border-black/10 p-4 space-y-2 shadow-2xl"
                  >
                    {collections.map(col => (
                      <Link key={col.id} to={`/collection/${col.slug}`} className="block text-[9px] tracking-widest text-black/60 hover:text-black uppercase py-2 border-b border-black/5 last:border-0 transition font-bold" onClick={() => setActiveDropdown(null)}>
                        {col.name}
                      </Link>
                    ))}
                    {collections.length === 0 && <p className="text-[9px] text-black/40 italic">No collections</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div 
              className="relative py-8"
              onMouseEnter={() => setActiveDropdown('categories')}
            >
              <button className={`text-[10px] tracking-[0.3em] font-bold uppercase transition flex items-center gap-1 ${location.pathname.includes('/category') ? 'text-black' : 'text-black/60 hover:text-black'}`}>
                CATEGORIES
                <ChevronDown size={10} />
              </button>
              <AnimatePresence>
                {activeDropdown === 'categories' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 w-64 bg-white border border-black/10 p-4 space-y-2 shadow-2xl"
                  >
                    {categories.map(cat => (
                      <Link key={cat.id} to={`/category/${cat.slug}`} className="block text-[9px] tracking-widest text-black/60 hover:text-black uppercase py-2 border-b border-black/5 last:border-0 transition font-bold" onClick={() => setActiveDropdown(null)}>
                        {cat.name}
                      </Link>
                    ))}
                    {categories.length === 0 && <p className="text-[9px] text-black/40 italic">No categories</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isAdmin && (
              <Link to="/admin" className="flex items-center space-x-1 text-[10px] tracking-[0.3em] font-bold text-black border-b-2 border-transparent hover:border-black transition uppercase">
                <ShieldCheck size={14} />
                <span>ADMIN</span>
              </Link>
            )}
            <div className="flex items-center space-x-6 border-l border-black/10 pl-8 text-black">
              <button onClick={() => setIsSearchOpen(true)} className="group">
                <Search size={20} className="group-hover:scale-110 transition" />
              </button>
              <button onClick={() => setIsWishlistOpen(true)} className="relative group">
                <Heart size={20} className="group-hover:scale-110 transition" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>
              <button onClick={() => setIsCartOpen(true)} className="relative group">
                <ShoppingBag size={22} className="group-hover:scale-110 transition" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
              {user && !user.isAnonymous ? (
                <div className="flex items-center space-x-4">
                  <Link to="/dashboard">
                    <User size={22} className="hover:scale-110 transition" />
                  </Link>
                  <button onClick={() => auth.signOut()} className="hover:text-red-500 transition">
                    <LogOut size={22} />
                  </button>
                </div>
              ) : (
                <Link to="/login" className="text-[10px] tracking-widest font-bold bg-black text-white px-6 py-2.5 hover:bg-black/80 transition">
                  LOGIN
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center space-x-4 text-black">
             <button onClick={() => setIsSearchOpen(true)}>
                <Search size={20} />
              </button>
             <button onClick={() => setIsWishlistOpen(true)} className="relative">
                <Heart size={20} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>
             <button onClick={() => setIsCartOpen(true)} className="relative">
                <ShoppingBag size={22} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
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
            className="md:hidden bg-white border-b border-black/5 px-4 py-8 space-y-6"
          >
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="block text-[10px] tracking-[0.3em] font-bold text-center uppercase text-black">HOME</Link>
            
            {collections.length > 0 && (
              <div className="space-y-4">
                <p className="text-[8px] tracking-[0.4em] text-black/40 text-center uppercase">Collections</p>
                {collections.map(col => (
                  <Link key={col.id} to={`/collection/${col.slug}`} onClick={() => setIsMenuOpen(false)} className="block text-[10px] tracking-widest text-center uppercase text-black/60">{col.name}</Link>
                ))}
              </div>
            )}

            {categories.length > 0 && (
              <div className="space-y-4">
                <p className="text-[8px] tracking-[0.4em] text-black/40 text-center uppercase">Categories</p>
                {categories.map(cat => (
                  <Link key={cat.id} to={`/category/${cat.slug}`} onClick={() => setIsMenuOpen(false)} className="block text-[10px] tracking-widest text-center uppercase text-black/60">{cat.name}</Link>
                ))}
              </div>
            )}

            {isAdmin && <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block text-[10px] tracking-[0.3em] font-bold text-gold text-center uppercase">ADMIN PANEL</Link>}
            {user && !user.isAnonymous ? (
              <>
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block text-[10px] font-bold tracking-[0.3em] text-center text-black">DASHBOARD</Link>
                <button onClick={() => { auth.signOut(); setIsMenuOpen(false); }} className="block w-full text-[10px] font-bold tracking-[0.3em] text-red-500 text-center">LOGOUT</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block text-[10px] bg-black text-white py-4 tracking-[0.3em] font-bold text-center">LOGIN</Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-xl p-4 md:p-20 flex flex-col items-center"
          >
            <button 
              onClick={() => setIsSearchOpen(false)}
              className="absolute top-8 right-8 text-black/40 hover:text-black transition"
            >
              <X size={32} />
            </button>

            <form onSubmit={handleSearch} className="w-full max-w-4xl mt-20 md:mt-40">
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative"
              >
                <Search size={32} className="absolute left-0 top-1/2 -translate-y-1/2 text-black/20" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="SEARCH FOR STYLES OR PRODUCTS..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-black/10 py-8 pl-14 pr-4 text-xl md:text-4xl font-serif tracking-tight focus:border-black outline-none transition uppercase italic text-black placeholder:text-black/10"
                />
              </motion.div>
              <p className="mt-8 text-[10px] md:text-xs tracking-[0.3em] font-black text-black/40 uppercase">Press Enter to search</p>
            </form>
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
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-black/10 z-[70] flex flex-col shadow-2xl h-screen"
            >
              <div className="p-6 border-b border-black/5 flex justify-between items-center bg-white z-10">
                <h2 className="text-xl font-serif tracking-widest uppercase text-black">Your Wishlist</h2>
                <button onClick={() => setIsWishlistOpen(false)} className="text-black/40 hover:text-black transition">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 min-h-0 custom-scrollbar bg-white">
                {wishlist.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <Heart size={48} className="text-black/10 mb-4" />
                    <p className="text-black/40 tracking-widest uppercase text-sm">Wishlist is empty</p>
                    <button 
                      onClick={() => { setIsWishlistOpen(false); navigate('/'); }}
                      className="mt-6 text-[10px] tracking-widest text-black/60 hover:text-black hover:underline uppercase font-bold"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {wishlist.map((item) => (
                      <div key={item.id} className="flex space-x-4 bg-black/[0.02] p-4 border border-black/5 group">
                        <Link to={`/product/${item.slug || item.id}`} onClick={() => setIsWishlistOpen(false)} className="w-16 h-20 bg-white border border-black/5 overflow-hidden flex items-center justify-center">
                          <img src={item.image || null} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        </Link>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <Link to={`/product/${item.slug || item.id}`} onClick={() => setIsWishlistOpen(false)}>
                               <h3 className="text-sm font-serif text-black uppercase tracking-wider">{item.name}</h3>
                            </Link>
                            <button onClick={() => removeFromWishlist(item.id)} className="text-black/20 hover:text-red-500">
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <p className="text-xs text-black/60 mt-1 uppercase tracking-widest font-bold">৳{item.price}</p>
                          <div className="mt-4">
                            <Link 
                              to={`/product/${item.slug || item.id}`}
                              onClick={() => setIsWishlistOpen(false)}
                              className="text-[10px] tracking-widest font-bold bg-black text-white px-4 py-2 hover:bg-black/80 transition block text-center"
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
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-black/10 z-[70] flex flex-col shadow-2xl h-screen"
            >
              {/* Header - Fixed Top */}
              <div className="p-6 border-b border-black/5 flex justify-between items-center bg-white z-10">
                <h2 className="text-xl font-serif tracking-widest text-black">YOUR BAG</h2>
                <button onClick={() => setIsCartOpen(false)} className="text-black/40 hover:text-black transition">
                  <X size={24} />
                </button>
              </div>

              {/* Cart Items Section - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0 custom-scrollbar bg-white">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <ShoppingBag size={48} className="text-black/10 mb-4" />
                    <p className="text-black/40 tracking-widest uppercase text-sm">Your bag is empty</p>
                  </div>
                ) : (
                  <div className="space-y-8 pb-4">
                    <div className="space-y-6">
                      {cart.map((item) => (
                        <div key={`${item.id}-${item.size}`} className="flex space-x-4 bg-black/[0.02] p-3 border border-black/5">
                          <img src={item.image || null} className="w-16 h-20 object-cover flex-shrink-0 bg-white" referrerPolicy="no-referrer" />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <h3 className="text-xs font-serif truncate pr-2 uppercase tracking-wider text-black">{item.name}</h3>
                              <button onClick={() => removeFromCart(item.id, item.size)} className="text-black/20 hover:text-red-500 p-1 flex-shrink-0">
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <p className="text-[9px] text-black/40 tracking-[0.2em] uppercase mt-0.5">SIZE: {item.size}</p>
                            <div className="flex justify-between items-center mt-3">
                              <div className="flex items-center space-x-4 border border-black/10 px-2 py-1">
                                <button onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)} className="text-black/40 hover:text-black p-1">
                                  <Minus size={10} />
                                </button>
                                <span className="text-[10px] font-bold w-4 text-center text-black">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)} className="text-black/40 hover:text-black p-1">
                                  <Plus size={10} />
                                </button>
                              </div>
                              <p className="text-xs font-bold text-black">৳{item.price * item.quantity}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Size Guide Table */}
                    <div className="mt-12 pt-8 border-t border-black/5">
                      <div className="flex items-center space-x-2 mb-6 text-black">
                        <ShieldCheck size={16} />
                        <h3 className="text-xs tracking-[0.2em] font-serif uppercase">Size Guide</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[10px] text-black">
                          <thead>
                            <tr className="border-b border-black/5">
                              <th className="py-2 tracking-widest text-black/40 uppercase font-light">Size</th>
                              <th className="py-2 tracking-widest text-black/40 uppercase font-light">Chest</th>
                              <th className="py-2 tracking-widest text-black/40 uppercase font-light">Length</th>
                              <th className="py-2 tracking-widest text-black/40 uppercase font-light">Collar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/[0.02]">
                            {[
                              { s: 'S', c: '40"', l: '29"', col: '15"' },
                              { s: 'M', c: '42"', l: '30"', col: '15.5"' },
                              { s: 'L', c: '44"', l: '31"', col: '16"' },
                              { s: 'XL', c: '46"', l: '31"', col: '16.5"' },
                              { s: '2XL', c: '48"', l: '31.5"', col: '17"' },
                            ].map((row) => (
                              <tr key={row.s} className="hover:bg-black/[0.02] transition-colors">
                                <td className="py-3 font-bold pr-2">{row.s}</td>
                                <td className="py-3 text-black/60">{row.c}</td>
                                <td className="py-3 text-black/60">{row.l}</td>
                                <td className="py-3 text-black/60">{row.col}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="mt-4 text-[9px] text-black/30 italic tracking-tight">* All measurements are in inches.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer - Fixed Bottom */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-black/5 bg-white space-y-4 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] safe-bottom">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-black/40 tracking-widest uppercase">
                      <span>Subtotal</span>
                      <span>৳{total}</span>
                    </div>
                    <div className="flex justify-between text-lg font-serif border-t border-black/5 pt-2 text-black">
                      <span>ESTIMATED TOTAL</span>
                      <span className="font-bold">৳{total}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setIsCartOpen(false);
                      navigate('/cart');
                    }}
                    className="w-full bg-black text-white py-4 font-bold tracking-[0.2em] hover:bg-black/80 transition flex items-center justify-center space-x-2"
                  >
                    <span>CHECKOUT</span>
                    <ArrowRight size={18} />
                  </button>
                  
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="w-full text-[10px] tracking-widest text-black/40 uppercase hover:text-black transition py-2 font-bold"
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
