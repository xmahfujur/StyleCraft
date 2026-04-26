import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs, or } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { Filter, SlidersHorizontal, ChevronRight } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { Product, Category } from '../types';

export default function CategoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [categoryData, setCategoryData] = useState<Category | null>(null);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    if (!slug) return;

    const findCategory = async () => {
      const catQuery = query(collection(db, 'categories'), where('slug', '==', slug));
      const snap = await getDocs(catQuery);
      
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as Category;
        setCategoryData(data);
        
        // Fetch Subcategories
        const subQuery = query(collection(db, 'categories'), where('parentCategoryId', '==', data.id));
        const subSnap = await getDocs(subQuery);
        setSubCategories(subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[]);

        // Fetch Products for this category and its subcategories
        // For simplicity now, just this category
        const prodQuery = query(
          collection(db, 'products'), 
          or(
            where('categoryId', '==', data.id),
            where('category', '==', data.name)
          )
        );
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

    findCategory();
  }, [slug]);

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

  if (!categoryData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-luxury-black px-4 text-center">
        <h2 className="text-4xl font-serif mb-6 text-white">Category Not Found</h2>
        <Link to="/" className="text-gold hover:underline tracking-widest uppercase">Return to Home</Link>
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
            <span className="text-white/60">Category</span>
            <ChevronRight size={12} />
            <span className="text-gold">{categoryData.name}</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-serif text-white mb-4 tracking-tight uppercase italic underline decoration-gold/30">
            {categoryData.name}
          </h1>
          <p className="text-white/40 text-[10px] tracking-[0.3em] uppercase">Premium selection of items</p>
        </div>

        {/* Subcategories (if any) */}
        {subCategories.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-12">
            {subCategories.map(sub => (
              <Link 
                key={sub.id} 
                to={`/category/${sub.slug}`}
                className="px-6 py-3 bg-white/5 border border-white/10 hover:border-gold/50 text-[10px] tracking-widest uppercase transition rounded-sm text-white/60 hover:text-gold"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        )}

        {/* Filters & Sorting */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8 border-y border-white/5 py-8">
          <div className="flex items-center space-x-4">
            <Filter size={18} className="text-gold" />
            <span className="text-[10px] tracking-widest text-white/40 uppercase font-bold">{products.length} Products Available</span>
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
              <Filter className="text-white/20" />
            </div>
            <p className="text-white/20 tracking-widest uppercase">No products found in this category.</p>
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
