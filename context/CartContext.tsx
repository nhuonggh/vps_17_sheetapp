'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Định nghĩa kiểu dữ liệu cho sản phẩm trong giỏ
export interface CartItem {
  id: number;
  name: string;
  price: number;
  slug: string;
  thumbnail_url: string | null;
  quantity: number;
  type?: string;
}

// Định nghĩa kiểu dữ liệu đầu vào
export interface ProductInput {
  id: number;
  name: string;
  price: number;
  slug: string;
  thumbnail_url: string | null;
  type?: string;
  [key: string]: unknown; // Cho phép các trường khác nhưng an toàn hơn any
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: ProductInput) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  // FIX LỖI 1: Không cần state isMounted phức tạp, chỉ cần check window khi load
  
  // Load giỏ hàng (Chỉ chạy 1 lần khi mount)
  useEffect(() => {
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

  // Lưu giỏ hàng (Chạy mỗi khi items thay đổi)
  useEffect(() => {
    // Chỉ lưu khi items có dữ liệu hoặc đã load xong (để tránh ghi đè rỗng lúc đầu)
    // Tuy nhiên, logic đơn giản nhất là cứ items thay đổi thì lưu.
    if (typeof window !== 'undefined') {
        // Chỉ lưu nếu items khác rỗng hoặc đã từng load (để tránh bug clear lúc F5)
        // Cách fix đơn giản: 
        localStorage.setItem('sheetapp_cart', JSON.stringify(items));
    }
  }, [items]);

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