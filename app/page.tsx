'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import HeroSlider from '@/components/HeroSlider';
import { ChevronRight, Star, Quote } from 'lucide-react';

// --- INTERFACE & MOCK DATA ---
interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  thumbnail_url: string;
  type: string;
}

const NEWS_DATA = [
  { id: 1, title: "DeepSeek là gì? Đối thủ khiến ChatGPT lo sợ có gì đặc biệt?", date: "06/01/2026", image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=300&h=200" },
  { id: 2, title: "Tổng hợp 10 hàm Excel 'cứu mạng' dân văn phòng 2026", date: "05/01/2026", image: "https://images.unsplash.com/photo-1543286386-2e659306cd6c?auto=format&fit=crop&q=80&w=300&h=200" },
  { id: 3, title: "AppSheet là gì? Tại sao nên dùng AppSheet?", date: "26/12/2025", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=300&h=200" },
];

const PARTNERS = [
  { name: "Google", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
  { name: "Microsoft", logo: "https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg" },
  { name: "Zalo", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Zalo_logo_2024.svg/200px-Zalo_logo_2024.svg.png" },
  { name: "AppSheet", logo: "https://seeklogo.com/images/A/appsheet-logo-7076B95C39-seeklogo.com.png" },
];

const TESTIMONIALS = [
  { id: 1, name: "Nguyễn Văn A", role: "CEO, Tech Corp", content: "Giải pháp tuyệt vời, giúp tôi tiết kiệm 50% thời gian quản lý.", avatar: "https://i.pravatar.cc/150?u=1" },
  { id: 2, name: "Trần Thị B", role: "HR Manager", content: "Khóa học rất thực tế, giảng viên nhiệt tình hỗ trợ.", avatar: "https://i.pravatar.cc/150?u=2" },
];

export default function HomePage() {
  const [courses, setCourses] = useState<Product[]>([]);
  const [services, setServices] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const [coursesRes, servicesRes] = await Promise.all([
          fetch('/api/products?type=course&limit=4'),
          fetch('/api/products?type=service&limit=4'),
        ]);
        const coursesJson = await coursesRes.json();
        const servicesJson = await servicesRes.json();

        if (coursesJson.data) setCourses(coursesJson.data);
        if (servicesJson.data) setServices(servicesJson.data);
      } catch (error) {
        console.error('Error loading homepage products:', error);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  // Component Card
  const ProductCard = ({ p }: { p: Product }) => (
    <Link href={`/product/${p.slug}`} className="group bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full">
        <div className="aspect-video relative bg-gray-100 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            {p.price === 0 && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">FREE</span>}
        </div>
        <div className="p-3 flex flex-col flex-1">
            <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-2 group-hover:text-emerald-600 min-h-[40px]">{p.name}</h3>
            <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
                <span className="text-red-600 font-bold text-sm">{p.price === 0 ? 'Miễn phí' : formatPrice(p.price)}</span>
            </div>
        </div>
    </Link>
  );

  return (
    <main className="min-h-screen bg-white pb-20">
      
      {/* 1. SLIDE CHẠY ẢNH (HERO) */}
      <section className="mt-0 md:mt-8">
         <HeroSlider />
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 py-8">

        {/* 2. KHÓA HỌC */}
        <section>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 uppercase border-l-4 border-emerald-500 pl-3">Khóa học mới nhất</h2>
                <Link href="/categories?tab=course" className="text-sm font-semibold text-emerald-600 flex items-center gap-1 hover:underline">
                    Xem tất cả <ChevronRight className="w-4 h-4"/>
                </Link>
            </div>
            {loading ? <div className="text-center py-10 text-gray-400">Đang tải...</div> : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {courses.map(p => <ProductCard key={p.id} p={p} />)}
                </div>
            )}
        </section>

        {/* 3. DỊCH VỤ */}
        <section>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 uppercase border-l-4 border-blue-500 pl-3">Dịch vụ & Giải pháp</h2>
                <Link href="/categories?tab=service" className="text-sm font-semibold text-blue-600 flex items-center gap-1 hover:underline">
                    Xem tất cả <ChevronRight className="w-4 h-4"/>
                </Link>
            </div>
            {loading ? <div className="text-center py-10 text-gray-400">Đang tải...</div> : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {services.map(p => <ProductCard key={p.id} p={p} />)}
                </div>
            )}
        </section>

        {/* 4. KIẾN THỨC (NEWS) */}
        <section>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 uppercase border-l-4 border-orange-500 pl-3">Kiến thức & Tin tức</h2>
                <Link href="/blog" className="text-sm font-semibold text-orange-600 flex items-center gap-1 hover:underline">
                    Xem thêm <ChevronRight className="w-4 h-4"/>
                </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {NEWS_DATA.map(news => (
                    <Link href={`/blog/${news.id}`} key={news.id} className="flex gap-4 group md:block">
                        <div className="w-32 h-20 md:w-full md:h-48 flex-shrink-0 rounded-lg overflow-hidden relative">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img src={news.image} alt={news.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <div className="flex flex-col justify-center md:mt-3">
                            <h3 className="font-bold text-gray-900 text-sm md:text-base line-clamp-2 group-hover:text-orange-600 transition-colors mb-1">{news.title}</h3>
                            <span className="text-xs text-gray-400">{news.date}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </section>

        {/* 5. ĐỐI TÁC TIN CẬY */}
        <section className="bg-gray-50 -mx-4 px-4 py-8 md:rounded-2xl">
            <h2 className="text-center text-lg font-bold text-gray-900 uppercase mb-6">Đối tác tin cậy</h2>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-70 grayscale hover:grayscale-0 transition-all">
                {PARTNERS.map((partner, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={idx} src={partner.logo} alt={partner.name} className="h-8 md:h-10 object-contain mix-blend-multiply" />
                ))}
            </div>
        </section>

        {/* 6. KHÁCH HÀNG NÓI GÌ */}
        <section>
            <h2 className="text-xl font-bold text-gray-900 uppercase border-l-4 border-purple-500 pl-3 mb-6">Khách hàng nói gì?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TESTIMONIALS.map(t => (
                    <div key={t.id} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                        <div>
                            <div className="flex text-yellow-400 mb-1"><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/></div>
                            <p className="text-gray-600 text-sm italic mb-2 line-clamp-2"><Quote className="w-3 h-3 inline-block rotate-180 mr-1 text-gray-300"/>{t.content}</p>
                            <h4 className="font-bold text-sm text-gray-900">{t.name}</h4>
                            <span className="text-xs text-gray-400">{t.role}</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>

        {/* ĐÃ XÓA PHẦN LIÊN HỆ (GREEN BOX) */}

      </div>
    </main>
  );
}