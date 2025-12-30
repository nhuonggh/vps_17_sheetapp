'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// 1. Định nghĩa kiểu dữ liệu cho sản phẩm ĐÃ nằm trong giỏ
export interface CartItem {
  id: number;
  name: string;
  price: number;
  slug: string;
  thumbnail_url: string | null;
  quantity: number;
  type?: string; // Thêm type để xử lý logic hiển thị nếu cần
}

// 2. Định nghĩa kiểu dữ liệu đầu vào
export interface ProductInput {
  id: number;
  name: string;
  price: number;
  slug: string;
  thumbnail_url: string | null;
  type?: string;
  [key: string]: unknown; 
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: ProductInput) => void; // ĐÃ SỬA TÊN HÀM Ở ĐÂY
  removeItem: (id: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Load giỏ hàng
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('sheetapp_cart');
      if (savedCart) {
        try {
          setItems(JSON.parse(savedCart));
        } catch (e) {
          console.error('Lỗi đọc giỏ hàng cũ', e);
        }
      }
    }
  }, []);

  // Lưu giỏ hàng
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem('sheetapp_cart', JSON.stringify(items));
    }
  }, [items, isMounted]);

  // HÀM THÊM SẢN PHẨM (ĐÃ ĐỔI TÊN THÀNH addToCart)
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
      
      return [...currentItems, {
        id: product.id,
        name: product.name,
        price: product.price,
        slug: product.slug,
        thumbnail_url: product.thumbnail_url,
        quantity: 1,
        type: product.type as string
      }];
    });
    // Có thể thêm alert hoặc toast thông báo ở đây nếu muốn
  };

  const removeItem = (id: number) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalAmount = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeItem, clearCart, totalAmount, totalItems }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart phải được dùng bên trong CartProvider');
  }
  return context;
}