import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Plus, Search, Filter, X, Truck, Heart, Star } from 'lucide-react';
import { useCart } from '../CartContext';
import { useWishlist } from '../WishlistContext';
import { toast } from 'sonner';
import ProductCard from '../components/ProductCard';

const ProductSkeleton = () => (
  <div className="animate-pulse flex flex-col h-full rounded-xl overflow-hidden bg-white border border-black/5 shadow-sm">
    <div className="bg-black/5 aspect-[3/4] rounded-t-xl" />
    <div className="p-4 md:p-6 space-y-4">
      <div className="h-4 bg-black/5 w-2/3 rounded-full" />
      <div className="h-6 bg-black/5 w-1/3 rounded-full" />
    </div>
  </div>
);

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [selectedSizes, setSelectedSizes] = useState<{[key: string]: string}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    // Fetch Products
    const qProd = query(collection(db, 'products'));
    const unsubProd = onSnapshot(qProd, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setProducts(items);
      setLoading(false);
    }, (error) => {
      setLoading(false);
    });

    // Fetch Categories
    const qCat = query(collection(db, 'categories'));
    const unsubCat = onSnapshot(qCat, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(cats);
    });

    // Fetch Collections
    const qCol = query(collection(db, 'collections'));
    const unsubCol = onSnapshot(qCol, (snapshot) => {
      const cols = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCollections(cols);
    });

    return () => {
      unsubProd();
      unsubCat();
      unsubCol();
    };
  }, []);

  useEffect(() => {
    let filtered = products;

    if (selectedCategory !== 'All') {
      const selectedCat = categories.find(c => c.id === selectedCategory);
      filtered = filtered.filter(p => 
        p.categoryId === selectedCategory || 
        (selectedCat && p.category === selectedCat.name)
      );
    }

    if (searchQuery.trim()) {
      const queryStr = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const catObj = categories.find(c => c.id === p.categoryId);
        return (
          p.name.toLowerCase().includes(queryStr) || 
          (p.category || catObj?.name || '').toLowerCase().includes(queryStr) ||
          p.description?.toLowerCase().includes(queryStr)
        );
      });
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory]);

  const handleAddToCart = (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const size = selectedSizes[product.id];
    if (!size) {
      toast.error('Please select a size first');
      return;
    }

    const variant = product.variants?.find((v: any) => v.size === size);
    if (variant && variant.stock <= 0) {
      toast.error('This size is out of stock');
      return;
    }

    // Debug log for price consistency
    const basePrice = (variant && variant.price) ? variant.price : product.price;
    const finalPrice = product.discountedPrice ?? basePrice;
    
    console.log("Product price:", product.price);
    console.log("Discounted price:", product.discountedPrice);
    console.log("Final cart price:", finalPrice);

    addToCart({
      id: product.id,
      name: product.name,
      price: Number(Number(finalPrice).toFixed(0)),
      image: product.images?.[0] || product.image,
      quantity: 1,
      size: size,
      deliveryType: product.deliveryType,
      insideDhaka: Number(product.insideDhaka || 0),
      outsideDhaka: Number(product.outsideDhaka || 0)
    });
    toast.success('Added to bag');
  };

  const selectSize = (productId: string, size: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSizes(prev => ({ ...prev, [productId]: size }));
  };

  const [currentSlide, setCurrentSlide] = useState(0);
  const heroImages = [
    "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=2070",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2070",
    "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=2071",
    "https://images.unsplash.com/photo-1470309864661-68328b2cd0a5?auto=format&fit=crop&q=80&w=2070",
    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=1974"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  return (
    <div className="pt-16 pb-20 md:pb-0">
      {/* 1. 🔥 HERO SECTION (PRODUCT-FIRST) */}
      <section className="relative h-[85vh] md:h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <AnimatePresence>
            <motion.img 
              key={currentSlide}
              src={heroImages[currentSlide]} 
              alt="Premium Shirt Model" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
          {/* Dark Overlay for Readability */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10" />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <span className="bg-red-600 text-white text-[10px] md:text-xs font-black tracking-[0.3em] px-4 py-1.5 rounded-full shadow-lg inline-block uppercase">
              Limited Edition Collection
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-6xl font-serif mb-6 tracking-tighter leading-tight text-white uppercase italic font-black"
          >
            Premium Shirts That Make You <span className="text-red-500">Look Sharp</span> Instantly
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/90 text-lg md:text-2xl font-medium tracking-wide mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            Breathable Fabric. Perfect Fit. Cash on Delivery Available.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-10 flex items-center justify-center gap-2"
          >
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <span className="text-white/80 text-xs md:text-sm font-bold tracking-widest uppercase">
              Trusted by 1000+ Happy Customers
            </span>
          </motion.div>

          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.4 }}
             className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a 
              href="#featured" 
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 bg-white text-black px-12 py-5 text-lg font-black tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all group rounded-full shadow-2xl active:scale-95"
            >
              <span>SHOP NOW</span>
              <ChevronRight size={24} className="group-hover:translate-x-2 transition" />
            </a>
            <a 
              href="#collection" 
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 bg-transparent border-2 border-white/30 text-white px-10 py-5 text-lg font-bold tracking-[0.2em] hover:bg-white/10 transition-all rounded-full backdrop-blur-sm"
            >
              BROWSE ALL
            </a>
          </motion.div>
        </div>
      </section>

      {/* 2. ⚡ URGENCY + OFFER STRIP */}
      <div className="bg-black py-4 overflow-hidden border-y border-white/10">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center space-x-12 mx-6">
              <span className="text-red-500 font-black tracking-widest text-xs md:text-sm uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                🔥 Limited Stock Available
              </span>
              <span className="text-white font-black tracking-widest text-xs md:text-sm uppercase flex items-center gap-2">
                <Truck size={16} className="text-amber-400" />
                🚚 BUY 2+ ITEMS FOR FREE DELIVERY
              </span>
              <span className="text-amber-400 font-black tracking-widest text-xs md:text-sm uppercase flex items-center gap-2">
                ⏳ Offer Ends Tonight
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2.5 🏷️ CATEGORY BUTTONS (NEW) */}
      <section className="bg-white py-12 px-4 border-b border-black/5">
        <div className="max-w-7xl mx-auto flex overflow-x-auto gap-4 no-scrollbar pb-2">
          <Link
            to="/category/all"
            className="px-8 py-3 bg-black text-white text-[10px] md:text-xs font-black tracking-widest uppercase rounded-full shadow-lg whitespace-nowrap hover:bg-red-600 transition-all flex items-center gap-2 active:scale-95"
          >
            <ShoppingBag size={14} />
            All Collection
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="px-8 py-3 bg-white border border-black/10 text-black text-[10px] md:text-xs font-black tracking-widest uppercase rounded-full whitespace-nowrap hover:border-black hover:bg-black/5 transition-all active:scale-95"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      {/* 3. 🛍️ FEATURED PRODUCTS (ABOVE THE FOLD ON MOBILE) */}
      <section id="featured" className="max-w-7xl mx-auto px-4 py-20 px-4">
        <div className="mb-12 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <span className="text-red-600 text-[10px] md:text-xs font-black tracking-[0.4em] uppercase mb-2 block">Trending Now</span>
            <h2 className="text-3xl md:text-5xl font-serif tracking-tighter text-black uppercase font-black italic">BEST SELLERS</h2>
          </div>
          <Link to="/category/All" className="text-xs font-black tracking-widest uppercase hover:text-red-600 transition flex items-center gap-2 group">
            View All Collection
            <ChevronRight size={16} className="group-hover:translate-x-1 transition" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
            {[1, 2, 3, 4].map(i => <ProductSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
            {products
              .filter(p => p.isFeatured || (p.tags && p.tags.includes('bestseller')))
              .slice(0, 4)
              .map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            }
            {products.filter(p => p.isFeatured || (p.tags && p.tags.includes('bestseller'))).length === 0 && 
              products.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            }
          </div>
        )}
      </section>

      {/* 4. 🧩 DYNAMIC COLLECTIONS (REPLACED QUICK NAVIGATION) */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-red-600 text-[10px] md:text-xs font-black tracking-[0.4em] uppercase mb-4 block">Exclusive Pairs</span>
            <h2 className="text-4xl md:text-6xl font-serif tracking-widest text-black uppercase font-black italic mb-4">OUR COLLECTIONS</h2>
            <p className="text-black/40 text-xs tracking-[0.3em] font-bold uppercase">Discover Curated Style Categories</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {collections.filter(c => c.isFeatured).map((col) => (
              <Link 
                key={col.id} 
                to={`/collection/${col.slug}`} 
                className="group relative h-[400px] md:h-[500px] overflow-hidden rounded-2xl shadow-xl transition-all duration-500 hover:shadow-2xl active:scale-98"
              >
                {/* Image background */}
                <img 
                  src={col.bannerImage || 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=2070'} 
                  alt={col.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full transform transition-transform duration-500">
                  <span className="text-red-500 text-[10px] font-black tracking-[0.4em] uppercase mb-3 block transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    Featured Collection
                  </span>
                  <h3 className="text-3xl md:text-4xl font-serif text-white font-black italic uppercase tracking-tighter mb-4 translate-y-2 transition-transform duration-500 group-hover:translate-y-0">
                    {col.name}
                  </h3>
                  <div className="flex items-center gap-3 text-white font-black tracking-[0.2em] text-[10px] uppercase">
                    <span className="bg-white text-black px-6 py-3 rounded-full hover:bg-red-600 hover:text-white transition-colors duration-300">Explore Collection</span>
                  </div>
                </div>
              </Link>
            ))}
            {collections.filter(c => c.isFeatured).length === 0 && (
              <div className="col-span-full text-center py-20 bg-black/5 rounded-2xl border-2 border-dashed border-black/10">
                <p className="text-black/20 font-black tracking-[0.4em] uppercase text-sm">No featured collections found</p>
                <p className="text-black/10 text-[10px] font-bold uppercase mt-2">Enable 'Featured' in Admin Panel to show here</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. 🛒 ALL PRODUCTS / COLLECTION */}
      <section id="collection" className="max-w-7xl mx-auto px-4 py-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div>
            <span className="text-red-600 text-[10px] md:text-xs font-black tracking-[0.4em] uppercase mb-2 block">Our Collection</span>
            <h2 className="text-3xl md:text-5xl font-serif tracking-tighter text-black uppercase font-black italic">SHOP THE STYLES</h2>
          </div>
          
          <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
            <div className="relative group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20 group-focus-within:text-black transition" />
              <input 
                type="text" 
                placeholder="Search styles..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 bg-black/5 border border-black/10 pl-12 pr-10 py-4 text-xs tracking-widest focus:border-black outline-none transition rounded-full text-black font-bold"
              />
            </div>

            <div className="flex overflow-x-auto gap-2 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-8 py-4 text-[10px] tracking-widest uppercase border transition whitespace-nowrap rounded-full font-black ${
                  selectedCategory === 'All' 
                    ? 'bg-black text-white border-black shadow-lg scale-105' 
                    : 'border-black/10 text-black/40 hover:border-black'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-8 py-4 text-[10px] tracking-widest uppercase border transition whitespace-nowrap rounded-full font-black ${
                    selectedCategory === cat.id 
                      ? 'bg-black text-white border-black shadow-lg scale-105' 
                      : 'border-black/10 text-black/40 hover:border-black'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <ProductSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 6. 🎯 WHY CHOOSE US */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { title: 'Premium Fabric', desc: 'Superior comfort & durability', icon: <Star className="text-amber-500" /> },
            { title: 'Perfect Fit', desc: 'Tailored for everyday sharp look', icon: <Heart className="text-red-500" /> },
            { title: 'Easy Returns', desc: 'Non-hassle replacement policy', icon: <ChevronRight className="text-black" /> },
            { title: 'Fast Delivery', desc: 'Dhaka 24h | Outside 48-72h', icon: <Truck className="text-blue-500" /> }
          ].map((benefit, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6 bg-white border border-black/5 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mb-4">
                {benefit.icon}
              </div>
              <h4 className="text-xs md:text-sm font-black tracking-widest uppercase mb-2 text-black">{benefit.title}</h4>
              <p className="text-[10px] text-black/40 font-bold leading-relaxed">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. ⭐ SOCIAL PROOF SECTION */}
      <section className="bg-black py-24 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="grid grid-cols-6 gap-4">
            {[...Array(24)].map((_, i) => <div key={i} className="aspect-square bg-white rounded-full" />)}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif tracking-widest text-white uppercase font-black italic mb-4">What our customers say</h2>
            <div className="flex items-center justify-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
              <span className="text-white/60 text-xs font-black tracking-widest ml-2">4.9/5 RATING</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Rahim Ahmed", comment: "Excellent quality! The fabric is very breathable. Will order again.", location: "Dhaka" },
              { name: "Tanvir Hasan", comment: "Perfect fit. Best premium shirts I've bought online so far.", location: "Chittagong" },
              { name: "Sajid Islam", comment: "Fast delivery and great customer support. Highly recommended!", location: "Sylhet" }
            ].map((review, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm shadow-2xl">
                <p className="text-white/80 font-medium text-sm italic mb-6 leading-relaxed">"{review.comment}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white font-black">{review.name[0]}</div>
                  <div>
                    <h4 className="text-white text-xs font-black tracking-widest uppercase">{review.name}</h4>
                    <p className="text-white/30 text-[10px] tracking-widest uppercase font-bold">{review.location} • Verified Buyer</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. 📦 TRUST + DELIVERY INFO */}
      <section className="bg-black text-white py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-4xl font-serif italic font-black uppercase tracking-widest mb-12">Seamless Shipping</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-white/10 pt-16">
              <div>
                <h4 className="text-lg font-black tracking-widest mb-4 uppercase italic">Cash on Delivery</h4>
                <p className="text-white/40 text-sm font-bold leading-relaxed">Pay only when you receive your premium shirts. Zero risk shopping.</p>
              </div>
              <div>
                <h4 className="text-lg font-black tracking-widest mb-4 uppercase italic">Easy Returns</h4>
                <p className="text-white/40 text-sm font-bold leading-relaxed">7-day hassle-free return and exchange policy for any measurement issues.</p>
              </div>
              <div>
                <h4 className="text-lg font-black tracking-widest mb-4 uppercase italic">Fast Shipping</h4>
                <p className="text-white/40 text-sm font-bold leading-relaxed">Same day shipping for Dhaka orders and 48-72h for outside Dhaka.</p>
              </div>
            </div>
        </div>
      </section>

    </div>
  );
}

