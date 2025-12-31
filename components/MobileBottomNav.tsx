'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
// Dùng bộ icon đồng nhất
import { Home, LayoutGrid, CalendarClock, Bell, User } from 'lucide-react'; 
import { useState } from 'react';
import ConsultationModal from './ConsultationModal'; 

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navItems = [
    { name: 'Trang chủ', href: '/', icon: Home },
    { name: 'Danh mục', href: '/categories', icon: LayoutGrid },
    // Nút giữa đặc biệt: Đặt lịch
    { name: 'Đặt lịch', href: '#', icon: CalendarClock, isAction: true }, 
    { name: 'Thông báo', href: '/notifications', icon: Bell },
    { name: 'Cá nhân', href: '/profile', icon: User },
  ];

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[90] pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16 px-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            // Xử lý nút Đặt lịch (Action Button) - Icon nổi bật
            if (item.isAction) {
                return (
                    <button 
                        key={item.name}
                        onClick={() => setIsModalOpen(true)}
                        className="flex flex-col items-center justify-center w-full h-full space-y-1"
                    >
                        <div className="bg-emerald-600 text-white p-2.5 rounded-full shadow-lg -mt-6 border-4 border-white">
                            <Icon className="w-6 h-6" strokeWidth={2} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-600">{item.name}</span>
                    </button>
                )
            }

            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  isActive ? 'text-emerald-600' : 'text-gray-400'
                }`}
              >
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
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