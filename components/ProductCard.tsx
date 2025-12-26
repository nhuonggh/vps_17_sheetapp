import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

// Định nghĩa kiểu dữ liệu cho sản phẩm (giúp code không báo lỗi đỏ)
interface ProductProps {
  product: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    old_price: number | null;
    thumbnail_url: string | null;
    categories: {
      name: string;
    } | null; // Sửa lại kiểu dữ liệu categories để khớp với kết quả trả về từ Supabase
  };
}

export default function ProductCard({ product }: ProductProps) {
  // Hàm format tiền tệ (VD: 1500000 -> 1.500.000 đ)
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300 flex flex-col h-full">
      {/* Phần ảnh Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={product.thumbnail_url || 'https://via.placeholder.com/400'}
          alt={product.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
        {/* Badge Category */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs font-semibold px-3 py-1 rounded-full text-emerald-700 shadow-sm">
          {product.categories?.name || 'Sản phẩm'}
        </div>
      </div>

      {/* Phần thông tin */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-grow">
          {product.description}
        </p>
        
        <div className="flex items-end justify-between mt-auto pt-4 border-t border-gray-50">
          <div>
            {product.old_price && (
              <span className="text-xs text-gray-400 line-through block mb-1">
                {formatPrice(product.old_price)}
              </span>
            )}
            <span className="text-emerald-600 font-bold text-lg">
              {formatPrice(product.price)}
            </span>
          </div>
          
          <Link href={`/product/${product.slug}`} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}