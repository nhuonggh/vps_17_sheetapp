'use client';

import { Suspense } from 'react';

function PaymentCallbackContent() {
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
                                <span>Đang chờ webhook từ PayOS</span>
                            </li>
                            <li className="flex items-center">
                                <span className="mr-2">⏱️</span>
                                <span>Thời gian chờ: tối đa 5 phút</span>
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
