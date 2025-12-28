'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, CalendarDays, Bell, User } from 'lucide-react'; // Đã đổi icon CalendarDays
import { useState } from 'react';
import ConsultationModal from './ConsultationModal'; 

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navItems = [
    { name: 'Trang chủ', href: '/', icon: Home },
    { name: 'Danh mục', href: '/categories', icon: LayoutGrid },
    // Nút giữa đặc biệt: Đặt lịch dùng icon CalendarDays
    { name: 'Đặt lịch', href: '#', icon: CalendarDays, isAction: true }, 
    { name: 'Thông báo', href: '/notifications', icon: Bell },
    { name: 'Cá nhân', href: '/profile', icon: User },
  ];

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[90] pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            // Xử lý nút Đặt lịch (Action Button)
            if (item.isAction) {
                return (
                    <button 
                        key={item.name}
                        onClick={() => setIsModalOpen(true)}
                        className="flex flex-col items-center justify-center w-full h-full space-y-1 text-emerald-600"
                    >
                        <div className="bg-emerald-100 p-2 rounded-xl">
                            <Icon className="w-6 h-6 fill-current" />
                        </div>
                        <span className="text-[10px] font-bold">{item.name}</span>
                    </button>
                )
            }

            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  isActive ? 'text-emerald-600' : 'text-gray-500'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Form Popup */}
      <ConsultationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}