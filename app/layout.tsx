import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import MobileBottomNav from "@/components/MobileBottomNav";
import MobileHeader from "@/components/MobileHeader";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingContact from "@/components/FloatingContact"; // Import nút Gọi/Zalo nổi

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SheetApp - Siêu ứng dụng quản trị",
  description: "Giải pháp Google Sheets, AppSheet, WebApp chuyên nghiệp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <CartProvider>
          {/* Header Mobile cố định */}
          <MobileHeader />
          
          {/* Navbar Desktop Sticky */}
          <div className="hidden md:block sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
            <Navbar />
          </div>

          {/* Nội dung chính */}
          {children}

          {/* Nút Gọi/Zalo nổi (Hiển thị đè lên mọi thứ) */}
          <FloatingContact />

          <Footer />
          <MobileBottomNav />
        </CartProvider>
      </body>
    </html>
  );
}