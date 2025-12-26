'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// 1. Định nghĩa kiểu dữ liệu cho sản phẩm ĐÃ nằm trong giỏ (có số lượng)
export interface CartItem {
  id: number;
  name: string;
  price: number;
  slug: string;
  thumbnail_url: string | null;
  quantity: number;
}

// 2. Định nghĩa kiểu dữ liệu đầu vào cho hàm addItem
export interface ProductInput {
  id: number;
  name: string;
  price: number;
  slug: string;
  thumbnail_url: string | null;
  // Dùng unknown an toàn hơn any để thỏa mãn ESLint
  [key: string]: unknown; 
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: ProductInput) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // 1. Load giỏ hàng từ LocalStorage khi mới vào web
  useEffect(() => {
    // Di chuyển dòng tắt lỗi lên đây vì setIsMounted mới là nguyên nhân gây lỗi
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);

    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('sheetapp_cart');
      if (savedCart) {
        try {
          // Xóa dòng disable thừa ở đây đi
          setItems(JSON.parse(savedCart));
        } catch (e) {
          console.error('Lỗi đọc giỏ hàng cũ', e);
        }
      }
    }
  }, []);

  // 2. Tự động lưu vào LocalStorage mỗi khi giỏ hàng thay đổi
  useEffect(() => {
    // Chỉ lưu khi component đã mount để tránh ghi đè dữ liệu rỗng lúc khởi tạo
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem('sheetapp_cart', JSON.stringify(items));
    }
  }, [items, isMounted]);

  // Hàm thêm sản phẩm
  const addItem = (product: ProductInput) => {
    setItems((currentItems) => {
      // Kiểm tra xem sản phẩm đã có trong giỏ chưa
      const existingItem = currentItems.find((item) => item.id === product.id);
      
      if (existingItem) {
        // Nếu có rồi -> Tăng số lượng lên 1
        return currentItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      // Nếu chưa -> Thêm mới với số lượng 1
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

  // Hàm xóa sản phẩm
  const removeItem = (id: number) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  // Hàm dọn sạch giỏ (dùng sau khi thanh toán xong)
  const clearCart = () => {
    setItems([]);
  };

  // Tính tổng tiền
  const totalAmount = items.reduce((total, item) => total + item.price * item.quantity, 0);
  
  // Tính tổng số lượng item
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, totalAmount, totalItems }}>
      {children}
    </CartContext.Provider>
  );
}

// Hook để dùng nhanh ở các component khác
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart phải được dùng bên trong CartProvider');
  }
  return context;
}