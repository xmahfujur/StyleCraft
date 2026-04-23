/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './AuthContext';
import { CartProvider } from './CartContext';
import { WishlistProvider } from './WishlistContext';
import { ThemeProvider } from './ThemeContext';
import { AnimatePresence } from 'motion/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import PageTransition from './components/PageTransition';
import WhatsAppButton from './components/WhatsAppButton';
import SocialProof from './components/SocialProof';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Cart from './pages/Cart';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-luxury-black">
      <img 
        src="https://i.ibb.co.com/GQmPMMjR/image.png" 
        alt="StyleCraft Logo" 
        className="h-24 w-auto object-contain animate-pulse mb-4"
        referrerPolicy="no-referrer"
      />
      <div className="tracking-[0.5em] text-gold text-xs uppercase">STYLECRAFT</div>
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-luxury-black">
      <img 
        src="https://i.ibb.co.com/GQmPMMjR/image.png" 
        alt="StyleCraft Logo" 
        className="h-24 w-auto object-contain animate-pulse mb-4"
        referrerPolicy="no-referrer"
      />
      <div className="tracking-[0.5em] text-gold text-xs uppercase">STYLECRAFT</div>
    </div>
  );
  return user && isAdmin ? <>{children}</> : <Navigate to="/" />;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  React.useEffect(() => {
    // Track page view on location change if fbq is defined
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }
  }, [location]);

  return (
    <AnimatePresence mode="wait">
      <div key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/product/:id" element={<PageTransition><ProductDetail /></PageTransition>} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/cart" element={<PageTransition><Cart /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><PrivateRoute><Dashboard /></PrivateRoute></PageTransition>} />
          <Route path="/admin" element={<PageTransition><AdminRoute><AdminPanel /></AdminRoute></PageTransition>} />
        </Routes>
      </div>
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <Router>
            <ScrollToTop />
            <div className="min-h-screen selection:bg-gold selection:text-luxury-black">
              <Navbar />
              <AnimatedRoutes />
              <Footer />
              <WhatsAppButton />
              <SocialProof />
              <Toaster 
                position="top-right" 
                expand={false}
                richColors
                closeButton
                duration={1000}
                toastOptions={{
                  style: { 
                    background: '#0B0F1A', 
                    border: '1px solid rgba(212, 175, 55, 0.2)', 
                    color: '#fff',
                    pointerEvents: 'none'
                  },
                  className: 'my-toast-class',
                }} 
              />
            </div>
          </Router>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
