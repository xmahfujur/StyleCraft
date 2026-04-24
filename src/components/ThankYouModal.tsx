import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderAmount: number;
  contentIds: string[];
}

const ThankYouModal: React.FC<ThankYouModalProps> = ({ isOpen, onClose, orderAmount, contentIds }) => {
  const navigate = useNavigate();
  const hasFired = useRef(false);

  useEffect(() => {
    if (isOpen && orderAmount > 0 && !hasFired.current) {
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Purchase', {
          content_ids: contentIds,
          content_type: 'product',
          value: orderAmount,
          currency: 'BDT'
        });
        hasFired.current = true;
      }
    }
  }, [isOpen, orderAmount, contentIds]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-luxury-black/90 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-luxury-black border border-gold/30 p-8 md:p-12 max-w-lg w-full shadow-[0_0_50px_rgba(212,175,55,0.1)] text-center overflow-hidden"
          >
            {/* Background Decorative Elements */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold/5 blur-3xl rounded-full" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gold/5 blur-3xl rounded-full" />
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-8 text-gold border border-gold/20"
            >
              <CheckCircle2 size={40} strokeWidth={1} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-3xl font-serif mb-4 tracking-[0.2em] text-white">THANK YOU</h2>
              <div className="flex items-center justify-center gap-2 mb-6 text-gold/60">
                <Heart size={14} fill="currentColor" />
                <span className="text-[10px] tracking-[0.4em] uppercase font-bold">A Choice of Excellence</span>
                <Heart size={14} fill="currentColor" />
              </div>
              
              <p className="text-white/60 text-sm leading-relaxed mb-10 font-light tracking-wide italic">
                "Fashion is an extension of who you are. Thank you for making StyleCraft a part of your journey. Your order is being handled with the utmost care, just as you deserve."
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                onClick={() => {
                  onClose();
                  navigate('/dashboard');
                }}
                className="group flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white/80 py-4 px-6 text-[10px] tracking-[0.3em] uppercase hover:bg-white/10 transition-all duration-300"
              >
                Track Order
                <ShoppingBag size={14} className="group-hover:translate-y-[-2px] transition-transform" />
              </motion.button>
              
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                onClick={() => {
                  onClose();
                  navigate('/');
                }}
                className="group flex items-center justify-center gap-3 bg-gold text-luxury-black py-4 px-6 text-[10px] tracking-[0.3em] uppercase font-bold hover:brightness-110 transition-all duration-300"
              >
                Continue Shopping
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 text-[9px] text-white/20 uppercase tracking-[0.5em]"
            >
              StyleCraft &copy; {new Date().getFullYear()}
            </motion.p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ThankYouModal;
