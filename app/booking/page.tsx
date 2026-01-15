'use client';

import { MapPin, Phone, Mail, Clock, CalendarCheck } from 'lucide-react';

export default function BookingPage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-20 pt-safe">
      <div className="max-w-3xl mx-auto px-4 py-8">
        
        <h1 className="text-2xl font-bold text-gray-900 mb-6 border-l-4 border-emerald-600 pl-4">
            Đặt lịch tư vấn
        </h1>

        {/* PHẦN LIÊN HỆ (Được tách từ Trang chủ sang đây) */}
        <div className="bg-[#044F40] text-white rounded-2xl p-6 shadow-lg mb-8">
            <h2 className="text-lg font-bold uppercase mb-6 border-b border-emerald-500/50 pb-2 inline-block">
                Thông tin liên hệ
            </h2>
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className="bg-emerald-800/50 p-2 rounded-lg">
                        <MapPin className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-emerald-200 mb-1">Địa chỉ</p>
                        <p className="text-sm text-white leading-relaxed">Chung cư Moscow Tower, P. Tân Thới Nhất, Q.12, TP.HCM</p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-emerald-800/50 p-2 rounded-lg">
                        <Phone className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-emerald-200 mb-1">Hotline / Zalo</p>
                        <a href="tel:0987726236" className="text-xl font-bold text-white hover:text-emerald-400 transition-colors">0987 726 236</a>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-emerald-800/50 p-2 rounded-lg">
                        <Mail className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-emerald-200 mb-1">Email hỗ trợ</p>
                        <a href="mailto:sheetappai@gmail.com" className="text-base text-white hover:text-emerald-400 transition-colors">sheetappai@gmail.com</a>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-emerald-800/50 p-2 rounded-lg">
                        <Clock className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-emerald-200 mb-1">Giờ làm việc</p>
                        <p className="text-sm text-white">Thứ 2 - Thứ 7: 8:00 - 17:30</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Form Đặt lịch đơn giản (Nếu cần) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-emerald-600" />
                Đăng ký tư vấn
            </h2>
            <form className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors" placeholder="Nhập họ tên của bạn" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                    <input type="tel" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors" placeholder="Nhập số điện thoại" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung cần tư vấn</label>
                    <textarea rows={4} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors" placeholder="Bạn quan tâm đến khóa học hay dịch vụ nào?"></textarea>
                </div>
                <button type="button" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
                    Gửi yêu cầu
                </button>
            </form>
        </div>

      </div>
    </main>
  );
}