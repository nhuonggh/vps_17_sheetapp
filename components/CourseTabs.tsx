'use client';

import { useState, useEffect } from 'react';
import { PlayCircle, Lock, ChevronDown, Star, MessageSquare, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import Link from 'next/link'; // <--- Import Link

// 1. Định nghĩa các Interface
interface Lesson { id: number; title: string; duration: string; is_preview: boolean; }
interface Chapter { id: number; title: string; lessons: Lesson[]; }
interface Instructor { id: number; name: string; bio: string; avatar_url: string; rating: number; title?: string; } // Thêm id và title
interface ProductProps { chapters: Chapter[]; total_duration: string; instructor: Instructor; }

// 2. Định nghĩa kiểu cho Tab
type TabType = 'content' | 'instructor' | 'reviews';

export default function CourseTabs({ product }: { product: ProductProps }) {
  const [activeTab, setActiveTab] = useState<TabType>('content');
  const [user, setUser] = useState<User | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
  }, []);

  const totalChapters = product.chapters?.length || 0;
  const totalLessons = product.chapters?.reduce((acc, ch) => acc + (ch.lessons?.length || 0), 0) || 0;
  const tabs: TabType[] = ['content', 'instructor', 'reviews'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
            <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500'}`}
            >
                {tab === 'content' ? 'Nội dung khóa học' : tab === 'instructor' ? 'Giảng viên' : 'Đánh giá học viên'}
            </button>
        ))}
      </div>

      <div className="p-6">
        {/* TAB 1: NỘI DUNG */}
        {activeTab === 'content' && (
          <div>
             <div className="flex justify-between items-center mb-6 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                <span>📚 <strong>{totalChapters}</strong> chương • <strong>{totalLessons}</strong> bài học</span>
                <span className="hidden sm:inline">⏱️ Tổng thời lượng: <strong>{product.total_duration || 'Cập nhật'}</strong></span>
             </div>
             <div className="space-y-3">
                {product.chapters?.map((chapter, idx) => (
                    <details key={chapter.id} className="group border border-gray-200 rounded-xl overflow-hidden" open={idx === 0}>
                        <summary className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors list-none">
                            <div className="font-bold text-gray-800 flex items-center gap-2">
                                <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" /> {chapter.title}
                            </div>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">{chapter.lessons?.length || 0} bài</span>
                        </summary>
                        <div className="bg-white divide-y divide-gray-100">
                            {chapter.lessons?.map((lesson) => (
                                <div key={lesson.id} className="p-3 pl-11 flex justify-between items-center hover:bg-emerald-50 cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        {lesson.is_preview ? <PlayCircle className="w-4 h-4 text-orange-500" /> : <Lock className="w-4 h-4 text-gray-300" />}
                                        <span className={`text-sm ${lesson.is_preview ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{lesson.title}</span>
                                    </div>
                                    <span className="text-xs text-gray-400">{lesson.duration}</span>
                                </div>
                            ))}
                        </div>
                    </details>
                ))}
             </div>
          </div>
        )}

        {/* TAB 2: GIẢNG VIÊN (CẬP NHẬT LINK) */}
        {activeTab === 'instructor' && (
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="text-center">
                    <Link href={`/instructor/${product.instructor?.id}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.instructor?.avatar_url || 'https://via.placeholder.com/150'} alt="Instructor" className="w-24 h-24 rounded-full object-cover mx-auto mb-3 border-4 border-emerald-50 hover:scale-105 transition-transform cursor-pointer" />
                    </Link>
                    <div className="flex items-center justify-center gap-1 text-yellow-500 text-sm font-bold bg-yellow-50 py-1 px-3 rounded-full">
                        <span>{product.instructor?.rating || 5.0}</span> <Star className="w-4 h-4 fill-current" />
                    </div>
                </div>
                <div>
                    <Link href={`/instructor/${product.instructor?.id}`} className="hover:text-emerald-600 transition-colors">
                        <h3 className="text-xl font-bold text-gray-900">{product.instructor?.name || 'Đội ngũ SheetApp'}</h3>
                    </Link>
                    <p className="text-emerald-600 text-sm font-medium mb-4">{product.instructor?.title || 'Chuyên gia'}</p>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-xl border border-gray-100">
                        {product.instructor?.bio || 'Giảng viên có nhiều năm kinh nghiệm thực chiến...'}
                    </p>
                    <Link href={`/instructor/${product.instructor?.id}`} className="text-emerald-600 text-sm font-bold mt-2 inline-block hover:underline">
                        Xem hồ sơ đầy đủ &rarr;
                    </Link>
                </div>
            </div>
        )}

        {/* TAB 3: ĐÁNH GIÁ */}
        {activeTab === 'reviews' && (
            <div className="space-y-8">
                {/* Khu vực Gửi bình luận */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
                    {!user ? (
                        <>
                            <h4 className="font-bold text-gray-800 mb-2">Bạn có thắc mắc về khóa học?</h4>
                            <p className="text-sm text-gray-500 mb-4">Đăng nhập để gửi câu hỏi hoặc bình luận ngay.</p>
                            <button 
                                onClick={() => setIsReviewModalOpen(true)}
                                className="bg-red-600 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-red-700 transition-all flex items-center gap-2 mx-auto shadow-lg shadow-red-200"
                            >
                                <MessageSquare className="w-4 h-4" /> Gửi bình luận
                            </button>
                        </>
                    ) : (
                        <div className="text-left">
                            <div className="flex items-center gap-3 mb-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={user.user_metadata.avatar_url} className="w-8 h-8 rounded-full" alt="User" />
                                <span className="font-bold text-gray-900 text-sm">{user.user_metadata.full_name}</span>
                            </div>
                            <textarea 
                                placeholder="Viết đánh giá hoặc câu hỏi của bạn..." 
                                rows={3}
                                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                            ></textarea>
                            <div className="mt-2 text-right">
                                <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 ml-auto">
                                    <Send className="w-4 h-4" /> Gửi ngay
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Danh sách bình luận demo */}
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center font-bold text-blue-600">A</div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-sm">Nguyễn Văn A</span>
                                <span className="text-xs text-gray-400">2 ngày trước</span>
                            </div>
                            <div className="flex text-yellow-400 text-xs my-1"><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/></div>
                            <p className="text-gray-600 text-sm">Khóa học rất chi tiết, giảng viên hỗ trợ nhiệt tình.</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* MODAL BÌNH LUẬN */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsReviewModalOpen(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">Gửi bình luận</h3>
                <div className="space-y-3">
                    <input type="text" placeholder="Họ và tên *" className="w-full p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm" />
                    <input type="email" placeholder="Email *" className="w-full p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm" />
                    <textarea placeholder="Nội dung *" rows={3} className="w-full p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm"></textarea>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg border border-gray-200">
                        <div className="font-mono font-bold text-lg tracking-widest text-gray-500 line-through">8 A 3 k</div>
                        <input type="text" placeholder="Nhập mã..." className="w-20 p-1 text-sm border-b border-gray-300 bg-transparent focus:outline-none" />
                    </div>

                    <button onClick={() => { alert('Gửi thành công!'); setIsReviewModalOpen(false); }} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700">
                        Gửi đánh giá
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}