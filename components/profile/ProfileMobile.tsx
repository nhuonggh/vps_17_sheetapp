'use client';

import { useState, useEffect } from 'react';
import {
    User as UserIcon, Phone, Briefcase, Package, Clock,
    CalendarCheck, Bell, LogOut, Edit, X, Loader2, Save,
    Ticket, UserPlus, MessageSquarePlus, Copy, Check, ShieldCheck, FileText, Target
} from 'lucide-react';
import { signOut } from '@/lib/auth/client-signout';
import { useCart } from '@/context/CartContext';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

// --- INTERFACES ---
interface Booking {
    id: number; created_at: string; content: string; status: string;
}
interface Notification {
    id: number; created_at: string; title: string; message: string; is_read: boolean;
}
interface Coupon {
    id: number; code: string; discount: string; description: string; expiration_date: string;
}
interface AffiliateRequest {
    id: number; created_at: string; status: string; full_name: string; phone: string; scope?: string;
}

interface ProfileUser {
    id: string;
    email?: string;
    user_metadata: { avatar_url?: string; full_name?: string };
}

export default function ProfileMobile({ user }: { user: ProfileUser | null }) {
    const { clearCart } = useCart();
    const { executeRecaptcha } = useGoogleReCaptcha();
    const [activeTab, setActiveTab] = useState('info');
    const [showEditModal, setShowEditModal] = useState(false);

    // State Modal Đăng ký CTV
    const [showAffiliateModal, setShowAffiliateModal] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    // Data States
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [affiliateRequest, setAffiliateRequest] = useState<AffiliateRequest | null>(null);

    const [feedbackContent, setFeedbackContent] = useState('');
    const [isCopied, setIsCopied] = useState<string | null>(null);

    // Form Data Edit Profile
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        job: '',
        gender: 'Nam'
    });

    // Form Data Register Affiliate (ĐÃ CẬP NHẬT: Thêm scope)
    const [affiliateForm, setAffiliateForm] = useState({
        fullName: '',
        phone: '',
        scope: ''
    });

    // --- 1. FETCH DATA TỪ SUPABASE ---
    useEffect(() => {
        const loadUserData = async () => {
            if (!user) return;

            // Load profile from profiles table
            const profileRes = await fetch('/api/profile');
            const { profile: profileData } = await profileRes.json();

            if (profileData) {
                setFormData({
                    fullName: profileData.full_name || profileData.name || '',
                    phone: profileData.phone || '',
                    job: profileData.job || '',
                    gender: profileData.gender || 'Nam',
                });
            }

            // Load Bookings
            const fetchBookings = async () => {
                const res = await fetch('/api/profile/bookings');
                const { bookings: data } = await res.json();
                if (data) setBookings(data);
            };

            // Load Notifications
            const fetchNotifications = async () => {
                const res = await fetch('/api/profile/notifications');
                const { notifications: data } = await res.json();
                if (data) setNotifications(data as Notification[]);
            };

            // Load Coupons
            const fetchCoupons = async () => {
                const res = await fetch('/api/coupons');
                const { coupons: data } = await res.json();
                if (data) setCoupons(data);
            };

            // Check Affiliate Status
            const checkAffiliate = async () => {
                const res = await fetch('/api/profile/affiliate-request');
                const { affiliateRequest: data } = await res.json();
                if (data) setAffiliateRequest(data);
            };

            fetchBookings();
            fetchNotifications();
            fetchCoupons();
            checkAffiliate();
        };

        loadUserData();
    }, [user]);

    // --- 2. ACTIONS ---

    const handleLogout = async () => {
        clearCart();
        await signOut();
        window.location.href = '/';
    };

    const handleUpdateProfile = async () => {
        setIsLoading(true);
        try {
            if (!user) throw new Error('User not logged in');

            // Update profiles table
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    phone: formData.phone,
                    job: formData.job,
                    gender: formData.gender,
                }),
            });

            if (!res.ok) {
                throw new Error('Profile update failed');
            }

            alert("Cập nhật thông tin thành công!");
            setShowEditModal(false);
            window.location.reload();
        } catch (error: any) {
            console.error("Lỗi update profile:", error);
            alert(error.message || "Có lỗi xảy ra, vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendFeedback = async () => {
        if (!feedbackContent.trim()) return alert("Vui lòng nhập nội dung góp ý!");
        setIsLoading(true);
        try {
            // Verify CAPTCHA
            if (!executeRecaptcha) {
                alert('CAPTCHA not ready. Please refresh the page.');
                setIsLoading(false);
                return;
            }

            const captchaToken = await executeRecaptcha('feedback');
            const captchaResponse = await fetch('/api/verify-captcha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: captchaToken }),
            });

            const captchaData = await captchaResponse.json();
            if (!captchaResponse.ok || !captchaData.success) {
                alert('Bot detected! Please try again.');
                setIsLoading(false);
                return;
            }

            // CAPTCHA passed - Submit feedback
            const feedbackRes = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: feedbackContent, type: 'general' }),
            });

            if (!feedbackRes.ok) throw new Error('Failed to submit feedback');
            alert("Cảm ơn bạn đã gửi góp ý!");
            setFeedbackContent('');
        } catch (error) {
            console.error(error);
            alert("Gửi thất bại. Vui lòng thử lại sau.");
        } finally {
            setIsLoading(false);
        }
    }

    // MỞ MODAL ĐĂNG KÝ CTV
    const openAffiliateModal = () => {
        setAffiliateForm({
            fullName: formData.fullName || '',
            phone: formData.phone || '',
            scope: 'Khóa học' // Mặc định
        });
        setShowAffiliateModal(true);
    }

    // GỬI FORM ĐĂNG KÝ CTV VÀO DB
    const submitAffiliateRequest = async () => {
        if (!affiliateForm.fullName || !affiliateForm.phone || !affiliateForm.scope) {
            alert("Vui lòng nhập đầy đủ thông tin");
            return;
        }

        setIsLoading(true);
        try {
            // Verify CAPTCHA
            if (!executeRecaptcha) {
                alert('CAPTCHA not ready. Please refresh the page.');
                setIsLoading(false);
                return;
            }

            const captchaToken = await executeRecaptcha('affiliate');
            const captchaResponse = await fetch('/api/verify-captcha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: captchaToken }),
            });

            const captchaData = await captchaResponse.json();
            if (!captchaResponse.ok || !captchaData.success) {
                alert('Bot detected! Please try again.');
                setIsLoading(false);
                return;
            }

            // CAPTCHA passed - Submit affiliate request
            const affiliateRes = await fetch('/api/profile/affiliate-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: affiliateForm.fullName,
                    phone: affiliateForm.phone,
                    scope: affiliateForm.scope,
                }),
            });

            if (!affiliateRes.ok) throw new Error('Failed to submit affiliate request');
            const { affiliateRequest: data } = await affiliateRes.json();

            alert("Gửi hồ sơ đăng ký thành công!");
            setAffiliateRequest(data);
            setShowAffiliateModal(false);

        } catch (error) {
            console.error(error);
            alert("Lỗi khi gửi yêu cầu. Có thể bạn đã đăng ký rồi.");
        } finally {
            setIsLoading(false);
        }
    }

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setIsCopied(code);
        setTimeout(() => setIsCopied(null), 2000);
    }

    const menuItems = [
        { id: 'info', icon: UserIcon, label: 'Hồ sơ' },
        { id: 'assets', icon: Package, label: 'Tài sản' },
        { id: 'affiliate', icon: UserPlus, label: 'CTV' },
        { id: 'bookings', icon: CalendarCheck, label: 'Tư vấn' },
        { id: 'coupons', icon: Ticket, label: 'Mã giảm' },
        { id: 'orders', icon: Clock, label: 'Lịch sử' },
        { id: 'feedback', icon: MessageSquarePlus, label: 'Góp ý' },
        { id: 'notifs', icon: Bell, label: 'T.Báo' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'info':
                return (
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                            <UserIcon className="w-5 h-5 text-gray-400" />
                            <div><p className="text-xs text-gray-400">Họ và tên</p><p className="text-sm font-medium text-gray-800">{user?.user_metadata?.full_name || 'Chưa cập nhật'}</p></div>
                        </div>
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                            <Phone className="w-5 h-5 text-gray-400" />
                            <div><p className="text-xs text-gray-400">Số điện thoại</p><p className="text-sm font-medium text-gray-800">{user?.user_metadata?.phone || 'Chưa cập nhật'}</p></div>
                        </div>
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                            <Briefcase className="w-5 h-5 text-gray-400" />
                            <div><p className="text-xs text-gray-400">Nghề nghiệp</p><p className="text-sm font-medium text-gray-800">{user?.user_metadata?.job || 'Chưa cập nhật'}</p></div>
                        </div>
                        <button onClick={() => setShowEditModal(true)} className="w-full mt-2 py-2 rounded-lg border border-emerald-600 text-emerald-600 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 active:scale-95 transition-all">
                            <Edit className="w-3 h-3" /> Cập nhật thông tin
                        </button>
                    </div>
                );
            case 'assets':
                return (
                    <div className="text-center py-10 text-gray-400 text-sm">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        Chưa có tài sản nào. <br /> Hãy mua khóa học để bắt đầu học ngay!
                    </div>
                );
            case 'coupons':
                return (
                    <div className="space-y-3">
                        {coupons.length > 0 ? coupons.map(cp => (
                            <div key={cp.id} className="bg-white p-4 rounded-xl border border-dashed border-emerald-300 relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-700 text-[9px] font-bold px-2 py-1 rounded-bl-lg">HSD: {new Date(cp.expiration_date).toLocaleDateString('vi-VN')}</div>
                                <div className="flex justify-between items-center mt-2">
                                    <div>
                                        <h4 className="text-lg font-bold text-emerald-600">{cp.discount}</h4>
                                        <p className="text-xs text-gray-500">{cp.description}</p>
                                        <div className="mt-2 inline-flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                            <code className="text-sm font-mono text-gray-800">{cp.code}</code>
                                        </div>
                                    </div>
                                    <button onClick={() => copyCode(cp.code)} className={`p-2 rounded-full transition-colors ${isCopied === cp.code ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 active:bg-gray-200'}`}>
                                        {isCopied === cp.code ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-gray-400 text-sm">Hiện chưa có mã giảm giá nào.</div>
                        )}
                    </div>
                );
            case 'affiliate':
                return (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        {!affiliateRequest ? (
                            <div className="text-center">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <UserPlus className="w-8 h-8" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg mb-2">Trở thành Cộng tác viên</h3>
                                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                    Tham gia mạng lưới Affiliate của SheetApp để nhận hoa hồng lên đến <span className="font-bold text-emerald-600">30%</span> khi giới thiệu khóa học & dịch vụ.
                                </p>
                                <button
                                    onClick={openAffiliateModal}
                                    className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    Đăng ký ngay
                                </button>
                            </div>
                        ) : (
                            <div>
                                <h3 className="font-bold text-gray-900 text-base mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <FileText className="w-5 h-5 text-emerald-600" /> Hồ sơ đăng ký
                                </h3>

                                <div className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-xs text-gray-500">Ngày gửi</span>
                                            <span className="text-xs font-bold text-gray-800">{new Date(affiliateRequest.created_at).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-xs text-gray-500">Họ tên</span>
                                            <span className="text-xs font-bold text-gray-800">{affiliateRequest.full_name}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-xs text-gray-500">Số điện thoại</span>
                                            <span className="text-xs font-bold text-gray-800">{affiliateRequest.phone}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs text-gray-500">Phạm vi</span>
                                            <span className="text-xs font-bold text-gray-800">{affiliateRequest.scope || 'Chưa cập nhật'}</span>
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-lg flex items-center gap-3 ${affiliateRequest.status === 'approved' ? 'bg-emerald-50 text-emerald-800' :
                                        affiliateRequest.status === 'rejected' ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'
                                        }`}>
                                        <ShieldCheck className="w-6 h-6 flex-shrink-0" />
                                        <div>
                                            <p className="font-bold text-sm uppercase">
                                                {affiliateRequest.status === 'pending' && 'Đang chờ duyệt'}
                                                {affiliateRequest.status === 'approved' && 'Đã được duyệt'}
                                                {affiliateRequest.status === 'rejected' && 'Bị từ chối'}
                                            </p>
                                            <p className="text-xs opacity-80 mt-1">
                                                {affiliateRequest.status === 'pending' && 'Hồ sơ của bạn đang được xem xét. Vui lòng quay lại sau.'}
                                                {affiliateRequest.status === 'approved' && 'Chúc mừng! Bạn đã trở thành đối tác.'}
                                                {affiliateRequest.status === 'rejected' && 'Vui lòng liên hệ Admin để biết chi tiết.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'feedback':
                return (
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <MessageSquarePlus className="w-5 h-5 text-emerald-600" /> Gửi góp ý
                        </h3>
                        <textarea
                            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 min-h-[120px] mb-3"
                            placeholder="Bạn có ý tưởng gì giúp SheetApp tốt hơn? Hoặc báo lỗi tại đây..."
                            value={feedbackContent}
                            onChange={(e) => setFeedbackContent(e.target.value)}
                        ></textarea>
                        <button onClick={handleSendFeedback} disabled={isLoading} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors">
                            {isLoading ? "Đang gửi..." : "Gửi góp ý"}
                        </button>
                    </div>
                );
            case 'bookings':
                return (
                    <div className="space-y-3">
                        {bookings.length > 0 ? bookings.map(bk => (
                            <div key={bk.id} className="bg-white p-4 rounded-xl border-l-4 border-emerald-500 shadow-sm">
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold text-xs text-gray-500">{new Date(bk.created_at).toLocaleDateString('vi-VN')}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${bk.status === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {bk.status === 'new' ? 'Mới gửi' : bk.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-800 font-medium">{bk.content}</p>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-gray-400 text-sm">Chưa có lịch sử đặt lịch nào.</div>
                        )}
                    </div>
                );
            case 'notifs':
                return (
                    <div className="space-y-2">
                        {notifications.length > 0 ? notifications.map(notif => (
                            <div key={notif.id} className={`p-4 rounded-xl border ${notif.is_read ? 'bg-white border-gray-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                <h4 className={`text-sm ${notif.is_read ? 'text-gray-700' : 'text-gray-900 font-bold'}`}>{notif.title}</h4>
                                <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                                <span className="text-[10px] text-gray-400 mt-2 block">{new Date(notif.created_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-gray-400 text-sm">Bạn không có thông báo mới.</div>
                        )}
                    </div>
                );
            case 'orders':
                return <div className="text-center py-8 text-gray-400 text-sm">Chưa có đơn hàng nào.</div>;
            default: return null;
        }
    };

    return (
        <div className="pb-24 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="bg-emerald-700 text-white pt-12 pb-16 px-6 relative rounded-b-[30px] shadow-lg">
                <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={user?.user_metadata?.avatar_url || 'https://via.placeholder.com/80'}
                        className="w-16 h-16 rounded-full border-4 border-emerald-500/50 shadow-md bg-white object-cover"
                        alt="User"
                    />
                    <div>
                        <h2 className="font-bold text-lg">{user?.user_metadata?.full_name || 'Khách hàng'}</h2>
                        <p className="text-emerald-100 text-sm">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Menu (Đã cập nhật thứ tự) */}
            <div className="px-4 -mt-8 relative z-10">
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-2 flex justify-between overflow-x-auto scrollbar-hide gap-2">
                    {menuItems.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center gap-1 p-2 min-w-[55px] rounded-lg transition-all flex-shrink-0 ${activeTab === tab.id ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400'}`}
                        >
                            <tab.icon className="w-5 h-5" strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                            <span className="text-[9px] font-bold">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="px-4 mt-6">
                <h3 className="font-bold text-gray-800 mb-4 uppercase text-xs tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                    {activeTab === 'info' && 'Thông tin cá nhân'}
                    {activeTab === 'assets' && 'Tài sản của tôi'}
                    {activeTab === 'affiliate' && 'Cộng tác viên'}
                    {activeTab === 'bookings' && 'Lịch sử đặt lịch'}
                    {activeTab === 'coupons' && 'Mã giảm giá của tôi'}
                    {activeTab === 'orders' && 'Lịch sử đơn hàng'}
                    {activeTab === 'feedback' && 'Gửi góp ý - Báo lỗi'}
                    {activeTab === 'notifs' && 'Thông báo'}
                </h3>

                {renderContent()}

                {activeTab === 'info' && (
                    <button onClick={handleLogout} className="w-full mt-8 bg-gray-200 text-gray-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors">
                        <LogOut className="w-4 h-4" /> Đăng xuất
                    </button>
                )}
            </div>

            {/* Modal Edit Profile (Giữ nguyên) */}
            {showEditModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden">
                        <div className="bg-emerald-600 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Edit className="w-5 h-5" /> Cập nhật hồ sơ</h3>
                            <button onClick={() => setShowEditModal(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Họ và tên</label>
                                <input type="text" className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-emerald-500" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Số điện thoại</label>
                                <input type="tel" className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-emerald-500" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Nghề nghiệp</label>
                                <select className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-emerald-500 bg-white" value={formData.job} onChange={e => setFormData({ ...formData, job: e.target.value })}>
                                    <option value="">-- Chọn nghề nghiệp --</option>
                                    <option value="Kế toán">Kế toán / Tài chính</option>
                                    <option value="Nhân sự">Nhân sự / Hành chính</option>
                                    <option value="IT">IT / Lập trình viên</option>
                                    <option value="Kinh doanh">Kinh doanh / Sale</option>
                                    <option value="Marketing">Marketing / Truyền thông</option>
                                    <option value="Giáo dục">Giáo dục / Giảng viên</option>
                                    <option value="Y tế">Y tế / Dược</option>
                                    <option value="Luật">Luật sư / Pháp lý</option>
                                    <option value="Xây dựng">Xây dựng / Kiến trúc</option>
                                    <option value="Sinh viên">Sinh viên</option>
                                    <option value="Freelancer">Freelancer</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Giới tính</label>
                                <div className="flex gap-3">
                                    <label className="flex items-center gap-2 text-sm text-gray-700"><input type="radio" name="gender" value="Nam" checked={formData.gender === 'Nam'} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="text-emerald-600 focus:ring-emerald-500" /> Nam</label>
                                    <label className="flex items-center gap-2 text-sm text-gray-700"><input type="radio" name="gender" value="Nữ" checked={formData.gender === 'Nữ'} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="text-emerald-600 focus:ring-emerald-500" /> Nữ</label>
                                    <label className="flex items-center gap-2 text-sm text-gray-700"><input type="radio" name="gender" value="Khác" checked={formData.gender === 'Khác'} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="text-emerald-600 focus:ring-emerald-500" /> Khác</label>
                                </div>
                            </div>
                            <button onClick={handleUpdateProfile} disabled={isLoading} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl mt-2 flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Đăng Ký CTV (ĐÃ CẬP NHẬT: Thêm trường Scope) */}
            {showAffiliateModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAffiliateModal(false)}></div>
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden">
                        <div className="bg-emerald-600 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2"><UserPlus className="w-5 h-5" /> Đăng ký CTV</h3>
                            <button onClick={() => setShowAffiliateModal(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600 mb-4">
                                Vui lòng xác nhận thông tin liên hệ chính xác để chúng tôi liên lạc.
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Họ và tên (*)</label>
                                <input type="text" className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-emerald-500"
                                    value={affiliateForm.fullName}
                                    onChange={e => setAffiliateForm({ ...affiliateForm, fullName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Số điện thoại / Zalo (*)</label>
                                <input type="tel" className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-emerald-500"
                                    value={affiliateForm.phone}
                                    onChange={e => setAffiliateForm({ ...affiliateForm, phone: e.target.value })}
                                />
                            </div>
                            {/* --- TRƯỜNG MỚI: PHẠM VI ĐĂNG KÝ --- */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Mô tả phạm vi đăng ký (*)</label>
                                <textarea
                                    className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-emerald-500"
                                    rows={3}
                                    placeholder="VD: Tôi muốn kinh doanh Phần mềm nhân sự, Khóa học AppSheet..."
                                    value={affiliateForm.scope}
                                    onChange={e => setAffiliateForm({ ...affiliateForm, scope: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={submitAffiliateRequest}
                                disabled={isLoading}
                                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl mt-2 flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Gửi đăng ký"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}