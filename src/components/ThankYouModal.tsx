import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderAmount: number;
  contentIds: string[];
}

const ThankYouModal: React.FC<ThankYouModalProps> = ({
  isOpen,
  onClose,
  orderAmount,
  contentIds
}) => {
  const navigate = useNavigate();
  const hasFired = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    if (hasFired.current) return;

    const firePurchase = () => {
      if (typeof window !== 'undefined' && (window as any).fbq) {
        try {
          const eventId = 'order_' + Date.now();

          (window as any).fbq(
            'track',
            'Purchase',
            {
              content_ids: contentIds || [],
              content_type: 'product',
              value: orderAmount || 1000,
              currency: 'BDT'
            },
            {
              eventID: eventId
            }
          );

          hasFired.current = true;
          console.log('✅ Purchase Event Fired:', eventId);
        } catch (error) {
          console.error('❌ Meta Pixel Error:', error);
        }
      } else {
        console.warn('⏳ Pixel not ready, retrying...');
        setTimeout(firePurchase, 500);
      }
    };

    firePurchase();
  }, [isOpen, orderAmount, contentIds]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 overflow-hidden">
          
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-black border border-yellow-500/30 p-8 md:p-12 max-w-lg w-full text-center"
          >
            
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-yellow-500"
            >
              <CheckCircle2 size={40} />
            </motion.div>

            {/* Title */}
            <h2 className="text-3xl mb-4 text-white font-semibold">
              THANK YOU
            </h2>

            {/* Message */}
            <p className="text-white/60 mb-10">
              Your order has been placed successfully.
            </p>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-4">
              
              <button
                onClick={() => {
                  onClose();
                  navigate('/dashboard');
                }}
                className="flex items-center justify-center gap-2 bg-white/10 text-white py-3 hover:bg-white/20 transition"
              >
                Track Order
                <ShoppingBag size={14} />
              </button>

              <button
                onClick={() => {
                  onClose();
                  navigate('/');
                }}
                className="flex items-center justify-center gap-2 bg-yellow-500 text-black py-3 font-semibold hover:brightness-110 transition"
              >
                Continue
                <ArrowRight size={14} />
              </button>

            </div>

            {/* Footer */}
            <p className="mt-8 text-xs text-white/30 uppercase tracking-widest">
              StyleCraft © {new Date().getFullYear()}
            </p>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ThankYouModal;
