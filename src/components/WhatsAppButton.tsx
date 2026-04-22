import React from 'react';
import { motion } from 'motion/react';
import { MessageCircle } from 'lucide-react';

const WhatsAppButton = () => {
  const phoneNumber = '+8801410040330'; // Site phone number
  const message = 'Hello StyleCraft! I have a question about your collection.';
  const whatsappUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-8 left-8 z-[100] group"
      aria-label="Contact us on WhatsApp"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gold rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
        <div className="relative bg-luxury-black border border-gold/30 text-gold p-4 rounded-full flex items-center justify-center shadow-2xl hover:border-gold transition-colors">
          <MessageCircle size={24} strokeWidth={1.5} />
          <div className="absolute left-full ml-4 whitespace-nowrap bg-luxury-black border border-gold/20 px-3 py-1.5 rounded-sm opacity-0 -translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all">
            <span className="text-[10px] tracking-widest uppercase font-bold text-gold">Chat with us</span>
          </div>
        </div>
      </div>
    </motion.a>
  );
};

export default WhatsAppButton;
