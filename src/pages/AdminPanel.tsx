import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db, storage, auth } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, ShoppingCart, PlusCircle, Package, CheckCircle, XCircle, Truck, Clock, Upload, X, Image as ImageIcon, Trash2, Printer, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import slugify from 'slugify';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function AdminPanel() {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, placed, packing, delivery, delivered, failed, products, categories, collections
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, type: 'product' | 'category' | 'order' | 'collection'} | null>(null);
  const [printingOrder, setPrintingOrder] = useState<any | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);

  // Collection Form State
  const [newCollection, setNewCollection] = useState({
    name: '',
    slug: '',
    bannerImage: '',
    description: '',
    isFeatured: false,
    priority: '0',
    metaTitle: '',
    metaDescription: ''
  });
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);

  // Product Form State
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    slug: '',
    price: '', 
    discountedPrice: '',
    images: [] as string[], 
    collectionId: '',
    categoryId: '',
    tags: [] as string[],
    description: '',
    stock: '',
    salesCount: '0',
    isFeatured: false,
    variants: [] as { size: string; stock: string; price: string }[]
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState('');

  useEffect(() => {
    if (!isAdmin || !auth.currentUser) {
      setLoading(false);
      return;
    }

    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qProducts = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const qCategories = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const unsubCategories = onSnapshot(qCategories, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qCollections = query(collection(db, 'collections'), orderBy('name', 'asc'));
    const unsubCollections = onSnapshot(qCollections, (snapshot) => {
      setCollections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubOrders();
      unsubProducts();
      unsubCategories();
      unsubCollections();
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

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'product' | 'collection') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    const toastId = toast.loading('Uploading images...');

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `${target === 'product' ? 'products' : 'collections'}/${Date.now()}-${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => reject(error),
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                newUrls.push(downloadURL);
                resolve(true);
              } catch (err) { reject(err); }
            }
          );
        });
      }

      if (target === 'product') {
        setNewProduct(prev => ({ ...prev, images: [...prev.images, ...newUrls] }));
      } else {
        setNewCollection(prev => ({ ...prev, bannerImage: newUrls[0] }));
      }
      toast.success('Uploaded successfully', { id: toastId });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`, { id: toastId });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  const removeProductImage = (index: number) => {
    setNewProduct(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const generateSlug = (text: string) => slugify(text, { lower: true, strict: true });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProduct.images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }
    try {
      const productData = {
        ...newProduct,
        slug: newProduct.slug || generateSlug(newProduct.name),
        price: Number(newProduct.price),
        discountedPrice: newProduct.discountedPrice ? Number(newProduct.discountedPrice) : null,
        stock: Number(newProduct.stock),
        salesCount: Number(newProduct.salesCount),
        variants: newProduct.variants.map(v => ({
          ...v,
          stock: Number(v.stock),
          price: v.price ? Number(v.price) : null
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), productData);
        toast.success('Product updated');
      } else {
        await addDoc(collection(db, 'products'), productData);
        toast.success('Product added');
      }
      handleProductReset();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const handleProductReset = () => {
    setNewProduct({
      name: '',
      slug: '',
      price: '',
      discountedPrice: '',
      images: [],
      collectionId: '',
      categoryId: '',
      tags: [],
      description: '',
      stock: '',
      salesCount: '0',
      isFeatured: false,
      variants: []
    });
    setEditingId(null);
  };

  const handleEditProduct = (product: any) => {
    setNewProduct({
      name: product.name || '',
      slug: product.slug || '',
      price: (product.price ?? '').toString(),
      discountedPrice: product.discountedPrice ? product.discountedPrice.toString() : '',
      images: product.images || [],
      collectionId: product.collectionId || '',
      categoryId: product.categoryId || '',
      tags: product.tags || [],
      description: product.description || '',
      stock: (product.stock ?? '').toString(),
      salesCount: (product.salesCount ?? 0).toString(),
      isFeatured: product.isFeatured || false,
      variants: (product.variants || []).map((v: any) => ({
        size: v.size || 'M',
        stock: (v.stock ?? '').toString(),
        price: (v.price ?? '').toString()
      }))
    });
    setEditingId(product.id);
    setActiveTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Product deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Collection Handlers
  const handleAddCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...newCollection,
        slug: newCollection.slug || generateSlug(newCollection.name),
        priority: Number(newCollection.priority),
        createdAt: new Date().toISOString()
      };

      if (editingCollectionId) {
        await updateDoc(doc(db, 'collections', editingCollectionId), data);
        toast.success('Collection updated');
      } else {
        await addDoc(collection(db, 'collections'), data);
        toast.success('Collection added');
      }
      cancelCollectionEdit();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const cancelCollectionEdit = () => {
    setNewCollection({
      name: '',
      slug: '',
      bannerImage: '',
      description: '',
      isFeatured: false,
      priority: '0',
      metaTitle: '',
      metaDescription: ''
    });
    setEditingCollectionId(null);
  };

  const handleEditCollection = (col: any) => {
    setNewCollection({
      name: col.name || '',
      slug: col.slug || '',
      bannerImage: col.bannerImage || '',
      description: col.description || '',
      isFeatured: col.isFeatured || false,
      priority: (col.priority ?? 0).toString(),
      metaTitle: col.metaTitle || '',
      metaDescription: col.metaDescription || ''
    });
    setEditingCollectionId(col.id);
    setActiveTab('collections');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'collections', id));
      toast.success('Collection deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const slug = generateSlug(newCategoryName);
      await addDoc(collection(db, 'categories'), { 
        name: newCategoryName.trim(),
        slug,
        priority: categories.length,
        createdAt: new Date().toISOString()
      });
      setNewCategoryName('');
      toast.success('Category added');
    } catch (error: any) {
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

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedOrders.length === 0) return;
    setBulkStatusLoading(true);
    const toastId = toast.loading(`Updating ${selectedOrders.length} orders...`);
    
    try {
      const promises = selectedOrders.map(id => updateDoc(doc(db, 'orders', id), { status: newStatus }));
      await Promise.all(promises);
      toast.success(`Successfully updated ${selectedOrders.length} orders`, { id: toastId });
      setSelectedOrders([]);
    } catch (error: any) {
      console.error("Bulk update error:", error);
      toast.error("Failed to update some orders", { id: toastId });
    } finally {
      setBulkStatusLoading(false);
    }
  };

  const exportToCSV = () => {
    if (orders.length === 0) return;
    
    const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'Total', 'Status', 'Items'];
    const rows = filteredOrders.map(o => [
      o.id,
      o.createdAtISO || (o.createdAt?.toDate ? o.createdAt.toDate().toISOString() : ''),
      o.shippingAddress?.fullName || o.address?.split(',')?. [0] || 'Unknown',
      o.shippingAddress?.phone || o.phone || '',
      o.total,
      o.status,
      (o.products || []).map((p: any) => `${p.name} (${p.size} x${p.quantity})`).join('; ')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const selectAllOrders = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  if (!isAdmin) return <div className="pt-40 text-center tracking-widest text-red-400">ACCESS DENIED</div>;

  const totalSales = orders
    .filter(o => o.status === 'Delivered')
    .reduce((acc, o) => acc + (Number(o.total) || 0), 0);
  const pendingOrdersCount = orders.filter(o => ['Placed', 'Packing', 'Out for Delivery'].includes(o.status)).length;
  const outOfStockCount = products.filter(p => !p.variants || p.variants.some((v: any) => v.stock <= 0)).length;

  const filteredOrders = orders.filter(o => {
    // Status Filter
    let matchesStatus = true;
    if (activeTab === 'placed') matchesStatus = o.status === 'Placed';
    else if (activeTab === 'packing') matchesStatus = o.status === 'Packing';
    else if (activeTab === 'delivery') matchesStatus = o.status === 'Out for Delivery';
    else if (activeTab === 'delivered') matchesStatus = o.status === 'Delivered';
    else if (activeTab === 'failed') matchesStatus = o.status === 'Failed';

    // Search Filter
    const searchLower = searchTerm.toLowerCase();
    const customerName = (o.shippingAddress?.fullName || o.address?.split(',')[0] || '').toLowerCase();
    const phone = (o.shippingAddress?.phone || o.phone || '').toLowerCase();
    const orderId = o.id.toLowerCase();
    
    const matchesSearch = !searchTerm || 
      customerName.includes(searchLower) || 
      phone.includes(searchLower) || 
      orderId.includes(searchLower);

    return matchesStatus && matchesSearch;
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
      {/* Quick Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-gold/10 p-6 rounded-sm flex items-center space-x-4"
        >
          <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center text-gold">
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="text-[10px] tracking-widest text-white/40 uppercase">Total Revenue</p>
            <p className="text-xl font-serif text-gold">৳{totalSales.toLocaleString()}</p>
          </div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-gold/10 p-6 rounded-sm flex items-center space-x-4"
        >
          <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
            <ShoppingCart size={24} />
          </div>
          <div>
            <p className="text-[10px] tracking-widest text-white/40 uppercase">Total Orders</p>
            <p className="text-xl font-serif">{orders.length}</p>
          </div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-gold/10 p-6 rounded-sm flex items-center space-x-4"
        >
          <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] tracking-widest text-white/40 uppercase">Pending</p>
            <p className="text-xl font-serif">{pendingOrdersCount}</p>
          </div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-gold/10 p-6 rounded-sm flex items-center space-x-4"
        >
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-400">
            <Package size={24} />
          </div>
          <div>
            <p className="text-[10px] tracking-widest text-white/40 uppercase">Stock Alerts</p>
            <p className="text-xl font-serif">{outOfStockCount}</p>
          </div>
        </motion.div>
      </div>

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
          <button onClick={() => setActiveTab('products')} className={`px-6 py-2 text-[10px] tracking-widest uppercase border transition ${activeTab === 'products' ? 'bg-white text-luxury-black border-white' : 'border-white/10 text-white/40 hover:border-white/50'}`}>Products</button>
          <button onClick={() => setActiveTab('collections')} className={`px-6 py-2 text-[10px] tracking-widest uppercase border transition ${activeTab === 'collections' ? 'bg-gold text-luxury-black border-gold' : 'border-white/10 text-white/40 hover:border-gold/50'}`}>Collections</button>
          <button onClick={() => setActiveTab('categories')} className={`px-6 py-2 text-[10px] tracking-widest uppercase border transition ${activeTab === 'categories' ? 'bg-gold text-luxury-black border-gold' : 'border-white/10 text-white/40 hover:border-gold/50'}`}>Categories</button>
          <button onClick={() => setActiveTab('analytics')} className={`px-6 py-2 text-[10px] tracking-widest uppercase border transition ${activeTab === 'analytics' ? 'bg-gold text-luxury-black border-gold' : 'border-white/10 text-white/40 hover:border-gold/50'}`}>Analytics</button>
        </div>
      </div>

      {/* Search & Bulk Actions Bar */}
      {activeTab !== 'products' && activeTab !== 'categories' && activeTab !== 'analytics' && (
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Search by Name, Phone or Order ID..."
                value={searchTerm || ''}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 px-10 py-4 text-sm focus:border-gold outline-none transition rounded-sm"
              />
              <LayoutDashboard className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button 
              onClick={exportToCSV}
              className="px-8 py-4 border border-gold/20 text-gold hover:bg-gold hover:text-luxury-black transition text-[10px] tracking-widest uppercase font-bold flex items-center justify-center gap-2"
            >
              <Upload size={14} className="rotate-180" />
              Export CSV
            </button>
          </div>

          {/* Bulk Actions */}
          <AnimatePresence>
            {selectedOrders.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-gold/10 border border-gold/20 p-4 flex flex-col md:flex-row items-center justify-between gap-4 rounded-sm"
              >
                <div className="flex items-center gap-4">
                  <span className="text-[10px] tracking-widest uppercase font-bold text-gold">
                    {selectedOrders.length} Orders Selected
                  </span>
                  <button 
                    onClick={() => setSelectedOrders([])}
                    className="text-[8px] tracking-widest uppercase text-white/40 hover:text-white underline"
                  >
                    Deselect All
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className="text-[8px] tracking-widest uppercase text-white/40 self-center mr-2">Update Status:</span>
                  {['Placed', 'Packing', 'Out for Delivery', 'Delivered', 'Failed'].map(status => (
                    <button
                      key={status}
                      disabled={bulkStatusLoading}
                      onClick={() => handleBulkStatusUpdate(status)}
                      className="px-3 py-1.5 text-[8px] tracking-widest uppercase bg-luxury-black border border-gold/20 text-gold hover:bg-gold hover:text-luxury-black transition disabled:opacity-50"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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

      {activeTab === 'analytics' ? (
        <div className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Chart */}
            <div className="bg-white/5 border border-gold/10 p-8 rounded-sm">
              <h3 className="text-xl font-serif mb-8 tracking-widest">REVENUE TREND</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={Object.entries(groupedOrders).map(([date, items]) => ({
                    date,
                    revenue: items.filter(o => o.status === 'Delivered').reduce((acc, o) => acc + o.total, 0)
                  })).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#ffffff40" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#ffffff40" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `৳${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #d4af3720', fontSize: '10px' }}
                      itemStyle={{ color: '#d4af37' }}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#d4af37" strokeWidth={2} dot={{ fill: '#d4af37' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Orders by Status */}
            <div className="bg-white/5 border border-gold/10 p-8 rounded-sm">
              <h3 className="text-xl font-serif mb-8 tracking-widest">ORDERS BY STATUS</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Placed', count: getStatusCount('placed') },
                    { name: 'Packing', count: getStatusCount('packing') },
                    { name: 'Delivery', count: getStatusCount('delivery') },
                    { name: 'Delivered', count: getStatusCount('delivered') },
                    { name: 'Failed', count: getStatusCount('failed') },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #d4af3720', fontSize: '10px' }}
                      cursor={{ fill: '#ffffff05' }}
                    />
                    <Bar dataKey="count" fill="#d4af37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Products Table */}
          <div className="bg-white/5 border border-gold/10 p-8 rounded-sm">
            <h3 className="text-xl font-serif mb-8 tracking-widest">TOP SELLING PRODUCTS</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-4 text-[10px] tracking-widest text-white/30 uppercase">Product</th>
                    <th className="pb-4 text-[10px] tracking-widest text-white/30 uppercase">Sales</th>
                    <th className="pb-4 text-[10px] tracking-widest text-white/30 uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(() => {
                    const productSales: {[key: string]: {name: string, count: number, revenue: number}} = {};
                    orders.filter(o => o.status === 'Delivered').forEach(order => {
                      order.products.forEach((p: any) => {
                        if (!productSales[p.id]) productSales[p.id] = { name: p.name, count: 0, revenue: 0 };
                        productSales[p.id].count += p.quantity;
                        productSales[p.id].revenue += p.price * p.quantity;
                      });
                    });
                    return Object.values(productSales)
                      .sort((a, b) => b.revenue - a.revenue)
                      .slice(0, 5)
                      .map((p, i) => (
                        <tr key={i}>
                          <td className="py-4 text-sm font-serif">{p.name}</td>
                          <td className="py-4 text-sm text-white/60">{p.count}</td>
                          <td className="py-4 text-sm text-gold font-bold">৳{p.revenue}</td>
                        </tr>
                      ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'products' ? (
        <div className="flex flex-col space-y-16">
          {/* Add/Edit Product Section */}
          <section className="bg-white/5 border border-gold/10 p-6 md:p-10 rounded-sm">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-serif mb-8 tracking-widest text-center">{editingId ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT'}</h2>
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Basic Info */}
                <div className="space-y-6">
                  <div className="flex flex-col text-[10px] tracking-widest text-white/40 uppercase font-bold">
                    <label className="mb-2">Product Name</label>
                    <input type="text" required value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:border-gold outline-none transition rounded-sm" />
                  </div>
                  <div className="flex flex-col text-[10px] tracking-widest text-white/40 uppercase font-bold">
                    <label className="mb-2">Slug (Auto-generated if empty)</label>
                    <input type="text" value={newProduct.slug || ''} onChange={e => setNewProduct({...newProduct, slug: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:border-gold outline-none transition rounded-sm" placeholder={generateSlug(newProduct.name || '')} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[10px] tracking-widest text-white/40 uppercase font-bold">
                    <div className="flex flex-col">
                      <label className="mb-2">Price (BDT)</label>
                      <input type="number" required value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:border-gold outline-none transition rounded-sm" />
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-2">Discount Price</label>
                      <input type="number" value={newProduct.discountedPrice || ''} onChange={e => setNewProduct({...newProduct, discountedPrice: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:border-gold outline-none transition rounded-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[10px] tracking-widest text-white/40 uppercase font-bold">
                    <div className="flex flex-col">
                      <label className="mb-2">Category</label>
                      <select value={newProduct.categoryId || ''} onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})} className="w-full bg-luxury-black border border-white/10 px-4 py-3 text-sm text-white focus:border-gold outline-none transition rounded-sm">
                        <option value="">Select Category</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-2">Collection</label>
                      <select value={newProduct.collectionId || ''} onChange={e => setNewProduct({...newProduct, collectionId: e.target.value})} className="w-full bg-luxury-black border border-white/10 px-4 py-3 text-sm text-white focus:border-gold outline-none transition rounded-sm">
                        <option value="">None</option>
                        {collections.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col text-[10px] tracking-widest text-white/40 uppercase font-bold">
                    <label className="mb-2">Tags (comma separated)</label>
                    <input type="text" value={(newProduct.tags || []).join(', ')} onChange={e => setNewProduct({...newProduct, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:border-gold outline-none transition rounded-sm" placeholder="new, bestseller, limited" />
                  </div>
                  <div className="flex flex-col text-[10px] tracking-widest text-white/40 uppercase font-bold">
                    <label className="mb-2">Description</label>
                    <textarea value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:border-gold outline-none transition h-32 resize-none rounded-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[10px] tracking-widest text-white/40 uppercase font-bold">
                    <div className="flex flex-col">
                      <label className="mb-2">Stock</label>
                      <input type="number" required value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:border-gold outline-none transition rounded-sm" />
                    </div>
                    <div className="flex items-center space-x-3 pt-6">
                      <input type="checkbox" id="featured" checked={newProduct.isFeatured} onChange={e => setNewProduct({...newProduct, isFeatured: e.target.checked})} className="w-4 h-4 accent-gold" />
                      <label htmlFor="featured" className="cursor-pointer">Featured</label>
                    </div>
                  </div>
                </div>

                {/* Right Column: Images & Variants */}
                <div className="space-y-6">
                  <div className="flex flex-col text-[10px] tracking-widest text-white/40 uppercase font-bold">
                    <label className="mb-4">Product Images (URL Input)</label>
                    
                    {/* URL Input */}
                    <div className="flex gap-2 mb-6">
                      <input 
                        type="text" 
                        placeholder="Paste image URL here..."
                        value={tempImageUrl || ''}
                        onChange={(e) => setTempImageUrl(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition rounded-sm no-scrollbar"
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
                        className="bg-gold text-luxury-black px-6 py-3 font-bold uppercase transition rounded-sm hover:brightness-110"
                      >
                        Add
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                      {newProduct.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square border border-white/10 bg-white/5 rounded-sm overflow-hidden group">
                    <img src={img || null} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => {
                            const updated = newProduct.images.filter((_, i) => i !== idx);
                            setNewProduct({...newProduct, images: updated});
                          }} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition"><X size={10} className="text-white"/></button>
                        </div>
                      ))}
                      {newProduct.images.length < 8 && (
                        <label className="aspect-square border border-dashed border-gold/30 flex flex-col items-center justify-center cursor-pointer hover:bg-gold/5 transition rounded-sm group">
                          <Upload size={16} className="text-gold/50 group-hover:text-gold transition" />
                          <input type="file" multiple accept="image/*" onChange={e => handleImageUpload(e, 'product')} className="hidden" />
                          <span className="text-[8px] mt-1">Upload instead</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Variants Section */}
                  <div className="pt-6 border-t border-white/10">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-[10px] tracking-widest text-gold uppercase font-bold">Size Variants</label>
                      <button 
                        type="button"
                        onClick={() => setNewProduct(prev => ({
                          ...prev,
                          variants: [...prev.variants, { size: 'M', stock: '10', price: '' }]
                        }))}
                        className="text-[10px] tracking-widest text-gold hover:underline uppercase font-bold"
                      >
                        + Add Variant
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {newProduct.variants.map((variant, idx) => (
                        <div key={idx} className="grid grid-cols-3 gap-2 items-end bg-white/5 p-3 rounded-sm border border-white/5">
                          <div>
                            <label className="block text-[8px] tracking-widest text-white/20 uppercase mb-1">Size</label>
                            <select 
                              value={variant.size || ''} 
                              onChange={e => {
                                const updated = [...newProduct.variants];
                                updated[idx].size = e.target.value;
                                setNewProduct({...newProduct, variants: updated});
                              }}
                              className="w-full bg-luxury-black border border-white/10 px-2 py-2 text-xs text-white focus:border-gold outline-none rounded-sm"
                            >
                              {['S', 'M', 'L', 'XL', 'XXL', '30', '32', '34', '36', '38', '40'].map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[8px] tracking-widest text-white/20 uppercase mb-1">Stock</label>
                            <input 
                              type="number" 
                              value={variant.stock || ''} 
                              onChange={e => {
                                const updated = [...newProduct.variants];
                                updated[idx].stock = e.target.value;
                                setNewProduct({...newProduct, variants: updated});
                              }}
                              className="w-full bg-luxury-black border border-white/10 px-2 py-2 text-xs text-white focus:border-gold outline-none rounded-sm"
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-[8px] tracking-widest text-white/20 uppercase mb-1">Price (Opt)</label>
                            <div className="flex gap-2">
                              <input 
                                type="number" 
                                value={variant.price || ''} 
                                placeholder="Base"
                                onChange={e => {
                                  const updated = [...newProduct.variants];
                                  updated[idx].price = e.target.value;
                                  setNewProduct({...newProduct, variants: updated});
                                }}
                                className="w-full bg-luxury-black border border-white/10 px-2 py-2 text-xs text-white focus:border-gold outline-none rounded-sm"
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  const updated = newProduct.variants.filter((_, i) => i !== idx);
                                  setNewProduct({...newProduct, variants: updated});
                                }}
                                className="text-red-400 hover:text-red-300 transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {newProduct.variants.length === 0 && (
                        <p className="text-[10px] text-white/20 italic text-center py-4 uppercase tracking-widest">No variants added. Using base price and total stock.</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-8 flex flex-col sm:flex-row gap-4">
                    <button type="submit" className="flex-1 px-8 py-4 bg-gold text-luxury-black font-bold tracking-widest uppercase hover:brightness-110 transition rounded-sm">{editingId ? 'Update Product' : 'Add Product'}</button>
                    {editingId && <button type="button" onClick={handleProductReset} className="px-8 py-4 border border-white/10 text-white/40 tracking-widest uppercase rounded-sm">Cancel</button>}
                  </div>
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
                    <img src={product.images?.[0] || null} alt={product.name} className="max-w-full max-h-full object-contain block" referrerPolicy="no-referrer" />
                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition duration-300">
                      <button 
                        onClick={() => handleEditProduct(product)}
                        className="p-2 bg-luxury-black/80 text-gold hover:bg-gold hover:text-luxury-black transition rounded-full"
                      >
                        <PlusCircle size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-sm font-medium line-clamp-1 mb-1 text-white">{product.name}</h3>
                    <p className="text-gold font-serif text-sm mb-4">৳{product.price}</p>
                    
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
      ) : activeTab === 'collections' ? (
        <div className="flex flex-col space-y-12">
          {/* Collection Form */}
          <section className="bg-white/5 border border-gold/10 p-6 md:p-10 rounded-sm">
            <h2 className="text-2xl font-serif mb-8 tracking-widest text-center">{editingCollectionId ? 'Edit Collection' : 'Create New Collection'}</h2>
            <form onSubmit={handleAddCollection} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6 text-[10px] tracking-widest uppercase text-white/40 font-bold">
                <div>
                  <label className="block mb-2">Collection Name</label>
                  <input type="text" required value={newCollection.name || ''} onChange={e => setNewCollection({...newCollection, name: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:border-gold outline-none transition rounded-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2">Slug</label>
                    <input type="text" value={newCollection.slug || ''} onChange={e => setNewCollection({...newCollection, slug: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:border-gold outline-none transition rounded-sm" />
                  </div>
                  <div>
                    <label className="block mb-2">Priority</label>
                    <input type="number" value={newCollection.priority || ''} onChange={e => setNewCollection({...newCollection, priority: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:border-gold outline-none transition rounded-sm" />
                  </div>
                </div>
                <div>
                  <label className="block mb-2">Description</label>
                  <textarea value={newCollection.description || ''} onChange={e => setNewCollection({...newCollection, description: e.target.value})} className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:border-gold outline-none transition h-24 resize-none rounded-sm" />
                </div>
                <div className="flex items-center space-x-3">
                  <input type="checkbox" id="col-featured" checked={newCollection.isFeatured} onChange={e => setNewCollection({...newCollection, isFeatured: e.target.checked})} className="w-4 h-4 accent-gold" />
                  <label htmlFor="col-featured">Featured Collection</label>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block mb-2 font-bold">Banner Image URL</label>
                  <input 
                    type="text" 
                    placeholder="Paste image URL here..."
                    value={newCollection.bannerImage || ''}
                    onChange={(e) => setNewCollection({...newCollection, bannerImage: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-gold outline-none transition rounded-sm mb-4"
                  />
                  <div className="aspect-video relative border border-white/10 bg-white/5 rounded-sm overflow-hidden flex items-center justify-center">
                    {newCollection.bannerImage ? (
                      <>
                        <img src={newCollection.bannerImage || null} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setNewCollection({...newCollection, bannerImage: ''})} className="absolute top-2 right-2 p-2 bg-red-500 rounded-full text-white"><Trash2 size={16}/></button>
                      </>
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gold/5 transition">
                        <ImageIcon size={32} className="text-white/20 mb-2" />
                        <span className="text-[10px] tracking-widest uppercase text-white/20">Preview will appear here</span>
                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'collection')} className="hidden" />
                      </label>
                    )}
                  </div>
                  <p className="text-[8px] text-white/20 mt-2 tracking-widest uppercase text-center">You can also click above to upload from your device if needed</p>
                </div>
                <div className="pt-8 flex gap-4">
                  <button type="submit" className="flex-1 px-8 py-4 bg-gold text-luxury-black font-bold tracking-widest uppercase hover:brightness-110 transition rounded-sm">{editingCollectionId ? 'Update' : 'Create'}</button>
                  {editingCollectionId && <button type="button" onClick={cancelCollectionEdit} className="px-8 py-4 border border-white/10 text-white/40 tracking-widest uppercase rounded-sm">Cancel</button>}
                </div>
              </div>
            </form>
          </section>

          {/* Collections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
            {collections.map(c => (
              <div key={c.id} className="bg-white/5 border border-white/10 p-4 rounded-sm group hover:border-gold transition">
                <img src={c.bannerImage || null} className="aspect-video object-cover mb-4 rounded-sm" />
                <h3 className="text-sm font-medium mb-1">{c.name}</h3>
                <p className="text-[8px] text-white/40 line-clamp-1">{c.description}</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => handleEditCollection(c)} className="flex-1 py-2 border border-gold/20 text-gold text-[8px] uppercase tracking-widest">Edit</button>
                  <button onClick={() => setDeleteConfirm({id: c.id, type: 'collection'})} className="px-3 py-2 border border-red-500/20 text-red-400"><Trash2 size={12}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'categories' ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/5 border border-gold/10 p-8 mb-12">
            <h2 className="text-2xl font-serif mb-8 tracking-widest">MANAGE CATEGORIES</h2>
            <form onSubmit={handleAddCategory} className="flex gap-4">
              <input 
                type="text" 
                required 
                value={newCategoryName || ''} 
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
                <button 
                  onClick={selectAllOrders}
                  className="text-[10px] tracking-widest uppercase border border-gold/20 px-3 py-1 text-gold hover:bg-gold hover:text-luxury-black transition"
                >
                  {selectedOrders.length === filteredOrders.length ? 'Deselect All' : 'Select All'}
                </button>
                <h3 className="text-lg font-serif tracking-widest text-gold uppercase">{date === new Date().toLocaleDateString() ? 'TODAY' : date}</h3>
                <div className="h-px flex-1 bg-gold/10" />
                <span className="text-[10px] tracking-widest text-white/20 uppercase">{dateOrders.length} Orders</span>
              </div>
              
              <div className="space-y-8">
                {dateOrders.map((order) => (
                  <motion.div layout key={order.id} className={`bg-white/5 border overflow-hidden hover:border-gold/20 transition duration-300 ${selectedOrders.includes(order.id) ? 'border-gold/40 ring-1 ring-gold/20' : 'border-gold/5'}`}>
                    <div className="p-6 border-b border-gold/5 flex flex-wrap justify-between items-center gap-6">
                      <div className="flex items-center gap-4">
                        <input 
                          type="checkbox" 
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="w-4 h-4 accent-gold cursor-pointer"
                        />
                        <div className="cursor-pointer" onClick={() => setViewingOrder(order)}>
                          <p className="text-[10px] tracking-widest text-white/30 uppercase mb-1">Customer</p>
                          <p className="text-sm font-medium hover:text-gold transition">
                            {order.shippingAddress?.fullName || order.address?.split(',')[0] || 'Unknown'}
                          </p>
                          <p className="text-[10px] text-white/40 font-mono">{order.id}</p>
                        </div>
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
                                <img src={p.image || null} className="max-w-full max-h-full object-contain block" referrerPolicy="no-referrer" />
                              </div>
                              <p className="text-xs">{p.name} <span className="text-white/40">({p.size} x{p.quantity})</span></p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] tracking-widest text-white/30 uppercase">Shipping Details</p>
                          {order.shippingAddress ? (
                            <div className="text-xs text-white/60 space-y-1">
                              <p className="text-white font-medium">{order.shippingAddress.fullName}</p>
                              <p>{[order.shippingAddress.addressLine, order.shippingAddress.area].filter(Boolean).join(', ')}</p>
                              <p>{order.shippingAddress.country}</p>
                              <p className="text-gold/80 font-mono">{order.shippingAddress.phone}</p>
                              {order.shippingAddress.instructions && (
                                <p className="mt-2 p-2 bg-white/5 border-l-2 border-gold/40 italic">"{order.shippingAddress.instructions}"</p>
                              )}
                            </div>
                          ) : (
                            <>
                              <p className="text-xs text-white/60 leading-relaxed">{order.address}</p>
                              <p className="text-xs text-gold/80 font-mono">{order.phone}</p>
                            </>
                          )}
                          
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
      {/* Order Detail Modal */}
      <AnimatePresence>
        {viewingOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingOrder(null)}
              className="absolute inset-0 bg-luxury-black/95 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-luxury-black border border-gold/20 max-h-[90vh] overflow-hidden flex flex-col rounded-sm"
            >
              <div className="p-6 border-b border-gold/10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-serif tracking-widest uppercase">Order Details</h2>
                  <p className="text-[10px] font-mono text-white/40 mt-1">{viewingOrder.id}</p>
                </div>
                <button onClick={() => setViewingOrder(null)} className="text-white/40 hover:text-white transition">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {/* Customer & Shipping */}
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-4 font-bold">Shipping Information</h3>
                      {viewingOrder.shippingAddress ? (
                        <div className="space-y-2 text-sm text-white/70">
                          <p className="text-white font-medium text-base">{viewingOrder.shippingAddress.fullName}</p>
                          <p>{viewingOrder.shippingAddress.addressLine}</p>
                          <p>{viewingOrder.shippingAddress.country}</p>
                          <div className="pt-2">
                            <p className="text-gold font-mono">{viewingOrder.shippingAddress.phone}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm text-white/70">
                          <p>{viewingOrder.address}</p>
                          <p className="text-gold font-mono">{viewingOrder.phone}</p>
                        </div>
                      )}
                    </section>

                    <section>
                      <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-4 font-bold">Order Metadata</h3>
                      <div className="grid grid-cols-2 gap-4 text-[10px] tracking-widest uppercase">
                        <div className="bg-white/5 p-3 rounded-sm border border-white/5">
                          <p className="text-white/30 mb-1">Date</p>
                          <p>{new Date(viewingOrder.createdAtISO || (viewingOrder.createdAt?.toDate ? viewingOrder.createdAt.toDate() : new Date())).toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-sm border border-white/5">
                          <p className="text-white/30 mb-1">Status</p>
                          <p className="text-gold">{viewingOrder.status}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-sm border border-white/5">
                          <p className="text-white/30 mb-1">Location</p>
                          <p>{viewingOrder.location || 'N/A'}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-sm border border-white/5">
                          <p className="text-white/30 mb-1">Invoice</p>
                          <p>{viewingOrder.invoicePrinted ? 'Printed' : 'Pending'}</p>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Items & Summary */}
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-4 font-bold">Order Items</h3>
                      <div className="space-y-4">
                        {viewingOrder.products.map((p: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-4 bg-white/5 p-3 rounded-sm border border-white/5">
                            <div className="w-16 h-20 bg-luxury-black flex items-center justify-center overflow-hidden rounded-sm">
                              <img src={p.image || null} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{p.name}</p>
                              <p className="text-[10px] text-white/40 tracking-widest uppercase mt-1">Size: {p.size} | Qty: {p.quantity}</p>
                              <p className="text-xs text-gold mt-1">৳{p.price} each</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">৳{p.price * p.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="bg-gold/5 p-6 border border-gold/10 rounded-sm">
                      <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-6 font-bold">Payment Summary</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-white/60">
                          <span>Subtotal</span>
                          <span>৳{viewingOrder.total - (viewingOrder.deliveryCharge || 0)}</span>
                        </div>
                        <div className="flex justify-between text-white/60">
                          <span>Delivery Charge</span>
                          <span>৳{viewingOrder.deliveryCharge || 0}</span>
                        </div>
                        <div className="h-px bg-gold/20 my-2" />
                        <div className="flex justify-between text-xl font-serif text-gold font-bold">
                          <span>TOTAL</span>
                          <span>৳{viewingOrder.total}</span>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gold/10 bg-luxury-black/50 flex flex-wrap gap-4 justify-end">
                <button 
                  onClick={() => handlePrintInvoice(viewingOrder)}
                  className="px-6 py-3 bg-white/10 text-white text-[10px] tracking-widest uppercase hover:bg-white/20 transition rounded-sm flex items-center gap-2"
                >
                  <Printer size={14} />
                  Print Invoice
                </button>
                <div className="flex gap-2">
                  {['Placed', 'Packing', 'Out for Delivery', 'Delivered', 'Failed'].map(status => (
                    <button
                      key={status}
                      onClick={() => updateStatus(viewingOrder.id, status)}
                      className={`px-4 py-3 text-[8px] tracking-widest uppercase border transition rounded-sm ${viewingOrder.status === status ? 'bg-gold text-luxury-black border-gold' : 'border-white/10 text-white/40 hover:border-gold/30'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Template (Hidden on Screen, Visible on Print) */}
      {printingOrder && (
        <div id="invoice-template" className="fixed inset-0 z-[-1] bg-white text-black print:z-[9999] print:block hidden overflow-hidden">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: auto;
                margin: 0mm;
              }
              body {
                background-color: white !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              body * { visibility: hidden; }
              #invoice-template, #invoice-template * { visibility: visible; }
              #invoice-template { 
                position: absolute; 
                left: 0; 
                top: 0; 
                width: 100%;
                height: 148mm; /* Half of A4 (297mm) */
                background: white !important;
                color: black !important;
                padding: 2mm 10mm !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
              }
              .no-print { display: none !important; }
            }
          `}} />
          
          <div className="max-w-4xl mx-auto py-4">
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
              <div>
                <h1 className="text-3xl font-serif font-bold tracking-tighter mb-1">STYLECRAFT</h1>
                <p className="text-[10px] tracking-widest uppercase opacity-60">Premium Clothing for the Modern Individual</p>
              </div>
              <div className="text-right">
                <h2 className="text-4xl font-serif font-light tracking-widest mb-1">INVOICE</h2>
                <p className="text-xs font-mono">#{printingOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="text-[10px] tracking-widest uppercase font-bold mb-2 border-b border-black/10 pb-1">Customer Details</h3>
                <div className="space-y-0.5 text-xs">
                  {printingOrder.shippingAddress ? (
                    <>
                      <p className="font-bold text-sm">{printingOrder.shippingAddress.fullName}</p>
                      <p className="opacity-80">{printingOrder.shippingAddress.addressLine}</p>
                      <p className="opacity-80">{printingOrder.shippingAddress.country}</p>
                      <p className="opacity-80">Phone: {printingOrder.shippingAddress.phone}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-sm">{printingOrder.address.split(',')[0]}</p>
                      <p className="opacity-80">{printingOrder.address}</p>
                      <p className="opacity-80">Phone: {printingOrder.phone}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-[10px] tracking-widest uppercase font-bold mb-2 border-b border-black/10 pb-1 text-right">Order Summary</h3>
                <div className="space-y-0.5 text-xs">
                  <p><span className="opacity-60">Date:</span> {new Date(printingOrder.createdAtISO || (printingOrder.createdAt?.toDate ? printingOrder.createdAt.toDate() : new Date())).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p><span className="opacity-60">Status:</span> {printingOrder.status}</p>
                  <p><span className="opacity-60">Location:</span> {printingOrder.location}</p>
                </div>
              </div>
            </div>

            <table className="w-full mb-6">
              <thead>
                <tr className="border-b-2 border-black text-left text-[10px] tracking-widest uppercase">
                  <th className="py-2">Item Description</th>
                  <th className="py-2 text-center">Size</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {printingOrder.products.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-black/10">
                    <td className="py-2 font-medium">{item.name}</td>
                    <td className="py-2 text-center">{item.size}</td>
                    <td className="py-2 text-center">x{item.quantity}</td>
                    <td className="py-2 text-right">৳{item.price}</td>
                    <td className="py-2 text-right font-bold">৳{item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-48 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="opacity-60">Subtotal</span>
                  <span>৳{printingOrder.total - (printingOrder.deliveryCharge || 0)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="opacity-60">Delivery Charge</span>
                  <span>৳{printingOrder.deliveryCharge || 0}</span>
                </div>
                <div className="h-px bg-black/20" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>৳{printingOrder.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
