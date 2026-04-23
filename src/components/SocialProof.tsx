import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag } from 'lucide-react';
import { collection, query, limit, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const SocialProof = () => {
  const [purchase, setPurchase] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  const locations = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Mirpur', 'Gulshan', 'Banani', 'Uttara'];
  const times = ['2 minutes ago', '5 minutes ago', '10 minutes ago', 'just now', 'recently'];

  const fetchRandomProduct = async () => {
    try {
      const q = query(collection(db, 'products'), limit(10));
      const snapshot = await getDocs(q);
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (products.length > 0) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const randomLocation = locations[Math.floor(Math.random() * locations.length)];
        const randomTime = times[Math.floor(Math.random() * times.length)];
        
        setPurchase({
          product: randomProduct,
          location: randomLocation,
          time: randomTime
        });
      }
    } catch (error) {
      console.error("Social proof fetch error:", error);
    }
  };

  useEffect(() => {
    let count = 0;
    let timeoutId: NodeJS.Timeout;

    const showNotification = async () => {
      if (count >= 2) return;

      await fetchRandomProduct();
      setIsVisible(true);
      count++;
      
      // Hide after 5 seconds
      setTimeout(() => {
        setIsVisible(false);
        // If we haven't reached 2 shows, schedule the second one
        if (count < 2) {
          timeoutId = setTimeout(showNotification, 45000);
        }
      }, 5000);
    };

    // Initial delay for the first notification
    const initialTimeout = setTimeout(showNotification, 10000);

    return () => {
      clearTimeout(initialTimeout);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && purchase && (
        <motion.div
          initial={{ opacity: 0, x: -50, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -50, scale: 0.8 }}
          className="fixed bottom-8 right-8 md:right-auto md:left-8 z-[90] pointer-events-none"
        >
          <div className="bg-luxury-black/90 backdrop-blur-md border border-gold/20 p-4 shadow-2xl flex items-center space-x-4 max-w-sm rounded-sm">
            <div className="w-12 h-16 bg-white/5 flex items-center justify-center overflow-hidden shrink-0 border border-white/5">
              <img 
                src={purchase.product.images?.[0] || purchase.product.image} 
                className="max-w-full max-h-full object-contain" 
                referrerPolicy="no-referrer"
                alt="Purchased item"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingBag size={10} className="text-gold" />
                <p className="text-[9px] tracking-widest text-gold font-bold uppercase">Recent Purchase</p>
              </div>
              <p className="text-[10px] text-white/80 leading-tight mb-1">
                Someone in <span className="text-white font-bold">{purchase.location}</span> just bought the <span className="italic">{purchase.product.name}</span>.
              </p>
              <p className="text-[8px] text-white/20 uppercase tracking-[0.2em]">{purchase.time}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SocialProof;
