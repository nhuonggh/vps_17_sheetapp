'use client';

import Link from 'next/link';
// FIX ERROR: Thêm ChevronDown vào danh sách import
import { ShoppingCart, Search, Menu, X, Phone, Filter, ChevronDown } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { signOut } from '@/lib/auth/client-signout';
import { useRouter, usePathname } from 'next/navigation';
import { APP_CONFIG } from '@/lib/constants';

export default function MobileHeader() {
  const pathname = usePathname();
  const { totalItems, clearCart } = useCart();
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user: authUser } = useCurrentUser();
  const user = authUser
    ? { email: authUser.email, user_metadata: { full_name: authUser.name } }
    : null;
  const [keyword, setKeyword] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      if (pathname.startsWith('/news')) {
        router.push(`/news?q=${encodeURIComponent(keyword)}`);
      } else {
        router.push(`/categories?q=${encodeURIComponent(keyword)}`);
      }
    }
  };

  const handleOpenFilter = () => {
    router.push('/categories?openFilter=true');
  };

  const menuGroups = [
    {
      title: "KHÓA HỌC ONLINE",
      items: [
        { name: "Khóa học Miễn phí", href: "/categories?tab=course&cost=free" },
        { name: "Khóa học Chuyên sâu (VIP)", href: "/categories?tab=course&cost=paid" },
      ]
    },
    {
      title: "DỊCH VỤ & GIẢI PHÁP",
      items: [
        { name: "Zalo Mini App", href: "/services/zalo" },
        { name: "AppSheet App", href: "/services/appsheet" },
        { name: "Web App", href: "/services/web" },
      ]
    }
  ];

  // Logic ẩn Header
  if (pathname === '/categories') return null;

  return (
    <>
      <header className="md:hidden sticky top-0 left-0 right-0 bg-white z-[90] shadow-sm border-b border-gray-100 h-28">
        <div className="flex flex-col h-full px-4 py-2 gap-2">

          {/* Dòng 1 */}
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-1.5">
              <span className="font-bold text-xl text-emerald-600 tracking-tight">SheetApp</span>
            </Link>

            <a href={`tel:${APP_CONFIG.contact.hotline_clean}`} className="bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-1 shadow-sm animate-pulse">
              <Phone className="w-3 h-3 fill-current" />
              <span className="text-xs font-bold">{APP_CONFIG.contact.phone}</span>
            </a>

            <div className="flex items-center gap-3">
              <Link href="/cart" className="relative text-gray-600">
                <ShoppingCart className="w-6 h-6" />
                {isMounted && totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-white">
                    {totalItems}
                  </span>
                )}
              </Link>
              <button onClick={() => setIsMenuOpen(true)} className="text-gray-700">
                <Menu className="w-7 h-7" />
              </button>
            </div>
          </div>

          {/* Dòng 2 */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <input
                type="text"
                placeholder={pathname.startsWith('/news') ? "Tìm kiếm bài viết..." : "Tìm khóa học, dịch vụ..."}
                className="w-full bg-gray-100 border-none text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-1 focus:ring-emerald-500"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </form>

            <button onClick={handleOpenFilter} className="flex items-center gap-1 text-gray-500 px-1">
              <Filter className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-600">Lọc</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[110] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
          <div className="absolute top-0 right-0 w-[85%] h-full bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="p-4 bg-emerald-600 text-white flex justify-between items-start">
              <div>
                {user ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={user.user_metadata.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border-2 border-white/50" alt="User" />
                    <div>
                      <div className="font-bold text-sm">{user.user_metadata.full_name}</div>
                      <div className="text-xs opacity-80">{user.email}</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-bold text-lg">Xin chào!</h3>
                    <p className="text-xs opacity-80 mb-2">Đăng nhập để học online & quản lý đơn hàng</p>
                    <Link href="/login" className="inline-block bg-white text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">Đăng nhập / Đăng ký</Link>
                  </div>
                )}
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-4 space-y-6 pb-24">
              {menuGroups.map((group, index) => (
                <div key={index}>
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">{group.title}</h4>
                  <div className="space-y-1">
                    {group.items.map((item, idx) => (
                      <Link key={idx} href={item.href} onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium text-sm transition-colors">
                        {item.name}
                        {/* Sử dụng ChevronDown ở đây */}
                        <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-gray-100">
                {user && (
                  <button onClick={async () => { clearCart(); await signOut(); window.location.reload(); }} className="w-full text-left p-3 text-sm text-red-600 font-medium">Đăng xuất</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}