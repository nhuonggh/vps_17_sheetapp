'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
// IMPORT PC & MOBILE (Đảm bảo bạn đã tạo file PC ở bước trước)
import CategoriesViewPC from '@/components/pc/CategoriesView';
import CategoriesViewMobile from '@/components/mobile/CategoriesView';

// --- TYPES ---
interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  thumbnail_url: string;
  type: string;
  categories: { name: string; slug: string } | null;
  industry_tag?: string;
  tech_tag?: string;
}

// --- CONSTANTS (Dùng cho PC) ---
const MAIN_TABS = [
  { id: 'all', name: 'Tất cả' },
  { id: 'online', name: 'Khóa học Online' },
  { id: 'zoom', name: 'Khóa học Zoom' },
  { id: 'appsheet', name: 'Google AppSheet' },
  { id: 'automation', name: 'Automation' },
];

const COST_TABS = [
  { id: 'all', name: 'Tất cả' },
  { id: 'paid', name: 'Có phí' },
  { id: 'free', name: 'Miễn phí' },
];

function CategoriesPageContent() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<string>('newest'); // Sort state

  // --- FETCH ALL DATA ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Lấy tất cả Course và Service đang active
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, slug)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAllProducts(data as unknown as Product[]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Format giá chung
  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  // Apply sorting
  const sortedProducts = [...allProducts].sort((a, b) => {
    switch (sortOrder) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'newest':
        return b.id - a.id;
      case 'oldest':
        return a.id - b.id;
      case 'name-asc':
        return a.name.localeCompare(b.name, 'vi');
      case 'name-desc':
        return b.name.localeCompare(a.name, 'vi');
      case 'popular':
        return 0;
      default:
        return 0;
    }
  });

  // --- PLACEHOLDER FUNCTIONS CHO PC (Để PC không bị lỗi khi chưa tách xong logic) ---
  // Bạn có thể giữ logic PC cũ ở đây hoặc chuyển hẳn vào file PC
  const updateParamPC = () => { };
  const toggleFilterPC = () => { };
  const checkMatchPC = () => true;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">

      {/* MOBILE VIEW */}
      <CategoriesViewMobile
        products={sortedProducts}
        loading={loading}
        formatPrice={formatPrice}
      />

      {/* DESKTOP VIEW (Vẫn dùng component cũ, truyền props giả lập hoặc data filtered nếu cần) */}
      {/* Lưu ý: Logic PC hiện tại đang nằm trong file PC, bạn cần đảm bảo file PC nhận đúng props */}
      <div className="hidden md:block">
        {/* Tạm thời render PC View với data thô, logic lọc PC nên nằm trong file PC hoặc xử lý tại đây truyền xuống */}
        <CategoriesViewPC
          products={sortedProducts.filter(p => p.type === 'course')} // PC mặc định chỉ hiện course như cũ
          loading={loading}
          activeTab="all"
          activeCost="all"
          activeIndustries={[]}
          activeTechs={[]}
          mainTabs={MAIN_TABS}
          costTabs={COST_TABS}
          onUpdateParam={updateParamPC}
          onToggleFilter={toggleFilterPC}
          checkCategoryMatch={checkMatchPC}
          formatPrice={formatPrice}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
        />
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-safe pt-safe md:pt-8">
      <Suspense fallback={<div className="text-center py-10">Đang tải...</div>}>
        <CategoriesPageContent />
      </Suspense>
    </main>
  );
}