import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useCart } from '../CartContext';
import { motion } from 'motion/react';
import { ShoppingBag, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [adding, setAdding] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

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

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    setAdding(true);
    
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

  const sizes = product.category === 'Shirts' ? ['S', 'M', 'L', 'XL'] : ['30', '32', '34', '36'];

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
            className="aspect-[3/4] bg-white/5 flex items-center justify-center overflow-hidden"
          >
            <img 
              src={product.images?.[activeImage] || product.image || undefined} 
              alt={product.name} 
              className="max-w-full max-h-full object-contain block"
              referrerPolicy="no-referrer"
            />
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
            console.log(`Displayed price for ${product.name}:`, product.price);
            return (
              <div className="flex items-center gap-4 mb-8">
                {product.discountedPrice ? (
                  <>
                    <p className="text-3xl font-bold text-gold">৳{product.discountedPrice}</p>
                    <p className="text-xl font-light text-white/30 line-through">৳{product.price}</p>
                  </>
                ) : (
                  <p className="text-2xl font-light text-white/80">৳{product.price}</p>
                )}
              </div>
            );
          })()}
          
          <div className="h-px bg-gold/20 w-full mb-8" />
          
          <p className="text-white/60 font-light leading-relaxed mb-10">
            {product.description || "Crafted from premium materials, this piece embodies our commitment to quality and timeless style. Designed for the modern individual who values both comfort and elegance."}
          </p>

          <div className="mb-10">
            <p className="text-xs tracking-widest text-white/40 mb-4 uppercase">Select Size</p>
            <div className="flex flex-wrap gap-4">
              {sizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`w-14 h-14 border flex items-center justify-center text-sm transition-all ${
                    selectedSize === size 
                      ? 'border-gold bg-gold text-luxury-black font-bold' 
                      : 'border-white/10 hover:border-gold/50 text-white/60'
                  }`}
                >
                  {size}
                </button>
              ))}
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
    </div>
  );
}
