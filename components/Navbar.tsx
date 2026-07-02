'use client';

import Link from 'next/link';
import {
  ShoppingCart, User as UserIcon, ChevronDown, Search, ChevronRight,
  Package, UserPlus, CalendarCheck, Ticket, Clock, Bell, MessageSquarePlus, LogOut
} from 'lucide-react';
import { Sheet } from 'lucide-react';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { signOut } from '@/lib/auth/client-signout';
import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { APP_CONFIG } from '@/lib/constants';

type MenuItem = {
  name: string;
  href: string;
  children?: MenuItem[];
};

type MenuSection = {
  title: string;
  href: string;
  submenu: MenuItem[];
};

export default function Navbar() {
  const { user: authUser } = useCurrentUser();
  const user = authUser
    ? { email: authUser.email, user_metadata: { avatar_url: authUser.avatar_url, full_name: authUser.name } }
    : null;
  const { totalItems, clearCart } = useCart();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // FIX ESLINT: Dùng setTimeout(..., 0)
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // --- CẤU HÌNH MENU DỮ LIỆU (ĐÃ XÓA TIỆN ÍCH) ---
  const menuItems: MenuSection[] = [
    {
      title: "Khóa học",
      href: "/categories",
      submenu: [
        { name: "Tất cả khóa học", href: "/categories?tab=all" },
        { name: "Khóa học Online", href: "/categories?tab=online" },
        { name: "Khóa học Zoom", href: "/categories?tab=zoom" },
        { name: "Google AppSheet", href: "/categories?tab=appsheet" },
        { name: "Automation", href: "/categories?tab=automation" }
      ]
    },
    {
      title: "Dịch vụ",
      href: "/services",
      submenu: [
        {
          name: "Zalo Mini App",
          href: "/services/zalo",
          children: [
            { name: "Nhà hàng", href: "/services/zalo?industry=Nhà hàng & F&B" },
            { name: "Khách sạn, FarmStay", href: "/services/zalo?industry=Khách sạn" },
            { name: "Quán Cafe", href: "/services/zalo?industry=Nhà hàng & F&B" },
            { name: "Cửa hàng quần áo", href: "/services/zalo?industry=Bán lẻ" },
            { name: "Cửa hàng sách", href: "/services/zalo?industry=Bán lẻ" },
            { name: "Bán lẻ (F&B)", href: "/services/zalo?industry=Nhà hàng & F&B" },
            { name: "Phòng Gym/Spa", href: "/services/zalo?industry=Spa & Làm đẹp" },
            { name: "Phòng khám", href: "/services/zalo?industry=Y tế" },
            { name: "Hành chính công", href: "/services/zalo?industry=Hành chính" },
            { name: "Giáo dục", href: "/services/zalo?industry=Giáo dục" },
            { name: "Xây dựng", href: "/services/zalo?industry=Xây dựng" },
          ]
        },
        {
          name: "Nocode App - AppSheet",
          href: "/services/appsheet",
          children: [
            { name: "Trung tâm gia sư", href: "/services/appsheet?industry=Giáo dục" },
            { name: "Trung tâm lái xe", href: "/services/appsheet?industry=Giáo dục" },
            { name: "Sản xuất", href: "/services/appsheet?industry=Sản xuất" },
            { name: "Tài chính - Ngân hàng", href: "/services/appsheet?industry=Tài chính" },
            { name: "Xây dựng", href: "/services/appsheet?industry=Xây dựng" },
          ]
        },
        { name: "Nocode App - NocodeBase", href: "/services/nocodebase" },
        {
          name: "Ứng dụng Web",
          href: "/services/web",
          children: [
            { name: "Bán lẻ", href: "/services/web?industry=Bán lẻ" },
            { name: "Nhà hàng, Khách sạn", href: "/services/web?industry=Nhà hàng & F&B" },
            { name: "Bất động sản", href: "/services/web?industry=Bất động sản" },
          ]
        },
        {
          name: "Ứng dụng trên PC",
          href: "/services/pc",
          children: [
            { name: "Xây dựng", href: "/services/pc?industry=Xây dựng" },
            { name: "Tài chính", href: "/services/pc?industry=Tài chính" },
          ]
        },
        {
          name: "Tiện ích Google Sheet",
          href: "/services/googlesheet",
          children: [
            { name: "Nhân sự (HR)", href: "/services/googlesheet?industry=Nhân sự" },
            { name: "Chấm công", href: "/services/googlesheet?industry=Nhân sự" },
            { name: "Sản xuất", href: "/services/googlesheet?industry=Sản xuất" },
            { name: "Tài chính", href: "/services/googlesheet?industry=Tài chính" },
          ]
        },
        {
          name: "AI Automation",
          href: "/services/automation",
          children: [
            { name: "Giải pháp n8n", href: "/services/automation/n8n" },
            { name: "Giải pháp Make.com", href: "/services/automation/make" },
          ]
        }
      ]
    }
  ];

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-100 h-20 flex items-center sticky top-0 z-[100] w-full shadow-sm">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-emerald-100 p-2 rounded-lg"><Sheet className="w-6 h-6 text-emerald-600" /></div>
          <span className="font-bold text-xl text-gray-800">Sheet<span className="text-emerald-600">App</span></span>
        </Link>

        {/* Menu Desktop */}
        <div className="hidden md:flex items-center gap-2 ml-8">
          {menuItems.map((item) => (
            <div key={item.title} className="relative group px-3 py-6">
              <Link href={item.href} className="flex items-center gap-1 text-gray-600 font-medium group-hover:text-emerald-600 text-sm lg:text-base cursor-pointer">
                {item.title} <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
              </Link>

              <div className="absolute top-full left-0 w-64 bg-white shadow-xl rounded-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 pb-2">
                <div className="p-2 space-y-1">
                  {item.submenu.map((sub) => (
                    <div key={sub.name} className="relative group/sub">
                      <Link href={sub.href} className="flex items-center justify-between px-4 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg">
                        <span>{sub.name}</span>
                        {sub.children && <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </Link>
                      {sub.children && (
                        <div className="absolute left-full top-0 w-60 bg-white shadow-xl rounded-xl border border-gray-100 opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible transition-all duration-200 ml-2 p-2">
                          {sub.children.map((child) => (
                            <Link key={child.name} href={child.href} className="block px-4 py-2 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg truncate" title={child.name}>
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <Link href="/news" className="px-3 py-6 text-gray-600 font-medium hover:text-emerald-600 text-sm lg:text-base">Kiến thức</Link>
        </div>

        {/* Search */}
        <div className="hidden lg:flex flex-1 max-w-xs mx-6">
          <div className="relative w-full group">
            <input type="text" placeholder="Tìm kiếm..." className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-full pl-4 pr-10 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
            <button className="absolute right-0 top-0 h-full px-3 text-gray-400 group-focus-within:text-emerald-600"><Search className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 lg:gap-4 flex-shrink-0">
          <a href={`tel:${APP_CONFIG.contact.hotline_clean}`} className="hidden xl:flex bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-red-600 transition-colors">
            {APP_CONFIG.contact.phone}
          </a>
          <Link href="/cart" className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative">
            <ShoppingCart className="w-5 h-5" />
            {isMounted && totalItems > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{totalItems}</span>}
          </Link>
          {isMounted && user ? (
            <div className="relative group">
              {/* Avatar Button */}
              <button className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.user_metadata.avatar_url || 'https://via.placeholder.com/40'}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full border border-gray-200"
                />
                <ChevronDown className="w-4 h-4 text-gray-600 transition-transform group-hover:rotate-180" />
              </button>

              {/* Dropdown Menu */}
              <div className="absolute top-full right-0 mt-2 w-72 bg-white shadow-2xl rounded-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 overflow-hidden z-50">
                {/* User Info Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-4 text-white">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={user.user_metadata.avatar_url || 'https://via.placeholder.com/40'}
                      alt="Avatar"
                      className="w-12 h-12 rounded-full border-2 border-white/50"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{user.user_metadata?.full_name || 'Khách hàng'}</p>
                      <p className="text-xs text-emerald-100 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <Link href="/profile?tab=info" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                    <UserIcon className="w-4 h-4" />
                    <span>Hồ sơ cá nhân</span>
                  </Link>
                  <Link href="/profile?tab=assets" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                    <Package className="w-4 h-4" />
                    <span>Tài sản / Khóa học</span>
                  </Link>
                  <Link href="/profile?tab=affiliate" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                    <UserPlus className="w-4 h-4" />
                    <span>Cộng tác viên (CTV)</span>
                  </Link>
                  <Link href="/profile?tab=bookings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                    <CalendarCheck className="w-4 h-4" />
                    <span>Lịch sử đặt lịch</span>
                  </Link>
                  <Link href="/profile?tab=coupons" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                    <Ticket className="w-4 h-4" />
                    <span>Mã giảm giá</span>
                  </Link>
                  <Link href="/profile?tab=orders" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                    <Clock className="w-4 h-4" />
                    <span>Lịch sử mua hàng</span>
                  </Link>
                  <Link href="/profile?tab=notifs" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                    <Bell className="w-4 h-4" />
                    <span>Thông báo</span>
                  </Link>
                  <Link href="/profile?tab=feedback" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                    <MessageSquarePlus className="w-4 h-4" />
                    <span>Góp ý / Báo lỗi</span>
                  </Link>

                  {/* Divider */}
                  <div className="h-px bg-gray-100 my-2"></div>

                  {/* Logout */}
                  <button
                    onClick={async () => { clearCart(); await signOut(); window.location.href = '/'; }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
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