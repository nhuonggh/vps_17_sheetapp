'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BookOpen, MonitorPlay, ListFilter, Filter, ChevronRight, CheckSquare, Square } from 'lucide-react';

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

  const activeTab = searchParams.get('tab') || 'all';
  const activeIndustry = searchParams.get('industry'); 

  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Danh sách ngành để tạo bộ lọc
  const industries = [
    "Xây dựng", "Tài chính", "Sản xuất", "Nhân sự", "Marketing", "Bán lẻ", "Giáo dục"
  ];

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
    if(params.has('industry')) params.delete('industry'); 
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleIndustryChange = (industry: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeIndustry === industry) {
        params.delete('industry'); // Bỏ chọn
    } else {
        params.set('industry', industry);
    }
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
    let matchesTab = true;
    if (activeTab !== 'all') {
        if (activeTab === 'online') matchesTab = product.type === 'course'; 
        else if (activeTab === 'zoom') matchesTab = product.name.toLowerCase().includes('zoom');
        else matchesTab = product.categories?.slug === activeTab;
    }

    let matchesIndustry = true;
    if (activeIndustry) {
        matchesIndustry = product.industry === activeIndustry;
    }

    return matchesTab && matchesIndustry;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tiêu đề & Tabs */}
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Thư viện Khóa học</h1>
            
            {/* TABS ngang */}
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

        {/* LAYOUT MỚI: Grid 12 cột (Content 8 - Sidebar 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* --- CỘT CHÍNH (Chiếm 8 phần) --- */}
            <div className="lg:col-span-8 order-2 lg:order-1">
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Không tìm thấy khóa học nào phù hợp.</p>
                        <button onClick={() => router.push(pathname)} className="mt-4 text-emerald-600 hover:underline">Xóa bộ lọc</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredProducts.map((course) => (
                            <Link href={`/product/${course.slug}`} key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
                                <div className="aspect-video relative overflow-hidden bg-gray-100">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={course.thumbnail_url || 'https://via.placeholder.com/400'} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                                        <MonitorPlay className="w-3 h-3" /> Online
                                    </div>
                                    {course.industry && (
                                        <div className="absolute bottom-3 right-3 bg-white/90 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                            {course.industry}
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 flex flex-col flex-1">
                                    <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">{course.categories?.name}</div>
                                    <h3 className="font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-emerald-600 transition-colors flex-1 text-base">{course.name}</h3>
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

            {/* --- SIDEBAR (Chiếm 4 phần - To hơn) --- */}
            <div className="lg:col-span-4 space-y-8 order-1 lg:order-2 sticky top-24">
                
                {/* 1. BỘ LỌC NGÀNH */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                        <Filter className="w-5 h-5 text-emerald-600" />
                        <h3 className="font-bold text-gray-900 text-base uppercase">Lọc theo ngành</h3>
                    </div>
                    <div className="space-y-2">
                         {industries.map((industry) => {
                             const isActive = activeIndustry === industry;
                             return (
                                <div 
                                    key={industry} 
                                    onClick={() => handleIndustryChange(industry)}
                                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-gray-50 border border-transparent'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        {isActive ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-gray-300" />}
                                        <span className={`text-sm ${isActive ? 'font-bold text-emerald-700' : 'text-gray-600'}`}>{industry}</span>
                                    </div>
                                    {isActive && <ChevronRight className="w-4 h-4 text-emerald-500" />}
                                </div>
                             )
                         })}
                    </div>
                </div>

                {/* 2. DỊCH VỤ ĐỀ XUẤT */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 text-base border-l-4 border-emerald-500 pl-3 uppercase">
                        Dịch vụ doanh nghiệp
                    </h3>
                    <div className="space-y-4">
                         {services.map((service) => (
                             <Link href={`/product/${service.slug}`} key={service.id} className="flex gap-4 group items-start">
                                <div className="w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden relative border border-gray-100">
                                     {/* eslint-disable-next-line @next/next/no-img-element */}
                                     <img src={service.thumbnail_url} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm line-clamp-2 group-hover:text-emerald-600 transition-colors mb-1">{service.name}</h4>
                                    <div className="text-red-600 font-bold text-sm">{formatPrice(service.price)}</div>
                                </div>
                             </Link>
                         ))}
                    </div>
                    <Link href="/services" className="block w-full text-center text-sm font-bold text-emerald-600 mt-5 hover:underline border-t border-gray-100 pt-3">
                        Xem tất cả dịch vụ &rarr;
                    </Link>
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