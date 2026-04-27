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
      case 'Placed': return <Clock size={16} className="text-blue-500" />;
      case 'Packing': return <Package size={16} className="text-orange-500" />;
      case 'Out for Delivery': return <Truck size={16} className="text-purple-500" />;
      case 'Delivered': return <CheckCircle size={16} className="text-green-600" />;
      case 'Failed': return <XCircle size={16} className="text-red-600" />;
      default: return <Clock size={16} />;
    }
  };

  const statusSteps = ['Placed', 'Packing', 'Out for Delivery', 'Delivered'];
  const getStatusIndex = (status: string) => statusSteps.indexOf(status);

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 bg-white min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-black/5 border border-black/5 p-8 text-center rounded-sm">
            <div className="w-20 h-20 bg-black/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-black/5">
              <span className="text-2xl font-serif text-black">{profile?.name?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            <h2 className="text-xl font-serif mb-1 text-black">{profile?.name || 'User'}</h2>
            <p className="text-xs text-black/40 tracking-widest mb-6 font-bold">{profile?.email}</p>
            <div className="h-px bg-black/10 w-full mb-6" />
            <div className="text-left space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] tracking-widest text-black/30 uppercase font-bold text-[8px]">Total Orders</span>
                <span className="text-black font-bold">{orders.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] tracking-widest text-black/30 uppercase font-bold text-[8px]">Member Since</span>
                <span className="text-black/60 text-xs font-bold">2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <div className="flex space-x-8 mb-12 border-b border-black/5">
            <button 
              onClick={() => setActiveTab('orders')}
              className={`pb-4 text-xs tracking-[0.3em] uppercase transition relative font-bold ${activeTab === 'orders' ? 'text-black' : 'text-black/20 hover:text-black'}`}
            >
              Order History
              {activeTab === 'orders' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
            </button>
            <button 
              onClick={() => setActiveTab('address')}
              className={`pb-4 text-xs tracking-[0.3em] uppercase transition relative font-bold ${activeTab === 'address' ? 'text-black' : 'text-black/20 hover:text-black'}`}
            >
              Saved Address
              {activeTab === 'address' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
            </button>
          </div>
          
          {activeTab === 'orders' ? (
            <>
              <h1 className="text-3xl font-serif mb-8 tracking-widest uppercase text-black">Your Orders</h1>
              
              {loading ? (
                <div className="space-y-6">
                  {[1, 2].map(i => <div key={i} className="h-32 bg-black/5 animate-pulse rounded-sm" />)}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-20 border border-black/5 bg-black/5 rounded-sm">
                  <p className="text-black/40 tracking-widest font-bold">NO ORDERS PLACED YET</p>
                </div>
              ) : (
                <div className="space-y-8 text-black">
                  {orders.map((order) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={order.id}
                      className="bg-white border border-black/10 overflow-hidden rounded-sm shadow-sm"
                    >
                      <div className="p-6 border-b border-black/5 flex flex-wrap justify-between items-center gap-4 bg-black/5">
                        <div>
                          <p className="text-[10px] tracking-widest text-black/40 uppercase mb-1 font-bold">Order ID</p>
                          <p className="text-[10px] font-mono text-black font-bold uppercase">{order.id}</p>
                        </div>
                        <div className="flex items-center space-x-2 bg-white px-4 py-2 border border-black/10 rounded-sm">
                          {getStatusIcon(order.status)}
                          <span className="text-[10px] tracking-widest uppercase font-bold text-black">{order.status}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] tracking-widest text-black/40 uppercase mb-1 font-bold">Total Amount</p>
                          <p className="text-lg font-bold text-red-600">৳{order.total}</p>
                        </div>
                      </div>
                      
                      {/* Refined Status Timeline */}
                      {order.status !== 'Failed' && (
                        <div className="px-6 py-12 border-b border-black/5 bg-white">
                          <div className="relative flex justify-between max-w-2xl mx-auto">
                            {/* Base Progress Track */}
                            <div className="absolute top-4 left-0 w-full h-[1px] bg-black/5 z-0" />
                            
                            {/* Active Progress Fill */}
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(getStatusIndex(order.status) / (statusSteps.length - 1)) * 100}%` }}
                              className="absolute top-4 left-0 h-[1px] bg-black z-0 shadow-sm"
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
                                      ? 'bg-white border-black text-black shadow-sm' 
                                      : 'bg-white border-black/10 text-black/10'
                                  } ${isCurrent ? 'scale-110 border-black ring-4 ring-black/5' : ''}`}>
                                    {getStepIcon(step)}
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <p className={`text-[8px] tracking-[0.2em] uppercase whitespace-nowrap transition-colors duration-500 ${
                                      isCompleted ? 'text-black font-bold' : 'text-black/20'
                                    }`}>
                                      {step}
                                    </p>
                                    {isCurrent && (
                                      <motion.span 
                                        layoutId="currentStatus"
                                        className="text-[7px] text-black font-bold tracking-widest mt-1 animate-pulse"
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
    
                      <div className="p-6 bg-white">
                        <div className="flex overflow-x-auto space-x-4 pb-2 scrollbar-none">
                          {order.products.map((p: any, idx: number) => (
                            <div key={idx} className="flex-shrink-0 flex items-center space-x-4 bg-black/[0.02] p-3 border border-black/5 rounded-sm">
                              <div className="w-12 h-16 bg-white flex items-center justify-center overflow-hidden border border-black/5">
                                <img src={p.image || null} alt={p.name} className="max-w-full max-h-full object-contain block" referrerPolicy="no-referrer" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-black">{p.name}</p>
                                <p className="text-[10px] text-black/40 uppercase font-bold">Size: {p.size} | Qty: {p.quantity}</p>
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
              className="max-w-2xl bg-white"
            >
              <h1 className="text-3xl font-serif mb-8 tracking-widest uppercase text-black">Saved Address</h1>
              {profile?.address ? (
                <div className="bg-black/[0.02] border border-black/10 p-8 space-y-6 rounded-sm">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-[10px] tracking-widest text-black/40 uppercase mb-2 font-bold">Recipient Name</p>
                      <p className="text-black font-bold">{profile.address.fullName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-widest text-black/40 uppercase mb-2 font-bold">Phone Number</p>
                      <p className="text-black font-bold">{profile.address.phone}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-widest text-black/40 uppercase mb-2 font-bold">Shipping Address</p>
                    <p className="text-black leading-relaxed font-medium">
                      {profile.address.addressLine}<br />
                      {profile.address.country}
                    </p>
                  </div>
                  <div className="pt-6 border-t border-black/10">
                    <p className="text-[10px] text-black/30 tracking-widest italic font-bold">
                      * Your address is automatically updated when you place a new order.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 border border-black/5 bg-black/5 rounded-sm">
                  <p className="text-black/40 tracking-widest mb-4 font-bold uppercase">No address saved yet</p>
                  <p className="text-[10px] tracking-widest opacity-30 font-bold uppercase">Enjoy shopping and your details will be saved automatically</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
