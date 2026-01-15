'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import ProfileMobile from '@/components/profile/ProfileMobile';
import ProfileDesktop from '@/components/profile/ProfileDesktop';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login'); // Chưa đăng nhập thì đá về login
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    getUser();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-emerald-600 font-bold">Đang tải hồ sơ...</div>;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* GIAO DIỆN MOBILE (Chỉ hiện ở màn hình nhỏ < md) */}
      <div className="block md:hidden">
        <ProfileMobile user={user} />
      </div>

      {/* GIAO DIỆN DESKTOP (Chỉ hiện ở màn hình lớn >= md) */}
      <div className="hidden md:block pt-20">
        <ProfileDesktop user={user} />
      </div>
    </main>
  );
}