'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Search, BookOpen, MonitorPlay, Users, LayoutGrid, ListFilter } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  thumbnail_url: string;
  type: string;
  industry: string;
  categories: { name: string; slug: string } | null;
}

function CategoriesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // 1. Lấy Tab và Ngành từ URL
  const activeTab = searchParams.get('tab') || 'all';
  const activeIndustry = searchParams.get('industry'); 

  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // DANH SÁCH TABS KHÓA HỌC
  const tabs = [
    { id: 'all', name: 'Tất cả' },
    { id: 'appsheet', name: 'AppSheet' },
    { id: 'automation', name: 'Automation' },
    { id: 'online', name: 'Online' },
    { id: 'zoom', name: 'Zoom' },
  ];

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    if(params.has('industry')) params.delete('industry'); // Reset ngành khi đổi tab chính
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const coursesQuery = supabase.from('products').select('*, categories(name, slug)').eq('type', 'course').order('created_at', { ascending: false });
      const servicesQuery = supabase.from('products').select('*, categories(name, slug)').eq('type', 'service').limit(5);

      const [coursesRes, servicesRes] = await Promise.all([coursesQuery, servicesQuery]);
      if (coursesRes.data) setProducts(coursesRes.data as unknown as Product[]);
      if (servicesRes.data) setServices(servicesRes.data as unknown as Product[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  // LOGIC LỌC
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Lọc theo Tab
    let matchesTab = true;
    if (activeTab !== 'all') {
        if (activeTab === 'online') matchesTab = product.type === 'course'; 
        else if (activeTab === 'zoom') matchesTab = product.name.toLowerCase().includes('zoom');
        else matchesTab = product.categories?.slug === activeTab;
    }

    // Lọc theo Ngành (Nếu chọn từ Menu)
    let matchesIndustry = true;
    if (activeIndustry) {
        matchesIndustry = product.industry === activeIndustry;
    }

    return matchesSearch && matchesTab && matchesIndustry;
  });

  // PHÂN NHÓM THEO NGÀNH
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const group = product.industry || 'Khóa học chung';
    if (!acc[group]) acc[group] = [];
    acc[group].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">Thư viện Khóa học</h1>
                    
                    {/* Search */}
                    <div className="relative max-w-xl mb-6">
                        <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm khóa học..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 p-3.5 rounded-full border border-gray-200 shadow-sm focus:outline-none focus:border-emerald-500 transition-all" 
                        />
                    </div>

                    {/* TABS (ĐÃ KHÔI PHỤC) */}
                    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${
                                    activeTab === tab.id 
                                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' 
                                    : 'border-transparent text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
                                }`}
                            >
                                {activeTab === tab.id && <ListFilter className="w-4 h-4" />}
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>
                ) : Object.keys(groupedProducts).length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Không tìm thấy khóa học nào phù hợp.</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {Object.entries(groupedProducts).map(([industry, items]) => (
                            <div key={industry} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Tiêu đề Ngành */}
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="text-lg font-bold text-white bg-emerald-600 px-3 py-1 rounded-lg uppercase shadow-sm">
                                        {industry}
                                    </h2>
                                    <div className="h-[1px] bg-emerald-100 flex-1"></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {items.map((course) => (
                                        <Link href={`/product/${course.slug}`} key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
                                            <div className="aspect-video relative overflow-hidden bg-gray-100">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={course.thumbnail_url || 'https://via.placeholder.com/400'} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                                                    <MonitorPlay className="w-3 h-3" /> Online
                                                </div>
                                            </div>
                                            <div className="p-4 flex flex-col flex-1">
                                                <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">{course.categories?.name}</div>
                                                <h3 className="font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-emerald-600 transition-colors flex-1 text-base">{course.name}</h3>
                                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                                                    <span className="text-red-600 font-bold text-base">{formatPrice(course.price)}</span>
                                                    <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="lg:col-span-1 space-y-6 mt-8 lg:mt-0">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 sticky top-24">
                    <h3 className="font-bold text-gray-900 mb-4 text-base border-l-4 border-emerald-500 pl-2 uppercase">
                        Dịch vụ đề xuất
                    </h3>
                    <div className="space-y-4">
                         {services.map((service) => (
                             <Link href={`/product/${service.slug}`} key={service.id} className="flex gap-3 group">
                                <div className="w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden relative">
                                     {/* eslint-disable-next-line @next/next/no-img-element */}
                                     <img src={service.thumbnail_url} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-xs line-clamp-2 group-hover:text-emerald-600 transition-colors mb-1">{service.name}</h4>
                                    <div className="text-red-600 font-bold text-xs">{formatPrice(service.price)}</div>
                                </div>
                             </Link>
                         ))}
                    </div>
                </div>
            </div>
        </div>
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