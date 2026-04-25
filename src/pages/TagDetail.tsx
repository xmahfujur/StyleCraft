import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { Tag, ChevronRight, SlidersHorizontal } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';

export default function TagDetail() {
  const { tag } = useParams<{ tag: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    if (!tag) return;

    // Fetch Products with this tag
    const q = query(collection(db, 'products'), where('tags', 'array-contains', tag));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(items);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return unsub;
  }, [tag]);

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'popularity') return (b.salesCount || 0) - (a.salesCount || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-luxury-black">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 bg-luxury-black min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center space-x-2 text-[10px] tracking-[0.2em] text-white/40 uppercase mb-6">
            <Link to="/" className="hover:text-gold transition">Home</Link>
            <ChevronRight size={12} />
            <span className="text-white/60">Tagged</span>
            <ChevronRight size={12} />
            <span className="text-gold">{tag}</span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <Tag size={32} className="text-gold" />
            <h1 className="text-5xl md:text-6xl font-serif text-white tracking-tight uppercase">
              {tag}
            </h1>
          </div>
          <p className="text-white/40 text-[10px] tracking-[0.3em] uppercase">Handpicked selection of items</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8 border-y border-white/5 py-8">
          <div className="text-[10px] tracking-widest text-white/40 uppercase font-bold">
            Showing all products tagged with "{tag}"
          </div>

          <div className="flex items-center space-x-4">
            <SlidersHorizontal size={16} className="text-gold" />
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none outline-none text-[10px] tracking-widest uppercase text-white/60 cursor-pointer focus:text-gold transition"
            >
              <option value="newest" className="bg-luxury-black">Newest Arrivals</option>
              <option value="popularity" className="bg-luxury-black">Most Popular</option>
              <option value="price-low" className="bg-luxury-black">Price: Low to High</option>
              <option value="price-high" className="bg-luxury-black">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {sortedProducts.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center">
            <div className="w-20 h-20 bg-white/5 flex items-center justify-center rounded-full mb-6 border border-white/10">
              <Tag className="text-white/20" />
            </div>
            <p className="text-white/20 tracking-widest uppercase text-center">No products found with tag "{tag}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
