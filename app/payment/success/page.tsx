'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Package, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';
export const runtime = 'edge';


export default function PaymentSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    const [orderDetails, setOrderDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orderId) {
            router.push('/');
            return;
        }

        // Fetch order details
        const fetchOrderDetails = async () => {
            try {
                const response = await fetch(`/api/payment/status/${orderId}`);
                const data = await response.json();

                if (response.ok) {
                    setOrderDetails(data);
                }
            } catch (error) {
                console.error('Error fetching order:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetails();
    }, [orderId, router]);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(price);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Success Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
                    {/* Success Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-12 h-12 text-emerald-600" />
                        </div>
                    </div>

                    {/* Success Message */}
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        Thanh toán thành công!
                    </h1>
                    <p className="text-lg text-gray-600 mb-8">
                        Cảm ơn bạn đã mua hàng tại SheetApp
                    </p>

                    {/* Order Details */}
                    <div className="bg-emerald-50 rounded-xl p-6 mb-8 text-left">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Package className="w-5 h-5 text-emerald-600" />
                            Thông tin đơn hàng
                        </h2>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Mã đơn hàng:</span>
                                <span className="font-mono font-semibold text-gray-900">
                                    {orderId}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Số tiền đã thanh toán:</span>
                                <span className="text-xl font-bold text-emerald-600">
                                    {amount ? formatPrice(parseInt(amount)) : (orderDetails?.totalAmount ? formatPrice(orderDetails.totalAmount) : 'N/A')}
                                </span>
                            </div>

                            {orderDetails?.paidAt && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Thời gian thanh toán:</span>
                                    <span className="font-semibold text-gray-900">
                                        {new Date(orderDetails.paidAt).toLocaleString('vi-VN')}
                                    </span>
                                </div>
                            )}

                            {orderDetails?.transactionId && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Mã giao dịch:</span>
                                    <span className="font-mono text-sm text-gray-700">
                                        {orderDetails.transactionId}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Next Steps */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-8 text-left">
                        <h3 className="font-semibold text-blue-900 mb-2">Bước tiếp theo:</h3>
                        <ul className="space-y-2 text-blue-800 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-0.5">✓</span>
                                <span>Đơn hàng của bạn đã được xác nhận thành công</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-0.5">✓</span>
                                <span>Chúng tôi sẽ gửi email xác nhận đến địa chỉ email của bạn</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-0.5">✓</span>
                                <span>Bạn có thể truy cập khóa học/sản phẩm ngay lập tức</span>
                            </li>
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link
                            href="/"
                            className="flex-1 bg-emerald-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-emerald-700 transition-colors text-center flex items-center justify-center gap-2"
                        >
                            Về trang chủ
                            <ArrowRight className="w-5 h-5" />
                        </Link>

                        <Link
                            href="/my-orders"
                            className="flex-1 border-2 border-emerald-600 text-emerald-600 font-bold py-4 px-6 rounded-xl hover:bg-emerald-50 transition-colors text-center"
                        >
                            Xem đơn hàng
                        </Link>
                    </div>

                    {/* Support Info */}
                    <p className="text-sm text-gray-500 mt-8">
                        Cần hỗ trợ? Liên hệ chúng tôi qua email: <a href="mailto:support@sheetapp.com" className="text-emerald-600 hover:underline">support@sheetapp.com</a>
                    </p>
                </div>

                {/* Confetti Effect (Optional Enhancement) */}
                <div className="text-center mt-8 text-6xl animate-bounce">
                    🎉
                </div>
            </div>
        </div>
    );
}
