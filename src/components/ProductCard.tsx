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

  const sizes = (product as any).variants?.map((v: any) => v.size) || ['S', 'M', 'L', 'XL', 'XXL'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative flex flex-col h-full bg-white border border-black/5 hover:border-black/20 transition-all duration-500 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1"
    >
      <Link to={`/product/${product.slug || product.id}`} className="flex flex-col h-full">
        <div className="relative aspect-[3/4] overflow-hidden bg-black/5 rounded-t-xl">
          <img 
            src={product.images[0] || null} 
            alt={product.name} 
            className="w-full h-full object-cover transition duration-700 md:group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
            {product.discountedPrice && (
              <div className="bg-gradient-to-r from-red-600 to-red-500 text-white font-black tracking-widest px-3 py-1 text-[9px] md:text-[10px] rounded-full shadow-[0_4px_12px_rgba(220,38,38,0.3)] border border-white/20">
                SALE
              </div>
            )}
            {product.stock <= 5 && product.stock > 0 && (
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black tracking-widest px-3 py-1 text-[9px] md:text-[10px] rounded-full shadow-[0_4px_12px_rgba(245,158,11,0.3)] border border-white/20">
                LOW STOCK
              </div>
            )}
            {product.stock === 0 && (
              <div className="bg-white/90 backdrop-blur-md text-black font-black tracking-widest px-3 py-1 text-[9px] md:text-[10px] rounded-full shadow-lg border border-black/5">
                SOLD OUT
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
                slug: product.slug,
                price: product.discountedPrice || product.price,
                image: product.images[0]
              });
            }}
            className={`absolute top-2 right-2 md:top-4 md:right-4 p-1.5 md:p-2 rounded-full backdrop-blur-md transition-all duration-300 z-10 ${
              isInWishlist(product.id) 
                ? 'bg-red-600 text-white scale-110 shadow-lg' 
                : 'bg-white/60 text-black/40 hover:bg-white hover:text-black'
            }`}
          >
            <Heart size={14} fill={isInWishlist(product.id) ? "currentColor" : "none"} />
          </button>

          {/* Quick Add Overlay (Desktop) */}
          <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition duration-500 bg-white/95 backdrop-blur-md border-t border-black/5 hidden md:block">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap justify-center gap-2">
                {sizes.map(size => {
                  const variant = (product as any).variants?.find((v: any) => v.size === size);
                  const isOutOfStock = variant && Number(variant.stock) <= 0;
                  
                  return (
                    <button
                      key={size}
                      disabled={isOutOfStock}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedSize(size);
                      }}
                      className={`w-8 h-8 text-[10px] border flex items-center justify-center transition-all duration-300 font-bold rounded-full ${
                        selectedSize === size 
                          ? 'bg-black text-white border-black scale-110 shadow-md' 
                          : isOutOfStock
                            ? 'border-black/5 bg-black/5 text-black/10 cursor-not-allowed'
                            : 'border-black/10 text-black/40 hover:border-black hover:bg-black/5'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="w-full bg-black text-white py-3 text-[10px] font-bold tracking-widest flex items-center justify-center space-x-2 hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded-full shadow-lg active:scale-95"
              >
                <Plus size={14} />
                <span>ADD TO BAG</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 flex flex-col flex-grow bg-white">
          <h3 className="text-sm md:text-base font-serif text-black transition-colors line-clamp-2 mb-2 uppercase tracking-widest font-bold leading-tight h-10 md:h-12">{product.name}</h3>
          
          <div className="flex items-center justify-between mt-auto pt-4">
            <div className="flex flex-col">
              {product.discountedPrice ? (
                <>
                  <p className="text-red-600 font-black text-sm md:text-xl tracking-tighter">৳{product.discountedPrice.toLocaleString()}</p>
                  <p className="text-black/30 line-through text-[10px] md:text-xs tracking-widest font-bold">৳{product.price.toLocaleString()}</p>
                </>
              ) : (
                <p className="text-black font-black text-sm md:text-xl tracking-tighter hover:text-red-600 transition-colors">৳{product.price.toLocaleString()}</p>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <span className="text-[8px] md:text-[10px] text-black/40 tracking-[0.2em] uppercase font-black px-2 py-0.5 bg-black/5 rounded-full">{product.tags?.[0] || 'Premium'}</span>
              {product.salesCount > 0 && (
                <span className="text-[8px] md:text-[10px] text-black/30 tracking-[0.2em] uppercase font-black">{product.salesCount}+ SOLD</span>
              )}
            </div>
          </div>
        </div>
      </Link>
      
      {/* Mobile Quick Add - More compact for 2-column grid */}
      <div className="md:hidden px-3 pb-3 bg-white flex flex-col gap-2">
        {/* Mobile Size Selection */}
        {product.stock > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-1">
            {sizes.slice(0, 5).map(size => {
              const variant = (product as any).variants?.find((v: any) => v.size === size);
              const isOutOfStock = variant && Number(variant.stock) <= 0;
              
              return (
                <button
                  key={size}
                  disabled={isOutOfStock}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedSize(size);
                  }}
                  className={`w-7 h-7 text-[9px] border flex items-center justify-center transition-all duration-300 font-bold rounded-full ${
                    selectedSize === size 
                      ? 'bg-black text-white border-black scale-105 shadow-sm' 
                      : isOutOfStock
                        ? 'border-black/5 bg-black/5 text-black/10 cursor-not-allowed'
                        : 'border-black/10 text-black/40 hover:border-black bg-black/5'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        )}
        
        <button 
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full bg-black text-white py-3 text-[10px] font-bold tracking-widest flex items-center justify-center space-x-2 active:scale-95 transition-all duration-300 rounded-full shadow-md"
        >
          <ShoppingBag size={10} />
          <span>{product.stock === 0 ? 'OUT' : 'ADD'}</span>
        </button>
      </div>
    </motion.div>
  );
};

export default ProductCard;
