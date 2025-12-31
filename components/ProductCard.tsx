import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

// Định nghĩa kiểu dữ liệu (cập nhật thêm các trường tags)
interface ProductProps {
  product: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    old_price: number | null;
    thumbnail_url: string | null;
    categories: { name: string } | null;
    // Các trường mới thêm
    industry_tag?: string;
    tech_tag?: string;
  };
}

export default function ProductCard({ product }: ProductProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300 flex flex-col h-full">
      {/* Phần ảnh Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.thumbnail_url || 'https://via.placeholder.com/400'}
          alt={product.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Badge Category (Ưu tiên hiện Tag chi tiết nếu có) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
            <div className="bg-white/90 backdrop-blur text-xs font-semibold px-3 py-1 rounded-full text-emerald-700 shadow-sm">
                {product.categories?.name || 'Sản phẩm'}
            </div>
            {/* Hiển thị thêm Tag lĩnh vực nếu có */}
            {product.industry_tag && (
                <div className="bg-blue-500/90 backdrop-blur text-xs font-semibold px-3 py-1 rounded-full text-white shadow-sm">
                    {product.industry_tag}
                </div>
            )}
        </div>
      </div>

      {/* Phần thông tin */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
          {product.name}
        </h3>
        
        {/* Hiển thị Tag công nghệ nhỏ bên dưới tên */}
        {product.tech_tag && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 border border-gray-200 px-2 py-0.5 rounded">
                {product.tech_tag}
            </span>
        )}

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