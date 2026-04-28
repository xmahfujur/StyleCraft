import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, ShoppingBag, User, LogIn, Search } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { useWishlist } from '../WishlistContext';

export default function MobileBottomNav() {
  const { user } = useAuth();
  const { setIsCartOpen, cart } = useCart();
  const { wishlist, setIsWishlistOpen, setIsSearchOpen } = useWishlist();
  const location = useLocation();

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const wishlistCount = wishlist.length;

  const isActive = (path: string) => location.pathname === path;

  const closeModals = () => {
    setIsCartOpen(false);
    setIsWishlistOpen(false);
    setIsSearchOpen(false);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-black/5 px-6 py-2 safe-bottom shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
      <div className="flex justify-between items-center max-w-lg mx-auto h-14">
        <Link 
          to="/" 
          onClick={closeModals}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all w-12 ${isActive('/') ? 'text-black' : 'text-black/30'}`}
        >
          <Home size={20} strokeWidth={isActive('/') ? 3 : 2} />
          <span className="text-[8px] font-black tracking-widest uppercase">Home</span>
        </Link>

        <button 
          onClick={() => {
            setIsWishlistOpen(true);
            setIsCartOpen(false);
            setIsSearchOpen(false);
          }}
          className={`flex flex-col items-center justify-center gap-0.5 relative transition-all w-12 text-black/30 hover:text-black`}
        >
          <Heart size={20} className={wishlistCount > 0 ? 'text-red-500 fill-red-500' : ''} />
          {wishlistCount > 0 && (
            <span className="absolute top-0 right-1 bg-black text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
              {wishlistCount}
            </span>
          )}
          <span className="text-[8px] font-black tracking-widest uppercase">Wish</span>
        </button>

        <div className="relative -mt-10">
          <button 
            onClick={() => {
              setIsCartOpen(true);
              setIsWishlistOpen(false);
              setIsSearchOpen(false);
            }}
            className="w-16 h-16 bg-black rounded-full flex items-center justify-center shadow-2xl shadow-black/40 active:scale-90 transition-transform border-4 border-white"
          >
            <ShoppingBag size={24} className="text-white" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                {cartCount}
              </span>
            )}
          </button>
          <span className="text-[8px] font-black tracking-widest uppercase text-black block text-center mt-1">Cart</span>
        </div>

        <button 
          onClick={() => {
            setIsSearchOpen(true);
            setIsCartOpen(false);
            setIsWishlistOpen(false);
          }}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all w-12 ${location.pathname.includes('/category') ? 'text-black' : 'text-black/30'}`}
        >
          <Search size={20} strokeWidth={location.pathname.includes('/category') ? 3 : 2} />
          <span className="text-[8px] font-black tracking-widest uppercase">Shop</span>
        </button>

        <Link 
          to={user && !user.isAnonymous ? "/dashboard" : "/login"} 
          onClick={closeModals}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all w-12 ${location.pathname === '/dashboard' || location.pathname === '/login' ? 'text-black' : 'text-black/30'}`}
        >
          {user && !user.isAnonymous ? (
            <User size={20} strokeWidth={isActive('/dashboard') ? 3 : 2} />
          ) : (
            <LogIn size={20} strokeWidth={isActive('/login') ? 3 : 2} />
          )}
          <span className="text-[8px] font-black tracking-widest uppercase">
            {user && !user.isAnonymous ? 'User' : 'Login'}
          </span>
        </Link>
      </div>
    </div>
  );
}
