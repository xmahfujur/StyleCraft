import React, { createContext, useContext, useState, useEffect } from 'react';

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  toggleWishlist: (item: WishlistItem) => void;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (isOpen: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem('wishlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const addToWishlist = (item: WishlistItem) => {
    setWishlist(prev => {
      if (prev.find(i => i.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const removeFromWishlist = (id: string) => {
    setWishlist(prev => prev.filter(i => i.id !== id));
  };

  const isInWishlist = (id: string) => wishlist.some(i => i.id === id);

  const toggleWishlist = (item: WishlistItem) => {
    if (isInWishlist(item.id)) {
      removeFromWishlist(item.id);
    } else {
      addToWishlist(item);
    }
  };

  return (
    <WishlistContext.Provider value={{ 
      wishlist, 
      addToWishlist, 
      removeFromWishlist, 
      isInWishlist, 
      toggleWishlist, 
      isWishlistOpen, 
      setIsWishlistOpen,
      isSearchOpen,
      setIsSearchOpen
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
};
