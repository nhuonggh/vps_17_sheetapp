'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthLogic() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            router.push('/'); 
        } else {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN') router.push('/');
            });
            return () => subscription.unsubscribe();
        }
    };
    handleAuth();
  }, [router]);

  return (
    <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Đang đăng nhập...</h2>
        <p className="text-gray-500">Vui lòng đợi trong giây lát</p>
    </div>
  );
}