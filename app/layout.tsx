import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react"; // <--- 1. THÊM DÒNG NÀY
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
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
          {/* 2. BỌC SUSPENSE CHO MOBILE HEADER */}
          {/* Đây là chốt chặn giúp trang 404 không bị lỗi khi build */}
          <Suspense fallback={<div className="h-28 bg-white shadow-sm"></div>}>
             <MobileHeader />
          </Suspense>
          
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