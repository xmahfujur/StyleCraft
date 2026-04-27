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
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // 1. Try to fetch by document ID
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        } else {
          // 2. Fallback: try to fetch by slug
          const slugQuery = query(collection(db, 'products'), where('slug', '==', id), limit(1));
          const querySnapshot = await getDocs(slugQuery);
          
          if (!querySnapshot.empty) {
            const docData = querySnapshot.docs[0];
            setProduct({ id: docData.id, ...docData.data() });
          } else {
            console.warn(`Product with ID/slug "${id}" not found.`);
          }
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
    if (product) {
      if (typeof window !== 'undefined' && (window as any).fbq) {
        try {
          (window as any).fbq('track', 'ViewContent', {
            content_name: product.name,
            content_ids: [product.id],
            content_type: 'product',
            value: product.discountedPrice || product.price,
            currency: 'BDT'
          });
          console.log('✅ Meta Pixel: ViewContent event fired', { product: product.name });
        } catch (err) {
          console.error('❌ Meta Pixel: Error tracking ViewContent event', err);
        }
      } else {
        console.warn('⚠️ Meta Pixel: fbq not found for ViewContent event');
      }
    }
  }, [product?.id]);

  useEffect(() => {
    const fetchRelated = async () => {
      if (!product || !id) return;
      const catId = product.categoryId;
      const catName = product.category;
      if (!catId && !catName) return;

      try {
        let q;
        if (catId) {
          q = query(
            collection(db, 'products'),
            where('categoryId', '==', catId),
            limit(5)
          );
        } else {
          q = query(
            collection(db, 'products'),
            where('category', '==', catName),
            limit(5)
          );
        }
        
        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(p => p.id !== id)
          .slice(0, 4);
        setRelatedProducts(items);
      } catch (error) {
        console.error("Related products fetch error:", error);
      }
    };
    fetchRelated();
  }, [product?.id, product?.categoryId, product?.category, id]);

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
    
    if (typeof window !== 'undefined' && (window as any).fbq) {
      try {
        (window as any).fbq('track', 'AddToCart', {
          content_name: product.name,
          content_ids: [product.id],
          content_type: 'product',
          value: Number(finalPrice),
          currency: 'BDT'
        });
        console.log('✅ Meta Pixel: AddToCart event fired', { product: product.name, price: finalPrice });
      } catch (err) {
        console.error('❌ Meta Pixel: Error tracking AddToCart event', err);
      }
    } else {
      console.warn('⚠️ Meta Pixel: fbq not found for AddToCart event');
    }
    
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

  if (loading) return <div className="pt-40 text-center tracking-widest text-black/40">LOADING PRODUCT...</div>;
  if (!product) return <div className="pt-40 text-center tracking-widest text-black/40">PRODUCT NOT FOUND</div>;

  const sizes = product.variants?.map((v: any) => v.size) || (product.category === 'Shirts' ? ['S', 'M', 'L', 'XL'] : ['30', '32', '34', '36']);

  return (
    <div className="pt-24 md:pt-32 pb-10 md:pb-24 max-w-7xl mx-auto px-4 bg-white">
      <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-black/60 hover:text-black transition mb-8 md:mb-12 group uppercase">
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition" />
        <span className="text-xs tracking-[0.2em] font-bold">BACK TO COLLECTION</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="aspect-[3/4] bg-black/5 flex items-center justify-center overflow-hidden relative border border-black/5 rounded-xl shadow-xl md:shadow-2xl"
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
              className={`absolute top-4 right-4 md:top-6 md:right-6 p-3 md:p-4 rounded-full backdrop-blur-md transition-all duration-300 z-10 shadow-sm ${
                isInWishlist(product.id) 
                  ? 'bg-red-600 text-white scale-110 shadow-lg' 
                  : 'bg-white/80 text-black/60 hover:bg-white hover:text-black'
              }`}
            >
              <Heart size={18} fill={isInWishlist(product.id) ? "currentColor" : "none"} />
            </button>
          </motion.div>
          
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 md:gap-4 px-2 md:px-0">
              {product.images.map((img: string, idx: number) => (
                <div 
                  key={idx} 
                  onClick={() => setActiveImage(idx)}
                  className={`aspect-square bg-black/5 cursor-pointer border-2 transition flex items-center justify-center overflow-hidden rounded-xl ${activeImage === idx ? 'border-black scale-105 shadow-md' : 'border-transparent hover:border-black/20'}`}
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
          className="flex flex-col px-1"
        >
          <span className="text-xs md:text-sm tracking-[0.4em] mb-3 md:mb-4 uppercase font-bold text-black/60">{product.category}</span>
          <h1 className="text-3xl md:text-6xl font-serif mb-4 md:mb-6 leading-tight text-black uppercase tracking-wider">{product.name}</h1>
          {(() => {
            const variant = product.variants?.find((v: any) => v.size === selectedSize);
            const currentPrice = (variant && variant.price) ? variant.price : product.price;
            return (
              <div className="flex items-center gap-4 mb-6 md:mb-10 font-mono">
                {product.discountedPrice ? (
                  <>
                    <p className="text-3xl md:text-5xl font-bold text-red-600">৳{product.discountedPrice.toLocaleString()}</p>
                    <p className="text-lg md:text-2xl text-black/40 line-through">৳{currentPrice.toLocaleString()}</p>
                  </>
                ) : (
                  <p className="text-3xl md:text-5xl font-bold text-black/80">৳{currentPrice.toLocaleString()}</p>
                )}
              </div>
            );
          })()}
          
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs tracking-widest text-black/60 uppercase font-bold">Select Size</p>
              {selectedSize && (() => {
                const variant = product.variants?.find((v: any) => v.size === selectedSize);
                if (variant && variant.stock > 0 && variant.stock <= 5) {
                  return <p className="text-xs text-red-600 animate-pulse uppercase tracking-widest font-black">Low Stock: Only {variant.stock} left!</p>;
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
                    className={`w-14 h-14 border flex flex-col items-center justify-center text-sm transition-all relative rounded-full ${
                      selectedSize === size 
                        ? 'border-black bg-black text-white font-bold shadow-lg scale-110' 
                        : isOutOfStock
                          ? 'border-black/5 bg-black/5 text-black/10 cursor-not-allowed'
                          : 'border-black/10 hover:border-black text-black/60 font-bold hover:bg-black/5'
                    }`}
                  >
                    <span>{size}</span>
                    {isOutOfStock && (
                      <span className="absolute -bottom-5 left-0 right-0 text-[10px] text-red-600/50 text-center uppercase tracking-tighter font-bold">Out</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={adding}
            className="w-full bg-black text-white py-6 font-black tracking-[0.3em] hover:bg-black/90 transition-all flex items-center justify-center space-x-3 disabled:opacity-50 shadow-2xl rounded-full hover:scale-[1.02] active:scale-95 mb-12"
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

          <div className="mb-12 border-t border-black/5 pt-8">
            <h3 className="text-xs tracking-[0.3em] text-black uppercase font-black mb-4">Description</h3>
            <p className="text-black/70 font-medium leading-relaxed font-sans whitespace-pre-wrap">
              {product.description || "Crafted from premium materials, this piece embodies our commitment to quality and timeless style. Designed for the modern individual who values both comfort and elegance."}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-8 border-t border-black/10 pt-8">
            <div>
              <p className="text-xs tracking-widest text-black/50 uppercase mb-2 font-bold">Shipping</p>
              <p className="text-sm text-black/70 font-medium tracking-tight">
                {product.deliveryType === 'Free' ? 'Complimentary shipping.' : `Inside Dhaka: ৳${product.insideDhaka} | Outside: ৳${product.outsideDhaka}`}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-widest text-black/50 uppercase mb-2 font-bold">Policy</p>
              <p className="text-sm text-black/70 font-medium tracking-tight">Non-returnable product.</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-20 md:mt-32 border-t border-black/10 pt-16 md:pt-24 uppercase">
          <div className="flex justify-between items-end mb-8 md:mb-12">
            <div>
              <h2 className="text-lg md:text-2xl font-serif tracking-[0.2em] text-black">You May Also Like</h2>
              <div className="h-0.5 w-10 md:w-12 bg-black mt-2" />
            </div>
            <Link to="/" className="text-xs tracking-widest text-black/80 uppercase hover:text-black hover:underline flex items-center gap-2 font-bold transition">
              <span>View All</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {relatedProducts.map((p) => (
              <Link 
                key={p.id} 
                to={`/product/${p.slug || p.id}`}
                className="group block"
              >
                <div className="aspect-[3/4] bg-black/5 mb-4 overflow-hidden relative border border-black/10 shadow-sm hover:shadow-2xl transition duration-500 rounded-xl">
                  <img 
                    src={p.images?.[0] || p.image || undefined} 
                    alt={p.name}
                    className="w-full h-full object-contain group-hover:scale-110 transition duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h3 className="text-xs md:text-sm font-serif group-hover:text-neutral-600 transition mb-1 uppercase tracking-wider line-clamp-1 text-black font-bold">{p.name}</h3>
                <p className="text-xs md:text-sm text-red-600 tracking-widest font-black uppercase">৳{(p.discountedPrice || p.price).toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
