import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { Filter, SlidersHorizontal, ChevronRight, Copy, Check } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { Product, Collection } from '../types';
import { toast } from 'sonner';

export default function CollectionDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [collectionData, setCollectionData] = useState<Collection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    if (!slug) return;

    // Fetch Collection Info
    const colQuery = query(collection(db, 'collections'), where('slug', '==', slug));
    const findCollection = async () => {
      const snap = await getDocs(colQuery);
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as Collection;
        setCollectionData(data);
        
        // Fetch Products for this collection
        const prodQuery = query(collection(db, 'products'), where('collectionId', '==', data.id));
        const unsub = onSnapshot(prodQuery, (pSnap) => {
          const items = pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
          setProducts(items);
          setLoading(false);
        });
        return unsub;
      } else {
        setLoading(false);
      }
    };

    findCollection();
  }, [slug]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'popularity') return (b.salesCount || 0) - (a.salesCount || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-black border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!collectionData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
        <h2 className="text-4xl font-serif mb-6 text-black">Collection Not Found</h2>
        <Link to="/" className="text-black hover:underline tracking-widest uppercase font-bold">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-20 bg-white min-h-screen">
      {/* Hero Banner */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <img 
          src={collectionData.bannerImage || null} 
          alt={collectionData.name} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/40 to-white" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-white/60 backdrop-blur-md px-6 py-2 border border-black/10 rounded-full shadow-lg"
          >
            <span className="text-black text-xs tracking-[0.4em] uppercase font-black">Featured Collection</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-7xl font-serif mb-4 tracking-tight text-black drop-shadow-md uppercase italic"
          >
            {collectionData.name}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl text-black/80 text-sm md:text-base font-bold tracking-widest uppercase leading-relaxed drop-shadow-sm"
          >
            {collectionData.description}
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-12">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8 border-b border-black/5 pb-8">
          <div className="flex items-center space-x-2 text-[10px] tracking-widest text-black/60 uppercase font-bold">
            <Link to="/" className="hover:text-black transition">Home</Link>
            <ChevronRight size={12} />
            <span className="text-black/60">Collection</span>
            <ChevronRight size={12} />
            <span className="text-black font-black underline">{collectionData.name}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button 
              onClick={copyLink}
              className="flex items-center space-x-2 px-6 py-2.5 bg-black text-white text-[10px] tracking-widest hover:bg-black/80 transition-all uppercase font-black rounded-full shadow-md active:scale-95"
            >
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              <span>{copied ? 'COPIED' : 'COPY LINK'}</span>
            </button>

            <div className="flex items-center space-x-4 text-black font-bold">
              <SlidersHorizontal size={16} />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] tracking-widest uppercase text-black/80 cursor-pointer focus:text-black transition"
              >
                <option value="newest" className="bg-white">Newest Arrivals</option>
                <option value="popularity" className="bg-white">Most Popular</option>
                <option value="price-low" className="bg-white">Price: Low to High</option>
                <option value="price-high" className="bg-white">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {sortedProducts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-black/20 tracking-widest uppercase">No products in this collection yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
