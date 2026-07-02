import { query } from '@/lib/db';
import ProductCard from './ProductCard';

// Hàm lấy dữ liệu (Chạy trên Server - cực nhanh và bảo mật)
async function getProducts() {
  try {
    const result = await query(
      `SELECT p.*,
              CASE WHEN c.id IS NOT NULL THEN json_build_object('name', c.name) END AS categories
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = true
       ORDER BY p.created_at DESC`
    );
    return result.rows;
  } catch (error) {
    console.error('Lỗi lấy sản phẩm:', error);
    return [];
  }
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