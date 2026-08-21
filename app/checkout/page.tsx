'use client';

import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, ShoppingCart, CheckCircle, Loader2, Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCurrentUser } from '@/lib/auth/use-current-user';

export default function CheckoutPage() {
    const { items, totalAmount, totalItems, clearCart } = useCart();
    const router = useRouter();
    const { user: authUser } = useCurrentUser();
    const [currentStep, setCurrentStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [orderData, setOrderData] = useState<any>(null);

    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        email: '',
        phone: '',
    });

    // Auto-fill tên/email từ user đã đăng nhập (GET /api/auth/me qua useCurrentUser).
    // `phone` không nằm trong dữ liệu session — để trống, người dùng tự nhập
    // (autofill phone qua bảng profiles thuộc phạm vi spec CRUD kế tiếp).
    useEffect(() => {
        if (!authUser) return;
        setCustomerInfo(prev => ({
            ...prev,
            name: prev.name || authUser.name || '',
            email: prev.email || authUser.email || '',
        }));
    }, [authUser]);

    // Redirect if cart is empty
    useEffect(() => {
        if (items.length === 0 && currentStep === 1) {
            router.push('/cart');
        }
    }, [items, currentStep, router]);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(price);
    };

    const handleStep1Next = () => {
        if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
            alert('Vui lòng điền đầy đủ thông tin');
            return;
        }
        setCurrentStep(2);
    };

    const handleStep2Confirm = async () => {
        setIsProcessing(true);
        try {
            // Use explicit origin to ensure correct URL in all environments
            const apiUrl = `${window.location.origin}/api/checkout`;
            console.log('🔍 Checkout API URL:', apiUrl); // DEBUG: Verify URL is correct

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(item => ({
                        product_id: item.id,
                        product_name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                    })),
                    customer: customerInfo,
                }),
            });

            const data = await response.json();
            console.log('Checkout API Response:', data); // DEBUG

            if (data.success) {
                console.log('Order Data:', data.order); // DEBUG
                setOrderData(data.order);

                // If PayOS payment URL exists, redirect to PayOS
                if (data.order.paymentUrl) {
                    console.log('Redirecting to PayOS:', data.order.paymentUrl);
                    window.location.href = data.order.paymentUrl;
                    return;
                }

                // Otherwise, show QR code step (fallback)
                console.log('No PayOS URL, showing QR code');
                setCurrentStep(3);
            } else {
                alert('Lỗi tạo đơn hàng: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Lỗi kết nối. Vui lòng thử lại!');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePaymentConfirm = async () => {
        setIsProcessing(true);
        try {
            // Wait 2 seconds to simulate checking (UX improvement)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Call API to verify payment from database/PayOS
            const response = await fetch(`/api/payment/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: orderData.id,
                }),
            });

            const data = await response.json();
            if (data.success && data.paid) {
                // Payment verified - clear cart and redirect to success page
                clearCart();
                router.push(`/payment/success?orderId=${orderData.id}&amount=${orderData.totalAmount}`);
            } else {
                alert('Chưa phát hiện giao dịch. Vui lòng kiểm tra lại hoặc đợi thêm vài phút.\n\nLưu ý: Có thể mất 1-2 phút để hệ thống ngân hàng xác nhận giao dịch.');
            }
        } catch (error) {
            console.error('Verify error:', error);
            alert('Lỗi kiểm tra giao dịch. Vui lòng thử lại!');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="flex items-center justify-between relative">
                        {/* Step 1 */}
                        <div className="flex flex-col items-center flex-1 z-10">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${currentStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                {currentStep > 1 ? <CheckCircle className="w-6 h-6" /> : '1'}
                            </div>
                            <span className="text-sm mt-2 font-semibold text-gray-700">Thông tin</span>
                        </div>

                        {/* Line connector */}
                        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 -z-0"></div>
                        <div className={`absolute top-6 left-0 h-0.5 transition-all ${currentStep >= 2 ? 'bg-emerald-600' : 'bg-gray-200'
                            }`} style={{ width: currentStep >= 2 ? '50%' : '0%' }}></div>

                        {/* Step 2 */}
                        <div className="flex flex-col items-center flex-1 z-10">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                {currentStep > 2 ? <CheckCircle className="w-6 h-6" /> : '2'}
                            </div>
                            <span className="text-sm mt-2 font-semibold text-gray-700">Xác nhận</span>
                        </div>

                        <div className={`absolute top-6 right-0 h-0.5 transition-all ${currentStep >= 3 ? 'bg-emerald-600' : 'bg-gray-200'
                            }`} style={{ width: currentStep >= 3 ? '50%' : '0%', left: '50%' }}></div>

                        {/* Step 3 */}
                        <div className="flex flex-col items-center flex-1 z-10">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${currentStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                3
                            </div>
                            <span className="text-sm mt-2 font-semibold text-gray-700">Thanh toán</span>
                        </div>
                    </div>
                </div>

                {/* Step Content */}
                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                    {/* Step 1: Customer Information */}
                    {currentStep === 1 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Thông tin khách hàng</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Họ và tên *</label>
                                    <input
                                        type="text"
                                        value={customerInfo.name}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                                        placeholder="Nguyễn Văn A"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                                    <input
                                        type="email"
                                        value={customerInfo.email}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                                        placeholder="email@example.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Số điện thoại *</label>
                                    <input
                                        type="tel"
                                        value={customerInfo.phone}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                                        placeholder="0987654321"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <Link href="/cart" className="flex-1 border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center">
                                    <ArrowLeft className="w-5 h-5 inline mr-2" />
                                    Quay lại giỏ hàng
                                </Link>
                                <button
                                    onClick={handleStep1Next}
                                    className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                                >
                                    Tiếp tục
                                    <ArrowRight className="w-5 h-5 inline ml-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Order Confirmation */}
                    {currentStep === 2 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Xác nhận đơn hàng</h2>

                            {/* Customer Info Summary */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                <h3 className="font-semibold text-gray-900 mb-2">Thông tin người mua</h3>
                                <p className="text-gray-700"><span className="font-medium">Tên:</span> {customerInfo.name}</p>
                                <p className="text-gray-700"><span className="font-medium">Email:</span> {customerInfo.email}</p>
                                <p className="text-gray-700"><span className="font-medium">SĐT:</span> {customerInfo.phone}</p>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-4 mb-6">
                                <h3 className="font-semibold text-gray-900">Sản phẩm đã chọn ({totalItems})</h3>
                                {items.map((item) => (
                                    <div key={item.id} className="flex gap-4 border-b pb-4">
                                        <div className="w-20 h-20 bg-gray-100 rounded-lg relative flex-shrink-0">
                                            {item.thumbnail_url && <Image src={item.thumbnail_url} alt={item.name} fill className="object-cover rounded-lg" />}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900">{item.name}</h4>
                                            <p className="text-gray-600">Số lượng: {item.quantity}</p>
                                            <p className="text-emerald-600 font-bold">{formatPrice(item.price)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Total */}
                            <div className="bg-emerald-50 rounded-xl p-4 mb-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold text-gray-900">Tổng cộng:</span>
                                    <span className="text-2xl font-bold text-emerald-600">{formatPrice(totalAmount)}</span>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Link href="/cart" className="flex-1 border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center">
                                    Mua thêm
                                </Link>
                                <button
                                    onClick={() => setCurrentStep(1)}
                                    className="flex-1 border-2 border-emerald-600 text-emerald-600 px-6 py-3 rounded-xl font-semibold hover:bg-emerald-50 transition-colors"
                                >
                                    Sửa thông tin
                                </button>
                                <button
                                    onClick={handleStep2Confirm}
                                    disabled={isProcessing}
                                    className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                >
                                    {isProcessing ? <Loader2 className="w-5 h-5 inline animate-spin" /> : 'Xác nhận'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: QR Code Payment */}
                    {currentStep === 3 && orderData && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Quét mã QR để thanh toán</h2>

                            {/* QR Code */}
                            <div className="flex justify-center mb-6">
                                {orderData.qrCode ? (
                                    <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-emerald-100">
                                        <img
                                            src={orderData.qrCode}
                                            alt="QR Code Thanh Toán"
                                            width={280}
                                            height={280}
                                            className="rounded-xl"
                                        />
                                        <p className="text-xs text-center text-gray-500 mt-2">Quét mã để thanh toán</p>
                                    </div>
                                ) : (
                                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 text-center max-w-md">
                                        <p className="text-yellow-900 font-semibold mb-2">⚠️ Chưa tải được QR Code</p>
                                        <p className="text-yellow-800 text-sm">Vui lòng sử dụng thông tin chuyển khoản bên dưới để thanh toán thủ công.</p>
                                    </div>
                                )}
                            </div>

                            {/* Payment Details */}
                            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl p-6 mb-6 border-2 border-emerald-100">
                                <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                                    <Package className="w-5 h-5 text-emerald-600" />
                                    Thông tin chuyển khoản
                                </h3>

                                <div className="space-y-4">
                                    {/* Bank Name */}
                                    <div className="bg-white rounded-lg p-3 border border-emerald-200">
                                        <label className="text-xs text-gray-600 block mb-1">Ngân hàng</label>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-gray-900">{orderData.bankInfo?.bankName || 'MBBank - Ngân hàng TMCP Quân đội (Chi nhánh Hóc Môn)'}</span>
                                        </div>
                                    </div>

                                    {/* Account Number */}
                                    <div className="bg-white rounded-lg p-3 border border-emerald-200">
                                        <label className="text-xs text-gray-600 block mb-1">Số tài khoản</label>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono font-bold text-lg text-gray-900">{orderData.bankInfo?.accountNumber || '0987726236'}</span>
                                            <button
                                                onClick={() => {
                                                    const acc = orderData.bankInfo?.accountNumber || '0987726236';
                                                    navigator.clipboard.writeText(acc);
                                                    alert('Đã copy số tài khoản!');
                                                }}
                                                className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>

                                    {/* Account Name */}
                                    <div className="bg-white rounded-lg p-3 border border-emerald-200">
                                        <label className="text-xs text-gray-600 block mb-1">Chủ tài khoản</label>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-gray-900">{orderData.bankInfo?.accountHolder || 'VO TAN NHUONG'}</span>
                                            <button
                                                onClick={() => {
                                                    const holder = orderData.bankInfo?.accountHolder || 'VO TAN NHUONG';
                                                    navigator.clipboard.writeText(holder);
                                                    alert('Đã copy tên tài khoản!');
                                                }}
                                                className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div className="bg-white rounded-lg p-3 border border-emerald-200">
                                        <label className="text-xs text-gray-600 block mb-1">Số tiền</label>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-2xl font-bold text-emerald-600">{formatPrice(orderData.totalAmount)}</span>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(orderData.totalAmount.toString());
                                                    alert('Đã copy số tiền!');
                                                }}
                                                className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>

                                    {/* Transfer Content */}
                                    <div className="bg-white rounded-lg p-3 border border-emerald-200">
                                        <label className="text-xs text-gray-600 block mb-1">Nội dung chuyển khoản</label>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono font-semibold text-gray-900">{orderData.paymentCode || orderData.id}</span>
                                            <button
                                                onClick={() => {
                                                    const code = orderData.paymentCode || orderData.id;
                                                    navigator.clipboard.writeText(code);
                                                    alert('Đã copy nội dung chuyển khoản!');
                                                }}
                                                className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                                <h4 className="font-semibold text-blue-900 mb-2">Hướng dẫn thanh toán:</h4>
                                <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
                                    <li><strong>CÁCH 1:</strong> Mở app ngân hàng → Quét mã QR phía trên</li>
                                    <li><strong>CÁCH 2:</strong> Chuyển khoản thủ công với thông tin trên (nhớ nhập đúng nội dung)</li>
                                    <li>Kiểm tra thông tin và xác nhận chuyển khoản</li>
                                    <li>Sau khi chuyển khoản thành công, bấm nút "Xác nhận đã thanh toán" bên dưới</li>
                                </ol>
                            </div>

                            {/* Important Note */}
                            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6">
                                <p className="text-yellow-900 text-sm font-medium">
                                    ⚠️ <strong>LƯU Ý QUAN TRỌNG:</strong> Vui lòng nhập chính xác nội dung chuyển khoản <span className="font-mono bg-yellow-100 px-2 py-0.5 rounded">{orderData.paymentCode || orderData.id}</span> để hệ thống tự động xác nhận thanh toán.
                                </p>
                            </div>

                            {/* Confirm Button */}
                            <button
                                onClick={handlePaymentConfirm}
                                disabled={isProcessing}
                                className="w-full bg-emerald-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-6 h-6 inline animate-spin mr-2" />
                                        Đang kiểm tra giao dịch...
                                    </>
                                ) : (
                                    '✓ Xác nhận đã thanh toán'
                                )}
                            </button>

                            <p className="text-center text-sm text-gray-500 mt-4">
                                Sau khi chuyển khoản thành công, hệ thống sẽ tự động<br />
                                xác nhận giao dịch từ ngân hàng trong vài phút
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
