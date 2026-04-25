import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../CartContext';
import { useWishlist } from '../WishlistContext';
import { toast } from 'sonner';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [selectedSize, setSelectedSize] = useState<string>('');

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedSize) {
      toast.error('Please select a size first');
      return;
    }

    const price = product.discountedPrice || product.price;

    addToCart({
      id: product.id,
      name: product.name,
      price: Number(price.toFixed(0)),
      image: product.images[0],
      quantity: 1,
      size: selectedSize,
      // Pass other fields if context supports them
    } as any);

    toast.success('Added to bag');
  };

  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -10 }}
      className="group relative flex flex-col h-full bg-white/5 border border-white/5 hover:border-gold/20 transition-all duration-500 rounded-sm overflow-hidden"
    >
      <Link to={`/product/${product.slug || product.id}`} className="flex flex-col h-full">
        <div className="relative aspect-[3/4] overflow-hidden bg-luxury-black/50">
          <img 
            src={product.images[0]} 
            alt={product.name} 
            className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          
          {/* Badges */}
          <div className="absolute top-0 left-0 z-10 flex flex-col gap-1">
            {product.discountedPrice && (
              <div className="bg-red-500 text-white text-[8px] font-bold tracking-[0.2em] px-3 py-1.5">
                SALE
              </div>
            )}
            {product.stock <= 5 && product.stock > 0 && (
              <div className="bg-orange-500 text-white text-[8px] font-bold tracking-[0.2em] px-3 py-1.5">
                LOW STOCK
              </div>
            )}
            {product.stock === 0 && (
              <div className="bg-white/20 backdrop-blur-md text-white text-[8px] font-bold tracking-[0.2em] px-3 py-1.5">
                OUT OF STOCK
              </div>
            )}
            {product.tags?.includes('new') && (
              <div className="bg-gold text-luxury-black text-[8px] font-bold tracking-[0.2em] px-3 py-1.5">
                NEW
              </div>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist({
                id: product.id,
                name: product.name,
                price: product.discountedPrice || product.price,
                image: product.images[0]
              });
            }}
            className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-md transition-all duration-300 z-10 ${
              isInWishlist(product.id) 
                ? 'bg-gold text-luxury-black scale-110' 
                : 'bg-black/20 text-white/60 hover:bg-black/40 hover:text-white'
            }`}
          >
            <Heart size={16} fill={isInWishlist(product.id) ? "currentColor" : "none"} />
          </button>

          {/* Quick Add Overlay */}
          <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition duration-500 bg-luxury-black/90 backdrop-blur-md border-t border-gold/20 hidden md:block">
            <div className="flex flex-col gap-3">
              <div className="flex justify-center gap-2">
                {sizes.map(size => (
                  <button
                    key={size}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSize(size);
                    }}
                    className={`w-8 h-8 text-[10px] border flex items-center justify-center transition-all duration-300 ${
                      selectedSize === size 
                        ? 'bg-gold text-luxury-black border-gold' 
                        : 'border-white/20 text-white/60 hover:border-gold/50'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="w-full bg-gold text-luxury-black py-2.5 text-[10px] font-bold tracking-widest flex items-center justify-center space-x-2 hover:brightness-110 disabled:grayscale disabled:cursor-not-allowed transition"
              >
                <Plus size={14} />
                <span>ADD TO BAG</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-serif group-hover:text-gold transition-colors line-clamp-1">{product.name}</h3>
          </div>
          
          <div className="flex items-center gap-3 mt-auto">
            {product.discountedPrice ? (
              <>
                <p className="text-gold text-sm tracking-widest font-bold">৳{product.discountedPrice}</p>
                <p className="text-white/20 text-xs tracking-widest line-through">৳{product.price}</p>
              </>
            ) : (
              <p className="text-white/40 text-sm tracking-widest">৳{product.price}</p>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-white/20 tracking-widest uppercase">{product.tags?.[0] || 'Premium'}</span>
            {product.salesCount > 0 && (
              <span className="text-[10px] text-gold/40 tracking-widest uppercase">{product.salesCount}+ SOLD</span>
            )}
          </div>
        </div>
      </Link>
      
      {/* Mobile Quick Add */}
      <div className="md:hidden p-4 pt-0">
        <button 
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full bg-gold text-luxury-black py-3 text-[10px] font-bold tracking-widest flex items-center justify-center space-x-2 active:scale-95 transition"
        >
          <ShoppingBag size={14} />
          <span>{product.stock === 0 ? 'OUT OF STOCK' : 'QUICK ADD'}</span>
        </button>
      </div>
    </motion.div>
  );
};

export default ProductCard;
