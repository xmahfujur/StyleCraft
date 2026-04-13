/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './AuthContext';
import { CartProvider } from './CartContext';
import { ThemeProvider } from './ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
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
        src="https://i.ibb.co.com/N6PcCT18/671510935-948788494412125-811881166588617131-n.jpg" 
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
        src="https://i.ibb.co.com/N6PcCT18/671510935-948788494412125-811881166588617131-n.jpg" 
        alt="StyleCraft Logo" 
        className="h-24 w-auto object-contain animate-pulse mb-4"
        referrerPolicy="no-referrer"
      />
      <div className="tracking-[0.5em] text-gold text-xs uppercase">STYLECRAFT</div>
    </div>
  );
  return user && isAdmin ? <>{children}</> : <Navigate to="/" />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <Router>
            <div className="min-h-screen selection:bg-gold selection:text-luxury-black">
              <Navbar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
              </Routes>
              <Footer />
              <Toaster position="bottom-right" toastOptions={{
                style: { background: '#0B0F1A', border: '1px solid rgba(212, 175, 55, 0.2)', color: '#fff' }
              }} />
            </div>
          </Router>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
