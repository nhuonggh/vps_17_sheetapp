'use client';

import { useCart } from '@/context/CartContext';
import { Trash2, ShoppingCart, ArrowLeft, Minus, Plus, Tag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CartPage() {
    const { items, removeItem, clearCart, updateQuantity, totalAmount, totalItems } = useCart();
    const router = useRouter();
    const [discountCode, setDiscountCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(0);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [checkoutData, setCheckoutData] = useState({
        name: '',
        email: '',
        phone: '',
    });

    const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

    const handleApplyDiscount = () => {
        const discounts: Record<string, number> = { 'SAVE10': 0.1, 'SAVE20': 0.2, 'VIP50': 0.5 };
        const code = discountCode.toUpperCase().trim();
        setAppliedDiscount(discounts[code] || 0);
    };

    const discountAmount = totalAmount * appliedDiscount;
    const finalTotal = totalAmount - discountAmount;

    const handleCheckout = async () => {
        if (!checkoutData.name || !checkoutData.email || !checkoutData.phone) {
            alert('Vui lòng điền đầy đủ thông tin thanh toán');
            return;
        }

        setIsCheckingOut(true);
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(item => ({
                        product_id: item.id,
                        quantity: item.quantity
                    })),
                    customer: checkoutData,
                }),
            });

            const data = await response.json();
            if (data.success && data.order.paymentUrl) {
                // Redirect to PayOS payment page
                window.location.href = data.order.paymentUrl;
            } else {
                alert('Lỗi tạo thanh toán: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Lỗi kết nối. Vui lòng thử lại!');
        } finally {
            setIsCheckingOut(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <ShoppingCart className="w-24 h-24 mx-auto text-gray-300 mb-6" />
                    <h1 className="text-3xl font-bold mb-4">Giỏ hàng trống</h1>
                    <Link href="/" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl hover:bg-emerald-700 font-semibold">
                        <ArrowLeft className="w-5 h-5" /> Tiếp tục mua sắm
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 md:py-12">
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Giỏ hàng ({totalItems})</h1>
                    <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Tiếp tục mua sắm
                    </Link>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 space-y-4">
                        {items.map((item) => (
                            <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 md:p-6 hover:shadow-md transition-shadow">
                                <div className="flex gap-4">
                                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-lg relative flex-shrink-0">
                                        {item.thumbnail_url && <Image src={item.thumbnail_url} alt={item.name} fill className="object-cover rounded-lg" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 mb-1 md:mb-2">{item.name}</h3>
                                        <p className="text-emerald-600 font-bold text-lg md:text-xl">{formatPrice(item.price)}</p>
                                        <div className="flex items-center gap-3 md:gap-4 mt-3 md:mt-4">
                                            <div className="flex items-center border-2 border-gray-200 rounded-lg">
                                                <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="p-1.5 md:p-2 hover:bg-gray-100 transition-colors">
                                                    <Minus className="w-3 h-3 md:w-4 md:h-4" />
                                                </button>
                                                <span className="px-3 md:px-4 font-semibold text-sm md:text-base">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1.5 md:p-2 hover:bg-gray-100 transition-colors">
                                                    <Plus className="w-3 h-3 md:w-4 md:h-4" />
                                                </button>
                                            </div>
                                            <button onClick={() => removeItem(item.id)} className="text-red-600 hover:text-red-700 p-1.5 md:p-2 transition-colors" title="Xóa">
                                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Summary & Checkout */}
                    <div className="space-y-6">
                        {/* Order Summary */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Tổng đơn hàng</h2>
                            <div className="space-y-4">
                                <div className="flex justify-between text-gray-700">
                                    <span>Tạm tính ({totalItems} sản phẩm)</span>
                                    <span className="font-semibold">{formatPrice(totalAmount)}</span>
                                </div>

                                {/* Discount Code */}
                                <div className="border-t pt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Tag className="w-4 h-4 text-emerald-600" />
                                        <span className="font-semibold text-gray-700">Mã giảm giá</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            value={discountCode}
                                            onChange={(e) => setDiscountCode(e.target.value)}
                                            placeholder="SAVE10, SAVE20, VIP50"
                                            className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none text-sm"
                                        />
                                        <button
                                            onClick={handleApplyDiscount}
                                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm whitespace-nowrap"
                                        >
                                            Áp dụng
                                        </button>
                                    </div>
                                    {appliedDiscount > 0 && (
                                        <p className="text-emerald-600 text-sm mt-2">✓ Giảm {appliedDiscount * 100}%</p>
                                    )}
                                </div>

                                {appliedDiscount > 0 && (
                                    <div className="flex justify-between text-emerald-600">
                                        <span>Giảm giá ({appliedDiscount * 100}%)</span>
                                        <span className="font-semibold">-{formatPrice(discountAmount)}</span>
                                    </div>
                                )}

                                <div className="border-t pt-4 flex justify-between text-xl font-bold">
                                    <span className="text-gray-900">Tổng cộng</span>
                                    <span className="text-emerald-600">{formatPrice(finalTotal)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Checkout Form */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <button
                                onClick={() => router.push('/checkout')}
                                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                            >
                                Tiến hành thanh toán
                            </button>

                            <p className="text-xs text-gray-500 text-center mt-4">
                                ✓ Thanh toán an toàn qua PayOS<br />
                                ✓ Hỗ trợ 24/7
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
