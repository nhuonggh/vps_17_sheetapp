'use client';
import { useState } from 'react';
import { X, CalendarCheck, User, Phone, MessageSquare, Loader2 } from 'lucide-react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    message: ''
  });

  if (!isOpen) return null;

  // Xử lý thay đổi input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Xử lý gửi form
  const handleSubmit = async () => {
    // 1. Validate cơ bản
    if (!formData.fullName.trim() || !formData.phone.trim()) {
      alert("Vui lòng nhập Họ tên và Số điện thoại để chúng tôi liên hệ!");
      return;
    }

    setIsLoading(true);

    try {
      // 2. Verify CAPTCHA
      if (!executeRecaptcha) {
        alert('CAPTCHA not ready. Please refresh the page.');
        setIsLoading(false);
        return;
      }

      const captchaToken = await executeRecaptcha('booking');
      const captchaResponse = await fetch('/api/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken }),
      });

      const captchaData = await captchaResponse.json();
      if (!captchaResponse.ok || !captchaData.success) {
        alert('Bot detected! Please try again or contact us directly.');
        setIsLoading(false);
        return;
      }

      // 3. CAPTCHA passed - Gửi dữ liệu lên API
      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
          message: formData.message,
        }),
      });

      if (!bookingRes.ok) throw new Error('Failed to submit booking');

      // 4. Thông báo thành công & Đóng modal
      alert("Gửi yêu cầu thành công! Chuyên gia của SheetApp sẽ liên hệ bạn sớm nhất.");
      setFormData({ fullName: '', phone: '', message: '' }); // Reset form
      onClose();

    } catch (error) {
      console.error('Lỗi gửi booking:', error);
      alert("Có lỗi xảy ra. Vui lòng thử lại sau hoặc liên hệ Hotline!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="bg-[#009065] p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-base flex items-center gap-2 uppercase">
            <CalendarCheck className="w-5 h-5" /> Đăng ký tư vấn
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 bg-white">
          <p className="text-gray-600 text-sm mb-5 text-center leading-relaxed">
            Để lại thông tin, chuyên gia SheetApp sẽ liên hệ tư vấn giải pháp phù hợp nhất cho bạn.
          </p>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {/* Họ tên */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                type="text"
                placeholder="Họ và tên của bạn (*)"
                className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#009065] focus:ring-1 focus:ring-[#009065] transition-all"
              />
            </div>

            {/* Số điện thoại */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-4 w-4 text-gray-400" />
              </div>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                type="tel"
                placeholder="Số điện thoại / Zalo (*)"
                className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#009065] focus:ring-1 focus:ring-[#009065] transition-all"
              />
            </div>

            {/* Nội dung */}
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <MessageSquare className="h-4 w-4 text-gray-400" />
              </div>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={3}
                placeholder="Nội dung cần tư vấn..."
                className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#009065] focus:ring-1 focus:ring-[#009065] resize-none transition-all"
              ></textarea>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-[#009065] text-white font-bold py-3 rounded-lg hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md shadow-emerald-100 mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...
                </>
              ) : (
                "Gửi yêu cầu tư vấn"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}