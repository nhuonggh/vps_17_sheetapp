import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import MobileBottomNav from "@/components/MobileBottomNav";
import MobileHeader from "@/components/MobileHeader";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingContact from "@/components/FloatingContact"; 
import { APP_CONFIG } from "@/lib/constants"; // Import Config mới

const inter = Inter({ subsets: ["latin"] });

// 1. Cấu hình Metadata động từ Constants
export const metadata: Metadata = {
  title: APP_CONFIG.app.title,
  description: "Giải pháp Google Sheets, AppSheet, WebApp chuyên nghiệp",
  icons: {
    icon: APP_CONFIG.app.favicon,
    apple: APP_CONFIG.app.favicon,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // 2. Schema JSON-LD (SEO) để hiện Sitelinks trên Google
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
        {/* Nhúng Schema SEO */}
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <CartProvider>
          {/* Header Mobile cố định */}
          <MobileHeader />
          
          {/* Navbar Desktop Sticky */}
          <div className="hidden md:block sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
            <Navbar />
          </div>

          {/* Nội dung chính */}
          {children}

          {/* Nút Gọi/Zalo nổi + Đăng ký tư vấn */}
          <FloatingContact />

          <Footer />
          <MobileBottomNav />
        </CartProvider>
      </body>
    </html>
  );
}