'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string;
                        callback: (response: { credential: string }) => void;
                    }) => void;
                    renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
                };
            };
        };
    }
}

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams?.get('redirect');
    const messageParam = searchParams?.get('message');

    const [message, setMessage] = useState<string | null>(
        messageParam ? decodeURIComponent(messageParam) : null
    );
    const [loading, setLoading] = useState(false);
    const buttonRef = useRef<HTMLDivElement>(null);

    const handleCredential = async (response: { credential: string }) => {
        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_token: response.credential }),
            });

            if (!res.ok) {
                setMessage('Đăng nhập Google thất bại. Vui lòng thử lại.');
                setLoading(false);
                return;
            }

            router.push(redirectUrl ? decodeURIComponent(redirectUrl) : '/');
            router.refresh();
        } catch {
            setMessage('Có lỗi xảy ra. Vui lòng thử lại.');
            setLoading(false);
        }
    };

    const initGoogleButton = () => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!window.google || !clientId || !buttonRef.current) return;

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredential,
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with',
        });
    };

    useEffect(() => {
        if (window.google) initGoogleButton();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onLoad={initGoogleButton}
            />
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
                <div className="px-8 pt-8 pb-6 text-center bg-white">
                    <Link href="/" className="inline-block text-2xl font-bold text-gray-800 tracking-tight mb-2">
                        Sheet<span className="text-emerald-600">App</span>
                    </Link>
                    <h2 className="text-gray-500 text-sm">Chào mừng bạn quay trở lại!</h2>
                </div>

                {message && (
                    <div className="mx-8 mb-4 p-3 rounded-lg text-sm flex items-start gap-2 bg-red-50 text-red-600">
                        <AlertCircle size={16} className="mt-0.5" />
                        {message}
                    </div>
                )}

                <div className="px-8 pb-8 flex flex-col items-center">
                    {loading && <Loader2 className="animate-spin w-5 h-5 text-emerald-600 mb-3" />}
                    <div ref={buttonRef} />
                    <p className="mt-6 text-center text-xs text-gray-400">
                        Đăng nhập bằng tài khoản Google của bạn.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
                    <p className="text-gray-600">Đang tải...</p>
                </div>
            </div>
        }>
            <LoginPageContent />
        </Suspense>
    );
}
