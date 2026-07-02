'use client';

import { useState, useEffect } from 'react';
import { User as UserIcon, Package, CalendarCheck, Bell, LogOut, CreditCard, ChevronRight, LucideIcon, Loader2, Save } from 'lucide-react';
import { signOut } from '@/lib/auth/client-signout';
import { useCart } from '@/context/CartContext';

// --- INTERFACES ---
interface Profile {
    id: string;
    email: string;
    full_name?: string;
    name?: string;
    phone?: string;
    role?: string;
    job?: string;
    avatar_url?: string;
    gender?: string;
    created_via?: string;
}

// --- MOCK DATA ---
const MOCK_ASSETS = [
    { id: 1, name: 'Khóa học AppSheet Master', type: 'Course', image: 'https://via.placeholder.com/150' },
    { id: 2, name: 'Template Quản lý Kho', type: 'Service', image: 'https://via.placeholder.com/150' },
];
const MOCK_ORDERS = [
    { id: 'DH001', date: '05/01/2026', total: '1.500.000đ', status: 'Hoàn thành' },
    { id: 'DH002', date: '01/01/2026', total: '500.000đ', status: 'Đang xử lý' },
];

// --- SIDEBAR ITEM COMPONENT ---
interface SidebarItemProps {
    id: string;
    icon: LucideIcon;
    label: string;
    isActive: boolean;
    onClick: (id: string) => void;
}

const SidebarItem = ({ id, icon: Icon, label, isActive, onClick }: SidebarItemProps) => (
    <button
        onClick={() => onClick(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
            ? 'bg-emerald-50 text-emerald-700 border-r-4 border-emerald-600'
            : 'text-gray-600 hover:bg-gray-50'
            }`}
    >
        <Icon className="w-5 h-5" />
        {label}
        {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
);

interface ProfileUser {
    id: string;
    email?: string;
    user_metadata: { avatar_url?: string; full_name?: string };
}

export default function ProfileDesktop({ user }: { user: ProfileUser | null }) {
    const { clearCart } = useCart();
    const [activeTab, setActiveTab] = useState('info');
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        job: '',
        gender: ''
    });

    // Load profile from Supabase
    useEffect(() => {
        const loadProfile = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch('/api/profile');
                const { profile: data } = await res.json();

                if (data) {
                    setProfile(data);
                    setFormData({
                        fullName: data.full_name || data.name || '',
                        phone: data.phone || '',
                        job: data.job || '',
                        gender: data.gender || ''
                    });
                }
            } catch (error) {
                console.error('Exception loading profile:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [user]);

    const handleLogout = async () => {
        clearCart();
        await signOut();
        window.location.href = '/';
    };

    const handleSaveProfile = async () => {
        if (!user) return;

        setSaving(true);
        setMessage(null);

        try {
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
                throw new Error('Không thể cập nhật profile');
            }

            const { profile: updatedProfile } = await res.json();

            setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });

            if (updatedProfile) {
                setProfile(updatedProfile);
            }

        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: 'Có lỗi xảy ra. Vui lòng thử lại.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-12 gap-8">

                {/* --- SIDEBAR TRÁI --- */}
                <div className="col-span-3">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={profile?.avatar_url || user?.user_metadata?.avatar_url || 'https://via.placeholder.com/100'}
                            className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-emerald-100 object-cover"
                            alt="User"
                        />
                        <h2 className="font-bold text-gray-900">
                            {profile?.full_name || profile?.name || user?.user_metadata?.full_name || 'Khách hàng'}
                        </h2>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-1">
                        <SidebarItem
                            id="info"
                            icon={UserIcon}
                            label="Thông tin cá nhân"
                            isActive={activeTab === 'info'}
                            onClick={setActiveTab}
                        />
                        <SidebarItem
                            id="assets"
                            icon={Package}
                            label="Tài sản của tôi"
                            isActive={activeTab === 'assets'}
                            onClick={setActiveTab}
                        />
                        <SidebarItem
                            id="orders"
                            icon={CreditCard}
                            label="Lịch sử mua hàng"
                            isActive={activeTab === 'orders'}
                            onClick={setActiveTab}
                        />
                        <SidebarItem
                            id="bookings"
                            icon={CalendarCheck}
                            label="Lịch sử đặt lịch"
                            isActive={activeTab === 'bookings'}
                            onClick={setActiveTab}
                        />
                        <SidebarItem
                            id="notifs"
                            icon={Bell}
                            label="Thông báo"
                            isActive={activeTab === 'notifs'}
                            onClick={setActiveTab}
                        />

                        <div className="h-px bg-gray-100 my-2"></div>

                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
                            <LogOut className="w-5 h-5" /> Đăng xuất
                        </button>
                    </div>
                </div>

                {/* --- CONTENT PHẢI --- */}
                <div className="col-span-9">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[500px]">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">
                            {activeTab === 'info' && 'Thông tin cá nhân'}
                            {activeTab === 'assets' && 'Kho tài sản số (Khóa học / Dịch vụ)'}
                            {activeTab === 'orders' && 'Lịch sử đơn hàng'}
                            {activeTab === 'bookings' && 'Lịch sử đặt lịch tư vấn'}
                            {activeTab === 'notifs' && 'Thông báo hệ thống'}
                        </h2>

                        {/* Message */}
                        {message && (
                            <div className={`mb-6 p-4 rounded-lg ${message.type === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        {/* CONTENT - INFO */}
                        {activeTab === 'info' && (
                            <div className="grid grid-cols-2 gap-6 max-w-2xl">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">
                                        Họ và tên đầy đủ
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nhập họ và tên đầy đủ..."
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                                    <div className="p-3 bg-gray-50 rounded-lg text-gray-800 font-medium border border-gray-200">
                                        {user?.email}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Email không thể thay đổi</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Số điện thoại</label>
                                    <input
                                        type="tel"
                                        placeholder="Nhập số điện thoại..."
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Giới tính</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-emerald-500 focus:border-emerald-500"
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    >
                                        <option value="">-- Chọn giới tính --</option>
                                        <option value="Nam">Nam</option>
                                        <option value="Nữ">Nữ</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>

                                {/* Job */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Nghề nghiệp</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-emerald-500 focus:border-emerald-500"
                                        value={formData.job}
                                        onChange={(e) => setFormData({ ...formData, job: e.target.value })}
                                    >
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

                                <div className="col-span-2">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Đang lưu...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Lưu thay đổi
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* CONTENT - ASSETS */}
                        {activeTab === 'assets' && (
                            <div className="grid grid-cols-3 gap-6">
                                {MOCK_ASSETS.map(item => (
                                    <div key={item.id} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all group">
                                        <div className="h-32 bg-gray-200 relative">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={item.image} className="w-full h-full object-cover" alt="" />
                                            <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] px-2 py-1 rounded font-bold">{item.type}</span>
                                        </div>
                                        <div className="p-4">
                                            <h4 className="font-bold text-gray-800 mb-2 group-hover:text-emerald-600">{item.name}</h4>
                                            <button className="w-full py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded hover:bg-emerald-600 hover:text-white transition-colors">Truy cập</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* CONTENT - ORDERS */}
                        {activeTab === 'orders' && (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="p-3">Mã đơn</th>
                                        <th className="p-3">Ngày mua</th>
                                        <th className="p-3">Tổng tiền</th>
                                        <th className="p-3">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK_ORDERS.map(order => (
                                        <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="p-3 font-bold">{order.id}</td>
                                            <td className="p-3 text-gray-600">{order.date}</td>
                                            <td className="p-3 font-bold text-emerald-600">{order.total}</td>
                                            <td className="p-3">
                                                <span className={`text-xs px-2 py-1 rounded-full ${order.status === 'Hoàn thành' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* CONTENT - BOOKINGS & NOTIFS */}
                        {(activeTab === 'bookings' || activeTab === 'notifs') && (
                            <div className="text-center py-20 text-gray-400">
                                <p>Chức năng đang được phát triển...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}