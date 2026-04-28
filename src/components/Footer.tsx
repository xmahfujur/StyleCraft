import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-neutral-50 border-t border-black/5 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div className="space-y-6">
          <Link to="/" className="flex items-center space-x-3">
            <img 
              src="https://i.ibb.co.com/C32Kc2j0/Chat-GPT-Image-Apr-27-2026-06-53-56-PM.png" 
              alt="StyleCraft Logo" 
              className="h-10 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="text-xl font-serif tracking-widest text-black">STYLECRAFT</span>
          </Link>
          <p className="text-black/60 text-sm font-medium leading-relaxed">
            Elevating everyday essentials through premium craftsmanship and timeless design.
          </p>
          <div className="flex space-x-4">
            <Instagram size={18} className="text-black/40 hover:text-black cursor-pointer transition" />
            <Facebook size={18} className="text-black/40 hover:text-black cursor-pointer transition" />
            <Twitter size={18} className="text-black/40 hover:text-black cursor-pointer transition" />
          </div>
        </div>

        <div>
          <h4 className="text-xs tracking-[0.3em] uppercase text-black font-bold mb-6">Collections</h4>
          <ul className="space-y-4 text-sm text-black/40 font-bold">
            <li className="hover:text-black transition cursor-pointer">New Arrivals</li>
            <li className="hover:text-black transition cursor-pointer">Premium Shirts</li>
            <li className="hover:text-black transition cursor-pointer">Luxury Pants</li>
            <li className="hover:text-black transition cursor-pointer">Accessories</li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs tracking-[0.3em] uppercase text-black font-bold mb-6">Customer Care</h4>
          <ul className="space-y-4 text-sm text-black/40 font-bold">
            <li className="hover:text-black transition cursor-pointer">Shipping Policy</li>
            <li className="hover:text-black transition cursor-pointer">Size Guide</li>
            <li className="hover:text-black transition cursor-pointer">Contact Us</li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs tracking-[0.3em] uppercase text-black font-bold mb-6">Contact</h4>
          <ul className="space-y-4 text-sm text-black/40 font-bold">
            <li className="flex items-center space-x-3">
              <MapPin size={14} className="text-black" />
              <span className="text-black">Mirpur 1, Dhaka</span>
            </li>
            <li className="flex items-center space-x-3">
              <Phone size={14} className="text-black" />
              <span className="text-black">+8801410040330</span>
            </li>
            <li className="flex items-center space-x-3">
              <Mail size={14} className="text-gold font-bold" />
              <span className="text-black">mr074770@gmail.com</span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 pt-10 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs tracking-widest text-black/20 uppercase font-bold">
          © 2026 STYLECRAFT. ALL RIGHTS RESERVED.
        </p>
        <div className="flex space-x-8 text-xs tracking-widest text-black/20 uppercase font-bold">
          <span className="hover:text-black transition cursor-pointer">Privacy Policy</span>
          <span className="hover:text-black transition cursor-pointer">Terms of Service</span>
        </div>
      </div>
    </footer>
  );
}
