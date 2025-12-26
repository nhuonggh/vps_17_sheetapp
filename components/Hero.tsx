import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Hero() {
  return (
    <section className="pt-32 pb-16 px-4 bg-gradient-to-b from-emerald-50/50 to-white">
      <div className="max-w-7xl mx-auto text-center">
        {/* Badge nhỏ xinh trên cùng */}
        <div className="inline-flex items-center gap-2 bg-white border border-emerald-100 px-4 py-1.5 rounded-full shadow-sm mb-8 animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="text-sm font-medium text-gray-600">Giải pháp quản trị 4.0</span>
        </div>

        {/* Headline chính */}
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
          Biến <span className="text-emerald-600 relative inline-block">
            Google Sheets
            <svg className="absolute w-full h-3 -bottom-1 left-0 text-emerald-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
            </svg>
          </span>
          <br className="hidden md:block" /> thành Siêu ứng dụng quản lý
        </h1>

        {/* Sub-headline */}
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Cung cấp các Template, WebApp, Zalo Mini App chuyên nghiệp sử dụng Google Sheet làm cơ sở dữ liệu. Tiết kiệm - Hiệu quả - Bảo mật.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="#products" className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 text-white rounded-full font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
            Khám phá ngay
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="#" className="w-full sm:w-auto px-8 py-3.5 bg-white text-gray-700 border border-gray-200 rounded-full font-semibold hover:bg-gray-50 transition-all flex items-center justify-center">
            Xem Demo
          </Link>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Thanh toán 1 lần
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Bảo mật 4 lớp
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Hỗ trợ trọn đời
          </div>
        </div>
      </div>
    </section>
  );
}