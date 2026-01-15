'use client';

import Link from 'next/link';
import { DollarSign, Briefcase, Cpu } from 'lucide-react';
import { FILTER_TREE } from '@/lib/constants';

// Interface dùng chung (Có thể tách ra file types riêng nếu muốn)
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

interface DesktopProps {
    products: Product[];
    loading: boolean;
    activeTab: string;
    activeCost: string;
    activeIndustries: string[];
    activeTechs: string[];
    mainTabs: { id: string; name: string }[];
    costTabs: { id: string; name: string }[];
    onUpdateParam: (key: string, value: string | null) => void;
    onToggleFilter: (key: 'industry' | 'tech', value: string) => void;
    checkCategoryMatch: (p: Product, tabId: string) => boolean;
    formatPrice: (price: number) => string;
    sortOrder?: string; // New prop
    onSortChange?: (value: string) => void; // New prop
}

export default function CategoriesViewPC({
    products,
    loading,
    activeTab,
    activeCost,
    activeIndustries,
    activeTechs,
    mainTabs,
    costTabs,
    onUpdateParam,
    onToggleFilter,
    checkCategoryMatch,
    formatPrice,
    sortOrder = 'newest',
    onSortChange = () => { }
}: DesktopProps) {

    const ProductCard = ({ p }: { p: Product }) => (
        <div className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
            <Link href={`/product/${p.slug}`}>
                <div className="aspect-video relative bg-gray-100 rounded-lg mb-3 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                    {p.price === 0 && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">FREE</span>}
                </div>
                <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-2 hover:text-emerald-600 min-h-[40px]">
                    {p.name}
                </h3>
            </Link>
            <div className="mt-auto pt-2 border-t border-gray-50 text-red-600 font-bold text-sm">
                {p.price === 0 ? 'Miễn phí' : formatPrice(p.price)}
            </div>
        </div>
    );

    return (
        <div className="hidden md:block py-8">
            <div className="mb-8">
                {/* Header with Sort */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Thư viện Khóa học</h1>

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <label className="text-sm text-gray-600 mr-2 font-medium">Sắp xếp:</label>
                        <select
                            value={sortOrder}
                            onChange={(e) => onSortChange(e.target.value)}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-gray-700"
                        >
                            <option value="newest">Từ mới nhất đến cũ nhất</option>
                            <option value="oldest">Từ cũ nhất đến mới nhất</option>
                            <option value="price-asc">Giá thấp đến cao</option>
                            <option value="price-desc">Giá cao đến thấp</option>
                            <option value="name-asc">Theo tên từ A-Z</option>
                            <option value="name-desc">Theo tên từ Z-A</option>
                            <option value="popular">Mua nhiều nhất</option>
                        </select>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-gray-200 pb-1">
                    {mainTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => onUpdateParam('tab', tab.id)}
                            className={`px-4 py-2 font-medium text-sm transition-all border-b-2 ${activeTab === tab.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-600 hover:text-emerald-600'}`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-4 gap-8 items-start">
                {/* --- SIDEBAR BỘ LỌC --- */}
                <div className="col-span-1 space-y-6 sticky top-24">
                    {/* Giá */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm uppercase"><DollarSign className="w-4 h-4" /> Mức giá</h3>
                        <div className="space-y-2">
                            {costTabs.map(c => (
                                <label key={c.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                                    <input type="radio" name="cost_pc" checked={activeCost === c.id} onChange={() => onUpdateParam('cost', c.id)} className="accent-emerald-600 w-4 h-4" />
                                    <span className="text-sm text-gray-700 font-medium">{c.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {/* Ngành */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm uppercase"><Briefcase className="w-4 h-4" /> Lọc theo Ngành</h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                            {FILTER_TREE.industry.map((group, idx) => (
                                <div key={idx}>
                                    <div className="text-xs font-bold text-gray-400 uppercase mb-2">{group.group}</div>
                                    <div className="space-y-1">
                                        {group.tags.map(tag => (
                                            <label key={tag} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                <input type="checkbox" checked={activeIndustries.includes(tag)} onChange={() => onToggleFilter('industry', tag)} className="accent-emerald-600 rounded w-4 h-4" />
                                                <span className={`text-sm ${activeIndustries.includes(tag) ? 'text-emerald-700 font-bold' : 'text-gray-600'}`}>{tag}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Công nghệ */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm uppercase"><Cpu className="w-4 h-4" /> Công nghệ</h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                            {FILTER_TREE.tech.map((group, idx) => (
                                <div key={idx}>
                                    <div className="text-xs font-bold text-gray-400 uppercase mb-2">{group.group}</div>
                                    <div className="space-y-1">
                                        {group.tags.map(tag => (
                                            <label key={tag} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                <input type="checkbox" checked={activeTechs.includes(tag)} onChange={() => onToggleFilter('tech', tag)} className="accent-emerald-600 rounded w-4 h-4" />
                                                <span className={`text-sm ${activeTechs.includes(tag) ? 'text-emerald-700 font-bold' : 'text-gray-600'}`}>{tag}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- NỘI DUNG CHÍNH --- */}
                <div className="col-span-3">
                    {loading ? <div className="text-center py-20">Đang tải...</div> :
                        products.length === 0 ? (
                            <div className="text-center py-20 border border-dashed border-gray-200 rounded-xl">Không tìm thấy khóa học phù hợp</div>
                        ) : (
                            activeTab === 'all' ? (
                                // GOM NHÓM
                                <div className="space-y-10">
                                    {mainTabs.slice(1).map(tab => {
                                        const groupProducts = products.filter(p => checkCategoryMatch(p, tab.id));
                                        if (groupProducts.length === 0) return null;
                                        return (
                                            <div key={tab.id}>
                                                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                                                    <h2 className="font-bold text-lg text-gray-800 border-l-4 border-emerald-500 pl-3">{tab.name}</h2>
                                                    <button onClick={() => onUpdateParam('tab', tab.id)} className="text-xs font-bold text-emerald-600 hover:underline">Xem tất cả</button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-6">
                                                    {groupProducts.slice(0, 6).map(p => (
                                                        <div key={p.id} className="h-full"><ProductCard p={p} /></div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                // GRID THƯỜNG
                                <div className="grid grid-cols-3 gap-6">
                                    {products.map(p => (
                                        <div key={p.id} className="h-full"><ProductCard p={p} /></div>
                                    ))}
                                </div>
                            )
                        )}
                </div>
            </div>
        </div>
    );
}