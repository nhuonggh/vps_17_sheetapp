'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Search, Filter, Phone, ChevronDown, Menu, X, Briefcase, Cpu, Check, RotateCcw, DollarSign } from 'lucide-react';
import { APP_CONFIG, FILTER_TREE } from '@/lib/constants';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';

// --- TYPES ---
type ParentTabType = 'all' | 'course' | 'service';

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

interface MobileProps {
  products: Product[];
  loading: boolean;
  formatPrice: (price: number) => string;
}

// --- CONSTANTS ---
const PARENT_TABS: { id: ParentTabType; name: string }[] = [
  { id: 'all', name: 'Tất cả' },
  { id: 'course', name: 'Khóa học' },
  { id: 'service', name: 'Dịch vụ' },
];

const COURSE_TABS = [
  { id: 'all_course', name: 'Tất cả khóa học' },
  { id: 'online', name: 'Online Video' },
  { id: 'zoom', name: 'Zoom Trực tiếp' },
  { id: 'appsheet', name: 'Google AppSheet' },
  { id: 'automation', name: 'Automation' },
];

const SERVICE_TABS = [
  { id: 'all_service', name: 'Tất cả dịch vụ' },
  { id: 'zalo', name: 'Zalo Mini App' },
  { id: 'web', name: 'Web App' },
  { id: 'pc', name: 'Phần mềm PC' },
  { id: 'automation_service', name: 'AI Automation' },
];

const MENU_GROUPS = [
    {
      title: "KHÓA HỌC ONLINE",
      items: [
        { name: "Khóa học Miễn phí", href: "/categories?tab=course&cost=free" },
        { name: "Khóa học Chuyên sâu (VIP)", href: "/categories?tab=course&cost=paid" },
      ]
    },
    {
      title: "DỊCH VỤ & GIẢI PHÁP",
      items: [
        { name: "Zalo Mini App", href: "/services/zalo" },
        { name: "AppSheet App", href: "/services/appsheet" },
        { name: "Web App", href: "/services/web" },
      ]
    },
    {
      title: "TIỆN ÍCH MỞ RỘNG",
      items: [
        { name: "Tra cứu Mã số thuế", href: "/tools/lookup" },
        { name: "Template Sheet", href: "/tools/template" },
      ]
    }
];

// --- HELPER LOGIC ---
const isMatchSubTab = (p: Product, subTabId: string) => {
    const catSlug = p.categories?.slug || '';
    const s = subTabId.toLowerCase();
    if (s === 'online') return catSlug.includes('online');
    if (s === 'zoom') return catSlug.includes('zoom');
    if (s === 'appsheet') return catSlug.includes('appsheet') || catSlug.includes('nocode');
    if (s === 'automation') return catSlug.includes('automation') || catSlug.includes('n8n');
    if (s === 'zalo') return catSlug.includes('zalo');
    if (s === 'web') return catSlug.includes('web');
    if (s === 'pc') return catSlug.includes('pc') || catSlug.includes('software');
    if (s === 'automation_service') return catSlug.includes('automation');
    return true;
};

// --- SUB COMPONENTS ---

// 1. ProductCard
const ProductCard = ({ p, formatPrice }: { p: Product, formatPrice: (price: number) => string }) => (
  <Link href={`/product/${p.slug}`} className="bg-white border rounded-xl p-3 shadow-sm flex flex-col h-full active:scale-[0.98] transition-transform">
      <div className="aspect-video relative bg-gray-100 rounded-lg mb-2 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
          {p.price === 0 && <span className="absolute top-1 left-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">FREE</span>}
      </div>
      <h3 className="font-bold text-gray-900 text-xs line-clamp-2 mb-1 min-h-[32px]">{p.name}</h3>
      <div className="mt-auto text-red-600 font-bold text-xs">{p.price === 0 ? 'Miễn phí' : formatPrice(p.price)}</div>
  </Link>
);

// 2. RenderGroupedList
interface GroupedListProps {
    tabs: { id: string, name: string }[];
    type: 'course' | 'service';
    data: Product[];
    onViewMore: (type: 'course' | 'service', subId: string) => void;
    formatPrice: (price: number) => string;
}

const RenderGroupedList = ({ tabs, type, data, onViewMore, formatPrice }: GroupedListProps) => {
    return (
        <div className="space-y-6">
            {tabs.slice(1).map(sub => { // Bỏ tab 'all_...' đầu tiên
                // Lọc dữ liệu dựa trên data đã được filter cơ bản (search, cost, tags) truyền vào
                const items = data.filter(p => p.type === type && isMatchSubTab(p, sub.id));
                
                if(items.length === 0) return null;
                return (
                    <div key={sub.id}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xs font-bold text-gray-500 uppercase">{sub.name}</h3>
                            <button 
                                onClick={() => onViewMore(type, sub.id)} 
                                className="text-[10px] text-emerald-600 font-bold"
                            >
                                Xem thêm &rarr;
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {items.slice(0, 4).map(p => <ProductCard key={p.id} p={p} formatPrice={formatPrice} />)}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// --- MAIN COMPONENT ---
export default function CategoriesViewMobile({ products, loading, formatPrice }: MobileProps) {
  const { totalItems } = useCart();
  
  // XỬ LÝ SEARCH PARAMS TỪ URL
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q');

  // State UI
  const [parentTab, setParentTab] = useState<ParentTabType>('all');
  const [childTab, setChildTab] = useState<string>('all_course'); 
  const [keyword, setKeyword] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // State Filter Data
  const [activeIndustries, setActiveIndustries] = useState<string[]>([]);
  const [activeTechs, setActiveTechs] = useState<string[]>([]);
  const [activeCosts, setActiveCosts] = useState<string[]>(['free', 'paid']); 
  const [filterMode, setFilterMode] = useState<'price' | 'industry' | 'tech'>('price');

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getUser();
  }, []);

  // FIX LỖI SET STATE IN EFFECT
  useEffect(() => {
    if (queryParam) {
        const timer = setTimeout(() => setKeyword(queryParam), 0);
        return () => clearTimeout(timer);
    }
  }, [queryParam]);

  // 1. DATA ĐÃ LỌC CƠ BẢN (Search, Filter, Cost)
  const baseFilteredData = useMemo(() => {
      let data = products;

      // Search
      if (keyword.trim()) data = data.filter(p => p.name.toLowerCase().includes(keyword.toLowerCase()));

      // Cost
      const isFree = activeCosts.includes('free');
      const isPaid = activeCosts.includes('paid');
      if (!isFree && !isPaid) data = [];
      else if (isFree && !isPaid) data = data.filter(p => p.price === 0);
      else if (!isFree && isPaid) data = data.filter(p => p.price > 0);

      // Industry
      if (activeIndustries.length > 0) {
          data = data.filter(p => !!p.industry_tag && activeIndustries.includes(p.industry_tag));
      }

      // Tech
      if (activeTechs.length > 0) {
          data = data.filter(p => !!p.tech_tag && activeTechs.includes(p.tech_tag));
      }

      return data;
  }, [products, keyword, activeIndustries, activeTechs, activeCosts]);

  // 2. DATA CHO GRID VIEW (Khi chọn tab con cụ thể)
  const gridViewData = useMemo(() => {
    let data = baseFilteredData;
    // Filter Parent
    if (parentTab === 'course') data = data.filter(p => p.type === 'course');
    else if (parentTab === 'service') data = data.filter(p => p.type === 'service');

    // Filter Child
    if (parentTab !== 'all' && !childTab.startsWith('all_')) { 
         data = data.filter(p => isMatchSubTab(p, childTab));
    }
    return data;
  }, [baseFilteredData, parentTab, childTab]);

  // Toggle Actions
  const toggleFilterItem = (type: 'industry' | 'tech', value: string) => {
      if (type === 'industry') {
          setActiveIndustries(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
      } else {
          setActiveTechs(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
      }
  };
  const toggleCost = (value: 'free' | 'paid') => {
      setActiveCosts(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };
  const resetFilters = () => {
      setActiveIndustries([]);
      setActiveTechs([]);
      setActiveCosts(['free', 'paid']);
  };

  // Handler xem thêm từ Group View
  const handleViewMore = (type: 'course' | 'service', subId: string) => {
      setParentTab(type);
      setChildTab(subId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="md:hidden flex flex-col min-h-screen bg-gray-50 pb-24">
        
        {/* ================= HEADER CỐ ĐỊNH ================= */}
        <div className="sticky top-0 z-[100] bg-white shadow-md">
            
            {/* Dòng 1: Logo, Hotline, Cart, MENU */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 bg-white">
                <Link href="/" className="font-bold text-lg text-emerald-600">SheetApp</Link>
                <div className="flex items-center gap-3">
                    <a href={`tel:${APP_CONFIG.contact.hotline_clean}`} className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                        <Phone className="w-3 h-3 fill-current" /> {APP_CONFIG.contact.phone}
                    </a>
                    <Link href="/cart" className="relative text-gray-600">
                        <ShoppingCart className="w-5 h-5" />
                        {totalItems > 0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full">{totalItems}</span>}
                    </Link>
                    <button onClick={() => setIsMenuOpen(true)} className="text-gray-700">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Dòng 2: Search & Filter */}
            <div className="px-4 py-2 bg-white flex gap-2 border-b border-gray-100">
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        placeholder="Tìm khóa học, dịch vụ..." 
                        className="w-full bg-gray-100 text-sm rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                </div>
                
                <button 
                    onClick={() => setShowFilterDrawer(true)}
                    className={`flex items-center gap-1 font-bold text-xs whitespace-nowrap px-2 ${activeIndustries.length + activeTechs.length > 0 || activeCosts.length < 2 ? 'text-red-500' : 'text-emerald-600'}`}
                >
                    <Filter className="w-4 h-4" /> Lọc
                    {(activeIndustries.length + activeTechs.length + (activeCosts.length < 2 ? 1 : 0)) > 0 ? `(${activeIndustries.length + activeTechs.length + (activeCosts.length < 2 ? 1 : 0)})` : ''}
                </button>
            </div>

            {/* Dòng 3: Tab Cha */}
            <div className="flex border-b border-gray-200 bg-white">
                {PARENT_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setParentTab(tab.id);
                            if(tab.id === 'course') setChildTab('all_course');
                            else if(tab.id === 'service') setChildTab('all_service');
                        }}
                        className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${
                            parentTab === tab.id ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50' : 'border-transparent text-gray-500'
                        }`}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Dòng 4: Tab Con */}
            {parentTab !== 'all' && (
                <div className="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-2 bg-gray-50 border-b border-gray-200">
                    {(parentTab === 'course' ? COURSE_TABS : SERVICE_TABS).map(sub => (
                        <button
                            key={sub.id}
                            onClick={() => setChildTab(sub.id)}
                            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                childTab === sub.id 
                                ? 'bg-emerald-600 text-white border-emerald-600' 
                                : 'bg-white text-gray-600 border-gray-200'
                            }`}
                        >
                            {sub.name}
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* ================= NỘI DUNG CHÍNH ================= */}
        <div className="px-4 py-4 space-y-6">
            {loading ? <div className="text-center py-10 text-xs text-gray-500">Đang tải dữ liệu...</div> : (
                <>
                    {/* 1. TRƯỜNG HỢP: TAB "TẤT CẢ" (Trang chủ categories) */}
                    {parentTab === 'all' && (
                        <>
                            <h2 className="font-bold text-gray-800 text-base uppercase border-l-4 border-emerald-500 pl-2 mb-4">Khóa học nổi bật</h2>
                            <RenderGroupedList 
                                tabs={COURSE_TABS} 
                                type="course" 
                                data={baseFilteredData}
                                onViewMore={handleViewMore}
                                formatPrice={formatPrice}
                            />
                            
                            <div className="h-2 bg-gray-100 -mx-4 my-6"></div>
                            
                            <h2 className="font-bold text-gray-800 text-base uppercase border-l-4 border-blue-500 pl-2 mb-4">Dịch vụ & Giải pháp</h2>
                            <RenderGroupedList 
                                tabs={SERVICE_TABS} 
                                type="service" 
                                data={baseFilteredData}
                                onViewMore={handleViewMore}
                                formatPrice={formatPrice}
                            />
                        </>
                    )}

                    {/* 2. TRƯỜNG HỢP: TAB KHÓA HỌC -> CHỌN "TẤT CẢ KHÓA HỌC" */}
                    {parentTab === 'course' && childTab === 'all_course' && (
                        <RenderGroupedList 
                            tabs={COURSE_TABS} 
                            type="course" 
                            data={baseFilteredData}
                            onViewMore={handleViewMore}
                            formatPrice={formatPrice}
                        />
                    )}

                    {/* 3. TRƯỜNG HỢP: TAB DỊCH VỤ -> CHỌN "TẤT CẢ DỊCH VỤ" */}
                    {parentTab === 'service' && childTab === 'all_service' && (
                        <RenderGroupedList 
                            tabs={SERVICE_TABS} 
                            type="service" 
                            data={baseFilteredData}
                            onViewMore={handleViewMore}
                            formatPrice={formatPrice}
                        />
                    )}

                    {/* 4. TRƯỜNG HỢP CÒN LẠI: TAB CON CỤ THỂ (GRID VIEW) */}
                    {parentTab !== 'all' && !childTab.startsWith('all_') && (
                        <div>
                            {gridViewData.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-xs">Không tìm thấy dữ liệu</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {gridViewData.map(p => <ProductCard key={p.id} p={p} formatPrice={formatPrice} />)}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>

        {/* ================= FILTER DRAWER ================= */}
        {showFilterDrawer && (
            <div className="fixed inset-0 z-[150] flex flex-col bg-white animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2"><Filter className="w-5 h-5 text-emerald-600"/> Bộ lọc tìm kiếm</h3>
                    <button onClick={() => setShowFilterDrawer(false)} className="p-1 rounded-full hover:bg-gray-100"><X className="w-6 h-6 text-gray-500"/></button>
                </div>
                <div className="flex flex-1 overflow-hidden">
                    <div className="w-[30%] bg-gray-50 border-r border-gray-100 overflow-y-auto">
                        <button onClick={() => setFilterMode('price')} className={`w-full p-4 text-left text-xs font-bold uppercase tracking-wider border-l-4 transition-all relative ${filterMode === 'price' ? 'bg-white border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}>
                            Mức giá {activeCosts.length < 2 && <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{activeCosts.length}</span>}
                        </button>
                        <button onClick={() => setFilterMode('industry')} className={`w-full p-4 text-left text-xs font-bold uppercase tracking-wider border-l-4 transition-all relative ${filterMode === 'industry' ? 'bg-white border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}>
                            Lĩnh vực {activeIndustries.length > 0 && <span className="text-red-500 ml-1">({activeIndustries.length})</span>}
                        </button>
                        <button onClick={() => setFilterMode('tech')} className={`w-full p-4 text-left text-xs font-bold uppercase tracking-wider border-l-4 transition-all relative ${filterMode === 'tech' ? 'bg-white border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}>
                            Công nghệ {activeTechs.length > 0 && <span className="text-red-500 ml-1">({activeTechs.length})</span>}
                        </button>
                    </div>
                    <div className="w-[70%] bg-white overflow-y-auto p-4">
                        {filterMode === 'price' && (
                            <div className="grid grid-cols-2 gap-3">
                                {[ { id: 'free', label: 'Miễn phí' }, { id: 'paid', label: 'Có phí' } ].map(opt => {
                                    const isSelected = activeCosts.includes(opt.id);
                                    return (
                                        <button key={opt.id} onClick={() => toggleCost(opt.id as 'free'|'paid')} className={`flex flex-col items-center justify-center gap-1 p-3 text-xs text-center border rounded-lg transition-all h-full ${isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'border-gray-100 text-gray-600 hover:bg-gray-50'}`}>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>{isSelected && <Check className="w-3 h-3 text-white" />}</div><span className="leading-tight">{opt.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                        {filterMode === 'industry' && (
                            <div className="space-y-6">
                                {FILTER_TREE.industry.map((group, idx) => (
                                    <div key={idx}>
                                        <div className="text-red-500 font-bold text-xs mb-2 uppercase border-b border-gray-100 pb-1 mt-2">{group.group}</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {group.tags.map(tag => {
                                                const isSelected = activeIndustries.includes(tag);
                                                return (
                                                    <button key={tag} onClick={() => toggleFilterItem('industry', tag)} className={`flex flex-col items-center justify-center gap-1 p-2 text-xs text-center border rounded-lg transition-all h-full ${isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'border-gray-100 text-gray-600 hover:bg-gray-50'}`}><div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>{isSelected && <Check className="w-3 h-3 text-white" />}</div><span className="leading-tight">{tag}</span></button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {filterMode === 'tech' && (
                            <div className="space-y-6">
                                {FILTER_TREE.tech.map((group, idx) => (
                                    <div key={idx}>
                                        <div className="text-red-500 font-bold text-xs mb-2 uppercase border-b border-gray-100 pb-1 mt-2">{group.group}</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {group.tags.map(tag => {
                                                const isSelected = activeTechs.includes(tag);
                                                return (
                                                    <button key={tag} onClick={() => toggleFilterItem('tech', tag)} className={`flex flex-col items-center justify-center gap-1 p-2 text-xs text-center border rounded-lg transition-all h-full ${isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'border-gray-100 text-gray-600 hover:bg-gray-50'}`}><div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>{isSelected && <Check className="w-3 h-3 text-white" />}</div><span className="leading-tight">{tag}</span></button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 bg-white flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button onClick={resetFilters} className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50"><RotateCcw className="w-4 h-4" /> Thiết lập lại</button>
                    <button onClick={() => setShowFilterDrawer(false)} className="flex-1 py-3 rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-200 active:scale-95 transition-transform">Áp dụng ({gridViewData.length > 0 ? gridViewData.length : baseFilteredData.length})</button>
                </div>
            </div>
        )}

        {/* ================= SIDEBAR MENU ================= */}
        {isMenuOpen && (
            <div className="fixed inset-0 z-[110] md:hidden">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
                <div className="absolute top-0 right-0 w-[85%] h-full bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                    <div className="p-4 bg-emerald-600 text-white flex justify-between items-start">
                        <div>
                            {user ? (
                                <div className="flex items-center gap-3">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={user.user_metadata.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border-2 border-white/50" alt="User" />
                                    <div><div className="font-bold text-sm">{user.user_metadata.full_name}</div><div className="text-xs opacity-80">{user.email}</div></div>
                                </div>
                            ) : (
                                <div><h3 className="font-bold text-lg">Xin chào!</h3><p className="text-xs opacity-80 mb-2">Đăng nhập để học online & quản lý đơn hàng</p><Link href="/login" className="inline-block bg-white text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">Đăng nhập / Đăng ký</Link></div>
                            )}
                        </div>
                        <button onClick={() => setIsMenuOpen(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
                    </div>
                    <div className="p-4 space-y-6 pb-24">
                        {MENU_GROUPS.map((group, index) => (
                            <div key={index}>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">{group.title}</h4>
                                <div className="space-y-1">
                                    {group.items.map((item, idx) => (
                                        <Link key={idx} href={item.href} onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium text-sm transition-colors">{item.name}<ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" /></Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div className="pt-4 border-t border-gray-100">
                            {user && <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="w-full text-left p-3 text-sm text-red-600 font-medium">Đăng xuất</button>}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}