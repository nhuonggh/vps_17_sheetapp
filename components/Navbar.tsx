'use client';

import Link from 'next/link';
import { Sheet, ShoppingCart, LogOut, User as UserIcon, ChevronDown, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const { totalItems } = useCart();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const menuItems = [
    { title: "Khóa học", href: "/courses", submenu: [{ name: "Khóa học Online", href: "/courses/online" }, { name: "Khóa học Zoom", href: "/courses/live" }] },
    { title: "Dịch vụ", href: "/services", submenu: [{ name: "Zalo Mini App", href: "/services/zalo" }, { name: "AppSheet", href: "/services/appsheet" }, { name: "Web App", href: "/services/web" }] },
    { title: "Tiện ích", href: "/tools", submenu: [{ name: "Template Sheet", href: "/tools/template" }, { name: "Tra cứu Online", href: "/tools/lookup" }] }
  ];

  return (
    // THAY ĐỔI: Thêm w-full và sticky top-0 chuẩn
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-100 h-20 flex items-center sticky top-0 z-[100] w-full shadow-sm">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        
        {/* 1. Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="bg-emerald-100 p-2 rounded-lg"><Sheet className="w-6 h-6 text-emerald-600" /></div>
            <span className="font-bold text-xl text-gray-800">Sheet<span className="text-emerald-600">App</span></span>
        </Link>

        {/* 2. Menu Desktop */}
        <div className="hidden md:flex items-center gap-2 ml-8">
          {menuItems.map((item) => (
            <div key={item.title} className="relative group px-3 py-6 cursor-pointer">
              <div className="flex items-center gap-1 text-gray-600 font-medium group-hover:text-emerald-600 text-sm lg:text-base">
                {item.title} <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
              </div>
              <div className="absolute top-full left-0 w-56 bg-white shadow-xl rounded-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                <div className="p-2">
                  {item.submenu.map((sub) => (
                    <Link key={sub.name} href={sub.href} className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg">
                      {sub.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <Link href="/news" className="px-3 py-6 text-gray-600 font-medium hover:text-emerald-600 text-sm lg:text-base">Kiến thức</Link>
        </div>

        {/* 3. Ô TÌM KIẾM (MỚI) */}
        <div className="hidden lg:flex flex-1 max-w-xs mx-6">
            <div className="relative w-full group">
                <input 
                    type="text" 
                    placeholder="Tìm khóa học, template..." 
                    className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-full pl-4 pr-10 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <button className="absolute right-0 top-0 h-full px-3 text-gray-400 group-focus-within:text-emerald-600">
                    <Search className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="flex items-center gap-3 lg:gap-4 flex-shrink-0">
            <Link href="/cart" className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{totalItems}</span>}
            </Link>

            {user ? (
               <div className="flex items-center gap-3">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full border border-gray-200" />
               </div>
            ) : (
               <Link href="/login" className="hidden md:flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition-all text-sm">
                 <UserIcon className="w-4 h-4" /> <span className="hidden lg:inline">Đăng nhập</span>
               </Link>
            )}
        </div>
      </div>
    </nav>
  );
}