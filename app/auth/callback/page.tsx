'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Supabase client sẽ tự động phát hiện hash #access_token trong URL
    // và lưu session vào localStorage.
    // Chúng ta chỉ cần đợi 1 chút rồi chuyển hướng về trang chủ.
    
    const handleAuth = async () => {
        // Kiểm tra xem đã có session chưa
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            // Đăng nhập thành công -> Về trang chủ
            router.push('/'); 
        } else {
            // Trường hợp mạng chậm, Supabase chưa kịp parse hash
            // Lắng nghe sự kiện đăng nhập thành công
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN') {
                    router.push('/');
                }
            });
            
            return () => subscription.unsubscribe();
        }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Đang đăng nhập...</h2>
        <p className="text-gray-500">Vui lòng đợi trong giây lát</p>
      </div>
    </div>
  );
}