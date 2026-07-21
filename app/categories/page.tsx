'use client';

import { useState, useEffect, Suspense } from 'react';
// IMPORT PC & MOBILE (Đảm bảo bạn đã tạo file PC ở bước trước)
import CategoriesViewPC from '@/components/pc/CategoriesView';
import CategoriesViewMobile from '@/components/mobile/CategoriesView';
import { isMatchSubTab } from '@/lib/product-filters';

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
// Gồm cả tab khóa học lẫn dịch vụ (id khớp với isMatchSubTab trong lib/product-filters.ts)
// để "Dịch vụ" thực sự có sản phẩm hiển thị, thay vì PC chỉ nhận course như trước.
const MAIN_TABS = [
  { id: 'all', name: 'Tất cả' },
  { id: 'online', name: 'Khóa học Online' },
  { id: 'zoom', name: 'Khóa học Zoom' },
  { id: 'appsheet', name: 'Google AppSheet' },
  { id: 'automation', name: 'Automation' },
  { id: 'zalo', name: 'Zalo Mini App' },
  { id: 'web', name: 'Web App' },
  { id: 'pc', name: 'Phần mềm PC' },
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
      try {
        const res = await fetch('/api/products?limit=100');
        const json = await res.json();
        if (json.data) {
          setAllProducts(json.data as unknown as Product[]);
        }
      } catch (error) {
        console.error('Error loading categories products:', error);
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

  // --- STATE LỌC THẬT CHO PC (thay thế stub cũ luôn no-op) ---
  const [activeTab, setActiveTab] = useState('all');
  const [activeCost, setActiveCost] = useState('all');
  const [activeIndustries, setActiveIndustries] = useState<string[]>([]);
  const [activeTechs, setActiveTechs] = useState<string[]>([]);

  const updateParamPC = (key: string, value: string | null) => {
    if (key === 'tab') setActiveTab(value ?? 'all');
    if (key === 'cost') setActiveCost(value ?? 'all');
  };

  const toggleFilterPC = (key: 'industry' | 'tech', value: string) => {
    if (key === 'industry') {
      setActiveIndustries(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    } else {
      setActiveTechs(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    }
  };

  const checkMatchPC = (p: Product, tabId: string) => isMatchSubTab(p, tabId);

  // Lọc theo giá + ngành + công nghệ (KHÔNG lọc theo type — PC nhận cả course lẫn service)
  const pcFilteredProducts = sortedProducts.filter(p => {
    if (activeCost === 'paid' && p.price === 0) return false;
    if (activeCost === 'free' && p.price > 0) return false;
    if (activeIndustries.length > 0 && !(p.industry_tag && activeIndustries.includes(p.industry_tag))) return false;
    if (activeTechs.length > 0 && !(p.tech_tag && activeTechs.includes(p.tech_tag))) return false;
    return true;
  });

  // Khi chọn 1 tab cụ thể (không phải "Tất cả"), CategoriesViewPC hiển thị thẳng mảng
  // `products` được truyền vào (không tự lọc lại theo tab) — nên phải lọc trước ở đây.
  const pcProductsForView = activeTab === 'all'
    ? pcFilteredProducts
    : pcFilteredProducts.filter(p => checkMatchPC(p, activeTab));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">

      {/* MOBILE VIEW */}
      <CategoriesViewMobile
        products={sortedProducts}
        loading={loading}
        formatPrice={formatPrice}
      />

      {/* DESKTOP VIEW */}
      <div className="hidden md:block">
        <CategoriesViewPC
          products={pcProductsForView}
          loading={loading}
          activeTab={activeTab}
          activeCost={activeCost}
          activeIndustries={activeIndustries}
          activeTechs={activeTechs}
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