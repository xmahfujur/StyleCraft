import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white/5 border-t border-gold/10 pt-20 pb-10">
      {/* Newsletter / Club Signup */}
      <div className="max-w-7xl mx-auto px-4 mb-20">
        <div className="bg-luxury-black border border-gold/20 p-8 md:p-12 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gold/5 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-1000 origin-left" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-serif tracking-[0.2em] mb-4 uppercase">Join the Insider Circle</h3>
            <p className="text-white/40 text-xs md:text-sm font-light tracking-widest mb-8 leading-relaxed">
              SUBSCRIBE TO RECEIVE EARLY ACCESS TO NEW DROPS, EXCLUSIVE EVENTS, AND CURATED STYLE DISPATCHES.
            </p>
            <form className="flex flex-col md:flex-row gap-4 max-w-lg mx-auto" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Enter your email address"
                className="flex-1 bg-white/5 border border-white/10 px-6 py-4 text-xs tracking-widest outline-none focus:border-gold transition rounded-sm no-scrollbar"
              />
              <button className="bg-gold text-luxury-black px-10 py-4 text-[10px] font-bold tracking-[0.3em] uppercase hover:brightness-110 active:scale-95 transition whitespace-nowrap">
                Join Now
              </button>
            </form>
          </div>
        </div>
      </div>

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
