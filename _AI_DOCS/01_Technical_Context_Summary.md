# SheetApp - Technical Context Summary

> **Mục đích**: Tóm tắt ngữ cảnh kỹ thuật chi tiết của dự án SheetApp WebApp để AI khác (Gemini) hiểu ngay lập tức toàn bộ dự án mà không cần hỏi lại.

---

## 1. Project Overview

### Tên dự án
**SheetApp | App thực chiến**

### Mục tiêu chính
SheetApp là một nền tảng thương mại điện tử và học tập trực tuyến chuyên về:
- **Khóa học**: Google Sheets, AppSheet, Automation (n8n, Make.com), Web Development
- **Dịch vụ & Giải pháp**: Phát triển Zalo Mini App, AppSheet App, Web App, Phần mềm PC, AI Automation

### Luồng vận hành tổng thể
1. **Người dùng truy cập**: Xem danh sách khóa học/dịch vụ từ trang chủ
2. **Tìm kiếm & Lọc**: Sử dụng bộ lọc theo ngành nghề, công nghệ, giá cả
3. **Xem chi tiết sản phẩm**: Chi tiết khóa học (chapters, lessons) hoặc dịch vụ (features, quy trình)
4. **Thêm vào giỏ hàng**: Cart context lưu localStorage
5. **Đăng nhập/Đăng ký**: OAuth Google qua Supabase Auth
6. **Thanh toán**: Hiển thị QR banking (chưa tích hợp gateway)
7. **Học tập**: Truy cập bài học sau khi mua (đang xây dựng)

---

## 2. Tech Stack & Architecture

### Frontend Framework
- **Next.js 16.1.1** (App Router - RSC-based)
- **React 19.2.3** 
- **TypeScript 5**

### Styling
- **Tailwind CSS 3.4.17** (PostCSS 4, Autoprefixer)
- **Vanilla CSS** cho global styles (`app/globals.css`)

### Backend & Database
- **Supabase** (PostgreSQL + Auth + Storage)
  - Tables chính: `products`, `chapters`, `lessons`, `instructors`, `posts`, `categories`
  - Auth: Google OAuth Provider
  - Row Level Security (RLS) đang được cấu hình

### State Management
- **React Context API**: `CartContext` (giỏ hàng)
- **localStorage**: Lưu trữ giỏ hàng client-side
- **Supabase Auth State**: Session management

### UI Icons & Components
- **Lucide React** 0.562.0 (icon library)
- **Custom components** (không dùng UI library như shadcn/MUI)

### Utilities
- **clsx** 2.1.1 + **tailwind-merge** 3.4.0 cho className merging
- **Intl.NumberFormat** cho format tiền tệ VND

---

## 3. Folder Structure

```
SheetAppV1/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (Navbar, Footer, CartProvider)
│   ├── page.tsx                  # Homepage (Hero, Courses, Services, News)
│   ├── globals.css               # Global styles + Tailwind directives
│   ├── auth/
│   │   └── callback/             # OAuth callback handler
│   ├── login/                    # Trang đăng nhập
│   ├── categories/               # Danh mục khóa học/dịch vụ
│   ├── product/[slug]/           # Chi tiết sản phẩm (dynamic route)
│   ├── services/                 # Landing pages dịch vụ
│   │   └── [category]/
│   ├── news/                     # Blog/Tin tức
│   │   ├── page.tsx
│   │   └── [slug]/
│   ├── profile/                  # Trang cá nhân
│   ├── booking/                  # Đặt lịch tư vấn
│   ├── instructor/[id]/          # Trang giảng viên
│   └── update-password/          # Đổi mật khẩu
│
├── components/                   # React Components
│   ├── Navbar.tsx                # Desktop navigation (2-level dropdown)
│   ├── MobileHeader.tsx          # Mobile header (search, cart, menu)
│   ├── MobileBottomNav.tsx       # Bottom nav mobile (Home, Categories, Cart, Profile)
│   ├── Footer.tsx                # Footer (Links, Contact, Social)
│   ├── FloatingContact.tsx       # Nút liên hệ nổi (Zalo, Messenger, Phone)
│   ├── Hero.tsx / HeroSlider.tsx # Hero banners
│   ├── CourseTabs.tsx            # Tab component (Content, Instructor, Reviews, Process)
│   ├── ProductCard.tsx           # Card hiển thị sản phẩm
│   ├── ProductActions.tsx        # Actions (Thêm giỏ hàng, Mua ngay, Tư vấn)
│   ├── ProductImageSlider.tsx    # Image gallery slider
│   ├── BookingModal.tsx          # Modal đặt lịch
│   ├── ConsultationModal.tsx     # Modal tư vấn
│   ├── mobile/
│   │   └── CategoriesView.tsx    # MOBILE: Categories page logic
│   └── pc/
│       └── CategoriesView.tsx    # DESKTOP: Categories page logic
│
├── context/
│   └── CartContext.tsx           # Cart state management (Context API)
│
├── lib/
│   ├── supabase.ts               # Supabase client config
│   └── constants.ts              # App config (contact, payment, filters)
│
├── public/
│   └── favicon.ico
│
├── next.config.ts                # Next.js config
├── tailwind.config.ts            # Tailwind config
├── tsconfig.json                 # TypeScript config
└── package.json
```

### Ý nghĩa các thư mục chính

#### `/app`
- **App Router của Next.js 16**: File-based routing, hỗ trợ RSC (React Server Components)
- **layout.tsx**: Wrapper toàn app, chứa Navbar, Footer, CartProvider, SEO meta tags
- **page.tsx**: Server/Client components cho từng route
- **Dynamic routes**: `[slug]`, `[id]` cho product, instructor, news detail

#### `/components`
- **Shared components**: Navbar, Footer, Header
- **Feature components**: CourseTabs, ProductCard, Modals
- **Mobile/PC split**: `mobile/` và `pc/` folders cho responsive logic riêng biệt

#### `/lib`
- **supabase.ts**: Khởi tạo Supabase client với env vars
- **constants.ts**: Config tập trung (contact info, payment QR, filter trees)

---

## 4. Core Logic & Functions

### 4.1 Authentication Flow (Supabase OAuth)

**File**: `app/login/page.tsx`

```typescript
// Đăng nhập Google OAuth
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    queryParams: { access_type: 'offline', prompt: 'consent' }
  }
});
```

**Callback Handler**: `app/auth/callback/page.tsx`
- Nhận code từ Google
- Exchange code → session
- Redirect về trang chủ hoặc profile

### 4.2 Product Data Fetching

**File**: `app/product/[slug]/page.tsx`

```typescript
async function getProduct(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`*, 
      categories (name, slug), 
      instructor:instructors(*), 
      chapters:chapters(*, lessons(*))
    `)
    .eq('slug', slug)
    .single();
  
  if (error || !data) return null;
  
  // Sort chapters và lessons theo sort_order
  if (data.chapters) {
    data.chapters.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    data.chapters.forEach((ch) => {
      if (ch.lessons) ch.lessons.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });
  }
  
  return data as unknown as Product;
}
```

### 4.3 Cart Management (Context API)

**File**: `context/CartContext.tsx`

```typescript
interface CartItem {
  id: number;
  name: string;
  price: number;
  slug: string;
  thumbnail_url: string | null;
  quantity: number;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  
  // Load từ localStorage khi mount
  useEffect(() => {
    const savedCart = localStorage.getItem('sheetapp_cart');
    if (savedCart) setItems(JSON.parse(savedCart));
  }, []);
  
  // Lưu vào localStorage khi items thay đổi
  useEffect(() => {
    localStorage.setItem('sheetapp_cart', JSON.stringify(items));
  }, [items]);
  
  const addToCart = (product: ProductInput) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);
      
      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      return [...currentItems, { ...product, quantity: 1 }];
    });
  };
  
  // ... removeItem, clearCart, totalAmount, totalItems
}
```

### 4.4 Filter Logic (Mobile Categories)

**File**: `components/mobile/CategoriesView.tsx`

```typescript
// Multi-level filtering
const baseFilteredData = useMemo(() => {
  let data = products;
  
  // 1. Search keyword
  if (keyword.trim()) {
    data = data.filter(p => p.name.toLowerCase().includes(keyword.toLowerCase()));
  }
  
  // 2. Cost filter
  const isFree = activeCosts.includes('free');
  const isPaid = activeCosts.includes('paid');
  if (!isFree && !isPaid) data = [];
  else if (isFree && !isPaid) data = data.filter(p => p.price === 0);
  else if (!isFree && isPaid) data = data.filter(p => p.price > 0);
  
  // 3. Industry tags
  if (activeIndustries.length > 0) {
    data = data.filter(p => !!p.industry_tag && activeIndustries.includes(p.industry_tag));
  }
  
  // 4. Tech tags
  if (activeTechs.length > 0) {
    data = data.filter(p => !!p.tech_tag && activeTechs.includes(p.tech_tag));
  }
  
  return data;
}, [products, keyword, activeIndustries, activeTechs, activeCosts]);
```

### 4.5 Responsive Layout Detection

**File**: `app/layout.tsx`

```typescript
// Mobile Header: Hiển thị trên mobile, ẩn trên desktop
<Suspense fallback={<div className="h-28 bg-white shadow-sm"></div>}>
  <MobileHeader />
</Suspense>

// Desktop Navbar: Sticky top, ẩn trên mobile
<div className="hidden md:block sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md">
  <Navbar />
</div>

// Mobile Bottom Nav: Fixed bottom-0 trên mobile
<MobileBottomNav />
```

---

## 5. Detailed Source Code (Base Code Examples)

### 5.1 Supabase Client Configuration

**File**: `lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

// Dùng placeholder nếu không có env vars (để build không lỗi)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### 5.2 App Config Constants

**File**: `lib/constants.ts`

```typescript
export const APP_CONFIG = {
  app: {
    title: "SheetApp | App thực chiến",
    favicon: "https://ui-avatars.com/api/?name=Sheet+App&background=10b981&color=fff&rounded=true&bold=true&size=128",
  },
  
  contact: {
    phone: "0987 726 236",
    hotline_clean: "0987726236",
    email: "sheetappai@gmail.com",
    address: "Chung cư Moscow Tower, P. Tân Thới Nhất, Q.12, TP.HCM",
    map_url: "https://maps.app.goo.gl/..."
  },
  
  social: {
    facebook: "https://facebook.com/sheetapp",
    zalo: "https://zalo.me/0987726236",
    zaloOA: "https://zalo.me/521492569667566752",
    youtube: "https://youtube.com/@sheetapp",
    messenger: "https://m.me/61585387094666"
  },
  
  payment: {
    bank_id: "970418",
    bank_name: "BIDV",
    account_no: "31810000034086",
    account_name: "VO TAN NHUONG",
    branch_payment: "Chi nhánh Hóc Môn",
    get qr_link() {
      return `https://img.vietqr.io/image/${this.bank_id}-${this.account_no}-compact2.jpg?amount=0&addInfo=Chuyen tien&accountName=${encodeURIComponent(this.account_name)}`;
    }
  },
  
  designer: {
    name: "CÔNG TY TNHH GIẢI PHÁP BIM VIỆT",
    url: "https://bimvietsolutions.com"
  }
};

// Filter tree cho bộ lọc 2 cấp (Industry + Tech)
export const FILTER_TREE = {
  industry: [
    { group: "Xây dựng", tags: ["Nhà thầu", "Chủ đầu tư", "Tư vấn thiết kế", "Tư vấn giám sát"] },
    { group: "F&B", tags: ["Nhà hàng", "Khách sạn", "Khu du lịch", "Quán Cafe", "Bar/Pub"] },
    { group: "Giáo dục", tags: ["Trung tâm ngoại ngữ", "Dạy online", "Dạy offline", "Trường học"] },
    // ... more groups
  ],
  tech: [
    { group: "Nocode", tags: ["AppSheet", "NocodeBase", "Airtable"] },
    { group: "Web App", tags: ["Appscript", "Web giải pháp", "Next.js", "React"] },
    // ... more groups
  ]
};
```

### 5.3 Root Layout with Metadata

**File**: `app/layout.tsx`

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import MobileBottomNav from "@/components/MobileBottomNav";
import MobileHeader from "@/components/MobileHeader";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingContact from "@/components/FloatingContact";
import { APP_CONFIG } from "@/lib/constants";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: APP_CONFIG.app.title,
  description: "Giải pháp Google Sheets, AppSheet, WebApp chuyên nghiệp",
  icons: {
    icon: APP_CONFIG.app.favicon,
    apple: APP_CONFIG.app.favicon,
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": APP_CONFIG.app.title,
    "url": "https://sheetapp.io.vn",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://sheetapp.io.vn/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="vi">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <CartProvider>
          {/* Mobile Header với Suspense để fix build error 404 page */}
          <Suspense fallback={<div className="h-28 bg-white shadow-sm"></div>}>
            <MobileHeader />
          </Suspense>
          
          {/* Desktop Navbar - Sticky */}
          <div className="hidden md:block sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
            <Navbar />
          </div>

          {children}

          <FloatingContact />
          <Footer />
          <MobileBottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
```

### 5.4 Product Actions Component

**File**: `components/ProductActions.tsx`

```typescript
'use client';

import { useState } from 'react';
import { ShoppingCart, Phone } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import ConsultationModal from './ConsultationModal';

export default function ProductActions({ product }: { product: any }) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleAddToCart = () => {
    addToCart(product);
    alert(`Đã thêm "${product.name}" vào giỏ hàng!`);
  };

  const handleBuyNow = () => {
    addToCart(product);
    router.push('/cart');
  };

  return (
    <>
      <div className="space-y-3">
        <button
          onClick={handleBuyNow}
          className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
        >
          Mua ngay
        </button>
        
        <button
          onClick={handleAddToCart}
          className="w-full border-2 border-emerald-600 text-emerald-600 font-bold py-3 rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" /> Thêm vào giỏ
        </button>
        
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
        >
          <Phone className="w-5 h-5" /> Tư vấn miễn phí
        </button>
      </div>

      {showModal && <ConsultationModal onClose={() => setShowModal(false)} />}
    </>
  );
}
```

---

## 6. Current Progress

### ✅ Tính năng đã hoàn thành 100%

#### 6.1 Core Features
- [x] **Authentication**: Google OAuth via Supabase
- [x] **Product Catalog**: Listing, Detail, Categories
- [x] **Cart System**: Add, Remove, localStorage persistence
- [x] **Responsive Layout**: Mobile-first, Desktop optimized
- [x] **SEO**: Meta tags, JSON-LD structured data
- [x] **Search & Filter**: Keyword, Cost, Industry, Tech tags

#### 6.2 Pages
- [x] Homepage (Hero, Courses, Services, News, Testimonials, Partners)
- [x] Categories (Mobile: Grouped tabs + filter drawer, PC: Sidebar filters)
- [x] Product Detail (Tabs: Content, Instructor, Reviews, Process)
- [x] Login/Signup (OAuth Google)
- [x] Profile (Basic user info)
- [x] Services landing pages
- [x] News/Blog listing & detail
- [x] 404 Not Found

#### 6.3 Components
- [x] Navbar (Desktop, 2-level dropdown menu)
- [x] MobileHeader (Search, Cart badge, Menu drawer)
- [x] MobileBottomNav (4 tabs: Home, Categories, Cart, Profile)
- [x] Footer (Company info, Social links, Payment QR)
- [x] FloatingContact (Zalo, Messenger, Phone buttons)
- [x] CourseTabs (Tabbed interface for product details)
- [x] ProductCard, ProductActions, ProductImageSlider
- [x] BookingModal, ConsultationModal

### 🚧 Tính năng đang dở dang

#### 6.4 In Progress
- [ ] **Learning Platform**: `/learn/[slug]/lesson/[id]` page (video player, progress tracking)
- [ ] **Payment Gateway**: Chưa tích hợp VNPay/MoMo (hiện tại chỉ hiển thị QR banking)
- [ ] **Order Management**: Admin dashboard để quản lý đơn hàng
- [ ] **Email Notifications**: Xác nhận đơn hàng, reset password
- [ ] **Reviews System**: User reviews cho products (UI đã có, backend chưa)
- [ ] **Instructor Profile Page**: Chi tiết giảng viên đầy đủ
- [ ] **Advanced Search**: Autocomplete, recent searches
- [ ] **Wishlist/Favorites**: Lưu sản phẩm yêu thích

#### 6.5 Planned Features
- [ ] **Admin CMS**: Quản lý products, courses, posts
- [ ] **Google Sheets Sync**: Import/Export data từ Google Sheets (đã có OAuth config)
- [ ] **Video Hosting**: Tích hợp Vimeo/YouTube API cho bài học
- [ ] **Certificate Generation**: Chứng chỉ hoàn thành khóa học
- [ ] **Affiliate System**: Hoa hồng cho người giới thiệu

---

## 7. Coding Style & Rules

### 7.1 File Naming Conventions
- **Pages**: `page.tsx` (Next.js App Router convention)
- **Components**: PascalCase (e.g. `ProductCard.tsx`, `MobileHeader.tsx`)
- **Utils/Libs**: camelCase (e.g. `supabase.ts`, `constants.ts`)
- **Folders**: lowercase hoặc kebab-case (e.g. `mobile`, `product`, `auth`)

### 7.2 TypeScript Practices
- **Interface cho Props**: Luôn định nghĩa interface cho component props
  ```typescript
  interface ProductCardProps {
    product: Product;
    formatPrice: (price: number) => string;
  }
  ```
- **Type Safety**: Sử dụng `as unknown as Type` khi cần cast Supabase data
- **Explicit Return Types**: Khai báo return type cho async functions
  ```typescript
  async function getProduct(slug: string): Promise<Product | null> { ... }
  ```
- **ESLint Disable Comments**: Sử dụng khi cần thiết (e.g. `// eslint-disable-next-line @next/next/no-img-element`)

### 7.3 Component Structure Pattern

```typescript
'use client'; // Khai báo nếu cần client-side features

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon1, Icon2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// 1. INTERFACES & TYPES
interface ComponentProps {
  data: DataType;
  onAction: () => void;
}

// 2. CONSTANTS
const TAB_OPTIONS = [
  { id: 'tab1', name: 'Tab 1' },
  { id: 'tab2', name: 'Tab 2' },
];

// 3. HELPER FUNCTIONS (nếu có)
const helperFunction = (param: string) => {
  return param.toUpperCase();
};

// 4. MAIN COMPONENT
export default function ComponentName({ data, onAction }: ComponentProps) {
  // State declarations
  const [activeTab, setActiveTab] = useState('tab1');
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, []);
  
  // Event handlers
  const handleClick = () => {
    onAction();
  };
  
  // Render
  return (
    <div className="container">
      {/* JSX */}
    </div>
  );
}
```

### 7.4 CSS/Tailwind Guidelines
- **Mobile-first**: Dùng breakpoints `md:`, `lg:` cho desktop
  ```tsx
  <div className="text-sm md:text-base lg:text-lg">...</div>
  ```
- **Semantic Classes**: Group theo category
  ```tsx
  <button className="bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-emerald-700 transition-colors">
    Button
  </button>
  ```
- **Consistent Spacing**: Dùng scale Tailwind (4, 6, 8, 12, 16, 24)
- **Z-index Layers**:
  - `z-[90]`: Mobile Header
  - `z-50`: Desktop Navbar
  - `z-[100-110]`: Modals, Drawers
  - `z-[150-200]`: Filter drawers, Overlays

### 7.5 Naming Conventions cho Variables
- **Boolean states**: `isOpen`, `showModal`, `hasError`
- **Arrays**: Plural (e.g. `products`, `categories`, `items`)
- **Handlers**: `handleClick`, `onSubmit`, `toggleMenu`
- **Async functions**: `fetchData`, `getProduct`, `updateUser`

### 7.6 Comment Style
- **Section Headers**: `// --- SECTION NAME ---` (uppercase, dashes)
- **Inline Explanations**: `// Fix: Issue description`
- **TODO Comments**: `// TODO: Feature to implement`
- **Vietnamese cho Business Logic**: Comments giải thích logic nghiệp vụ nên viết tiếng Việt

### 7.7 Import Order
```typescript
// 1. React/Next.js core
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 2. External libraries
import { Icon } from 'lucide-react';

// 3. Internal utils/libs
import { supabase } from '@/lib/supabase';
import { APP_CONFIG } from '@/lib/constants';

// 4. Context/Hooks
import { useCart } from '@/context/CartContext';

// 5. Components
import ProductCard from '@/components/ProductCard';
```

### 7.8 Error Handling Pattern
```typescript
// Supabase queries
const { data, error } = await supabase.from('table').select('*');
if (error) {
  console.error('Error fetching data:', error);
  return null; // hoặc fallback value
}

// Try-catch cho localStorage
try {
  const savedData = JSON.parse(localStorage.getItem('key') || '[]');
} catch (e) {
  console.error('Parse error:', e);
  localStorage.removeItem('key');
}
```

---

## 8. Phân biệt Mobile vs PC Layout

### 8.1 Strategy: Component Splitting

**Nguyên tắc**: Khi logic UI quá khác biệt giữa mobile và desktop, tách thành 2 components riêng trong `components/mobile/` và `components/pc/`.

**Ví dụ**: Categories Page

```typescript
// app/categories/page.tsx
import CategoriesViewMobile from '@/components/mobile/CategoriesView';
import CategoriesViewPC from '@/components/pc/CategoriesView';

export default function CategoriesPage() {
  return (
    <>
      {/* Mobile View */}
      <CategoriesViewMobile products={data} loading={loading} />
      
      {/* Desktop View */}
      <div className="hidden md:block">
        <CategoriesViewPC products={data} loading={loading} />
      </div>
    </>
  );
}
```

### 8.2 Mobile Layout Characteristics

#### Navigation
- **Top Header**: Sticky, 2 rows
  - Row 1: Logo, Hotline button, Cart icon, Menu icon
  - Row 2: Search input + Filter button
- **Bottom Navigation**: Fixed bottom-0
  - 4 tabs: Home, Categories, Cart, Profile
  - Active state với icon fill + text màu emerald

#### Categories Page (Mobile)
- **4-tier tab system**:
  1. Parent tabs: Tất cả / Khóa học / Dịch vụ
  2. Child tabs: Horizontal scroll pills (Online, Zoom, AppSheet...)
  3. Filter drawer: Full-screen slide-in từ right
     - Left sidebar: Price / Industry / Tech
     - Right content: Checkbox grid
  4. Product grid: 2 columns

#### Product Detail (Mobile)
- **Mobile Hero Section**: Card riêng hiển thị giá + actions
- **Image Slider**: Full-width swiper
- **Tabs**: Horizontal scroll
- **Sticky "Mua ngay" button**: Bottom của viewport

### 8.3 Desktop (PC) Layout Characteristics

#### Navigation
- **Navbar**: Sticky top, single row
  - Logo, 2-level dropdown menu (Khóa học, Dịch vụ)
  - Search bar (center)
  - Hotline, Cart, Login buttons (right)
  
#### Categories Page (Desktop)
- **Sidebar + Grid layout**:
  - Left sidebar (1/4 width): Filter panels (Price, Industry, Tech)
  - Main content (3/4 width): 3-column product grid
- **Tab switching**: Horizontal tabs dưới heading
- **Grouped view**: Khi chọn "Tất cả", hiển thị grouped sections

#### Product Detail (Desktop)
- **2-column layout**:
  - Left (2/3): Image slider, Description, Tabs
  - Right (1/3): Sticky sidebar (Price, Actions, Share, Related)

### 8.4 Responsive Breakpoints
```css
/* Mobile: < 768px */
/* Tablet: 768px - 1024px (md:) */
/* Desktop: > 1024px (lg:) */
```

**Tailwind Classes**:
- `md:hidden` - Ẩn trên desktop (≥768px)
- `hidden md:block` - Ẩn mobile, hiện desktop
- `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` - Responsive grid

### 8.5 Mobile-Specific Features

| Feature | Mobile Implementation | Desktop Implementation |
|---------|----------------------|------------------------|
| **Menu** | Slide-in drawer (85% width) | Dropdown on hover |
| **Search** | Always visible in header | In navbar center |
| **Filter** | Full-screen drawer với 2-panel UI | Left sidebar sticky |
| **Cart Badge** | Top-right header | Navbar right |
| **Product Actions** | Fixed bottom bar | Sticky sidebar |
| **Hero Slider** | Full-width, auto-play | Container-width, manual |

### 8.6 Touch Optimization (Mobile)
- **Touch targets**: Minimum 44x44px (py-3, px-4)
- **Active states**: `active:scale-[0.98]` feedback
- **Scroll snap**: `snap-x`, `snap-mandatory` cho sliders
- **Drawer animations**: `animate-in slide-in-from-right duration-300`

### 8.7 Desktop-Specific Enhancements
- **Hover states**: `:hover` effects (không có trên mobile)
- **Tooltips**: Show on hover
- **Cursor**: `cursor-pointer` classes
- **Multi-level dropdowns**: `group/sub` pattern cho nested hovers

---

## 9. Data Models (Supabase Schema)

### Products Table
```sql
products (
  id: number (PK),
  name: string,
  slug: string (unique),
  type: 'course' | 'service',
  price: number,
  old_price: number?,
  thumbnail_url: string,
  gallery: string[],
  description: text,
  content_html: text,
  total_duration: string,
  benefits: string[],
  outcomes: string[],
  requirements: string[],
  category_id: number (FK -> categories),
  instructor_id: number (FK -> instructors),
  industry_tag: string?,
  tech_tag: string?,
  is_active: boolean,
  created_at: timestamp
)
```

### Chapters Table
```sql
chapters (
  id: number (PK),
  product_id: number (FK -> products),
  title: string,
  sort_order: number,
  created_at: timestamp
)
```

### Lessons Table
```sql
lessons (
  id: number (PK),
  chapter_id: number (FK -> chapters),
  title: string,
  duration: string (e.g. "15:30"),
  is_preview: boolean,
  video_url: string?,
  sort_order: number,
  created_at: timestamp
)
```

### Instructors Table
```sql
instructors (
  id: number (PK),
  name: string,
  title: string,
  bio: text,
  avatar_url: string,
  rating: decimal,
  created_at: timestamp
)
```

---

## 10. Environment Variables

**File**: `.env.local` (gitignored)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 11. Build & Deployment

### Development
```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Vercel Deployment
- **Framework**: Next.js 16.1.1
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Environment Variables**: Set NEXT_PUBLIC_SUPABASE_* in Vercel dashboard

---

## 12. Key Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.1.1 | React framework |
| react | 19.2.3 | UI library |
| @supabase/supabase-js | 2.89.0 | Backend client |
| tailwindcss | 3.4.17 | CSS framework |
| lucide-react | 0.562.0 | Icon library |
| typescript | 5.x | Type checking |
| clsx + tailwind-merge | - | className utilities |

---

## 13. Important Notes for AI

### Khi thêm tính năng mới:
1. **Check responsive**: Test trên mobile và desktop
2. **Update constants.ts**: Nếu có config mới
3. **TypeScript types**: Luôn định nghĩa interface
4. **Error handling**: Xử lý null/undefined cases
5. **SEO**: Thêm metadata cho pages mới

### Khi sửa bug:
1. **Console logs**: Tránh để lại console.log trong production
2. **ESLint warnings**: Fix hoặc comment `// eslint-disable-next-line`
3. **Build test**: Chạy `npm run build` trước khi commit

### Database migrations:
- Thay đổi schema qua Supabase Dashboard
- Update TypeScript interfaces tương ứng
- Test Supabase queries với data mới

---

**Tóm tắt**: SheetApp là một Next.js 16 + Supabase webapp với responsive design (mobile/desktop riêng biệt), cart context, OAuth authentication, và hệ thống catalog sản phẩm đa cấp. Coding style tuân thủ TypeScript strict, Tailwind mobile-first, và component-driven architecture.
