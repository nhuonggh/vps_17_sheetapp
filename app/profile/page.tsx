'use client';

import { useEffect } from 'react';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import ProfileMobile from '@/components/profile/ProfileMobile';
import ProfileDesktop from '@/components/profile/ProfileDesktop';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, loading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login'); // Chưa đăng nhập thì đá về login
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-emerald-600 font-bold">Đang tải hồ sơ...</div>;
  }

  // Shim adapt sang shape user_metadata.* mà ProfileMobile/ProfileDesktop đang đọc —
  // 2 component đó tự fetch thêm dữ liệu qua GET /api/profile, không đổi ở đây.
  const compatUser = {
    id: user.id,
    email: user.email,
    user_metadata: {
      avatar_url: user.avatar_url,
      full_name: user.name,
    },
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* GIAO DIỆN MOBILE (Chỉ hiện ở màn hình nhỏ < md) */}
      <div className="block md:hidden">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ProfileMobile user={compatUser as any} />
      </div>

      {/* GIAO DIỆN DESKTOP (Chỉ hiện ở màn hình lớn >= md) */}
      <div className="hidden md:block pt-20">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ProfileDesktop user={compatUser as any} />
      </div>
    </main>
  );
}
