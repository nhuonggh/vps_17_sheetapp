'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// 1. Định nghĩa Type cho sản phẩm trong giỏ
export interface CartItem {
  id: number;
  name: string;
  price: number;
  slug: string;
  thumbnail_url: string | null;
  quantity: number;
}

// 2. Định nghĩa Type input
export interface ProductInput {
  id: number;
  name: string;
  price: number;
  slug: string;
  thumbnail_url: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Cho phép các trường khác để tránh lỗi Type
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: ProductInput) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Load giỏ hàng (Chạy 1 lần duy nhất khi mount)
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('sheetapp_cart');
      if (savedCart) {
        try {
          // Bỏ qua cảnh báo setState trong useEffect vì đây là logic load cart bắt buộc
          setItems(JSON.parse(savedCart));
        } catch (e) {
          console.error('Lỗi đọc giỏ hàng:', e);
          localStorage.removeItem('sheetapp_cart');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lưu giỏ hàng (Chạy mỗi khi items thay đổi)
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('sheetapp_cart', JSON.stringify(items));
    }
  }, [items, isMounted]);

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
        quantity: 1
      }];
    });
  };

  const removeItem = (id: number) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number, quantity: number) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalAmount = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeItem, updateQuantity, clearCart, totalAmount, totalItems }}>
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