'use client';

import Link from 'next/link';
import { Phone } from 'lucide-react';
import { APP_CONFIG } from '@/lib/constants';
import { useState } from 'react';
import ConsultationModal from './ConsultationModal'; // Import Form Modal

/* --- ICON ASSETS --- */
const ZaloImg = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Icon_of_Zalo.svg/120px-Icon_of_Zalo.svg.png" 
    alt="Zalo" 
    className="w-full h-full object-contain"
  />
);

const MessengerIcon = () => (
  <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
     <path d="M14 0C6.18247 0 0 5.90824 0 13.1977C0 17.3364 2.11576 21.0341 5.42082 23.3611V28L10.3725 25.2155C11.5369 25.5458 12.7485 25.7271 14 25.7271C21.8175 25.7271 28 19.8188 28 12.5294C28 5.23999 21.8175 0 14 0ZM15.4608 17.4729L11.6667 13.3447L4.23917 17.4729L12.3925 8.65529L16.3333 12.7835L23.6075 8.65529L15.4608 17.4729Z" fill="white"/>
  </svg>
);

export default function FloatingContact() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* ================= GIAO DIỆN DESKTOP (Hiện chữ) ================= */}
      <div className="hidden md:flex fixed bottom-10 right-6 z-50 flex-col gap-3 items-end">
        
        {/* 1. NÚT ĐĂNG KÝ TƯ VẤN (MỚI) */}
        <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-white text-red-600 px-5 py-2.5 rounded-full shadow-lg border-2 border-white hover:scale-105 transition-transform group animate-bounce"
        >
            <div className="font-bold text-sm uppercase tracking-wide drop-shadow-sm">Đăng ký tư vấn</div>
        </button>

        {/* 2. Nút Chat Fanpage */}
        <Link 
            href={APP_CONFIG.social.messenger}
            target="_blank"
            className="flex items-center gap-3 bg-[#0084FF] text-white pl-4 pr-2 py-2 rounded-full shadow-lg hover:scale-105 transition-transform group"
        >
            <span className="font-bold text-sm">Chat Facebook</span>
            <div className="w-10 h-10 bg-white/20 rounded-full p-2">
                <MessengerIcon />
            </div>
        </Link>

        {/* 3. Nút Chat Zalo OA */}
        <Link 
            href={APP_CONFIG.social.zaloOA}
            target="_blank"
            className="flex items-center gap-3 bg-white text-blue-600 pl-4 pr-2 py-2 rounded-full shadow-xl border border-blue-100 hover:scale-105 transition-transform group"
        >
            <div className="text-right">
                <div className="font-bold text-sm text-gray-800">Tư vấn giải pháp</div>
                <div className="text-xs text-blue-600 font-medium">Chat Zalo ngay</div>
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden">
                <ZaloImg />
            </div>
        </Link>

      </div>


      {/* ================= GIAO DIỆN MOBILE (Chỉ hiện Icon) ================= */}
      <div className="md:hidden fixed bottom-24 right-4 z-[80] flex flex-col gap-3">
        
        {/* 1. Gọi điện */}
        <Link 
          href={`tel:${APP_CONFIG.contact.phone.replace(/\s/g, '')}`}
          className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform animate-bounce"
        >
          <Phone className="w-6 h-6 text-white fill-current" />
        </Link>

        {/* 2. Messenger */}
        <Link 
            href={APP_CONFIG.social.messenger}
            target="_blank"
            className="w-12 h-12 bg-[#0084FF] rounded-full flex items-center justify-center shadow-lg p-2.5"
        >
            <MessengerIcon />
        </Link>

        {/* 3. Zalo */}
        <Link 
          href={APP_CONFIG.social.zaloOA}
          target="_blank"
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden border border-gray-100"
        >
          <div className="w-full h-full"> 
             <ZaloImg />
          </div>
        </Link>

      </div>

      {/* MODAL FORM */}
      <ConsultationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}