'use client';

import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';

// Dùng any cho đơn giản, hoặc bạn có thể copy interface Product nếu muốn chặt chẽ
export default function ProductActions({ product }: { product: any }) {
  const { addItem } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    addItem(product);
    setIsAdded(true);
    // Hiệu ứng nháy nút trong 1 giây để báo thành công
    setTimeout(() => setIsAdded(false), 1000);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-10">
      <button 
        onClick={handleAddToCart}
        className={`flex-1 text-lg font-bold py-4 px-8 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 ${
            isAdded 
            ? 'bg-emerald-700 text-white shadow-emerald-200' 
            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
        }`}
      >
        {isAdded ? (
            <>Đã thêm vào giỏ ✓</>
        ) : (
            <>
                <ShoppingCart className="w-5 h-5" />
                Thêm vào giỏ
            </>
        )}
      </button>
      
      <button className="flex-1 bg-white text-gray-700 border border-gray-200 text-lg font-semibold py-4 px-8 rounded-xl hover:bg-gray-50 transition-all">
        Xem Demo
      </button>
    </div>
  );
}