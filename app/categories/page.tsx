'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Search, BookOpen, MonitorPlay, Users } from 'lucide-react';

// Định nghĩa Interface
interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  thumbnail_url: string;
  type: string;
  categories: { name: string; slug: string } | null;
}

// Component con
function CategoriesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Lấy activeTab trực tiếp từ URL
  const activeTab = searchParams.get('tab') || 'all';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const tabs = [
    { id: 'all', name: 'Tất cả khóa học' },
    { id: 'online', name: 'Khóa học Online' },
    { id: 'zoom', name: 'Khóa học Zoom' },
    { id: 'appsheet', name: 'Google AppSheet' },
    { id: 'automation', name: 'Automation' },
  ];

  // Hàm chuyển Tab: Cập nhật URL
  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      
      // SỬA LỖI 1: Đổi 'let' thành 'const' vì biến query không bị gán lại
      const query = supabase
        .from('products')
        .select('*, categories(name, slug)')
        .eq('type', 'course') 
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      
      if (!error && data) {
        // SỬA LỖI 2: Thay 'as any' bằng 'as unknown as Product[]' để đúng chuẩn TypeScript
        setProducts(data as unknown as Product[]);
      }
      setLoading(false);
    };

    fetchCourses();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'all' 
      ? true 
      : activeTab === 'appsheet' ? product.name.toLowerCase().includes('appsheet')
      : activeTab === 'automation' ? product.name.toLowerCase().includes('auto')
      : true; 
      
    return matchesSearch && matchesTab;
  });

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Thư viện Khóa học</h1>
            
            <div className="relative max-w-xl mb-8">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Tìm kiếm khóa học bạn quan tâm..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 p-3.5 rounded-full border border-gray-200 shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" 
                />
            </div>

            <div className="flex flex-wrap gap-3 border-b border-gray-200 pb-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-all border-b-2 ${
                            activeTab === tab.id 
                            ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' 
                            : 'border-transparent text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
                        }`}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>
        </div>

        {loading ? (
            <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>
        ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Không tìm thấy khóa học nào phù hợp.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts.map((course) => (
                    <Link href={`/product/${course.slug}`} key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
                        <div className="aspect-video relative overflow-hidden bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={course.thumbnail_url || 'https://via.placeholder.com/400'} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                                <MonitorPlay className="w-3 h-3" /> Online
                            </div>
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                            <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-2">{course.categories?.name || 'Khóa học'}</div>
                            <h3 className="font-bold text-gray-900 line-clamp-2 mb-3 group-hover:text-emerald-600 transition-colors flex-1 text-base">{course.name}</h3>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 1.2k học viên</span>
                                <span>•</span>
                                <span>25 bài giảng</span>
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                                <span className="text-red-600 font-bold text-lg">{formatPrice(course.price)}</span>
                                <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        )}
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-20 pt-8">
      <Suspense fallback={<div className="text-center py-10">Đang tải...</div>}>
        <CategoriesContent />
      </Suspense>
    </main>
  );
}