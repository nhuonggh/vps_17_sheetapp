'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Bell, User } from 'lucide-react';
import { APP_CONFIG } from '@/lib/constants';

// Icon Zalo tự vẽ (vì thư viện không có)
const ZaloIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M42 16C42 16.8837 41.8796 17.7428 41.6521 18.567C43.1416 19.8252 44.0863 21.6444 44.0863 23.6706C44.0863 27.5756 41.0558 30.7712 37.2435 31.2588C36.6534 33.7297 34.4533 35.5925 31.815 35.5925C31.2676 35.5925 30.7381 35.5132 30.2372 35.3653L26.3768 37.9103C25.7972 38.2925 25.0441 37.8183 25.1326 37.1306L25.5684 33.7436C25.545 33.7445 25.5215 33.7449 25.498 33.7449C24.7925 33.7449 24.1165 33.6339 23.4862 33.4285C22.6841 33.8821 21.761 34.1412 20.7788 34.1412C16.8376 34.1412 13.642 31.2163 13.642 27.6087C13.642 27.352 13.6599 27.0988 13.6946 26.8496C12.1818 25.6105 11.2157 23.7783 11.2157 21.7345C11.2157 17.7942 14.5097 14.6 18.5732 14.6C19.141 14.6 19.6917 14.6644 20.2223 14.7865C20.8406 14.6649 21.4828 14.6 22.1437 14.6C22.9566 14.6 23.7383 14.698 24.4795 14.881C26.0461 11.8385 29.3551 9.8 33.1557 9.8C38.0396 9.8 42 13.2575 42 17.5229V16Z" fill="#0068FF"/>
    <path d="M25.498 33.7449C28.9171 33.7449 31.6888 31.2934 31.6888 28.2691C31.6888 25.2449 28.9171 22.7934 25.498 22.7934C22.0789 22.7934 19.3072 25.2449 19.3072 28.2691C19.3072 31.2934 22.0789 33.7449 25.498 33.7449Z" fill="white"/>
  </svg>
);

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Trang chủ', href: '/', icon: Home },
    { name: 'Danh mục', href: '/categories', icon: LayoutGrid },
    // Đổi Giỏ hàng thành Zalo/Tư vấn
    { name: 'Tư vấn', href: APP_CONFIG.social.zalo, icon: ZaloIcon, isExternal: true }, 
    // Đổi Tin nhắn thành Thông báo
    { name: 'Thông báo', href: '/notifications', icon: Bell },
    { name: 'Cá nhân', href: '/profile', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[100] pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              target={item.isExternal ? "_blank" : "_self"}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-emerald-600' : 'text-gray-500'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'fill-current text-emerald-600' : ''}`} />
              </div>
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}