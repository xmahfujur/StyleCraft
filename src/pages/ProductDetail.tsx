import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useCart } from '../CartContext';
import { AnimatePresence, motion } from 'motion/react';
import { ShoppingBag, ArrowLeft, Check, Ruler, X, ChevronRight, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../WishlistContext';
import { toast } from 'sonner';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [adding, setAdding] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  const shirtSizes = [
    { size: 'S', chest: '36', length: '26', shoulder: '16' },
    { size: 'M', chest: '38', length: '27', shoulder: '17' },
    { size: 'L', chest: '40', length: '28', shoulder: '18' },
    { size: 'XL', chest: '42', length: '29', shoulder: '19' },
  ];

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error: any) {
        const errInfo = {
          error: error.message,
          operationType: 'get',
          path: `products/${id}`,
          authInfo: {
            userId: auth.currentUser?.uid,
            isAnonymous: auth.currentUser?.isAnonymous
          }
        };
        console.error("Product fetch error:", JSON.stringify(errInfo));
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    const fetchRelated = async () => {
      if (!product?.category || !id) return;
      try {
        const q = query(
          collection(db, 'products'),
          where('category', '==', product.category),
          limit(5)
        );
        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => p.id !== id)
          .slice(0, 4);
        setRelatedProducts(items);
      } catch (error) {
        console.error("Related products fetch error:", error);
      }
    };
    fetchRelated();
  }, [product?.category, id]);

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }

    const variant = product.variants?.find((v: any) => v.size === selectedSize);
    if (variant && variant.stock <= 0) {
      toast.error('This size is out of stock');
      return;
    }

    setAdding(true);
    
    // Debug log for price consistency
    const basePrice = (variant && variant.price) ? variant.price : product.price;
    const finalPrice = product.discountedPrice ?? basePrice;
    
    console.log("Base price:", basePrice);
    console.log("Discounted price:", product.discountedPrice);
    console.log("Final cart price:", finalPrice);
    
    addToCart({
      id: product.id,
      name: product.name,
      price: Number(Number(finalPrice).toFixed(0)),
      image: product.images?.[0] || product.image,
      quantity: 1,
      size: selectedSize,
      deliveryType: product.deliveryType,
      insideDhaka: Number(product.insideDhaka || 0),
      outsideDhaka: Number(product.outsideDhaka || 0)
    });
    
    setTimeout(() => {
      setAdding(false);
      toast.success('Added to cart');
    }, 600);
  };

  if (loading) return <div className="pt-40 text-center tracking-widest text-white/40">LOADING PRODUCT...</div>;
  if (!product) return <div className="pt-40 text-center tracking-widest text-white/40">PRODUCT NOT FOUND</div>;

  const sizes = product.variants?.map((v: any) => v.size) || (product.category === 'Shirts' ? ['S', 'M', 'L', 'XL'] : ['30', '32', '34', '36']);

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4">
      <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-white/40 hover:text-gold transition mb-12 group">
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition" />
        <span className="text-xs tracking-[0.2em]">BACK TO COLLECTION</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="aspect-[3/4] bg-white/5 flex items-center justify-center overflow-hidden relative"
          >
            <img 
              src={product.images?.[activeImage] || product.image || undefined} 
              alt={product.name} 
              className="max-w-full max-h-full object-contain block transition-transform duration-200 ease-out"
              referrerPolicy="no-referrer"
            />
            {/* Wishlist Button On Product Image */}
            <button
              onClick={() => toggleWishlist({
                id: product.id,
                name: product.name,
                price: product.discountedPrice || product.price,
                image: product.images?.[0] || product.image
              })}
              className={`absolute top-6 right-6 p-4 rounded-full backdrop-blur-md transition-all duration-300 z-10 ${
                isInWishlist(product.id) 
                  ? 'bg-gold text-luxury-black scale-110 shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                  : 'bg-black/20 text-white/60 hover:bg-black/40 hover:text-white'
              }`}
            >
              <Heart size={20} fill={isInWishlist(product.id) ? "currentColor" : "none"} />
            </button>
          </motion.div>
          
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img: string, idx: number) => (
                <div 
                  key={idx} 
                  onClick={() => setActiveImage(idx)}
                  className={`aspect-square bg-white/5 cursor-pointer border-2 transition flex items-center justify-center overflow-hidden ${activeImage === idx ? 'border-gold' : 'border-transparent hover:border-gold/30'}`}
                >
                  <img src={img || undefined} className="max-w-full max-h-full object-contain block" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          )}
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          <span className="text-gold tracking-[0.4em] text-xs mb-4 uppercase">{product.category}</span>
          <h1 className="text-4xl md:text-6xl font-serif mb-6">{product.name}</h1>
          {(() => {
            const variant = product.variants?.find((v: any) => v.size === selectedSize);
            const currentPrice = (variant && variant.price) ? variant.price : product.price;
            console.log(`Displayed price for ${product.name}:`, currentPrice);
            return (
              <div className="flex items-center gap-4 mb-8">
                {product.discountedPrice ? (
                  <>
                    <p className="text-3xl font-bold text-gold">৳{product.discountedPrice}</p>
                    <p className="text-xl font-light text-white/30 line-through">৳{currentPrice}</p>
                  </>
                ) : (
                  <p className="text-2xl font-light text-white/80">৳{currentPrice}</p>
                )}
              </div>
            );
          })()}
          
          <div className="h-px bg-gold/20 w-full mb-8" />
          
          <p className="text-white/60 font-light leading-relaxed mb-10">
            {product.description || "Crafted from premium materials, this piece embodies our commitment to quality and timeless style. Designed for the modern individual who values both comfort and elegance."}
          </p>

          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs tracking-widest text-white/40 uppercase">Select Size</p>
              {product.category === 'Shirts' && (
                <button 
                  onClick={() => setShowSizeGuide(true)}
                  className="flex items-center space-x-1.5 text-[10px] tracking-widest text-gold uppercase hover:underline"
                >
                  <Ruler size={12} />
                  <span>View Size Guide</span>
                </button>
              )}
              {selectedSize && (() => {
                const variant = product.variants?.find((v: any) => v.size === selectedSize);
                if (variant && variant.stock > 0 && variant.stock <= 5) {
                  return <p className="text-[10px] text-orange-400 animate-pulse uppercase tracking-widest font-bold">Low Stock: Only {variant.stock} left!</p>;
                }
                return null;
              })()}
            </div>
            <div className="flex flex-wrap gap-4">
              {sizes.map(size => {
                const variant = product.variants?.find((v: any) => v.size === size);
                const isOutOfStock = variant && variant.stock <= 0;
                
                return (
                  <button
                    key={size}
                    disabled={isOutOfStock}
                    onClick={() => setSelectedSize(size)}
                    className={`w-14 h-14 border flex flex-col items-center justify-center text-sm transition-all relative ${
                      selectedSize === size 
                        ? 'border-gold bg-gold text-luxury-black font-bold' 
                        : isOutOfStock
                          ? 'border-white/5 bg-white/5 text-white/10 cursor-not-allowed'
                          : 'border-white/10 hover:border-gold/50 text-white/60'
                    }`}
                  >
                    <span>{size}</span>
                    {isOutOfStock && (
                      <span className="absolute -bottom-5 left-0 right-0 text-[8px] text-red-400/50 text-center uppercase tracking-tighter">Out</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={adding}
            className="w-full bg-white text-luxury-black py-5 font-bold tracking-[0.2em] hover:bg-gold transition-colors flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            {adding ? (
              <Check size={20} />
            ) : (
              <>
                <ShoppingBag size={20} />
                <span>ADD TO BAG</span>
              </>
            )}
          </button>

          <div className="mt-12 grid grid-cols-2 gap-8 border-t border-gold/10 pt-8">
            <div>
              <p className="text-[10px] tracking-widest text-white/30 uppercase mb-2">Shipping</p>
              <p className="text-xs text-white/60">
                {product.deliveryType === 'Free' ? 'Complimentary shipping.' : `Inside Dhaka: ৳${product.insideDhaka} | Outside: ৳${product.outsideDhaka}`}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-widest text-white/30 uppercase mb-2">Policy</p>
              <p className="text-xs text-white/60">Non-returnable product.</p>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSizeGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSizeGuide(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-luxury-black border border-gold/20 p-6 md:p-10 max-w-2xl w-full shadow-2xl rounded-sm overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setShowSizeGuide(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-10">
                <h2 className="text-3xl font-serif tracking-widest uppercase mb-2">Shirt Size Guide</h2>
                <div className="h-0.5 w-16 bg-gold mx-auto" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gold/20">
                      <th className="py-4 text-[10px] tracking-widest text-white/40 uppercase">Size</th>
                      <th className="py-4 text-[10px] tracking-widest text-white/40 uppercase">Chest (in)</th>
                      <th className="py-4 text-[10px] tracking-widest text-white/40 uppercase">Length (in)</th>
                      <th className="py-4 text-[10px] tracking-widest text-white/40 uppercase">Shoulder (in)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/10">
                    {shirtSizes.map((s) => (
                      <tr key={s.size} className="hover:bg-gold/5 transition-colors">
                        <td className="py-4 font-bold text-white">{s.size}</td>
                        <td className="py-4 text-white/80">{s.chest}</td>
                        <td className="py-4 text-white/80">{s.length}</td>
                        <td className="py-4 text-white/80">{s.shoulder}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-10 space-y-4">
                <div className="bg-white/5 p-4 border border-gold/10 rounded-sm">
                  <p className="text-[10px] tracking-widest text-gold/80 uppercase font-bold mb-2">Measuring Guide</p>
                  <ul className="text-xs text-white/60 space-y-2 list-disc pl-4 font-light">
                    <li>Chest measured from underarm to underarm (×2)</li>
                    <li>Measurements may vary by ±0.5 inch</li>
                  </ul>
                </div>
                
                <div className="flex justify-center pt-4">
                   {/* Measurement Illustration SVG placeholder/representation */}
                   <svg width="200" height="180" viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-40">
                      <path d="M40 40H160L180 80L160 100H40L20 80L40 40Z" stroke="#D4AF37" strokeWidth="1" />
                      <line x1="40" y1="40" x2="40" y2="160" stroke="#D4AF37" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
                      <line x1="160" y1="40" x2="160" y2="160" stroke="#D4AF37" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
                      <line x1="20" y1="80" x2="180" y2="80" stroke="#D4AF37" strokeWidth="1" strokeDasharray="4 4" />
                      <text x="100" y="75" fill="#D4AF37" fontSize="10" textAnchor="middle" className="uppercase tracking-widest">Chest</text>
                      <line x1="100" y1="40" x2="100" y2="160" stroke="#D4AF37" strokeWidth="1" strokeDasharray="4 4" />
                      <text x="105" y="110" fill="#D4AF37" fontSize="10" transform="rotate(90 105 110)" className="uppercase tracking-widest">Length</text>
                   </svg>
                </div>
              </div>

              <button 
                onClick={() => setShowSizeGuide(false)}
                className="mt-10 w-full py-4 border border-gold/20 text-gold text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-gold/5 transition"
              >
                Close Guide
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-32 border-t border-gold/10 pt-24">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-2xl font-serif tracking-[0.2em] uppercase">You May Also Like</h2>
              <div className="h-0.5 w-12 bg-gold mt-2" />
            </div>
            <Link to="/" className="text-[10px] tracking-widest text-gold uppercase hover:underline flex items-center gap-2">
              <span>View All</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {relatedProducts.map((p) => (
              <Link 
                key={p.id} 
                to={`/product/${p.id}`}
                className="group block"
              >
                <div className="aspect-[3/4] bg-white/5 mb-4 overflow-hidden relative">
                  <img 
                    src={p.images?.[0] || p.image || undefined} 
                    alt={p.name}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h3 className="text-sm font-serif group-hover:text-gold transition mb-1">{p.name}</h3>
                <p className="text-xs text-white/40 tracking-widest">৳{p.discountedPrice || p.price}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
