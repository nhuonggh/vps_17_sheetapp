'use client';

import Link from 'next/link';
import { ShoppingCart, Search, Menu, Sheet, X, ChevronDown, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';

export default function MobileHeader() {
  const { totalItems } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Lấy thông tin user để hiển thị trong Menu
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getUser();
  }, []);

  // Danh sách Menu cấu trúc theo yêu cầu của bạn
  const menuGroups = [
    {
      title: "KHÓA HỌC ONLINE",
      items: [
        { name: "Khóa học Miễn phí", href: "/courses/free" },
        { name: "Khóa học Chuyên sâu (VIP)", href: "/courses/pro" },
      ]
    },
    {
      title: "DỊCH VỤ & GIẢI PHÁP",
      items: [
        { name: "Zalo Mini App", href: "/category/zalo-mini-app" },
        { name: "AppSheet App", href: "/category/appsheet" },
        { name: "Web App", href: "/category/web-app" },
        { name: "Google Apps Script", href: "/category/apps-script" },
        { name: "Phần mềm PC", href: "/category/pc-software" },
        { name: "Google Sheet Template", href: "/category/google-sheet" },
      ]
    },
    {
      title: "TIỆN ÍCH MỞ RỘNG",
      items: [
        { name: "Trắc nghiệm Online", href: "/tools/quiz" },
        { name: "Tra cứu Mã số thuế", href: "/tools/tax" },
        { name: "Tiện ích khác", href: "/tools/others" },
      ]
    }
  ];

  return (
    <>
      {/* 1. HEADER CHÍNH (STICKY) */}
      <header className="md:hidden sticky top-0 left-0 right-0 bg-white z-40 shadow-sm border-b border-gray-100">
        <div className="flex justify-between items-center px-4 h-14">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5">
            <div className="bg-emerald-100 p-1.5 rounded-md">
               <Sheet className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="font-bold text-lg text-gray-800 tracking-tight">
              Sheet<span className="text-emerald-600">App</span>
            </span>
          </Link>

          {/* Action Icons */}
          <div className="flex items-center gap-4">
             {/* Nút tìm kiếm */}
             <button className="text-gray-500">
                <Search className="w-5 h-5" />
             </button>

             {/* Nút Giỏ hàng */}
             <Link href="/cart" className="relative text-gray-500">
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full">
                    {totalItems}
                  </span>
                )}
             </Link>

             {/* Nút Menu 3 gạch */}
             <button onClick={() => setIsMenuOpen(true)} className="text-gray-700">
                <Menu className="w-6 h-6" />
             </button>
          </div>
        </div>
      </header>

      {/* 2. SIDEBAR MENU (TRƯỢT TỪ PHẢI SANG) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
            {/* Lớp nền mờ */}
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)}></div>
            
            {/* Nội dung Menu */}
            <div className="absolute top-0 right-0 w-[85%] h-full bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                
                {/* Header của Menu */}
                <div className="p-4 bg-emerald-600 text-white flex justify-between items-start">
                    <div>
                        {user ? (
                            <div className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src={user.user_metadata.avatar_url || 'https://via.placeholder.com/40'} 
                                    className="w-10 h-10 rounded-full border-2 border-white/50"
                                    alt="User"
                                />
                                <div>
                                    <div className="font-bold text-sm">{user.user_metadata.full_name}</div>
                                    <div className="text-xs opacity-80">{user.email}</div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h3 className="font-bold text-lg">Xin chào!</h3>
                                <p className="text-xs opacity-80 mb-2">Đăng nhập để học online & quản lý đơn hàng</p>
                                <Link href="/login" className="inline-block bg-white text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                                    Đăng nhập / Đăng ký
                                </Link>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setIsMenuOpen(false)} className="text-white/80 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Danh sách Link */}
                <div className="p-4 space-y-6">
                    {menuGroups.map((group, index) => (
                        <div key={index}>
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">{group.title}</h4>
                            <div className="space-y-1">
                                {group.items.map((item, idx) => (
                                    <Link 
                                        key={idx} 
                                        href={item.href} 
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium text-sm transition-colors"
                                    >
                                        {item.name}
                                        <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="pt-4 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">HỖ TRỢ</h4>
                        <Link href="/contact" className="block p-3 text-sm text-gray-600">Liên hệ & Góp ý</Link>
                        <Link href="/policy" className="block p-3 text-sm text-gray-600">Chính sách bảo mật</Link>
                        {user && (
                            <button 
                                onClick={async () => {
                                    await supabase.auth.signOut();
                                    window.location.reload();
                                }}
                                className="w-full text-left p-3 text-sm text-red-600 font-medium"
                            >
                                Đăng xuất
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
      )}
    </>
  );
}