'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Smartphone, Database, Layout, Monitor, FileSpreadsheet, Cpu, LayoutGrid, Filter, CheckSquare, Square, ChevronRight, BookOpen } from 'lucide-react';

interface Service {
  id: number;
  name: string;
  slug: string;
  price: number;
  thumbnail_url: string;
  description: string;
  categories: { name: string; slug: string } | null;
  industry: string;
}

// Component con để dùng searchParams
function ServicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Lấy params từ URL
  const activeTab = searchParams.get('tab') || 'all';
  const activeIndustry = searchParams.get('industry');

  const [services, setServices] = useState<Service[]>([]);
  const [courses, setCourses] = useState<Service[]>([]); // Khóa học gợi ý
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // DANH SÁCH NGÀNH
  const industries = [
    "Nhà hàng & F&B", "Khách sạn", "Bán lẻ", "Xây dựng", "Tài chính", "Sản xuất", "Y tế", "Giáo dục", "Nhân sự"
  ];

  // DANH SÁCH TABS DỊCH VỤ
  const tabs = [
    { id: 'all', name: 'Tất cả', icon: LayoutGrid },
    { id: 'zalo', name: 'Zalo Mini App', icon: Smartphone },
    { id: 'appsheet', name: 'AppSheet & Nocode', icon: Database },
    { id: 'web', name: 'Web App', icon: Layout },
    { id: 'pc', name: 'Phần mềm PC', icon: Monitor },
    { id: 'googlesheet', name: 'Google Sheet', icon: FileSpreadsheet },
    { id: 'automation', name: 'AI Automation', icon: Cpu },
  ];

  // Xử lý đổi Tab
  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    if(params.has('industry')) params.delete('industry'); // Reset ngành khi đổi Tab
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Xử lý đổi Ngành (Filter Sidebar)
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
      
      // 1. Lấy Dịch vụ
      const servicesQuery = supabase
        .from('products')
        .select('*, categories(name, slug)')
        .eq('type', 'service')
        .order('created_at', { ascending: false });

      // 2. Lấy Khóa học (Cho Sidebar)
      const coursesQuery = supabase
        .from('products')
        .select('*')
        .eq('type', 'course')
        .limit(5);

      const [sRes, cRes] = await Promise.all([servicesQuery, coursesQuery]);
      
      if (sRes.data) setServices(sRes.data as unknown as Service[]);
      if (cRes.data) setCourses(cRes.data as unknown as Service[]);
      setLoading(false);
    };

    fetchData();
  }, []);

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  // LOGIC LỌC
  const filteredServices = services.filter(s => {
    // 1. Tìm kiếm
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.industry?.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Lọc theo Tab (Loại dịch vụ)
    let matchesTab = true;
    if (activeTab !== 'all') {
        if (activeTab === 'appsheet') matchesTab = s.categories?.slug === 'appsheet' || s.categories?.slug === 'nocode';
        else matchesTab = s.categories?.slug === activeTab;
    }

    // 3. Lọc theo Ngành (Sidebar Filter)
    let matchesIndustry = true;
    if (activeIndustry) {
        matchesIndustry = s.industry === activeIndustry;
    }

    return matchesSearch && matchesTab && matchesIndustry;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Dịch vụ & Giải pháp</h1>
            
            {/* TABS ngang */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg font-medium transition-all text-sm border-b-2 ${
                            activeTab === tab.id 
                            ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' 
                            : 'border-transparent text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {tab.icon && <tab.icon className="w-4 h-4" />}
                        {tab.name}
                    </button>
                ))}
            </div>
        </div>

        {/* LAYOUT: 8/12 Content - 4/12 Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* --- CỘT CHÍNH (8 phần) --- */}
            <div className="lg:col-span-8 order-2 lg:order-1">
                {/* Ô tìm kiếm nhỏ (Chỉ hiện ở mobile hoặc nếu muốn giữ lại trong content) */}
                <div className="mb-6 relative lg:hidden">
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm dịch vụ..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <div className="absolute left-3 top-3 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>
                ) : filteredServices.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Không tìm thấy dịch vụ nào phù hợp.</p>
                        <button onClick={() => {handleTabChange('all'); setSearchTerm('')}} className="mt-4 text-emerald-600 hover:underline">Xem tất cả</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredServices.map((service) => (
                            <Link href={`/product/${service.slug}`} key={service.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
                                <div className="aspect-video relative overflow-hidden bg-gray-100">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={service.thumbnail_url} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-100 shadow-sm">
                                        {service.categories?.name}
                                    </div>
                                    {service.industry && (
                                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                            {service.industry}
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 flex flex-col flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                                        {service.name}
                                    </h3>
                                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">
                                        {service.description}
                                    </p>
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                                        <span className="text-red-600 font-bold text-lg">{formatPrice(service.price)}</span>
                                        <span className="text-emerald-600 text-sm font-medium group-hover:underline">Chi tiết &rarr;</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* --- SIDEBAR (4 phần) --- */}
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

                {/* 2. KHÓA HỌC GỢI Ý */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 text-base border-l-4 border-emerald-500 pl-3 uppercase">
                        Khóa học đề xuất
                    </h3>
                    <div className="space-y-4">
                         {courses.map((course) => (
                             <Link href={`/product/${course.slug}`} key={course.id} className="flex gap-4 group items-start">
                                <div className="w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden relative border border-gray-100">
                                     {/* eslint-disable-next-line @next/next/no-img-element */}
                                     <img src={course.thumbnail_url} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm line-clamp-2 group-hover:text-emerald-600 transition-colors mb-1">{course.name}</h4>
                                    <div className="text-red-600 font-bold text-sm">{formatPrice(course.price)}</div>
                                </div>
                             </Link>
                         ))}
                    </div>
                    <Link href="/categories" className="block w-full text-center text-sm font-bold text-emerald-600 mt-5 hover:underline border-t border-gray-100 pt-3">
                        Xem tất cả khóa học &rarr;
                    </Link>
                </div>
            </div>
        </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-20 pt-8">
      <Suspense fallback={<div className="text-center py-10">Đang tải...</div>}>
        <ServicesContent />
      </Suspense>
    </main>
  );
}