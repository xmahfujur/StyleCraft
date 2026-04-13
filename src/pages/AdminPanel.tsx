import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db, storage, auth } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { motion } from 'motion/react';
import { LayoutDashboard, ShoppingCart, PlusCircle, Package, CheckCircle, XCircle, Truck, Clock, Upload, X, Image as ImageIcon, Trash2, Printer } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPanel() {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, placed, packing, delivery, delivered, failed, products, categories
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, type: 'product' | 'category' | 'order'} | null>(null);
  const [printingOrder, setPrintingOrder] = useState<any | null>(null);

  // Product Form State
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    price: '', 
    discountedPrice: '',
    images: [] as string[], 
    category: 'Shirts', 
    description: '',
    deliveryType: 'Free', // Free, Paid
    insideDhaka: '0',
    outsideDhaka: '0'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!isAdmin || !auth.currentUser) {
      setLoading(false);
      return;
    }

    const currentUser = auth.currentUser;
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      // Only log if we still have a user, otherwise it's likely a logout-related rejection
      if (auth.currentUser) {
        const errInfo = {
          error: error.message,
          operationType: 'list',
          path: 'orders',
          authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            isAnonymous: auth.currentUser?.isAnonymous
          }
        };
        console.error("Orders listener error:", JSON.stringify(errInfo));
      }
    });

    const qProducts = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      if (auth.currentUser) {
        const errInfo = {
          error: error.message,
          operationType: 'list',
          path: 'products',
          authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            isAnonymous: auth.currentUser?.isAnonymous
          }
        };
        console.error("Products listener error:", JSON.stringify(errInfo));
      }
      setLoading(false);
    });

    const qCategories = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const unsubCategories = onSnapshot(qCategories, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      if (auth.currentUser) {
        const errInfo = {
          error: error.message,
          operationType: 'list',
          path: 'categories',
          authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            isAnonymous: auth.currentUser?.isAnonymous
          }
        };
        console.error("Categories listener error:", JSON.stringify(errInfo));
      }
    });

    return () => {
      unsubOrders();
      unsubProducts();
      unsubCategories();
    };
  }, [isAdmin]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      toast.success('Status updated');
    } catch (error: any) {
      const errInfo = {
        error: error.message,
        operationType: 'update',
        path: `orders/${orderId}`,
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email
        }
      };
      console.error("Update status error:", JSON.stringify(errInfo));
      toast.error(error.message);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProduct.images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }
    try {
      const priceValue = Number(newProduct.price);
      const discountedPriceValue = newProduct.discountedPrice ? Number(newProduct.discountedPrice) : null;
      console.log("Saved price:", priceValue, "Discounted:", discountedPriceValue);
      
      const productData = {
        ...newProduct,
        price: priceValue,
        discountedPrice: discountedPriceValue,
        insideDhaka: Number(newProduct.insideDhaka),
        outsideDhaka: Number(newProduct.outsideDhaka)
      };

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), productData);
        toast.success('Product updated');
      } else {
        await addDoc(collection(db, 'products'), productData);
        toast.success('Product added');
      }
      setNewProduct({ 
        name: '', 
        price: '', 
        discountedPrice: '',
        images: [], 
        category: 'Shirts', 
        description: '',
        deliveryType: 'Free',
        insideDhaka: '0',
        outsideDhaka: '0'
      });
      setEditingId(null);
      setTempImageUrl('');
    } catch (error: any) {
      const errInfo = {
        error: error.message,
        operationType: editingId ? 'update' : 'create',
        path: editingId ? `products/${editingId}` : 'products',
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email
        }
      };
      console.error("Add/Update product error:", JSON.stringify(errInfo));
      toast.error(error.message);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
      toast.success('Product deleted');
      setDeleteConfirm(null);
    } catch (error: any) {
      const errInfo = {
        error: error.message,
        operationType: 'delete',
        path: `products/${productId}`,
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email
        }
      };
      console.error("Delete product error:", JSON.stringify(errInfo));
      toast.error(error.message);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    const toastId = toast.loading('Uploading images...');

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `products/${Date.now()}-${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                newUrls.push(downloadURL);
                resolve(true);
              } catch (err) {
                reject(err);
              }
            }
          );
        });
      }

      setNewProduct(prev => ({
        ...prev,
        images: [...prev.images, ...newUrls]
      }));
      toast.success('Images uploaded successfully', { id: toastId });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`, { id: toastId });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Clear input value so the same file can be selected again
      if (e.target) e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setNewProduct(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleEditProduct = (product: any) => {
    setNewProduct({
      name: product.name,
      price: product.price.toString(),
      discountedPrice: product.discountedPrice ? product.discountedPrice.toString() : '',
      images: product.images || [product.image], // Fallback for old products
      category: product.category,
      description: product.description || '',
      deliveryType: product.deliveryType || 'Free',
      insideDhaka: (product.insideDhaka || 0).toString(),
      outsideDhaka: (product.outsideDhaka || 0).toString()
    });
    setEditingId(product.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setNewProduct({ 
      name: '', 
      price: '', 
      discountedPrice: '',
      images: [], 
      category: 'Shirts', 
      description: '',
      deliveryType: 'Free',
      insideDhaka: '0',
      outsideDhaka: '0'
    });
    setEditingId(null);
    setTempImageUrl('');
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await addDoc(collection(db, 'categories'), { name: newCategoryName.trim() });
      setNewCategoryName('');
      toast.success('Category added');
    } catch (error: any) {
      const errInfo = {
        error: error.message,
        operationType: 'create',
        path: 'categories',
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email
        }
      };
      console.error("Add category error:", JSON.stringify(errInfo));
      toast.error(error.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      toast.success('Category deleted');
      setDeleteConfirm(null);
    } catch (error: any) {
      const errInfo = {
        error: error.message,
        operationType: 'delete',
        path: `categories/${id}`,
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email
        }
      };
      console.error("Delete category error:", JSON.stringify(errInfo));
      toast.error(error.message);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      toast.success('Order deleted successfully');
      setDeleteConfirm(null);
    } catch (error: any) {
      const errInfo = {
        error: error.message,
        operationType: 'delete',
        path: `orders/${orderId}`,
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email
        }
      };
      console.error("Delete order error:", JSON.stringify(errInfo));
      toast.error('Error deleting order: ' + error.message);
    }
  };

  const handlePrintInvoice = async (order: any) => {
    setPrintingOrder(order);
    
    // Wait for state to update and DOM to render the invoice
    setTimeout(async () => {
      window.print();
      
      // Update print status in Firebase
      try {
        await updateDoc(doc(db, 'orders', order.id), {
          invoicePrinted: true,
          invoicePrintedAt: new Date().toISOString()
        });
      } catch (error: any) {
        console.error("Error updating print status:", error);
      }
      
      setPrintingOrder(null);
    }, 500);
  };

  if (!isAdmin) return <div className="pt-40 text-center tracking-widest text-red-400">ACCESS DENIED</div>;

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'placed') return o.status === 'Placed';
    if (activeTab === 'packing') return o.status === 'Packing';
    if (activeTab === 'delivery') return o.status === 'Out for Delivery';
    if (activeTab === 'delivered') return o.status === 'Delivered';
    if (activeTab === 'failed') return o.status === 'Failed';
    return true;
  });

  const stats = {
    total: orders.length,
    delivered: orders.filter(o => o.status === 'Delivered').length,
    failed: orders.filter(o => o.status === 'Failed').length,
    revenue: orders.filter(o => o.status === 'Delivered').reduce((acc, o) => acc + o.total, 0),
    today: orders.filter(o => {
      const date = o.createdAtISO ? new Date(o.createdAtISO) : (o.createdAt?.toDate ? o.createdAt.toDate() : new Date());
      const today = new Date();
      return date.toDateString() === today.toDateString();
    }).length,
    todayDelivered: orders.filter(o => {
      const date = o.createdAtISO ? new Date(o.createdAtISO) : (o.createdAt?.toDate ? o.createdAt.toDate() : new Date());
      const today = new Date();
      return date.toDateString() === today.toDateString() && o.status === 'Delivered';
    }).length,
    todayPlaced: orders.filter(o => {
      const date = o.createdAtISO ? new Date(o.createdAtISO) : (o.createdAt?.toDate ? o.createdAt.toDate() : new Date());
      const today = new Date();
      return date.toDateString() === today.toDateString() && o.status === 'Placed';
    }).length
  };

  const getStatusCount = (status: string) => {
    if (status === 'all') return orders.length;
    const mapping: {[key: string]: string} = {
      'placed': 'Placed',
      'packing': 'Packing',
      'delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'failed': 'Failed'
    };
    const dbStatus = mapping[status] || status;
    return orders.filter(o => o.status === dbStatus).length;
  };

  const groupOrdersByDate = (ordersList: any[]) => {
    const groups: { [key: string]: any[] } = {};
    ordersList.forEach(order => {
      const date = order.createdAtISO 
        ? new Date(order.createdAtISO).toLocaleDateString() 
        : (order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'Unknown Date');
      if (!groups[date]) groups[date] = [];
      groups[date].push(order);
    });
    return groups;
  };

  const groupedOrders = groupOrdersByDate(filteredOrders);

  const StatusButton = ({ tab, label, color = 'gold' }: { tab: string, label: string, color?: string }) => {
    const count = getStatusCount(tab);
    const isActive = activeTab === tab;
    
    let activeClass = '';
    let hoverClass = '';
    
    switch(color) {
      case 'blue': 
        activeClass = 'bg-blue-500 text-white border-blue-500'; 
        hoverClass = 'hover:border-blue-500/50';
        break;
      case 'yellow': 
        activeClass = 'bg-yellow-500 text-white border-yellow-500'; 
        hoverClass = 'hover:border-yellow-500/50';
        break;
      case 'orange': 
        activeClass = 'bg-orange-500 text-white border-orange-500'; 
        hoverClass = 'hover:border-orange-500/50';
        break;
      case 'green': 
        activeClass = 'bg-green-500 text-white border-green-500'; 
        hoverClass = 'hover:border-green-500/50';
        break;
      case 'red': 
        activeClass = 'bg-red-500 text-white border-red-500'; 
        hoverClass = 'hover:border-red-500/50';
        break;
      case 'white':
        activeClass = 'bg-white text-luxury-black border-white';
        hoverClass = 'hover:border-white/50';
        break;
      default: 
        activeClass = 'bg-gold text-luxury-black border-gold'; 
        hoverClass = 'hover:border-gold/50';
    }

    return (
      <button 
        onClick={() => setActiveTab(tab)} 
        className={`relative px-6 py-2 text-[10px] tracking-widest uppercase border transition ${isActive ? activeClass : `border-white/10 text-white/40 ${hoverClass}`}`}
      >
        {label}
        {count > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white text-[8px] flex items-center justify-center rounded-full border border-luxury-black font-bold animate-in zoom-in duration-300">
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-serif tracking-widest mb-2">ADMIN PANEL</h1>
          <p className="text-gold text-xs tracking-[0.3em] uppercase">StyleCraft Management</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <StatusButton tab="all" label="All Orders" />
          <StatusButton tab="placed" label="Placed" color="blue" />
          <StatusButton tab="packing" label="Packing" color="yellow" />
          <StatusButton tab="delivery" label="Delivery" color="orange" />
          <StatusButton tab="delivered" label="Delivered" color="green" />
          <StatusButton tab="failed" label="Failed" color="red" />
          <button onClick={() => setActiveTab('products')} className={`px-6 py-2 text-[10px] tracking-widest uppercase border transition ${activeTab === 'products' ? 'bg-white text-luxury-black border-white' : 'border-white/10 text-white/40 hover:border-white/50'}`}>Catalog</button>
          <button onClick={() => setActiveTab('categories')} className={`px-6 py-2 text-[10px] tracking-widest uppercase border transition ${activeTab === 'categories' ? 'bg-gold text-luxury-black border-gold' : 'border-white/10 text-white/40 hover:border-gold/50'}`}>Categories</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-12">
        <div className="bg-white/5 border border-gold/10 p-6">
          <p className="text-[10px] tracking-widest text-white/30 uppercase mb-2">Total Orders</p>
          <p className="text-2xl font-serif text-white">{stats.total}</p>
        </div>
        <div className="bg-white/5 border border-gold/10 p-6">
          <p className="text-[10px] tracking-widest text-white/30 uppercase mb-2">Today's Orders</p>
          <p className="text-2xl font-serif text-gold">{stats.today}</p>
        </div>
        <div className="bg-white/5 border border-blue-500/10 p-6">
          <p className="text-[10px] tracking-widest text-white/30 uppercase mb-2">Today Placed</p>
          <p className="text-2xl font-serif text-blue-400">{stats.todayPlaced}</p>
        </div>
        <div className="bg-white/5 border border-green-500/10 p-6">
          <p className="text-[10px] tracking-widest text-white/30 uppercase mb-2">Today Delivered</p>
          <p className="text-2xl font-serif text-green-400">{stats.todayDelivered}</p>
        </div>
        <div className="bg-white/5 border border-red-500/10 p-6">
          <p className="text-[10px] tracking-widest text-white/30 uppercase mb-2">Total Failed</p>
          <p className="text-2xl font-serif text-red-400">{stats.failed}</p>
        </div>
        <div className="bg-white/5 border border-gold/10 p-6">
          <p className="text-[10px] tracking-widest text-white/30 uppercase mb-2">Total Revenue</p>
          <p className="text-2xl font-serif text-gold">৳{stats.revenue}</p>
        </div>
      </div>

      {activeTab === 'products' ? (
        <div className="flex flex-col space-y-16">
          {/* Add/Edit Product Section */}
          <section className="bg-white/5 border border-gold/10 p-6 md:p-10 rounded-sm">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-serif mb-8 tracking-widest text-center">{editingId ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT'}</h2>
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Basic Info */}
                <div className="space-y-6">
                  <div className="flex flex-col">
                    <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Product Name</label>
                    <input type="text" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition rounded-sm" />
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Price (BDT)</label>
                    <input type="number" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition rounded-sm" />
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Discounted Price (Optional)</label>
                    <input type="number" value={newProduct.discountedPrice} onChange={e => setNewProduct({...newProduct, discountedPrice: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition rounded-sm" placeholder="Leave empty if no discount" />
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Category</label>
                    <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full bg-luxury-black border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition rounded-sm">
                      <option value="Shirts">Shirts</option>
                      <option value="Pants">Pants</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Description</label>
                    <textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition h-32 resize-none rounded-sm" />
                  </div>
                </div>

                {/* Right Column: Images & Delivery */}
                <div className="space-y-6">
                  <div className="flex flex-col">
                    <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Product Images</label>
                    
                    {/* Manual URL Input with Live Preview */}
                    <div className="space-y-4 mb-6">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Paste image URL here..."
                          value={tempImageUrl}
                          onChange={(e) => setTempImageUrl(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-xs focus:border-gold outline-none transition rounded-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (tempImageUrl.trim()) {
                                setNewProduct(prev => ({
                                  ...prev,
                                  images: [...prev.images, tempImageUrl.trim()]
                                }));
                                setTempImageUrl('');
                              }
                            }
                          }}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            if (tempImageUrl.trim()) {
                              setNewProduct(prev => ({
                                ...prev,
                                images: [...prev.images, tempImageUrl.trim()]
                              }));
                              setTempImageUrl('');
                            }
                          }}
                          className="bg-gold text-luxury-black px-6 py-3 text-[10px] font-bold tracking-widest uppercase transition rounded-sm hover:brightness-110"
                        >
                          Add
                        </button>
                      </div>

                      {/* Live URL Preview Box */}
                      {tempImageUrl && (
                        <div className="p-4 border border-dashed border-gold/30 bg-gold/5 rounded-sm">
                          <p className="text-[8px] tracking-widest text-gold uppercase mb-2">URL Preview:</p>
                          <div className="relative aspect-video w-full bg-luxury-black rounded-sm overflow-hidden">
                            <img 
                              src={tempImageUrl} 
                              alt="URL Preview" 
                              className="w-full h-full object-contain block"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const errorMsg = document.createElement('div');
                                  errorMsg.className = 'absolute inset-0 flex items-center justify-center text-[10px] text-red-400 uppercase tracking-widest text-center p-4';
                                  errorMsg.innerText = 'Invalid Image URL or CORS Restricted';
                                  parent.appendChild(errorMsg);
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Image Gallery & Upload */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      {newProduct.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square bg-white/5 border border-white/10 rounded-sm flex items-center justify-center overflow-hidden box-sizing-border-box group">
                          {img && (
                            <img 
                              src={img} 
                              className="max-w-full max-h-full object-contain block" 
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/error/400/400';
                              }}
                            />
                          )}
                          <button 
                            type="button" 
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition z-10 opacity-0 group-hover:opacity-100"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {newProduct.images.length < 4 && (
                        <label className="aspect-square border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-gold/50 transition group rounded-sm bg-white/5">
                          <Upload size={20} className="text-white/20 group-hover:text-gold transition mb-2" />
                          <span className="text-[8px] tracking-widest text-white/20 uppercase">Upload File</span>
                          <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      )}
                    </div>
                    
                    <p className="text-[9px] text-white/30 italic mb-4">Tip: Paste a direct image link (.jpg, .png) or upload files. Max 4 images.</p>
                    
                    {uploading && (
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-[8px] tracking-widest uppercase text-gold">
                          <span>Uploading...</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            className="h-full bg-gold"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <label className="block text-[10px] tracking-widest text-white/40 uppercase mb-2">Delivery Charge</label>
                    <div className="flex space-x-4 mb-4">
                      {['Free', 'Paid'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewProduct({...newProduct, deliveryType: type})}
                          className={`flex-1 py-3 text-[10px] tracking-widest uppercase border transition rounded-sm ${newProduct.deliveryType === type ? 'bg-gold text-luxury-black border-gold' : 'border-white/10 text-white/40'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    {newProduct.deliveryType === 'Paid' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label className="block text-[8px] tracking-widest text-white/30 uppercase mb-1">Inside Dhaka</label>
                          <input type="number" value={newProduct.insideDhaka} onChange={e => setNewProduct({...newProduct, insideDhaka: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-2 text-xs focus:border-gold outline-none transition rounded-sm" />
                        </div>
                        <div className="flex flex-col">
                          <label className="block text-[8px] tracking-widest text-white/30 uppercase mb-1">Outside Dhaka</label>
                          <input type="number" value={newProduct.outsideDhaka} onChange={e => setNewProduct({...newProduct, outsideDhaka: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-2 text-xs focus:border-gold outline-none transition rounded-sm" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="md:col-span-2 flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t border-white/5">
                  {editingId && (
                    <button type="button" onClick={cancelEdit} className="px-8 py-4 border border-white/10 text-white/40 font-bold tracking-[0.2em] hover:text-white transition uppercase text-xs rounded-sm">
                      Cancel Edit
                    </button>
                  )}
                  <button type="submit" className="px-12 py-4 bg-gold text-luxury-black font-bold tracking-[0.2em] hover:brightness-110 transition uppercase text-xs rounded-sm">
                    {editingId ? 'Save Changes' : 'Add to Catalog'}
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Catalog Section */}
          <section className="space-y-8">
            <div className="flex items-center justify-between border-b border-gold/20 pb-4">
              <h2 className="text-2xl font-serif tracking-widest uppercase">Product Catalog</h2>
              <span className="text-[10px] tracking-widest text-white/30 uppercase">{products.length} Items Total</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white/5 border border-gold/5 flex flex-col rounded-sm overflow-hidden box-sizing-border-box group hover:border-gold/20 transition duration-300">
                  <div className="relative aspect-[3/4] bg-luxury-black flex items-center justify-center overflow-hidden">
                    <img src={product.images?.[0] || product.image || undefined} alt={product.name} className="max-w-full max-h-full object-contain transition duration-500 group-hover:scale-110 block" referrerPolicy="no-referrer" />
                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition duration-300">
                      <button 
                        onClick={() => handleEditProduct(product)}
                        className="p-2 bg-luxury-black/80 text-gold hover:bg-gold hover:text-luxury-black transition rounded-full"
                        title="Edit Product"
                      >
                        <PlusCircle size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-sm font-medium line-clamp-1">{product.name}</h3>
                      <span className="text-[8px] tracking-widest text-gold/60 uppercase bg-gold/5 px-2 py-0.5 rounded-full">{product.category}</span>
                    </div>
                    {(() => {
                      console.log(`Displayed price for ${product.name}:`, product.price);
                      return (
                        <div className="flex items-center gap-2 mb-4">
                          {product.discountedPrice ? (
                            <>
                              <p className="text-sm text-gold font-serif">৳{product.discountedPrice}</p>
                              <p className="text-[10px] text-white/20 line-through">৳{product.price}</p>
                            </>
                          ) : (
                            <p className="text-sm text-gold font-serif">৳{product.price}</p>
                          )}
                        </div>
                      );
                    })()}
                    
                    <div className="mt-auto pt-4 border-t border-white/5 flex gap-2">
                      <button 
                        onClick={() => handleEditProduct(product)}
                        className="flex-1 py-2 text-[10px] tracking-widest uppercase border border-gold/20 text-gold hover:bg-gold hover:text-luxury-black transition rounded-sm"
                      >
                        Edit
                      </button>
                      {deleteConfirm?.id === product.id ? (
                        <div className="flex-1 flex gap-1">
                          <button 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="flex-1 py-2 text-[10px] tracking-widest uppercase bg-red-600 text-white hover:bg-red-700 transition rounded-sm"
                          >
                            Yes
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(null)}
                            className="flex-1 py-2 text-[10px] tracking-widest uppercase bg-white/10 text-white hover:bg-white/20 transition rounded-sm"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeleteConfirm({id: product.id, type: 'product'})}
                          className="flex-1 py-2 text-[10px] tracking-widest uppercase border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition rounded-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : activeTab === 'categories' ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/5 border border-gold/10 p-8 mb-12">
            <h2 className="text-2xl font-serif mb-8 tracking-widest">MANAGE CATEGORIES</h2>
            <form onSubmit={handleAddCategory} className="flex gap-4">
              <input 
                type="text" 
                required 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)} 
                placeholder="New Category Name"
                className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition" 
              />
              <button type="submit" className="bg-gold text-luxury-black px-8 py-3 font-bold tracking-widest hover:brightness-110 transition uppercase">
                Add
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white/5 border border-gold/5 p-6 flex justify-between items-center group">
                <span className="tracking-widest uppercase text-sm">{cat.name}</span>
                {deleteConfirm?.id === cat.id ? (
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-[10px] tracking-widest uppercase bg-red-600 text-white px-3 py-1 hover:bg-red-700 transition"
                    >
                      Confirm
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm(null)}
                      className="text-[10px] tracking-widest uppercase text-white/40 hover:text-white transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setDeleteConfirm({id: cat.id, type: 'category'})}
                    className="text-red-500/40 hover:text-red-500 transition"
                  >
                    <XCircle size={20} />
                  </button>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-center text-white/20 tracking-widest py-12 border border-dashed border-white/10">NO CUSTOM CATEGORIES YET</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedOrders).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).map(([date, dateOrders]) => (
            <div key={date} className="space-y-6">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-serif tracking-widest text-gold uppercase">{date === new Date().toLocaleDateString() ? 'TODAY' : date}</h3>
                <div className="h-px flex-1 bg-gold/10" />
                <span className="text-[10px] tracking-widest text-white/20 uppercase">{dateOrders.length} Orders</span>
              </div>
              
              <div className="space-y-8">
                {dateOrders.map((order) => (
                  <motion.div layout key={order.id} className="bg-white/5 border border-gold/5 overflow-hidden hover:border-gold/20 transition duration-300">
                    <div className="p-6 border-b border-gold/5 flex flex-wrap justify-between items-center gap-6">
                      <div>
                        <p className="text-[10px] tracking-widest text-white/30 uppercase mb-1">Customer</p>
                        <p className="text-sm font-medium">{order.address.split(',')[0]}</p>
                        <p className="text-[10px] text-white/40 font-mono">{order.id}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 items-center">
                        {['Placed', 'Packing', 'Out for Delivery', 'Delivered', 'Failed'].map(status => (
                          <button
                            key={status}
                            onClick={() => updateStatus(order.id, status)}
                            className={`px-3 py-1 text-[8px] tracking-widest uppercase border transition ${order.status === status ? 'bg-gold text-luxury-black border-gold' : 'border-white/10 text-white/40 hover:border-gold/30'}`}
                          >
                            {status}
                          </button>
                        ))}
                        
                        {/* Print Status Badge */}
                        <div className={`flex items-center space-x-2 px-3 py-1 border transition duration-300 ${order.invoicePrinted ? 'border-green-500/30 bg-green-500/5 text-green-400' : 'border-white/10 bg-white/5 text-white/30'}`}>
                          <Printer size={10} />
                          <span className="text-[7px] tracking-widest uppercase font-bold">
                            {order.invoicePrinted ? 'Printed' : 'Not Printed'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] tracking-widest text-white/30 uppercase mb-1">Total</p>
                        <p className="text-lg font-bold text-gold">৳{order.total}</p>
                      </div>
                    </div>
                    <div className="p-6 bg-luxury-black/20">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <p className="text-[10px] tracking-widest text-white/30 uppercase">Items</p>
                          {order.products.map((p: any, idx: number) => (
                            <div key={idx} className="flex items-center space-x-4">
                              <div className="w-10 h-12 bg-white/5 flex items-center justify-center overflow-hidden">
                                <img src={p.image || undefined} className="max-w-full max-h-full object-contain block" referrerPolicy="no-referrer" />
                              </div>
                              <p className="text-xs">{p.name} <span className="text-white/40">({p.size} x{p.quantity})</span></p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] tracking-widest text-white/30 uppercase">Shipping Details</p>
                          <p className="text-xs text-white/60 leading-relaxed">{order.address}</p>
                          <p className="text-xs text-gold/80 font-mono">{order.phone}</p>
                          
                          <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5 mt-4">
                            <button 
                              onClick={() => handlePrintInvoice(order)}
                              className={`flex items-center space-x-2 px-6 py-3 text-[10px] tracking-widest uppercase transition rounded-sm ${order.invoicePrinted ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-gold text-luxury-black font-bold hover:brightness-110'}`}
                            >
                              <Printer size={14} />
                              <span>{order.invoicePrinted ? 'Reprint Invoice' : 'Print Invoice'}</span>
                            </button>

                            {(order.status === 'Delivered' || order.status === 'Failed') && (
                              deleteConfirm?.id === order.id ? (
                                <div className="flex items-center gap-4 bg-red-500/10 p-3 border border-red-500/20 rounded-sm">
                                  <p className="text-[8px] tracking-widest uppercase text-red-400">Confirm delete?</p>
                                  <button 
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="bg-red-600 text-white px-4 py-1 text-[8px] font-bold tracking-widest uppercase hover:bg-red-700 transition"
                                  >
                                    Yes
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirm(null)}
                                    className="text-white/40 hover:text-white text-[8px] tracking-widest uppercase transition"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setDeleteConfirm({id: order.id, type: 'order'})}
                                  className="flex items-center gap-2 text-red-500/60 hover:text-red-500 transition text-[10px] tracking-widest uppercase"
                                >
                                  <Trash2 size={14} />
                                  Delete Order Record
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="text-center py-20 border border-gold/10 bg-white/5">
              <p className="text-white/40 tracking-widest">NO ORDERS FOUND</p>
            </div>
          )}
        </div>
      )}
      {/* Invoice Template (Hidden on Screen, Visible on Print) */}
      {printingOrder && (
        <div id="invoice-template" className="fixed inset-0 z-[-1] bg-white text-black p-12 print:z-[9999] print:block hidden overflow-auto">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * { visibility: hidden; }
              #invoice-template, #invoice-template * { visibility: visible; }
              #invoice-template { 
                position: absolute; 
                left: 0; 
                top: 0; 
                width: 100%;
                background: white !important;
                color: black !important;
                padding: 40px !important;
              }
              .no-print { display: none !important; }
            }
          `}} />
          
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-8">
              <div>
                <h1 className="text-4xl font-serif font-bold tracking-tighter mb-2">STYLECRAFT</h1>
                <p className="text-sm tracking-widest uppercase opacity-60">Premium Clothing for the Modern Individual</p>
              </div>
              <div className="text-right">
                <h2 className="text-5xl font-serif font-light tracking-widest mb-2">INVOICE</h2>
                <p className="text-sm font-mono">#{printingOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-12">
              <div>
                <h3 className="text-xs tracking-widest uppercase font-bold mb-4 border-b border-black/10 pb-2">Customer Details</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-lg">{printingOrder.address.split(',')[0]}</p>
                  <p className="opacity-80">{printingOrder.address}</p>
                  <p className="opacity-80">Phone: {printingOrder.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-xs tracking-widest uppercase font-bold mb-4 border-b border-black/10 pb-2 text-right">Order Summary</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="opacity-60">Date:</span> {new Date(printingOrder.createdAtISO || (printingOrder.createdAt?.toDate ? printingOrder.createdAt.toDate() : new Date())).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p><span className="opacity-60">Status:</span> {printingOrder.status}</p>
                  <p><span className="opacity-60">Location:</span> {printingOrder.location}</p>
                </div>
              </div>
            </div>

            <table className="w-full mb-12">
              <thead>
                <tr className="border-b-2 border-black text-left text-xs tracking-widest uppercase">
                  <th className="py-4">Item Description</th>
                  <th className="py-4 text-center">Size</th>
                  <th className="py-4 text-center">Qty</th>
                  <th className="py-4 text-right">Price</th>
                  <th className="py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {printingOrder.products.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-black/10">
                    <td className="py-4 font-medium">{item.name}</td>
                    <td className="py-4 text-center">{item.size}</td>
                    <td className="py-4 text-center">x{item.quantity}</td>
                    <td className="py-4 text-right">৳{item.price}</td>
                    <td className="py-4 text-right font-bold">৳{item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-64 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">Subtotal</span>
                  <span>৳{printingOrder.total - (printingOrder.deliveryCharge || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">Delivery Charge</span>
                  <span>৳{printingOrder.deliveryCharge || 0}</span>
                </div>
                <div className="h-px bg-black/20" />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span>৳{printingOrder.total}</span>
                </div>
              </div>
            </div>

            <div className="mt-24 pt-12 border-t border-black/10 text-center">
              <p className="text-lg font-serif italic mb-2">Thank you for choosing StyleCraft</p>
              <p className="text-[10px] tracking-[0.3em] uppercase opacity-40">www.stylecraft.com | Premium Quality Guaranteed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
