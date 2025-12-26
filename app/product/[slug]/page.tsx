import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase'; // Lưu ý đường dẫn import
import { ArrowLeft, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import ProductActions from './ProductActions'; // <--- Import Component nút bấm vừa tạo

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  content_html: string | null;
  price: number;
  old_price: number | null;
  thumbnail_url: string | null;
  categories: {
    name: string;
  } | null;
}

async function getProduct(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (name)
    `)
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }
  return data as unknown as Product;
}

export default async function ProductDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  return (
    <main className="min-h-screen bg-gray-50 pb-20 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <Link href="/" className="inline-flex items-center text-gray-500 hover:text-emerald-600 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại trang chủ
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            
            {/* CỘT TRÁI: ẢNH SẢN PHẨM */}
            <div className="bg-gray-100 relative h-96 lg:h-auto min-h-[500px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.thumbnail_url || 'https://via.placeholder.com/800'}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute top-6 left-6 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full text-emerald-700 font-semibold shadow-sm">
                {product.categories?.name || 'Sản phẩm'}
              </div>
            </div>

            {/* CỘT PHẢI: THÔNG TIN & MUA HÀNG */}
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                {product.name}
              </h1>

              <div className="flex items-end gap-4 mb-8">
                <span className="text-4xl font-bold text-emerald-600">
                  {formatPrice(product.price)}
                </span>
                {product.old_price && (
                  <span className="text-xl text-gray-400 line-through mb-1">
                    {formatPrice(product.old_price)}
                  </span>
                )}
                {product.old_price && (
                  <span className="mb-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">
                    GIẢM {Math.round(((product.old_price - product.price) / product.old_price) * 100)}%
                  </span>
                )}
              </div>

              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                {product.description}
              </p>

              {/* Thay thế nút tĩnh bằng Component ProductActions */}
              <ProductActions product={product} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8 border-t border-gray-100">
                <div className="flex items-center gap-3 text-gray-600">
                  <Zap className="w-5 h-5 text-emerald-500" />
                  <span>Kích hoạt tự động</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span>Bảo mật dữ liệu 100%</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Hỗ trợ cài đặt từ A-Z</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Update trọn đời</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="mt-12 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 lg:p-12">
            <h2 className="text-2xl font-bold mb-6">Chi tiết sản phẩm</h2>
            <div className="prose max-w-none text-gray-600">
                {product.content_html ? (
                    <div dangerouslySetInnerHTML={{ __html: product.content_html }} />
                ) : (
                    <p>Chưa có nội dung chi tiết.</p>
                )}
            </div>
        </div>
      </div>
    </main>
  );
}