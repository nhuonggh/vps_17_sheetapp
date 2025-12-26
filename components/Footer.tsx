'use client';

import Link from 'next/link';
import { Facebook, Mail, MapPin, Phone, Youtube, ArrowUp } from 'lucide-react';
import { APP_CONFIG } from '@/lib/constants'; // Import Config

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-black text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          
          {/* Cột 1: Liên hệ */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-emerald-500">LIÊN HỆ</h3>
            <div className="space-y-4 text-gray-300 text-sm">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span>{APP_CONFIG.contact.phone}</span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span>{APP_CONFIG.contact.email}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span>{APP_CONFIG.contact.address}</span>
              </div>
            </div>
          </div>

          {/* Cột 2: Liên kết nhanh */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-emerald-500">LIÊN KẾT NHANH</h3>
            <ul className="space-y-3 text-gray-300 text-sm">
              <li><Link href="/policy" className="hover:text-emerald-400 transition-colors">Chính sách bảo mật</Link></li>
              <li><Link href="/guide" className="hover:text-emerald-400 transition-colors">Hướng dẫn đăng ký tài khoản</Link></li>
              <li><Link href="/courses" className="hover:text-emerald-400 transition-colors">Đăng ký khóa học</Link></li>
              <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">Liên hệ hợp tác</Link></li>
            </ul>
          </div>

          {/* Cột 3: Cộng đồng */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-emerald-500">CỘNG ĐỒNG</h3>
            <div className="flex gap-4">
              <Link href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"><Facebook className="w-5 h-5" /></Link>
              <Link href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"><Youtube className="w-5 h-5" /></Link>
              <Link href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors font-bold">Z</Link>
            </div>
          </div>
        </div>

        {/* Copyright & Back to Top */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">© 2025 SHEETAPP. All rights reserved.</p>
          <button 
            onClick={scrollToTop} 
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-full text-xs font-bold transition-all"
          >
            Lên đầu trang <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}