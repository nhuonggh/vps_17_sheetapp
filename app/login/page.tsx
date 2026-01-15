'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

export default function LoginPage() {
    const router = useRouter();
    const { executeRecaptcha } = useGoogleReCaptcha();

    // Trạng thái: 'login' | 'register' | 'forgot'
    const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // 1. Xử lý Đăng nhập Google
    const handleGoogleLogin = async () => {
        setLoading(true);
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
    };

    // 2. Xử lý Đăng nhập Email/Pass với CAPTCHA protection
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        // Verify CAPTCHA to prevent brute force attacks
        if (!executeRecaptcha) {
            setMessage({ type: 'error', text: 'CAPTCHA not ready. Please refresh the page.' });
            setLoading(false);
            return;
        }

        try {
            // Execute reCAPTCHA v3 (invisible)
            const captchaToken = await executeRecaptcha('login');

            // Verify CAPTCHA score with backend
            const captchaResponse = await fetch('/api/verify-captcha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: captchaToken }),
            });

            const captchaData = await captchaResponse.json();

            if (!captchaResponse.ok || !captchaData.success) {
                setMessage({
                    type: 'error',
                    text: 'Bot detected! Please try again or contact support.'
                });
                setLoading(false);
                return;
            }

            // CAPTCHA passed, proceed with login
            const { error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                setMessage({ type: 'error', text: 'Email hoặc mật khẩu không chính xác.' });
                setLoading(false);
            } else {
                router.push('/'); // Thành công -> Về trang chủ
                router.refresh(); // Refresh để Navbar cập nhật avatar
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
            setLoading(false);
        }
    };

    // 3. Xử lý Đăng ký với CAPTCHA protection
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        // Verify CAPTCHA first to block bots
        if (!executeRecaptcha) {
            setMessage({ type: 'error', text: 'CAPTCHA not ready. Please refresh the page.' });
            setLoading(false);
            return;
        }

        try {
            // Execute reCAPTCHA v3 (invisible)
            const captchaToken = await executeRecaptcha('register');

            // Verify CAPTCHA score with backend
            const captchaResponse = await fetch('/api/verify-captcha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: captchaToken }),
            });

            const captchaData = await captchaResponse.json();

            if (!captchaResponse.ok || !captchaData.success) {
                setMessage({
                    type: 'error',
                    text: 'Bot detected! Please try again or contact support.'
                });
                setLoading(false);
                return;
            }

            // CAPTCHA passed, proceed with registration
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: email.split('@')[0] },
                },
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    setMessage({ type: 'error', text: 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc chọn quên mật khẩu.' });
                } else {
                    setMessage({ type: 'error', text: error.message });
                }
            } else {
                setMessage({ type: 'success', text: 'Đăng ký thành công! Đang đăng nhập...' });
                setTimeout(() => {
                    router.push('/');
                    router.refresh();
                }, 1500);
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
        }

        setLoading(false);
    };

    // 4. Xử lý Quên mật khẩu
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`, // Trang này mình sẽ tạo sau
        });

        if (error) {
            console.log("Chi tiết lỗi gửi mail:", error); // <--- Thêm dòng này
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Link đặt lại mật khẩu đã gửi vào email của bạn.' });
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">

                {/* Header */}
                <div className="px-8 pt-8 pb-6 text-center bg-white">
                    <Link href="/" className="inline-block text-2xl font-bold text-gray-800 tracking-tight mb-2">
                        Sheet<span className="text-emerald-600">App</span>
                    </Link>
                    <h2 className="text-gray-500 text-sm">
                        {view === 'login' && 'Chào mừng bạn quay trở lại!'}
                        {view === 'register' && 'Tạo tài khoản miễn phí'}
                        {view === 'forgot' && 'Khôi phục mật khẩu'}
                    </h2>
                </div>

                {/* Thông báo lỗi/thành công */}
                {message && (
                    <div className={`mx-8 mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {message.type === 'error' ? <AlertCircle size={16} className="mt-0.5" /> : <CheckCircle size={16} className="mt-0.5" />}
                        {message.text}
                    </div>
                )}

                <div className="px-8 pb-8">
                    {/* Form */}
                    <form onSubmit={view === 'login' ? handleLogin : view === 'register' ? handleRegister : handleResetPassword} className="space-y-4">

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {view !== 'forgot' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {view === 'login' && (
                            <div className="flex justify-end">
                                <button type="button" onClick={() => setView('forgot')} className="text-sm text-emerald-600 hover:underline">
                                    Quên mật khẩu?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin w-4 h-4" />}
                            {view === 'login' ? 'Đăng nhập' : view === 'register' ? 'Đăng ký' : 'Gửi link khôi phục'}
                        </button>
                    </form>

                    {/* Divider */}
                    {view !== 'forgot' && (
                        <div className="my-6 flex items-center gap-4">
                            <div className="h-px bg-gray-200 flex-1"></div>
                            <span className="text-gray-400 text-xs uppercase">Hoặc</span>
                            <div className="h-px bg-gray-200 flex-1"></div>
                        </div>
                    )}

                    {/* Google Login */}
                    {view !== 'forgot' && (
                        <div className="space-y-3">
                            {/* Google Button */}
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                            >
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                                Tiếp tục với Google
                            </button>

                            {/* Facebook Button */}
                            <button
                                type="button"
                                onClick={async () => {
                                    setLoading(true);
                                    await supabase.auth.signInWithOAuth({
                                        provider: 'facebook',
                                        options: { redirectTo: `${window.location.origin}/auth/callback` },
                                    });
                                }}
                                className="w-full bg-[#1877F2] text-white py-2.5 rounded-lg font-medium hover:bg-[#166fe5] transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                                Tiếp tục với Facebook
                            </button>
                        </div>
                    )}

                    {/* Footer Links */}
                    <div className="mt-6 text-center text-sm text-gray-600">
                        {view === 'login' ? (
                            <>
                                Chưa có tài khoản?{' '}
                                <button onClick={() => setView('register')} className="text-emerald-600 font-semibold hover:underline">
                                    Đăng ký ngay
                                </button>
                            </>
                        ) : (
                            <>
                                Đã có tài khoản?{' '}
                                <button onClick={() => setView('login')} className="text-emerald-600 font-semibold hover:underline">
                                    Đăng nhập
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}