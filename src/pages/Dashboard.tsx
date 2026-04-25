import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'address'>('orders');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      const errInfo = {
        error: error.message,
        operationType: 'list',
        path: 'orders',
        authInfo: {
          userId: user.uid,
          isAnonymous: user.isAnonymous
        }
      };
      console.error("Dashboard orders listener error:", JSON.stringify(errInfo));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Placed': return <Clock size={16} className="text-blue-400" />;
      case 'Packing': return <Package size={16} className="text-yellow-400" />;
      case 'Out for Delivery': return <Truck size={16} className="text-orange-400" />;
      case 'Delivered': return <CheckCircle size={16} className="text-green-400" />;
      case 'Failed': return <XCircle size={16} className="text-red-400" />;
      default: return <Clock size={16} />;
    }
  };

  const statusSteps = ['Placed', 'Packing', 'Out for Delivery', 'Delivered'];
  const getStatusIndex = (status: string) => statusSteps.indexOf(status);

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white/5 border border-gold/10 p-8 text-center">
            <div className="w-20 h-20 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-gold/30">
              <span className="text-2xl font-serif text-gold">{profile?.name?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            <h2 className="text-xl font-serif mb-1">{profile?.name || 'User'}</h2>
            <p className="text-xs text-white/40 tracking-widest mb-6">{profile?.email}</p>
            <div className="h-px bg-gold/10 w-full mb-6" />
            <div className="text-left space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] tracking-widest text-white/30 uppercase">Total Orders</span>
                <span className="text-gold font-bold">{orders.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] tracking-widest text-white/30 uppercase">Member Since</span>
                <span className="text-white/60 text-xs">2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <div className="flex space-x-8 mb-12 border-b border-gold/10">
            <button 
              onClick={() => setActiveTab('orders')}
              className={`pb-4 text-xs tracking-[0.3em] uppercase transition relative ${activeTab === 'orders' ? 'text-gold' : 'text-white/40 hover:text-white'}`}
            >
              Order History
              {activeTab === 'orders' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-px bg-gold" />}
            </button>
            <button 
              onClick={() => setActiveTab('address')}
              className={`pb-4 text-xs tracking-[0.3em] uppercase transition relative ${activeTab === 'address' ? 'text-gold' : 'text-white/40 hover:text-white'}`}
            >
              Saved Address
              {activeTab === 'address' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-px bg-gold" />}
            </button>
          </div>
          
          {activeTab === 'orders' ? (
            <>
              <h1 className="text-3xl font-serif mb-8 tracking-widest uppercase">Your Orders</h1>
              
              {loading ? (
                <div className="space-y-6">
                  {[1, 2].map(i => <div key={i} className="h-32 bg-white/5 animate-pulse" />)}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-20 border border-gold/10 bg-white/5">
                  <p className="text-white/40 tracking-widest">NO ORDERS PLACED YET</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {orders.map((order) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={order.id}
                      className="bg-white/5 border border-gold/5 overflow-hidden"
                    >
                      <div className="p-6 border-b border-gold/5 flex flex-wrap justify-between items-center gap-4">
                        <div>
                          <p className="text-[10px] tracking-widest text-white/30 uppercase mb-1">Order ID</p>
                          <p className="text-xs font-mono text-white/60">{order.id}</p>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/5 px-4 py-2 border border-gold/10">
                          {getStatusIcon(order.status)}
                          <span className="text-[10px] tracking-widest uppercase font-bold text-gold">{order.status}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] tracking-widest text-white/30 uppercase mb-1">Total Amount</p>
                          <p className="text-lg font-bold text-gold">৳{order.total}</p>
                        </div>
                      </div>
                      
                      {/* Refined Status Timeline */}
                      {order.status !== 'Failed' && (
                        <div className="px-6 py-12 border-b border-gold/5 bg-white/[0.01]">
                          <div className="relative flex justify-between max-w-2xl mx-auto">
                            {/* Base Progress Track */}
                            <div className="absolute top-4 left-0 w-full h-[1px] bg-white/5 z-0" />
                            
                            {/* Active Progress Fill */}
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(getStatusIndex(order.status) / (statusSteps.length - 1)) * 100}%` }}
                              className="absolute top-4 left-0 h-[1px] bg-gold z-0 shadow-[0_0_10px_#D4AF37]"
                              transition={{ duration: 1.5, ease: "easeInOut" }}
                            />
    
                            {statusSteps.map((step, idx) => {
                              const isCompleted = getStatusIndex(order.status) >= idx;
                              const isCurrent = order.status === step;
                              
                              const getStepIcon = (s: string) => {
                                switch(s) {
                                  case 'Placed': return <CheckCircle size={12} />;
                                  case 'Packing': return <Package size={12} />;
                                  case 'Out for Delivery': return <Truck size={12} />;
                                  case 'Delivered': return <motion.div animate={isCompleted ? { scale: [1, 1.2, 1] } : {}} transition={{ repeat: Infinity, duration: 2 }}><CheckCircle size={12} /></motion.div>;
                                  default: return null;
                                }
                              };

                              return (
                                <div key={step} className="relative z-10 flex flex-col items-center">
                                  <div className={`w-8 h-8 rounded-full border mb-3 flex items-center justify-center transition-all duration-700 ${
                                    isCompleted 
                                      ? 'bg-luxury-black border-gold text-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                                      : 'bg-luxury-black border-white/10 text-white/10'
                                  } ${isCurrent ? 'scale-110 border-gold ring-4 ring-gold/10' : ''}`}>
                                    {getStepIcon(step)}
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <p className={`text-[8px] tracking-[0.2em] uppercase whitespace-nowrap transition-colors duration-500 ${
                                      isCompleted ? 'text-white font-bold' : 'text-white/20'
                                    }`}>
                                      {step}
                                    </p>
                                    {isCurrent && (
                                      <motion.span 
                                        layoutId="currentStatus"
                                        className="text-[7px] text-gold font-light tracking-widest mt-1 animate-pulse"
                                      >
                                        IN PROGRESS
                                      </motion.span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
    
                      <div className="p-6">
                        <div className="flex overflow-x-auto space-x-4 pb-2 scrollbar-none">
                          {order.products.map((p: any, idx: number) => (
                            <div key={idx} className="flex-shrink-0 flex items-center space-x-4 bg-luxury-black/40 p-3 border border-white/5">
                              <div className="w-12 h-16 bg-white/5 flex items-center justify-center overflow-hidden">
                                <img src={p.image || null} alt={p.name} className="max-w-full max-h-full object-contain block" referrerPolicy="no-referrer" />
                              </div>
                              <div>
                                <p className="text-xs font-medium">{p.name}</p>
                                <p className="text-[10px] text-white/40 uppercase">Size: {p.size} | Qty: {p.quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-2xl"
            >
              <h1 className="text-3xl font-serif mb-8 tracking-widest uppercase">Saved Address</h1>
              {profile?.address ? (
                <div className="bg-white/5 border border-gold/10 p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-[10px] tracking-widest text-white/30 uppercase mb-2">Recipient Name</p>
                      <p className="text-white/80">{profile.address.fullName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-widest text-white/30 uppercase mb-2">Phone Number</p>
                      <p className="text-white/80">{profile.address.phone}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-widest text-white/30 uppercase mb-2">Shipping Address</p>
                    <p className="text-white/80 leading-relaxed">
                      {profile.address.addressLine}<br />
                      {profile.address.country}
                    </p>
                  </div>
                  <div className="pt-6 border-t border-gold/10">
                    <p className="text-[10px] text-white/30 tracking-widest italic">
                      * Your address is automatically updated when you place a new order.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 border border-gold/10 bg-white/5">
                  <p className="text-white/40 tracking-widest mb-4">NO ADDRESS SAVED YET</p>
                  <p className="text-[10px] tracking-widest opacity-30">ENJOY SHOPPING AND YOUR DETAILS WILL BE SAVED AUTOMATICALLY</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
