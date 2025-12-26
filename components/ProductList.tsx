import { supabase } from '@/lib/supabase';
import ProductCard from './ProductCard';

// Hàm lấy dữ liệu (Chạy trên Server - cực nhanh và bảo mật)
async function getProducts() {
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (name)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Lỗi lấy sản phẩm:', error);
    return [];
  }
  
  // Ép kiểu dữ liệu trả về cho khớp với ProductProps (nếu cần thiết, hoặc để any nếu muốn nhanh nhưng nên rõ ràng)
   return products || [];
}

export default async function ProductList() {
  const products = await getProducts();

  return (
    <section id="products" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Kho Template & Giải pháp</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Các công cụ được xây dựng sẵn giúp bạn tiết kiệm hàng trăm giờ làm việc.
          </p>
        </div>

        {/* Lưới sản phẩm (Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            Chưa có sản phẩm nào trong Database.
          </div>
        )}
      </div>
    </section>
  );
}