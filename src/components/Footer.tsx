import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white/5 border-t border-gold/10 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div className="space-y-6">
          <Link to="/" className="flex items-center space-x-3">
            <img 
              src="https://i.ibb.co.com/N6PcCT18/671510935-948788494412125-811881166588617131-n.jpg" 
              alt="StyleCraft Logo" 
              className="h-10 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="text-xl font-serif tracking-widest text-gold">STYLECRAFT</span>
          </Link>
          <p className="text-white/40 text-sm font-light leading-relaxed">
            Elevating everyday essentials through premium craftsmanship and timeless design.
          </p>
          <div className="flex space-x-4">
            <Instagram size={18} className="text-white/40 hover:text-gold cursor-pointer transition" />
            <Facebook size={18} className="text-white/40 hover:text-gold cursor-pointer transition" />
            <Twitter size={18} className="text-white/40 hover:text-gold cursor-pointer transition" />
          </div>
        </div>

        <div>
          <h4 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-6">Collections</h4>
          <ul className="space-y-4 text-sm text-white/40 font-light">
            <li className="hover:text-gold transition cursor-pointer">New Arrivals</li>
            <li className="hover:text-gold transition cursor-pointer">Premium Shirts</li>
            <li className="hover:text-gold transition cursor-pointer">Luxury Pants</li>
            <li className="hover:text-gold transition cursor-pointer">Accessories</li>
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-6">Customer Care</h4>
          <ul className="space-y-4 text-sm text-white/40 font-light">
            <li className="hover:text-gold transition cursor-pointer">Shipping Policy</li>
            <li className="hover:text-gold transition cursor-pointer">Size Guide</li>
            <li className="hover:text-gold transition cursor-pointer">Contact Us</li>
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-6">Contact</h4>
          <ul className="space-y-4 text-sm text-white/40 font-light">
            <li className="flex items-center space-x-3">
              <MapPin size={14} className="text-gold" />
              <span>Mirpur 1, Dhaka</span>
            </li>
            <li className="flex items-center space-x-3">
              <Phone size={14} className="text-gold" />
              <span>+8801410040330</span>
            </li>
            <li className="flex items-center space-x-3">
              <Mail size={14} className="text-gold" />
              <span>mr074770@gmail.com</span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 pt-10 border-t border-white/5 flex flex-col md:row justify-between items-center gap-4">
        <p className="text-[10px] tracking-widest text-white/20 uppercase">
          © 2026 STYLECRAFT. ALL RIGHTS RESERVED.
        </p>
        <div className="flex space-x-8 text-[10px] tracking-widest text-white/20 uppercase">
          <span className="hover:text-white transition cursor-pointer">Privacy Policy</span>
          <span className="hover:text-white transition cursor-pointer">Terms of Service</span>
        </div>
      </div>
    </footer>
  );
}
