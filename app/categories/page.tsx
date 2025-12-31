'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ListFilter, Filter, ChevronRight, X, Check, RotateCcw, Briefcase, Cpu } from 'lucide-react';
import { FILTER_TREE } from '@/lib/constants';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  thumbnail_url: string;
  type: string;
  categories: { name: string; slug: string } | null;
  industry_group?: string;
  industry_tag?: string;
  tech_group?: string;
  tech_tag?: string;
}

function CategoriesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // --- 1. XỬ LÝ PARAMS (Hỗ trợ đa chọn, ngăn cách bằng dấu phẩy) ---
  const activeTab = searchParams.get('tab') || 'course'; 
  const activeCost = searchParams.get('cost') || 'all';
  const showFilterDrawer = searchParams.get('openFilter') === 'true';

  // Chuyển chuỗi "A,B,C" thành mảng ["A", "B", "C"] để xử lý logic
  const activeIndustries = searchParams.get('industry') ? searchParams.get('industry')!.split(',') : [];
  const activeTechs = searchParams.get('tech') ? searchParams.get('tech')!.split(',') : [];

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'industry' | 'tech'>('industry');

  const mainTabs = [
    { id: 'course', name: 'Khóa học' },
    { id: 'service', name: 'Dịch vụ' },
    { id: 'tool', name: 'Tiện ích' },
  ];

  const costTabs = [
    { id: 'all', name: 'Tất cả' },
    { id: 'paid', name: 'Có phí' },
    { id: 'free', name: 'Miễn phí' },
  ];

  // FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
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

  // --- 2. HÀM TOGGLE (Thêm/Xóa giá trị vào mảng) ---
  const toggleFilter = (key: 'industry' | 'tech', value: string) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    const currentValues = key === 'industry' ? activeIndustries : activeTechs;
    
    let newValues: string[];
    if (currentValues.includes(value)) {
        // Nếu đã có -> Xóa
        newValues = currentValues.filter(v => v !== value);
    } else {
        // Chưa có -> Thêm
        newValues = [...currentValues, value];
    }

    if (newValues.length > 0) {
        currentParams.set(key, newValues.join(','));
    } else {
        currentParams.delete(key);
    }
    
    router.replace(`${pathname}?${currentParams.toString()}`, { scroll: false });
  };

  // Cập nhật các params đơn lẻ (Tab, Cost, OpenDrawer)
  const updateSingleParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const closeFilterDrawer = () => updateSingleParam('openFilter', null);

  const resetFilters = () => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('industry');
      params.delete('tech');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  // --- 3. LOGIC LỌC SẢN PHẨM (ĐA ĐIỀU KIỆN) ---
  const filteredProducts = allProducts.filter(p => {
    // 1. Tab
    let typeMatch = false;
    if (activeTab === 'course') typeMatch = p.type === 'course';
    else if (activeTab === 'service') typeMatch = p.type === 'service';
    else if (activeTab === 'tool') typeMatch = p.type === 'tool' || p.type === 'template';
    else typeMatch = true;

    // 2. Giá
    let costMatch = true;
    if (activeCost === 'free') costMatch = p.price === 0;
    if (activeCost === 'paid') costMatch = p.price > 0;

    // 3. Ngành (Lọc theo mảng: Sản phẩm chỉ cần thuộc 1 trong các ngành đã chọn)
    let industryMatch = true;
    if (activeIndustries.length > 0) {
        industryMatch = !!p.industry_tag && activeIndustries.includes(p.industry_tag);
    }

    // 4. Công nghệ (Lọc theo mảng)
    let techMatch = true;
    if (activeTechs.length > 0) {
        techMatch = !!p.tech_tag && activeTechs.includes(p.tech_tag);
    }

    return typeMatch && costMatch && industryMatch && techMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
        
        {/* ==================== MOBILE LAYOUT ==================== */}
        <div className="md:hidden">
            {/* 1. MAIN TABS */}
            <div className="sticky top-[112px] z-40 bg-white border-b border-gray-100 -mx-4 px-4 pt-2 pb-0 flex overflow-x-auto scrollbar-hide gap-6">
                {mainTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => updateSingleParam('tab', tab.id)}
                        className={`pb-3 font-bold text-sm whitespace-nowrap border-b-2 transition-all ${
                            activeTab === tab.id 
                            ? 'border-emerald-600 text-emerald-600' 
                            : 'border-transparent text-gray-500'
                        }`}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* 2. SUB-FILTER (Cost) */}
            <div className="py-3 flex gap-2 overflow-x-auto scrollbar-hide">
                {costTabs.map(c => (
                    <button
                        key={c.id}
                        onClick={() => updateSingleParam('cost', c.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                            activeCost === c.id
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-gray-200 text-gray-600'
                        }`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            {/* 3. PRODUCT GRID */}
            <div className="space-y-4 pb-20">
                 {loading ? <p className="text-center py-10 text-gray-400 text-sm">Đang tải dữ liệu...</p> : 
                  filteredProducts.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                        <p className="text-gray-500 text-sm">Chưa có dữ liệu phù hợp.</p>
                        <button onClick={resetFilters} className="text-emerald-600 text-sm font-bold mt-2">Xóa bộ lọc</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredProducts.map(p => (
                            <Link href={`/product/${p.slug}`} key={p.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                                <div className="aspect-square relative bg-gray-100">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                                    {p.price === 0 && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">FREE</span>}
                                    {p.industry_tag && <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">{p.industry_tag}</span>}
                                </div>
                                <div className="p-3">
                                    <h3 className="font-medium text-gray-900 text-xs line-clamp-2 h-8 mb-1">{p.name}</h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-red-600 font-bold text-sm">{p.price === 0 ? 'Miễn phí' : formatPrice(p.price)}</span>
                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                  )}
            </div>

            {/* 4. DRAWER FILTER */}
            {showFilterDrawer && (
                <div className="fixed inset-0 z-[150] flex flex-col bg-white animate-in slide-in-from-right duration-300">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
                        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            <Filter className="w-5 h-5 text-emerald-600"/> Bộ lọc tìm kiếm
                        </h3>
                        <button onClick={closeFilterDrawer} className="p-1 rounded-full hover:bg-gray-100">
                            <X className="w-6 h-6 text-gray-500"/>
                        </button>
                    </div>

                    {/* Body: 2 Cột */}
                    <div className="flex flex-1 overflow-hidden">
                        
                        {/* CỘT TRÁI: DANH MỤC */}
                        <div className="w-[30%] bg-gray-50 border-r border-gray-100 overflow-y-auto">
                            <button 
                                onClick={() => setFilterMode('industry')}
                                className={`w-full p-4 text-left text-xs font-bold uppercase tracking-wider border-l-4 transition-all relative ${
                                    filterMode === 'industry' 
                                    ? 'bg-white border-emerald-600 text-emerald-700' 
                                    : 'border-transparent text-gray-500 hover:bg-gray-100'
                                }`}
                            >
                                Lĩnh vực
                                {activeIndustries.length > 0 && (
                                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{activeIndustries.length}</div>
                                )}
                            </button>

                            <button 
                                onClick={() => setFilterMode('tech')}
                                className={`w-full p-4 text-left text-xs font-bold uppercase tracking-wider border-l-4 transition-all relative ${
                                    filterMode === 'tech' 
                                    ? 'bg-white border-emerald-600 text-emerald-700' 
                                    : 'border-transparent text-gray-500 hover:bg-gray-100'
                                }`}
                            >
                                Công nghệ
                                {activeTechs.length > 0 && (
                                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{activeTechs.length}</div>
                                )}
                            </button>
                        </div>

                        {/* CỘT PHẢI: CHI TIẾT (GRID 2 CỘT & ĐA CHỌN) */}
                        <div className="w-[70%] bg-white overflow-y-auto p-4">
                            {filterMode === 'industry' && (
                                <div className="space-y-6">
                                    <h4 className="text-emerald-600 font-bold text-sm mb-2 flex items-center gap-2">
                                        <Briefcase className="w-4 h-4"/> Vui lòng chọn lĩnh vực
                                    </h4>
                                    
                                    {FILTER_TREE.industry.map((group, idx) => (
                                        <div key={idx}>
                                            <div className="text-red-500 font-bold text-xs mb-2 uppercase border-b border-gray-100 pb-1 mt-2">
                                                {group.group}
                                            </div>
                                            {/* SỬA LỖI: GRID 2 CỘT */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {group.tags.map(tag => {
                                                    const isSelected = activeIndustries.includes(tag);
                                                    return (
                                                        <button 
                                                            key={tag}
                                                            onClick={() => toggleFilter('industry', tag)}
                                                            className={`flex flex-col items-center justify-center gap-1 p-2 text-xs text-center border rounded-lg transition-all h-full ${
                                                                isSelected 
                                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' 
                                                                : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {/* Checkbox Icon */}
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <span className="leading-tight">{tag}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {filterMode === 'tech' && (
                                <div className="space-y-6">
                                    <h4 className="text-emerald-600 font-bold text-sm mb-2 flex items-center gap-2">
                                        <Cpu className="w-4 h-4"/> Vui lòng chọn công nghệ
                                    </h4>
                                    
                                    {FILTER_TREE.tech.map((group, idx) => (
                                        <div key={idx}>
                                            <div className="text-red-500 font-bold text-xs mb-2 uppercase border-b border-gray-100 pb-1 mt-2">
                                                {group.group}
                                            </div>
                                            {/* GRID 2 CỘT */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {group.tags.map(tag => {
                                                    const isSelected = activeTechs.includes(tag);
                                                    return (
                                                        <button 
                                                            key={tag}
                                                            onClick={() => toggleFilter('tech', tag)}
                                                            className={`flex flex-col items-center justify-center gap-1 p-2 text-xs text-center border rounded-lg transition-all h-full ${
                                                                isSelected 
                                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' 
                                                                : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <span className="leading-tight">{tag}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 bg-white flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <button 
                            onClick={resetFilters}
                            className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50"
                        >
                            <RotateCcw className="w-4 h-4" /> Thiết lập lại
                        </button>
                        <button 
                            onClick={closeFilterDrawer}
                            className="flex-1 py-3 rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-200 active:scale-95 transition-transform"
                        >
                            Áp dụng ({filteredProducts.length})
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* ==================== DESKTOP LAYOUT (GIỮ NGUYÊN) ==================== */}
        <div className="hidden md:block py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Thư viện Giải pháp</h1>
                <div className="flex gap-4 border-b border-gray-200 pb-1">
                    {mainTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => updateSingleParam('tab', tab.id)}
                            className={`px-4 py-2 font-medium text-sm transition-all border-b-2 ${
                                activeTab === tab.id 
                                ? 'border-emerald-600 text-emerald-700' 
                                : 'border-transparent text-gray-600 hover:text-emerald-600'
                            }`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-4 gap-8 items-start">
                {/* Desktop Filter (Demo) */}
                <div className="col-span-1 space-y-6 sticky top-24">
                     <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Filter className="w-4 h-4"/> LỌC NHANH</h3>
                        <div className="space-y-4">
                            {FILTER_TREE.industry.map((group, idx) => (
                                <div key={idx}>
                                    <div className="text-xs font-bold text-gray-400 uppercase mb-2">{group.group}</div>
                                    <div className="space-y-1">
                                        {group.tags.map(tag => (
                                            <button 
                                                key={tag}
                                                onClick={() => toggleFilter('industry', tag)}
                                                className={`block text-sm w-full text-left py-1 hover:text-emerald-600 ${activeIndustries.includes(tag) ? 'text-emerald-600 font-bold' : 'text-gray-600'}`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                </div>

                <div className="col-span-3">
                     <div className="grid grid-cols-3 gap-6">
                        {filteredProducts.map((p) => (
                            <div key={p.id} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                <Link href={`/product/${p.slug}`}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={p.thumbnail_url} alt={p.name} className="w-full h-40 object-cover rounded-lg mb-3" />
                                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-2 hover:text-emerald-600">{p.name}</h3>
                                </Link>
                                <div className="text-red-600 font-bold">{formatPrice(p.price)}</div>
                            </div>
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
    <main className="min-h-screen bg-gray-50 pb-safe pt-safe md:pt-8">
      <Suspense fallback={<div className="text-center py-10">Đang tải...</div>}>
        <CategoriesContent />
      </Suspense>
    </main>
  );
}