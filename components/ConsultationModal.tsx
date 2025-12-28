'use client';

import { X, Calendar, User, Phone, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ConsultationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', phone: '', message: '' });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('leads').insert([
        {
          full_name: formData.fullName,
          phone: formData.phone,
          message: formData.message
        }
      ]);

      if (error) throw error;

      alert("Gửi yêu cầu thành công! Chúng tôi sẽ liên hệ lại sớm.");
      setFormData({ fullName: '', phone: '', message: '' }); // Reset form
      onClose();
    } catch (error) {
      console.error('Lỗi gửi form:', error);
      alert("Có lỗi xảy ra, vui lòng thử lại hoặc gọi trực tiếp hotline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-2xl w-full max-w-md relative z-10 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
        <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Đăng ký tư vấn
            </h3>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <p className="text-sm text-gray-500 text-center mb-4">Để lại thông tin, chuyên gia SheetApp sẽ liên hệ tư vấn giải pháp phù hợp nhất cho bạn.</p>
            
            <div className="space-y-3">
                <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Họ và tên của bạn" 
                      required 
                      value={formData.fullName}
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                      className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                    />
                </div>

                <div className="relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input 
                      type="tel" 
                      placeholder="Số điện thoại / Zalo" 
                      required 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                    />
                </div>

                <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea 
                      placeholder="Nội dung cần tư vấn..." 
                      rows={3} 
                      value={formData.message}
                      onChange={e => setFormData({...formData, message: e.target.value})}
                      className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                    />
                </div>
            </div>

            <button disabled={loading} type="submit" className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 mt-2">
                {loading ? 'Đang gửi...' : 'Gửi yêu cầu tư vấn'}
            </button>
        </form>
      </div>
    </div>
  );
}