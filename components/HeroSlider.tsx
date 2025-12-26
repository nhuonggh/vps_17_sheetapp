'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const slides = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1600&auto=format&fit=crop&q=80',
    title: 'Biến Google Sheets thành Siêu ứng dụng',
    desc: 'Giải pháp quản trị tinh gọn, chi phí thấp cho doanh nghiệp vừa và nhỏ.',
    btnText: 'Khám phá ngay',
    btnLink: '/services'
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&auto=format&fit=crop&q=80',
    title: 'Khóa học AppSheet Thực chiến',
    desc: 'Tự tay xây dựng ứng dụng Mobile không cần biết lập trình.',
    btnText: 'Đăng ký học',
    btnLink: '/courses'
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&auto=format&fit=crop&q=80',
    title: 'Zalo Mini App - Bùng nổ doanh số',
    desc: 'Tiếp cận 70 triệu người dùng Zalo với cửa hàng Mini App chuyên nghiệp.',
    btnText: 'Xem demo',
    btnLink: '/zalo-app'
  }
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);

  // Tự động chạy sau 5 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrent(current === slides.length - 1 ? 0 : current + 1);
  const prevSlide = () => setCurrent(current === 0 ? slides.length - 1 : current - 1);

  return (
    <div className="relative h-[400px] md:h-[500px] w-full overflow-hidden bg-gray-900 group">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Ảnh nền */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.image} alt={slide.title} className="w-full h-full object-cover opacity-40" />
          
          {/* Nội dung chữ */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 animate-in slide-in-from-bottom duration-700 fade-in">
                {slide.title}
            </h2>
            <p className="text-gray-200 text-lg md:text-xl mb-8 max-w-2xl animate-in slide-in-from-bottom duration-1000 fade-in delay-100">
                {slide.desc}
            </p>
            <Link 
                href={slide.btnLink}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105 animate-in zoom-in duration-500 delay-200"
            >
                {slide.btnText}
            </Link>
          </div>
        </div>
      ))}

      {/* Nút điều hướng (Chỉ hiện khi hover) */}
      <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-2 rounded-full text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronLeft size={24} />
      </button>
      <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-2 rounded-full text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={24} />
      </button>

      {/* Dấu chấm chỉ trang */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === current ? 'bg-emerald-500 w-6' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}