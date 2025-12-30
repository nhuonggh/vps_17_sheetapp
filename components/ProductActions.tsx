'use client';

import { ShoppingCart, Check, Heart, PlayCircle, Zap } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProductActionsProps {
  product: any;
  showTrial?: boolean;
}

export default function ProductActions({ product, showTrial = true }: ProductActionsProps) {
  // Bây giờ CartContext đã có addToCart nên dòng này sẽ hết lỗi
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const router = useRouter();

  const handleAddToCart = () => {
    addToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart(product);
    router.push('/cart');
  };

  return (
    <div className="space-y-3">
      {/* Hàng 1: Đăng ký & Học thử */}
      <div className="flex gap-3">
        <button 
          onClick={handleBuyNow}
          className="flex-1 bg-red-600 text-white py-3 md:py-4 rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm md:text-base animate-pulse"
        >
          <Zap className="w-5 h-5 fill-current" /> Đăng ký ngay
        </button>

        {showTrial && (
          <button 
            onClick={() => setShowVideoModal(true)}
            className="px-4 md:px-6 py-3 md:py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <PlayCircle className="w-5 h-5" /> <span className="hidden sm:inline">{product.type === 'service' ? 'Xem Demo' : 'Học thử'}</span>
          </button>
        )}
      </div>

      {/* Hàng 2: Thêm giỏ & Yêu thích */}
      <div className="flex gap-3">
        <button 
            onClick={handleAddToCart}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all text-sm border-2 ${
            isAdded 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-white text-emerald-600 border-emerald-600 hover:bg-emerald-50'
            }`}
        >
            {isAdded ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
            {isAdded ? 'Đã thêm vào giỏ' : 'Thêm vào giỏ hàng'}
        </button>

        <button 
            onClick={() => setIsLiked(!isLiked)}
            className={`px-4 py-3 rounded-xl border-2 transition-all ${
                isLiked ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200'
            }`}
        >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Popup Video Học thử */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowVideoModal(false)}>
           <div className="w-full max-w-4xl bg-black rounded-2xl overflow-hidden aspect-video relative shadow-2xl">
              <iframe 
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                className="w-full h-full" 
                allow="autoplay; encrypted-media" 
                allowFullScreen
              />
           </div>
        </div>
      )}
    </div>
  );
}