import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Plus, Search, Filter, X, Truck, Heart, Star } from 'lucide-react';
import { useCart } from '../CartContext';
import { useWishlist } from '../WishlistContext';
import { toast } from 'sonner';

const ProductSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-white/5 aspect-[3/4] mb-4 rounded-sm" />
    <div className="h-4 bg-white/5 w-2/3 mb-2 rounded-sm" />
    <div className="h-4 bg-white/5 w-1/3 rounded-sm" />
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
    "https://www.morshedmart.com/slider-1.png?dpl=dpl_FuneRQY5byyxYRnai9an2zNeRPbx",
    "https://www.morshedmart.com/slider-2.png?dpl=dpl_FuneRQY5byyxYRnai9an2zNeRPbx",
    "https://www.morshedmart.com/slider-3.png?dpl=dpl_FuneRQY5byyxYRnai9an2zNeRPbx",
    "https://images.unsplash.com/photo-1470309864661-68328b2cd0a5?auto=format&fit=crop&q=80&w=2070",
    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=1974"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode='wait'>
            <motion.img 
              key={currentSlide}
              src={heroImages[currentSlide]} 
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 0.7, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              alt="Hero" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-luxury-black/10 via-luxury-black/40 to-luxury-black/90" />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <br /><br />
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl sm:text-7xl md:text-8xl font-serif mb-10 tracking-tighter leading-tight"
          >
            Look Sharp, <span className="text-gold italic">Feel Confident</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-white/90 text-lg md:text-2xl font-light tracking-wide mb-8"
          >
            Breathable Premium Fabric. Perfect Fit.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mb-14"
          >
            <span className="text-white/70 text-sm md:text-base font-medium tracking-widest flex items-center justify-center gap-2">
              <span className="text-gold text-lg">★</span> TRUSTED BY 1000+ HAPPY CUSTOMERS
            </span>
          </motion.div>

          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.6, duration: 0.8 }}
             className="mb-16"
          >
            <motion.a 
              href="#collection" 
              animate={{ 
                scale: [1, 1.05, 1],
                boxShadow: [
                  "0 0 0px rgba(212,175,55,0)", 
                  "0 0 30px rgba(212,175,55,0.6)", 
                  "0 0 0px rgba(212,175,55,0)"
                ],
                filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"]
              }}
              transition={{ 
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-flex items-center space-x-3 bg-gold text-luxury-black px-12 py-5 text-lg font-bold tracking-widest hover:brightness-110 transition-all group rounded-sm shadow-2xl"
            >
              <span>SHOP NOW</span>
              <ChevronRight size={24} className="group-hover:translate-x-2 transition" />
            </motion.a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-white/40 text-xs md:text-sm uppercase tracking-[0.2em] font-medium"
          >
            <span className="flex items-center gap-2">
              Cash on delivery
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20 hidden md:block" />
            <span className="flex items-center gap-2">
             3 Day's Easy Returns with Conditions
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20 hidden md:block" />
            <span className="flex items-center gap-2">
              Fast Delivery
            </span>
          </motion.div>
        </div>
      </section>

      {/* Promotional Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center justify-center pt-24 pb-8 px-4"
      >
        <motion.div 
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col md:flex-row items-center gap-4 text-gold group cursor-default"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              boxShadow: ["0 0 0px rgba(212,175,55,0)", "0 0 20px rgba(212,175,55,0.4)", "0 0 0px rgba(212,175,55,0)"]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="p-3 rounded-full border border-gold/30 flex items-center justify-center bg-gold/5"
          >
            <Truck size={28} strokeWidth={1.5} />
          </motion.div>
          <div className="text-center">
            <h3 className="text-sm md:text-2xl font-serif tracking-[0.1em] leading-relaxed">
              একসাথে ৩টি পণ্য কিনুন এবং উপভোগ করুন{" "}
              <motion.span 
                animate={{ 
                  textShadow: [
                    "0 0 0px rgba(212,175,55,0)",
                    "0 0 15px rgba(212,175,55,0.8)",
                    "0 0 0px rgba(212,175,55,0)"
                  ],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="relative inline-block font-bold italic text-gold"
              >
                ফ্রি ডেলিভারি
              </motion.span>{" "}
              বাংলাদেশের যেকোনো প্রান্তে!
            </h3>
          </div>
        </motion.div>
      </motion.div>

      {/* Featured Collections Section */}
      {collections.filter(c => c.isFeatured).length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-24 pb-0">
          <div className="mb-12">
            <h2 className="text-3xl font-serif mb-2 tracking-widest uppercase">Editor's Picks</h2>
            <div className="h-1 w-20 bg-gold" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.filter(c => c.isFeatured).slice(0, 3).map((col) => (
              <Link key={col.id} to={`/collection/${col.slug}`} className="relative aspect-square md:aspect-[4/5] bg-luxury-black overflow-hidden group">
                <img src={col.bannerImage || null} alt={col.name} className="w-full h-full object-cover transition duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100" />
                <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-10 left-10 right-10">
                  <h3 className="text-2xl font-serif text-white mb-2 tracking-widest uppercase">{col.name}</h3>
                  <p className="text-[10px] tracking-widest text-gold font-bold uppercase border-b border-gold inline-block pb-1 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition duration-500">View Collection</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Collection Grid */}
      <section id="collection" className="max-w-7xl mx-auto px-4 py-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div>
            <h2 className="text-3xl font-serif mb-2 tracking-widest uppercase">SHOP THE STYLES</h2>
            <div className="h-1 w-20 bg-gold" />
          </div>
          
          <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="relative group mb-4 md:mb-0">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold transition" />
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 bg-white/5 border border-white/10 pl-12 pr-10 py-3 text-xs tracking-widest focus:border-gold outline-none transition rounded-sm no-scrollbar"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Filters */}
            <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-6 py-3 text-[10px] tracking-widest uppercase border transition whitespace-nowrap rounded-sm ${
                  selectedCategory === 'All' 
                    ? 'bg-gold text-luxury-black border-gold font-bold' 
                    : 'border-white/10 text-white/40 hover:border-gold/50'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-6 py-3 text-[10px] tracking-widest uppercase border transition whitespace-nowrap rounded-sm ${
                    selectedCategory === cat.id 
                      ? 'bg-gold text-luxury-black border-gold font-bold' 
                      : 'border-white/10 text-white/40 hover:border-gold/50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-12">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <ProductSkeleton key={i} />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 md:py-32 border border-gold/10 bg-white/5 rounded-sm">
            <ShoppingBag size={48} className="mx-auto mb-6 text-white/10" />
            <p className="text-white/40 tracking-widest mb-2 uppercase text-sm">No products found</p>
            <p className="text-[10px] text-gold/60">Try adjusting your search or filters.</p>
            {(searchQuery || selectedCategory !== 'All') && (
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                className="mt-8 text-[10px] tracking-widest text-gold hover:underline uppercase"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-12">
            {filteredProducts.map((product) => (
              <motion.div 
                key={product.id}
                whileHover={{ y: -10 }}
                className="group relative flex flex-col"
              >
                <Link to={`/product/${product.id}`} className="flex flex-col h-full">
                  <div className="relative aspect-[3/4] mb-4 bg-white/5 flex items-center justify-center overflow-hidden">
                    <img 
                      src={product.images?.[0] || product.image || null} 
                      alt={product.name} 
                      className="max-w-full max-h-full object-contain block"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Premium Badges */}
                    {(() => {
                      const totalStock = product.variants?.reduce((acc: number, v: any) => acc + (v.stock || 0), 0) ?? 0;
                      let badge = null;
                      let badgeColor = "bg-gold";
                      
                      if (product.discountedPrice) {
                        badge = "SALE";
                        badgeColor = "bg-red-500";
                      } else if (totalStock > 0 && totalStock <= 10) {
                        badge = "LOW STOCK";
                        badgeColor = "bg-orange-500";
                      }
                      
                      if (!badge) return null;
                      
                      return (
                        <div className={`absolute top-0 left-0 ${badgeColor} text-white text-[8px] font-bold tracking-[0.2em] px-3 py-1.5 z-10`}>
                          {badge}
                        </div>
                      );
                    })()}

                    {/* Wishlist Toggle */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleWishlist({
                          id: product.id,
                          name: product.name,
                          price: product.discountedPrice || product.price,
                          image: product.images?.[0] || product.image
                        });
                      }}
                      className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-md transition-all duration-300 z-10 ${
                        isInWishlist(product.id) 
                          ? 'bg-gold text-luxury-black scale-110 shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                          : 'bg-black/20 text-white/60 hover:bg-black/40 hover:text-white'
                      }`}
                    >
                      <Heart size={16} fill={isInWishlist(product.id) ? "currentColor" : "none"} />
                    </button>

                    {/* Desktop Hover Quick Add Overlay */}
                    <div className="hidden md:block absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition duration-500 bg-luxury-black/90 backdrop-blur-sm border-t border-gold/20">
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-center gap-2">
                          {(product.variants && product.variants.length > 0 
                            ? product.variants.map((v: any) => v.size) 
                            : ['S', 'M', 'L', 'XL', 'XXL']
                          ).map(size => {
                            const variant = product.variants?.find((v: any) => v.size === size);
                            const isOutOfStock = variant && variant.stock <= 0;
                            return (
                              <button
                                key={size}
                                disabled={isOutOfStock}
                                onClick={(e) => selectSize(product.id, size, e)}
                                className={`w-8 h-8 text-[10px] border flex items-center justify-center transition ${
                                  selectedSizes[product.id] === size 
                                    ? 'bg-gold text-luxury-black border-gold' 
                                    : isOutOfStock
                                      ? 'border-white/5 text-white/10 cursor-not-allowed'
                                      : 'border-white/20 text-white/60 hover:border-gold/50'
                                }`}
                              >
                                {size}
                              </button>
                            );
                          })}
                        </div>
                        <button 
                          onClick={(e) => handleAddToCart(product, e)}
                          className="w-full bg-gold text-luxury-black py-2 text-[10px] font-bold tracking-widest flex items-center justify-center space-x-2 hover:brightness-110 transition"
                        >
                          <Plus size={14} />
                          <span>ADD TO BAG</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Permanent Quick Add (Visible only on mobile) */}
                  <div className="md:hidden flex flex-col gap-2 mb-4 px-1">
                    <div className="flex flex-wrap justify-center gap-1">
                      {(product.variants && product.variants.length > 0 
                        ? product.variants.map((v: any) => v.size) 
                        : ['S', 'M', 'L', 'XL', 'XXL']
                      ).slice(0, 5).map(size => { // Limiting to top 5 for mobile grid space
                        const variant = product.variants?.find((v: any) => v.size === size);
                        const isOutOfStock = variant && variant.stock <= 0;
                        return (
                          <button
                            key={size}
                            disabled={isOutOfStock}
                            onClick={(e) => selectSize(product.id, size, e)}
                            className={`w-7 h-7 text-[8px] border flex items-center justify-center transition rounded-sm ${
                              selectedSizes[product.id] === size 
                                ? 'bg-gold text-luxury-black border-gold font-bold' 
                                : isOutOfStock
                                  ? 'border-white/5 text-white/10 cursor-not-allowed opacity-30'
                                  : 'border-white/20 text-white/60 hover:border-gold/50'
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                    <button 
                      onClick={(e) => handleAddToCart(product, e)}
                      className="w-full bg-gold text-luxury-black py-2.5 text-[9px] font-bold tracking-widest flex items-center justify-center space-x-1 active:scale-95 transition rounded-sm shadow-lg shadow-gold/10"
                    >
                      <Plus size={12} />
                      <span>ADD TO BAG</span>
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start px-2 mt-auto pb-4">
                    <div>
                      <h3 className="text-sm md:text-xl font-serif group-hover:text-gold transition line-clamp-1">{product.name}</h3>
                      {(() => {
                        return (
                          <div className="flex items-center gap-2 mt-0.5">
                            {product.discountedPrice ? (
                              <>
                                <p className="text-gold text-[10px] md:text-sm tracking-widest font-bold">৳{product.discountedPrice}</p>
                                <p className="text-white/20 text-[8px] md:text-xs tracking-widest line-through">৳{product.price}</p>
                              </>
                            ) : (
                              <p className="text-white/40 text-[10px] md:text-sm tracking-widest">৳{product.price}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="text-gold/60 text-[8px] tracking-widest uppercase mt-2 hidden sm:block">{product.category}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Customer Reviews - Animated Marquee */}
      <section className="bg-white/5 py-24 border-y border-gold/10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-12 text-center">
          <h2 className="text-2xl font-serif tracking-[0.2em] mb-2 uppercase">What Specialists Say</h2>
          <div className="h-1 w-12 bg-gold mx-auto" />
        </div>

        <div className="relative flex overflow-hidden group">
          <motion.div 
            animate={{ x: ["0%", "-50%"] }}
            transition={{ 
              duration: 30, 
              ease: "linear", 
              repeat: Infinity 
            }}
            className="flex space-x-8 whitespace-nowrap py-4"
          >
            {[
              { name: "Tanvir Ahmed", comment: "কাপড়ের কোয়ালিটি অসাধারণ, ডেলিভারিও দ্রুত পেয়েছি।" },
              { name: "Rakibul Islam", comment: "ফিটিং একদম পারফেক্ট। প্রিমিয়াম ড্রেসের জন্য সেরা জায়গা।" },
              { name: "Mahfuzur Rahman", comment: "ডিজাইনগুলো খুবই ক্লাসি। সবার কাছে রিকমেন্ড করছি।" },
              { name: "Arif Hossain", comment: "খুবই আরামদায়ক কাপড়, গরমের জন্য একদম উপযুক্ত।" },
              { name: "Sakib Khan", comment: "প্রাইস অনুযায়ী কোয়ালিটি অনেক ভালো, আমি সন্তুষ্ট।" },
              { name: "Hasan Mahmud", comment: "ডেলিভারি ম্যান অনেক আন্তরিক ছিল, প্রোডাক্টও ভালো।" },
              { name: "Jewel Ahmed", comment: "কালারটা ঠিক যেমনটা ছবিতে দেখেছি তেমনটাই পেয়েছি।" },
              { name: "Milon Khan", comment: "অর্ডার করার ২ দিনের মধ্যেই প্রোডাক্ট পেয়েছি, ধন্যবাদ।" },
              { name: "Faisal Ahmed", comment: "প্যাকেজিং খুব সুন্দর ছিল, প্রোডাক্টও উন্নত মানের।" },
              { name: "Shuvo Ray", comment: "বাজেটের মধ্যে এমন লাক্সারি ফিল আর কোথাও পাইনি।" },
              // Duplicate for seamless loop
              { name: "Tanvir Ahmed", comment: "কাপড়ের কোয়ালিটি অসাধারণ, ডেলিভারিও দ্রুত পেয়েছি।" },
              { name: "Rakibul Islam", comment: "ফিটিং একদম পারফেক্ট। প্রিমিয়াম ড্রেসের জন্য সেরা জায়গা।" },
              { name: "Mahfuzur Rahman", comment: "ডিজাইনগুলো খুবই ক্লাসি। সবার কাছে রিকমেন্ড করছি।" },
              { name: "Arif Hossain", comment: "খুবই আরামদায়ক কাপড়, গরমের জন্য একদম উপযুক্ত।" },
              { name: "Sakib Khan", comment: "প্রাইস অনুযায়ী কোয়ালিটি অনেক ভালো, আমি সন্তুষ্ট।" },
              { name: "Hasan Mahmud", comment: "ডেলিভারি ম্যান অনেক আন্তরিক ছিল, প্রোডাক্টও ভালো।" },
              { name: "Jewel Ahmed", comment: "কালারটা ঠিক যেমনটা ছবিতে দেখেছি তেমনটাই পেয়েছি।" },
              { name: "Milon Khan", comment: "অর্ডার করার ২ দিনের মধ্যেই প্রোডাক্ট পেয়েছি, ধন্যবাদ।" },
              { name: "Faisal Ahmed", comment: "প্যাকেজিং খুব সুন্দর ছিল, প্রোডাক্টও উন্নত মানের।" },
              { name: "Shuvo Ray", comment: "বাজেটের মধ্যে এমন লাক্সারি ফিল আর কোথাও পাইনি।" },
            ].map((review, idx) => (
              <div 
                key={idx} 
                className="inline-block w-[300px] bg-luxury-black border border-gold/10 p-8 rounded-sm hover:border-gold/30 transition-colors"
              >
                <div className="flex text-gold mb-4 space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} fill="currentColor" />
                  ))}
                </div>
                <p className="text-white/60 font-light text-sm italic mb-6 whitespace-normal leading-relaxed overflow-hidden line-clamp-3">
                  "{review.comment}"
                </p>
                <div className="border-t border-gold/10 pt-4">
                  <h4 className="text-gold font-serif text-sm tracking-widest uppercase">{review.name}</h4>
                  <p className="text-[10px] text-white/20 tracking-tighter mt-1 uppercase">Verified Purchase</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}

