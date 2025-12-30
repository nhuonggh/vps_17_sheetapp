'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Facebook, Mail, MapPin, Phone, Youtube, CreditCard, ShieldCheck, FileText, Monitor, ExternalLink, X, ZoomIn } from 'lucide-react';
import { APP_CONFIG } from '@/lib/constants';

export default function Footer() {
  const [isZoomedQR, setIsZoomedQR] = useState(false);

  return (
    <>
      {/* --- PHẦN 1: FOOTER CHÍNH --- */}
      <footer className="bg-black text-gray-400 pt-16 pb-24 md:pb-20 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10 mb-12 items-start">
            
            {/* CỘT 1: LIÊN HỆ */}
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider border-l-4 border-emerald-500 pl-3">Liên hệ</h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{APP_CONFIG.contact.address}</span>
                </div>

                <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-white font-bold text-lg">{APP_CONFIG.contact.phone}</span>
                </div>
                
                <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span>{APP_CONFIG.contact.email}</span>
                </div>
              </div>
            </div>

            {/* CỘT 2: THANH TOÁN */}
            <div className="space-y-5 md:col-span-1">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider border-l-4 border-emerald-500 pl-3">Thanh toán</h3>
              
              <div className="flex gap-4 items-start">
                  {/* Text Info */}
                  <div className="flex-1 space-y-2 text-sm">
                      <div className="text-emerald-500 font-bold flex items-center gap-1 mb-1">
                          <CreditCard className="w-4 h-4" /> {APP_CONFIG.payment.bank_name}
                      </div>
                      <div>
                          <p className="text-xs text-gray-500">Số tài khoản:</p>
                          <p className="font-mono font-bold text-white text-base tracking-wider">{APP_CONFIG.payment.account_no}</p>
                      </div>
                      <div>
                          <p className="text-xs text-gray-500">Chủ tài khoản:</p>
                          <p className="text-white font-bold uppercase text-xs">{APP_CONFIG.payment.account_name}</p>
                      </div>
                      <div className="pt-1 border-t border-gray-800 mt-1">
                          <p className="text-xs text-gray-400 italic">{APP_CONFIG.payment.branch_payment}</p>
                      </div>
                  </div>

                  {/* QR Code (Click to Zoom) */}
                  <div 
                    className="bg-white p-1 rounded-lg flex-shrink-0 w-24 h-24 relative group cursor-zoom-in overflow-hidden"
                    onClick={() => setIsZoomedQR(true)}
                  >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={APP_CONFIG.payment.qr_link} 
                        alt="QR" 
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="w-6 h-6 text-white drop-shadow-md" />
                      </div>
                  </div>
              </div>
            </div>

            {/* CỘT 3: HỖ TRỢ (Update Icon Tròn) */}
            <div className="space-y-5">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider border-l-4 border-emerald-500 pl-3">Hỗ trợ</h3>
                <ul className="space-y-4 text-sm">
                    
                    {/* Công cụ hỗ trợ - STYLE ICON TRÒN */}
                    <li>
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase mb-3">
                            <Monitor className="w-4 h-4" /> Công cụ hỗ trợ
                        </div>
                        <div className="flex gap-3">
                             {/* UltraViewer */}
                             <a 
                                href="https://www.ultraviewer.net/vi/download.html" 
                                target="_blank" 
                                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition-all p-2"
                                title="Tải UltraViewer"
                             >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="https://www.ultraviewer.net/images/logo.png" alt="Ultra" className="w-full h-full object-contain" />
                             </a>

                             {/* TeamViewer */}
                             <a 
                                href="https://www.teamviewer.com/vi/" 
                                target="_blank" 
                                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-all p-2"
                                title="Tải TeamViewer"
                             >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="https://www.teamviewer.com/etc.clientlibs/teamviewer/clientlibs/clientlib-resources/resources/favicon.png" alt="Team" className="w-full h-full object-contain" />
                             </a>

                             {/* AnyDesk */}
                             <a 
                                href="https://anydesk.com/en" 
                                target="_blank" 
                                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 transition-all p-2"
                                title="Tải AnyDesk"
                             >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="https://anydesk.com/_static/img/favicon/favicon-32x32.png" alt="Any" className="w-full h-full object-contain" />
                             </a>
                        </div>
                    </li>

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
                </ul>
            </div>

            {/* CỘT 4: CỘNG ĐỒNG */}
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider border-l-4 border-emerald-500 pl-3">Cộng đồng</h3>
              <div className="flex gap-3">
                <a href={APP_CONFIG.social.facebook} target="_blank" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                    <Facebook className="w-5 h-5" />
                </a>
                <a href={APP_CONFIG.social.youtube} target="_blank" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                    <Youtube className="w-5 h-5" />
                </a>
                <a href={APP_CONFIG.social.zalo} target="_blank" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all font-bold">
                    Z
                </a>
              </div>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  Đồng hành cùng học viên trọn đời. Cập nhật kiến thức mới liên tục qua các kênh chính thức.
              </p>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-800 pt-8 text-center md:hidden">
            <p className="text-gray-600 text-xs">
                Thiết kế bởi <a href={APP_CONFIG.designer.url} target="_blank" className="text-gray-400 hover:text-white font-bold">{APP_CONFIG.designer.name}</a>
            </p>
          </div>
        </div>
      </footer>

      {/* --- PHẦN 2: BANNER CỐ ĐỊNH (PC) --- */}
      <div className="hidden md:flex fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-emerald-500 z-[9999] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between text-sm">
            <div className="text-gray-600 font-medium flex items-center gap-2">
                <span>Thiết kế bởi</span>
                <a href={APP_CONFIG.designer.url} target="_blank" className="text-emerald-700 font-bold uppercase hover:underline flex items-center gap-1">
                    {APP_CONFIG.designer.name} <ExternalLink className="w-3 h-3" />
                </a>
            </div>

            <div className="flex items-center gap-8">
                <div className="flex gap-4 text-gray-500 text-xs font-medium">
                    <Link href="/intro" className="hover:text-emerald-600 transition-colors">Giới thiệu</Link>
                    <span className="text-gray-300">|</span>
                    <Link href="/terms" className="hover:text-emerald-600 transition-colors">Điều khoản</Link>
                    <span className="text-gray-300">|</span>
                    <Link href="/privacy" className="hover:text-emerald-600 transition-colors">Bảo mật</Link>
                </div>
                
                <a href={`tel:${APP_CONFIG.contact.hotline_clean}`} className="bg-red-600 text-white px-4 py-1.5 rounded-full font-bold flex items-center gap-2 shadow-md shadow-red-100 hover:scale-105 transition-transform cursor-pointer">
                    <Phone className="w-4 h-4 fill-current animate-pulse" />
                    <span className="text-base">{APP_CONFIG.contact.phone}</span>
                </a>
            </div>
        </div>
      </div>

      {/* --- MODAL ZOOM QR CODE --- */}
      {isZoomedQR && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsZoomedQR(false)}>
            <div className="relative max-w-lg w-full bg-white p-2 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <button onClick={() => setIsZoomedQR(false)} className="absolute -top-12 right-0 text-white hover:text-emerald-400 transition-colors">
                    <X className="w-8 h-8" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={APP_CONFIG.payment.qr_link} alt="QR Code Full" className="w-full h-auto rounded-xl" />
                <div className="text-center mt-3 mb-1">
                    <p className="font-bold text-gray-900 text-lg">{APP_CONFIG.payment.bank_name} - {APP_CONFIG.payment.account_no}</p>
                    <p className="text-gray-500 text-sm uppercase">{APP_CONFIG.payment.account_name}</p>
                </div>
            </div>
        </div>
      )}
    </>
  );
}