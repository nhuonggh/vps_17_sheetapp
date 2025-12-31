'use client';

import dynamicComponent from 'next/dynamic';
import { Suspense } from 'react';

// Import Component Logic và TẮT Server-Side Rendering (SSR)
const AuthLogicNoSSR = dynamicComponent(() => import('./AuthLogic'), { 
  ssr: false,
});

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {/* Thêm Suspense để bọc giới hạn lỗi */}
      <Suspense fallback={<div className="text-center py-10">Đang tải...</div>}>
        <AuthLogicNoSSR />
      </Suspense>
    </div>
  );
}