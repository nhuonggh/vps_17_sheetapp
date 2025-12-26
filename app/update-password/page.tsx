'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Kiểm tra xem user có đang ở trong phiên khôi phục không
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Nếu không có session (link hết hạn hoặc lỗi), đẩy về trang login
        router.push('/login');
      }
    };
    checkSession();
  }, [router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      setLoading(false);
      return;
    }

    // Gọi hàm cập nhật mật khẩu của Supabase
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công! Đang chuyển hướng...' });
      // Đăng xuất khỏi phiên Recovery để bắt user đăng nhập lại bằng mật khẩu mới
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push('/login');
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="px-8 pt-8 pb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Đặt lại mật khẩu</h2>
            <p className="text-gray-500 text-sm">Vui lòng nhập mật khẩu mới của bạn.</p>
        </div>

        {message && (
            <div className={`mx-8 mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                {message.text}
            </div>
        )}

        <form onSubmit={handleUpdatePassword} className="px-8 pb-8 space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    <input 
                        type="password" 
                        required 
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    <input 
                        type="password" 
                        required 
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
            >
                {loading && <Loader2 className="animate-spin w-4 h-4" />}
                Cập nhật mật khẩu
            </button>
            
            <div className="text-center mt-4">
                <Link href="/login" className="text-sm text-gray-500 hover:text-emerald-600">
                    Quay lại trang đăng nhập
                </Link>
            </div>
        </form>
      </div>
    </div>
  );
}