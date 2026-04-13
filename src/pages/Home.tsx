import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Plus } from 'lucide-react';
import { useCart } from '../CartContext';
import { toast } from 'sonner';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [selectedSizes, setSelectedSizes] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      setLoading(false);
    }, (error) => {
      const errInfo = {
        error: error.message,
        operationType: 'list',
        path: 'products',
        authInfo: {
          userId: auth.currentUser?.uid,
          isAnonymous: auth.currentUser?.isAnonymous
        }
      };
      console.error("Home products listener error:", JSON.stringify(errInfo));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleAddToCart = (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const size = selectedSizes[product.id];
    if (!size) {
      toast.error('Please select a size first');
      return;
    }

    // Debug log for price consistency
    const finalPrice = product.discountedPrice ?? product.price;
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

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2070" 
            alt="Hero" 
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-luxury-black/20 via-luxury-black/60 to-luxury-black" />
        </div>
        
        <div className="relative z-10 text-center px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-serif mb-6 tracking-tighter"
          >
            The Art of <span className="text-gold italic">Style</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light tracking-widest"
          >
            PREMIUM CLOTHING FOR THE MODERN INDIVIDUAL
          </motion.p>
          <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.5 }}
          >
            <a href="#collection" className="inline-flex items-center space-x-2 bg-gold text-luxury-black px-10 py-4 font-bold tracking-widest hover:brightness-110 transition group">
              <span>EXPLORE COLLECTION</span>
              <ChevronRight size={20} className="group-hover:translate-x-1 transition" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Collection Grid */}
      <section id="collection" className="max-w-7xl mx-auto px-4 py-24">
        <div className="flex justify-between items-end mb-16">
          <div>
            <h2 className="text-3xl font-serif mb-2">New Arrivals</h2>
            <div className="h-1 w-20 bg-gold" />
          </div>
          <p className="text-white/40 text-sm tracking-widest hidden md:block">CURATED SELECTION</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-white/5 aspect-[3/4] mb-4" />
                <div className="h-4 bg-white/5 w-2/3 mb-2" />
                <div className="h-4 bg-white/5 w-1/3" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 border border-gold/10 bg-white/5">
            <p className="text-white/40 tracking-widest mb-4">NO PRODUCTS FOUND</p>
            <p className="text-sm text-gold/60">Admin needs to add products to the catalog.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {products.map((product) => (
              <motion.div 
                key={product.id}
                whileHover={{ y: -10 }}
                className="group relative flex flex-col"
              >
                <Link to={`/product/${product.id}`} className="flex flex-col h-full">
                  <div className="relative aspect-[3/4] mb-4 bg-white/5 flex items-center justify-center overflow-hidden">
                    <img 
                      src={product.images?.[0] || product.image || undefined} 
                      alt={product.name} 
                      className="max-w-full max-h-full object-contain transition-all duration-700 scale-105 group-hover:scale-100 block"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-luxury-black/20 group-hover:bg-transparent transition duration-500" />
                    
                    {/* Desktop Hover Quick Add Overlay */}
                    <div className="hidden md:block absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition duration-500 bg-luxury-black/90 backdrop-blur-sm border-t border-gold/20">
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-center gap-2">
                          {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                            <button
                              key={size}
                              onClick={(e) => selectSize(product.id, size, e)}
                              className={`w-8 h-8 text-[10px] border flex items-center justify-center transition ${selectedSizes[product.id] === size ? 'bg-gold text-luxury-black border-gold' : 'border-white/20 text-white/60 hover:border-gold/50'}`}
                            >
                              {size}
                            </button>
                          ))}
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
                  <div className="md:hidden flex flex-col gap-3 mb-4 px-2">
                    <div className="flex justify-center gap-2">
                      {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                        <button
                          key={size}
                          onClick={(e) => selectSize(product.id, size, e)}
                          className={`w-8 h-8 text-[10px] border flex items-center justify-center transition ${selectedSizes[product.id] === size ? 'bg-gold text-luxury-black border-gold' : 'border-white/20 text-white/60 hover:border-gold/50'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={(e) => handleAddToCart(product, e)}
                      className="w-full bg-gold text-luxury-black py-3 text-[10px] font-bold tracking-widest flex items-center justify-center space-x-2 active:scale-95 transition"
                    >
                      <Plus size={14} />
                      <span>ADD TO BAG</span>
                    </button>
                  </div>

                  <div className="flex justify-between items-start px-2 mt-auto">
                    <div>
                      <h3 className="text-xl font-serif group-hover:text-gold transition">{product.name}</h3>
                      {(() => {
                        console.log(`Displayed price for ${product.name}:`, product.price);
                        return (
                          <div className="flex items-center gap-2 mt-1">
                            {product.discountedPrice ? (
                              <>
                                <p className="text-gold text-sm tracking-widest font-bold">৳{product.discountedPrice}</p>
                                <p className="text-white/20 text-xs tracking-widest line-through">৳{product.price}</p>
                              </>
                            ) : (
                              <p className="text-white/40 text-sm tracking-widest">৳{product.price}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="text-gold/60 text-[10px] tracking-widest uppercase mt-2">{product.category}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Brand Values */}
      <section className="bg-white/5 py-24 border-y border-gold/10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-16 text-center">
          <div>
            <h4 className="text-gold font-serif text-xl mb-4 italic">Quality First</h4>
            <p className="text-white/50 font-light leading-relaxed">We source the finest materials globally to ensure every piece feels as good as it looks.</p>
          </div>
          <div>
            <h4 className="text-gold font-serif text-xl mb-4 italic">Timeless Design</h4>
            <p className="text-white/50 font-light leading-relaxed">Our aesthetic transcends trends, focusing on silhouettes that remain elegant for years.</p>
          </div>
          <div>
            <h4 className="text-gold font-serif text-xl mb-4 italic">Ethical Craft</h4>
            <p className="text-white/50 font-light leading-relaxed">Responsibly made with a commitment to fair labor and sustainable practices.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
