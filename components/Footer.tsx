'use client';

import Link from 'next/link';
import { Facebook, Mail, MapPin, Phone, Youtube, CreditCard, ShieldCheck, FileText, Monitor, Download } from 'lucide-react';
import { APP_CONFIG } from '@/lib/constants';

export default function Footer() {
  
  return (
    <>
      {/* --- PHẦN 1: FOOTER CHÍNH (Cuộn xuống mới thấy) --- */}
      {/* padding-bottom lớn trên PC để không bị banner che */}
      <footer className="bg-black text-gray-400 pt-16 pb-24 md:pb-20 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-12">
            
            {/* Cột 1: Liên hệ */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider">Liên hệ</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Chung cư Moscow Tower, Q12, TP.HCM</span>
                </div>
                <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-white font-bold">{APP_CONFIG.contact.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span>{APP_CONFIG.contact.email}</span>
                </div>
              </div>
            </div>

            {/* Cột 2: THANH TOÁN (Đã làm gọn, bỏ khung, thẳng hàng) */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider">Thanh toán</h3>
              <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-emerald-500 font-bold">
                      <CreditCard className="w-5 h-5" /> 
                      <span>VIETCOMBANK</span>
                  </div>
                  <div className="space-y-2 pl-7">
                      <p>Số TK: <span className="font-mono font-bold text-white text-base tracking-wider">0987726236</span></p>
                      <p>Chủ TK: <span className="text-white font-bold uppercase">VÕ TẤN NHƯỢNG</span></p>
                  </div>
              </div>
            </div>

            {/* Cột 3: HỖ TRỢ (Đã cập nhật mục mới) */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider">Hỗ trợ</h3>
                <ul className="space-y-3 text-sm">
                    <li>
                        <Link href="/rules" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500"/> Nội quy khóa học
                        </Link>
                    </li>
                    <li>
                        <Link href="/refund" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-gray-500"/> Chính sách hoàn hủy
                        </Link>
                    </li>
                    
                    {/* Công cụ hỗ trợ từ xa */}
                    <li className="pt-4 border-t border-gray-800 mt-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
                            <Monitor className="w-4 h-4" /> Hỗ trợ từ xa
                        </div>
                        <div className="flex flex-wrap gap-2">
                             <a href="https://www.ultraviewer.net/vi/download.html" target="_blank" className="bg-gray-800 hover:bg-emerald-600 hover:text-white px-2 py-1 rounded text-xs transition-colors">UltraViewer</a>
                             <a href="https://www.teamviewer.com/vi/" target="_blank" className="bg-gray-800 hover:bg-blue-600 hover:text-white px-2 py-1 rounded text-xs transition-colors">TeamViewer</a>
                             <a href="https://anydesk.com/en" target="_blank" className="bg-gray-800 hover:bg-red-600 hover:text-white px-2 py-1 rounded text-xs transition-colors">AnyDesk</a>
                        </div>
                    </li>
                </ul>
            </div>

            {/* Cột 4: Cộng đồng */}
            <div>
              <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider">Cộng đồng</h3>
              <div className="flex gap-3">
                <Link href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                    <Facebook className="w-5 h-5" />
                </Link>
                <Link href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                    <Youtube className="w-5 h-5" />
                </Link>
                <Link href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all font-bold">
                    Z
                </Link>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                  Tham gia cộng đồng để nhận tài liệu miễn phí hàng tuần.
              </p>
            </div>
          </div>

          {/* Copyright Mobile */}
          <div className="border-t border-gray-800 pt-8 text-center md:hidden">
            <p className="text-gray-600 text-xs">© 2026 CÔNG TY TNHH GIẢI PHÁP BIM VIỆT</p>
          </div>
        </div>
      </footer>

      {/* --- PHẦN 2: BANNER CỐ ĐỊNH (STICKY BOTTOM BAR - CHỈ HIỆN TRÊN PC) --- */}
      <div className="hidden md:flex fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-emerald-500 z-[9999] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between text-sm">
            
            {/* Bên trái: Bản quyền */}
            <div className="text-gray-700 font-medium flex items-center gap-2">
                <span>© 2026 Bản quyền thuộc về</span>
                <span className="text-emerald-700 font-bold uppercase">CÔNG TY TNHH GIẢI PHÁP BIM VIỆT</span>
            </div>

            {/* Bên phải: Links & Hotline */}
            <div className="flex items-center gap-8">
                {/* Links nhỏ - Chỉ giữ lại những mục quan trọng nhất */}
                <div className="flex gap-4 text-gray-500 text-xs font-medium">
                    <Link href="/intro" className="hover:text-emerald-600 transition-colors">Giới thiệu</Link>
                    <span className="text-gray-300">|</span>
                    <Link href="/terms" className="hover:text-emerald-600 transition-colors">Điều khoản</Link>
                    <span className="text-gray-300">|</span>
                    <Link href="/privacy" className="hover:text-emerald-600 transition-colors">Bảo mật</Link>
                </div>
                
                {/* Hotline nổi bật */}
                <div className="bg-red-600 text-white px-4 py-1.5 rounded-full font-bold flex items-center gap-2 shadow-md shadow-red-100 hover:scale-105 transition-transform cursor-pointer">
                    <Phone className="w-4 h-4 fill-current animate-pulse" />
                    <span className="text-base">0987 726 236</span>
                </div>
            </div>
        </div>
      </div>
    </>
  );
}