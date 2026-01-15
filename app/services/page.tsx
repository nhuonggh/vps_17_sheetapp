'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Smartphone, Database, Layout, Monitor, FileSpreadsheet, Cpu, LayoutGrid, DollarSign, Briefcase, BookOpen } from 'lucide-react';
import { FILTER_TREE } from '@/lib/constants';

interface Service {
    id: number;
    name: string;
    slug: string;
    price: number;
    thumbnail_url: string;
    description: string;
    categories: { name: string; slug: string } | null;
    industry_tag?: string;
    tech_tag?: string;
}

function ServicesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const activeTab = searchParams.get('tab') || 'all';

    const [services, setServices] = useState<Service[]>([]);
    const [courses, setCourses] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<string>('newest'); // Sort state

    // NEW: Filter states matching categories page
    const [activeCost, setActiveCost] = useState('all');
    const [activeIndustries, setActiveIndustries] = useState<string[]>([]);
    const [activeTechs, setActiveTechs] = useState<string[]>([]);

    const tabs = [
        { id: 'all', name: 'Tất cả', icon: LayoutGrid },
        { id: 'zalo', name: 'Zalo Mini App', icon: Smartphone },
        { id: 'appsheet', name: 'AppSheet & Nocode', icon: Database },
        { id: 'web', name: 'Web App', icon: Layout },
        { id: 'pc', name: 'Phần mềm PC', icon: Monitor },
        { id: 'googlesheet', name: 'Google Sheet', icon: FileSpreadsheet },
        { id: 'automation', name: 'AI Automation', icon: Cpu },
    ];

    const handleTabChange = (tabId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tabId);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const toggleIndustry = (tag: string) => {
        setActiveIndustries(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const toggleTech = (tag: string) => {
        setActiveTechs(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const servicesQuery = supabase
                .from('products')
                .select('*, categories(name, slug)')
                .eq('type', 'service')
                .order('created_at', { ascending: false });

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

    // Apply filters first
    let filteredServices = services.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.description?.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesTab = true;
        if (activeTab !== 'all') {
            if (activeTab === 'appsheet') matchesTab = s.categories?.slug === 'appsheet' || s.categories?.slug === 'nocode';
            else matchesTab = s.categories?.slug === activeTab;
        }

        // Price filtering
        let matchesPrice = true;
        if (activeCost === 'paid') matchesPrice = s.price > 0;
        else if (activeCost === 'free') matchesPrice = s.price === 0;

        // Industry filtering
        let matchesIndustry = activeIndustries.length === 0 ||
            (s.industry_tag && activeIndustries.includes(s.industry_tag));

        // Tech filtering
        let matchesTech = activeTechs.length === 0 ||
            (s.tech_tag && activeTechs.includes(s.tech_tag));

        return matchesSearch && matchesTab && matchesPrice && matchesIndustry && matchesTech;
    });

    // Apply sorting
    filteredServices = [...filteredServices].sort((a, b) => {
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
                return 0; // TODO
            default:
                return 0;
        }
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                {/* Header with Sort */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Dịch vụ & Giải pháp</h1>

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <label className="text-sm text-gray-600 mr-2 font-medium">Sắp xếp:</label>
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
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
                <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg font-medium transition-all text-sm border-b-2 ${activeTab === tab.id
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* SIDEBAR - NOW ON LEFT */}
                <div className="lg:col-span-4 space-y-6 order-2 lg:order-1 sticky top-24">
                    {/* Price Filter */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm uppercase">
                            <DollarSign className="w-4 h-4" /> Mức giá
                        </h3>
                        <div className="space-y-2">
                            {[
                                { id: 'all', name: 'Tất cả' },
                                { id: 'paid', name: 'Có phí' },
                                { id: 'free', name: 'Miễn phí' }
                            ].map(c => (
                                <label key={c.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                                    <input
                                        type="radio"
                                        name="cost"
                                        checked={activeCost === c.id}
                                        onChange={() => setActiveCost(c.id)}
                                        className="accent-emerald-600 w-4 h-4"
                                    />
                                    <span className="text-sm text-gray-700 font-medium">{c.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Industry Filter - GROUPED */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm uppercase">
                            <Briefcase className="w-4 h-4" /> Lọc theo Ngành
                        </h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                            {FILTER_TREE.industry.map((group, idx) => (
                                <div key={idx}>
                                    <div className="text-xs font-bold text-gray-400 uppercase mb-2">{group.group}</div>
                                    <div className="space-y-1">
                                        {group.tags.map(tag => (
                                            <label key={tag} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={activeIndustries.includes(tag)}
                                                    onChange={() => toggleIndustry(tag)}
                                                    className="accent-emerald-600 rounded w-4 h-4"
                                                />
                                                <span className={`text-sm ${activeIndustries.includes(tag) ? 'text-emerald-700 font-bold' : 'text-gray-600'}`}>
                                                    {tag}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Technology Filter - GROUPED */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm uppercase">
                            <Cpu className="w-4 h-4" /> Công nghệ
                        </h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                            {FILTER_TREE.tech.map((group, idx) => (
                                <div key={idx}>
                                    <div className="text-xs font-bold text-gray-400 uppercase mb-2">{group.group}</div>
                                    <div className="space-y-1">
                                        {group.tags.map(tag => (
                                            <label key={tag} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={activeTechs.includes(tag)}
                                                    onChange={() => toggleTech(tag)}
                                                    className="accent-emerald-600 rounded w-4 h-4"
                                                />
                                                <span className={`text-sm ${activeTechs.includes(tag) ? 'text-emerald-700 font-bold' : 'text-gray-600'}`}>
                                                    {tag}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommended Courses - KEPT */}
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

                {/* MAIN CONTENT - NOW ON RIGHT */}
                <div className="lg:col-span-8 order-1 lg:order-2">
                    <div className="mb-6 relative lg:hidden">
                        <input
                            type="text"
                            placeholder="Tìm kiếm dịch vụ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    {loading ? (
                        <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>
                    ) : filteredServices.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Không tìm thấy dịch vụ nào phù hợp.</p>
                            <button onClick={() => { handleTabChange('all'); setSearchTerm(''); setActiveCost('all'); setActiveIndustries([]); setActiveTechs([]); }} className="mt-4 text-emerald-600 hover:underline">Xem tất cả</button>
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
                                        {service.industry_tag && (
                                            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                                {service.industry_tag}
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