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
    if (!isOpen) return;
    if (hasFired.current) return;

    if (typeof window !== 'undefined' && (window as any).fbq) {
      try {
        (window as any).fbq('track', 'Purchase', {
          content_ids: contentIds || [],
          content_type: 'product',
          value: orderAmount || 1000,
          currency: 'BDT'
        });

        hasFired.current = true;
        console.log('✅ Meta Purchase Event Fired');
      } catch (error) {
        console.error('❌ Meta Pixel Error:', error);
      }
    } else {
      console.warn('⚠️ Meta Pixel not found');
    }
  }, [isOpen, orderAmount]);

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
            className="relative bg-luxury-black border border-gold/30 p-8 md:p-12 max-w-lg w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-8 text-gold"
            >
              <CheckCircle2 size={40} />
            </motion.div>

            <h2 className="text-3xl mb-4 text-white">THANK YOU</h2>

            <p className="text-white/60 mb-10">
              Your order has been placed successfully.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  onClose();
                  navigate('/dashboard');
                }}
                className="bg-white/10 text-white py-3"
              >
                Track Order
              </button>

              <button
                onClick={() => {
                  onClose();
                  navigate('/');
                }}
                className="bg-gold text-black py-3"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ThankYouModal;
