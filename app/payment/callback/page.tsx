'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function PaymentCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // State để track trạng thái payment
    const [status, setStatus] = useState<'checking' | 'success' | 'error' | 'timeout'>('checking');
    const [retryCount, setRetryCount] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const [orderInfo, setOrderInfo] = useState<any>(null);

    // Lấy orderCode từ URL (PayOS return về)
    const orderCode = searchParams.get('orderCode');
    const paymentStatus = searchParams.get('status'); // PAID, CANCELLED, etc.

    // Auto-check payment status
    useEffect(() => {
        if (!orderCode) {
            setStatus('error');
            setErrorMessage('Không tìm thấy mã đơn hàng trong URL');
            return;
        }

        let pollInterval: NodeJS.Timeout;
        let timeoutTimer: NodeJS.Timeout;
        let isMounted = true; // ✅ Track if component is mounted

        const checkPaymentStatus = async () => {
            if (!isMounted) return; // ✅ Don't run if unmounted

            try {
                setRetryCount(prev => {
                    console.log(`🔄 Checking payment status (attempt ${prev + 1})...`);
                    return prev + 1;
                });

                // Call API để check order status trong database
                const response = await fetch('/api/payment/status/find', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderCodePrefix: `DH${orderCode}`
                    }),
                });

                const data = await response.json();
                console.log('📦 API Response:', data);

                if (!isMounted) return; // ✅ Check again after async call

                if (data.success && data.found) {
                    setOrderInfo(data);

                    if (data.paid) {
                        // ✅ Payment đã confirmed trong database!
                        console.log('✅ Payment confirmed! Stopping poll...');
                        isMounted = false; // ✅ Stop immediately
                        setStatus('success');

                        // Stop polling
                        clearInterval(pollInterval);
                        clearTimeout(timeoutTimer);

                        // Auto-redirect sau 2 giây
                        setTimeout(() => {
                            router.push(`/payment/success?orderId=${data.orderId}`);
                        }, 2000);
                    } else {
                        // ⏳ Chưa paid, tiếp tục đợi
                        console.log(`⏳ Payment not yet confirmed. Status: ${data.status}`);
                    }
                } else {
                    // Order chưa tìm thấy (có thể webhook chưa chạy)
                    console.log('⚠️ Order not found yet');
                }
            } catch (error) {
                console.error('❌ Check payment error:', error);
            }
        };

        // Check ngay lập tức
        checkPaymentStatus();

        // Sau đó poll mỗi 3 giây
        pollInterval = setInterval(() => {
            if (isMounted) {
                checkPaymentStatus();
            }
        }, 3000);

        // Timeout sau 5 phút
        timeoutTimer = setTimeout(() => {
            if (isMounted) {
                console.log('⏰ Timeout reached');
                clearInterval(pollInterval);
                setStatus('timeout');
                setErrorMessage('Đã quá thời gian chờ. Vui lòng kiểm tra lại đơn hàng của bạn.');
            }
        }, 300000); // 5 minutes

        // Cleanup khi component unmount
        return () => {
            console.log('🛑 Cleanup: Stopping polling...');
            isMounted = false;
            clearInterval(pollInterval);
            clearTimeout(timeoutTimer);
        };
    }, [orderCode, router]); // ✅ REMOVED retryCount!

    // ===== SUCCESS STATE =====
    if (status === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center">
                        <div className="mb-6">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full">
                                <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-gray-900 mb-4">
                            ✅ Thanh toán thành công!
                        </h1>

                        <p className="text-gray-600 mb-6">
                            Đang chuyển hướng đến trang thành công...
                        </p>

                        {orderInfo && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-left">
                                <p className="font-semibold text-emerald-900 mb-2">Thông tin đơn hàng:</p>
                                <p className="text-emerald-800">Mã đơn: {orderInfo.orderId}</p>
                                <p className="text-emerald-800">Email: {orderInfo.customerEmail}</p>
                                <p className="text-emerald-800">Số tiền: {orderInfo.totalAmount?.toLocaleString()} VND</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ===== ERROR / TIMEOUT STATE =====
    if (status === 'error' || status === 'timeout') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center">
                        <div className="mb-6">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
                                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-gray-900 mb-4">
                            ⚠️ {status === 'timeout' ? 'Hết thời gian chờ' : 'Có lỗi xảy ra'}
                        </h1>

                        <p className="text-gray-600 mb-6">
                            {errorMessage || 'Vui lòng thử lại sau hoặc liên hệ hỗ trợ.'}
                        </p>

                        <div className="space-y-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                            >
                                🔄 Thử lại
                            </button>
                            <a
                                href="/"
                                className="block w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                            >
                                ← Về trang chủ
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ===== CHECKING STATE (default) =====
    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center">
                    {/* Loading Animation */}
                    <div className="mb-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full animate-pulse">
                            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        Đang kiểm tra thanh toán...
                    </h1>

                    <p className="text-gray-600 mb-8">
                        Vui lòng đợi trong giây lát, chúng tôi đang xác nhận giao dịch của bạn.
                    </p>

                    {/* Status Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                        <h3 className="font-semibold text-blue-900 mb-3">Thông tin:</h3>
                        <ul className="text-left text-sm text-blue-800 space-y-2">
                            <li className="flex items-center">
                                <span className="mr-2">✅</span>
                                <span>Đơn hàng đã được tạo</span>
                            </li>
                            <li className="flex items-center">
                                <span className="mr-2">🔄</span>
                                <span>Đang kiểm tra database (lần thử: {retryCount})</span>
                            </li>
                            <li className="flex items-center">
                                <span className="mr-2">⏱️</span>
                                <span>Tự động chuyển trang khi thanh toán thành công</span>
                            </li>
                        </ul>
                    </div>

                    {/* Instructions */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                        <h3 className="font-semibold text-yellow-900 mb-3">⚠️ Lưu ý quan trọng:</h3>
                        <ul className="text-left text-sm text-yellow-800 space-y-2">
                            <li>• Số tiền phải CHÍNH XÁC với đơn hàng</li>
                            <li>• Nội dung chuyển khoản phải ĐÚNG mã đơn hàng</li>
                            <li>• Webhook sẽ tự động cập nhật khi nhận tiền</li>
                        </ul>
                    </div>

                    {/* Check Status Button */}
                    <div className="space-y-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                        >
                            🔄 Kiểm tra lại trạng thái
                        </button>

                        <a
                            href="/"
                            className="block w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                        >
                            ← Về trang chủ
                        </a>
                    </div>

                    {/* Debug Info (for testing) */}
                    <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left">
                        <details className="text-sm">
                            <summary className="font-semibold text-gray-700 cursor-pointer">
                                🔧 Debug Information (Testing)
                            </summary>
                            <div className="mt-3 space-y-2 text-gray-600">
                                <p><strong>URL Params:</strong></p>
                                <pre className="bg-white p-2 rounded text-xs overflow-auto">
                                    {typeof window !== 'undefined' ? window.location.search : 'Loading...'}
                                </pre>
                                <p className="text-xs text-gray-500 mt-2">
                                    💡 Check terminal logs để xem webhook status
                                </p>
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PaymentCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                    <p className="mt-4 text-gray-600">Đang tải...</p>
                </div>
            </div>
        }>
            <PaymentCallbackContent />
        </Suspense>
    );
}
