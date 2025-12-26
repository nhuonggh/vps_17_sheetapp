'use client';

import Link from 'next/link';
import { Phone } from 'lucide-react';
import { APP_CONFIG } from '@/lib/constants';

// Icon Zalo (để dùng chung)
const ZaloIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
    <path d="M42 16C42 16.8837 41.8796 17.7428 41.6521 18.567C43.1416 19.8252 44.0863 21.6444 44.0863 23.6706C44.0863 27.5756 41.0558 30.7712 37.2435 31.2588C36.6534 33.7297 34.4533 35.5925 31.815 35.5925C31.2676 35.5925 30.7381 35.5132 30.2372 35.3653L26.3768 37.9103C25.7972 38.2925 25.0441 37.8183 25.1326 37.1306L25.5684 33.7436C25.545 33.7445 25.5215 33.7449 25.498 33.7449C24.7925 33.7449 24.1165 33.6339 23.4862 33.4285C22.6841 33.8821 21.761 34.1412 20.7788 34.1412C16.8376 34.1412 13.642 31.2163 13.642 27.6087C13.642 27.352 13.6599 27.0988 13.6946 26.8496C12.1818 25.6105 11.2157 23.7783 11.2157 21.7345C11.2157 17.7942 14.5097 14.6 18.5732 14.6C19.141 14.6 19.6917 14.6644 20.2223 14.7865C20.8406 14.6649 21.4828 14.6 22.1437 14.6C22.9566 14.6 23.7383 14.698 24.4795 14.881C26.0461 11.8385 29.3551 9.8 33.1557 9.8C38.0396 9.8 42 13.2575 42 17.5229V16Z" fill="white"/>
    <path d="M25.498 33.7449C28.9171 33.7449 31.6888 31.2934 31.6888 28.2691C31.6888 25.2449 28.9171 22.7934 25.498 22.7934C22.0789 22.7934 19.3072 25.2449 19.3072 28.2691C19.3072 31.2934 22.0789 33.7449 25.498 33.7449Z" fill="#0068FF"/>
  </svg>
);

export default function FloatingContact() {
  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-3 md:hidden">
      
      {/* Nút Gọi Điện */}
      <Link 
        href={`tel:${APP_CONFIG.contact.phone.replace(/\s/g, '')}`}
        className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform animate-bounce"
      >
        <Phone className="w-6 h-6 text-white" />
      </Link>

      {/* Nút Zalo */}
      <Link 
        href={APP_CONFIG.social.zalo}
        target="_blank"
        className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
      >
        <ZaloIcon />
      </Link>

    </div>
  );
}