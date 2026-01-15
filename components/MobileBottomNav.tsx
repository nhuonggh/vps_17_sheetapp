'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Calendar, User, BookOpen } from 'lucide-react';
import { useState } from 'react';
import BookingModal from '@/components/BookingModal'; // Import Modal mới tạo

export default function MobileBottomNav() {
  const pathname = usePathname();
  // State quản lý việc đóng/mở modal
  const [showBooking, setShowBooking] = useState(false);

  const navItems = [
    { name: 'Trang chủ', href: '/', icon: Home },
    { name: 'Danh mục', href: '/categories', icon: LayoutGrid },
    { name: 'Đặt lịch', href: '#', icon: Calendar, isAction: true }, // isAction = true: xử lý click riêng
    { name: 'Kiến thức', href: '/news', icon: BookOpen },
    { name: 'Cá nhân', href: '/profile', icon: User },
  ];

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-[90]">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            // Logic Active
            const isActive = item.href !== '#' && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
            
            // Nếu là nút Hành động (Đặt lịch) -> Dùng thẻ button
            if (item.isAction) {
                return (
                    <button
                        key={item.name}
                        onClick={() => setShowBooking(true)}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                            showBooking ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        {/* Icon đổi style khi active */}
                        <item.icon 
                            className={`w-6 h-6 ${showBooking ? 'fill-current' : ''}`} 
                            strokeWidth={showBooking ? 2.5 : 2} 
                        />
                        <span className="text-[10px] font-medium">{item.name}</span>
                    </button>
                )
            }

            // Các nút còn lại -> Dùng thẻ Link
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <item.icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Hiển thị Modal khi state showBooking = true */}
      <BookingModal isOpen={showBooking} onClose={() => setShowBooking(false)} />
    </>
  );
}