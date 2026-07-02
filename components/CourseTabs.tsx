'use client';

import { useState, useEffect } from 'react';
import { PlayCircle, Lock, ChevronDown, Star, MessageSquare, Send, UserCheck, BookOpen, Book, Settings, Layers, ShieldCheck, Zap } from 'lucide-react';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Lesson { id: number; title: string; duration: string; is_preview: boolean; }
interface Chapter { id: number; title: string; lessons: Lesson[]; }
interface Instructor { id: number; name: string; bio: string; avatar_url: string; rating: number; title: string; }
interface ProductProps { 
    id: number;
    slug?: string; 
    type: string; 
    content_html?: string; 
    chapters: Chapter[]; 
    total_duration: string; 
    instructor: Instructor; 
}

type TabType = 'content' | 'instructor' | 'reviews' | 'process';

export default function CourseTabs({ product }: { product: ProductProps }) {
  const [activeTab, setActiveTab] = useState<TabType>('content');
  const { user: authUser } = useCurrentUser();
  const user = authUser
    ? { email: authUser.email, user_metadata: { avatar_url: authUser.avatar_url, full_name: authUser.name } }
    : null;
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [openChapterIds, setOpenChapterIds] = useState<number[]>(
    product.chapters?.length > 0 ? [product.chapters[0].id] : []
  );

  const router = useRouter();
  const isService = product.type === 'service';

  const toggleChapter = (id: number) => {
    setOpenChapterIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleLessonClick = (lesson: Lesson) => {
    if (lesson.is_preview) { alert("Đang mở video học thử: " + lesson.title); return; }
    if (!user) {
        if (confirm("Vui lòng đăng nhập để sử dụng chức năng này.")) router.push('/login');
        return;
    }
    router.push(`/learn/${product.slug}/lesson/${lesson.id}`);
  };

  // CẤU HÌNH TABS (Đã bỏ 'specs', Thêm 'reviews' cho Service)
  const tabs = isService 
    ? [
        { id: 'content', label: 'Tính năng chi tiết', icon: Zap },
        { id: 'process', label: 'Quy trình triển khai', icon: Layers },
        { id: 'instructor', label: 'Chuyên gia phụ trách', icon: UserCheck },
        { id: 'reviews', label: 'Đánh giá khách hàng', icon: Star }, // Đã thêm
      ]
    : [
        { id: 'content', label: 'Nội dung khóa học', icon: BookOpen },
        { id: 'instructor', label: 'Giảng viên', icon: UserCheck },
        { id: 'reviews', label: 'Đánh giá học viên', icon: Star },
      ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
            <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as TabType)} 
                className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
                {tab.icon && <tab.icon className="w-4 h-4" />}
                {tab.label}
            </button>
        ))}
      </div>

      <div className="p-6">
        
        {/* --- NỘI DUNG CHÍNH (CONTENT) --- */}
        {activeTab === 'content' && (
          <div>
             {isService ? (
                 <div className="prose prose-emerald max-w-none text-gray-600 text-sm md:text-base leading-relaxed">
                    {product.content_html ? (
                        <div dangerouslySetInnerHTML={{ __html: product.content_html }} />
                    ) : (
                        <div className="space-y-4">
                            <p><strong>🔥 Các tính năng nổi bật:</strong></p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Quản lý dữ liệu tập trung, bảo mật cao.</li>
                                <li>Giao diện thân thiện, tối ưu trải nghiệm người dùng (UI/UX).</li>
                                <li>Tích hợp báo cáo động (Dashboard) realtime.</li>
                                <li>Phân quyền chi tiết theo chức vụ (Admin, Manager, Staff).</li>
                                <li>Tự động hóa quy trình (Workflow Automation).</li>
                            </ul>
                            <p className="italic text-gray-400 mt-4">(Nội dung chi tiết đang được cập nhật...)</p>
                        </div>
                    )}
                 </div>
             ) : (
                 <>
                    <div className="flex justify-between items-center mb-6 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="flex items-center gap-2">📚 <strong>{product.chapters?.length || 0}</strong> chương • <strong>{product.chapters?.reduce((acc, ch) => acc + (ch.lessons?.length || 0), 0) || 0}</strong> bài học</span>
                        <span className="hidden sm:flex items-center gap-1">⏱️ Tổng thời lượng: <strong>{product.total_duration || 'Cập nhật'}</strong></span>
                    </div>
                    <div className="space-y-3">
                        {product.chapters?.length > 0 ? product.chapters.map((chapter) => {
                            const isOpen = openChapterIds.includes(chapter.id);
                            return (
                                <div key={chapter.id} className="border border-gray-200 rounded-xl overflow-hidden transition-all duration-300">
                                    <div onClick={() => toggleChapter(chapter.id)} className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors select-none ${isOpen ? 'bg-emerald-50/50' : 'bg-white'}`}>
                                        <div className="font-bold text-gray-800 flex items-center gap-3 text-sm md:text-base">
                                            {isOpen ? <BookOpen className="w-5 h-5 text-emerald-600" /> : <Book className="w-5 h-5 text-emerald-600" />}
                                            {chapter.title}
                                        </div>
                                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 min-w-[60px] text-center">{chapter.lessons?.length || 0} bài</span>
                                    </div>
                                    {isOpen && (
                                        <div className="bg-white divide-y divide-gray-100 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                            {chapter.lessons?.map((lesson) => (
                                                <div key={lesson.id} onClick={() => handleLessonClick(lesson)} className="p-3 pl-12 flex justify-between items-center hover:bg-emerald-50 cursor-pointer group/lesson transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <PlayCircle className={`w-4 h-4 ${lesson.is_preview ? 'text-orange-500 fill-orange-100' : 'text-emerald-600 fill-emerald-50'}`} />
                                                        <span className={`text-sm ${lesson.is_preview ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover/lesson:text-emerald-700'}`}>{lesson.title}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-400 font-mono">{lesson.duration}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }) : <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300"><p className="text-gray-500 italic">Nội dung bài học đang được cập nhật...</p></div>}
                    </div>
                 </>
             )}
          </div>
        )}

        {/* --- TAB: QUY TRÌNH TRIỂN KHAI --- */}
        {activeTab === 'process' && isService && (
            <div className="relative border-l-2 border-emerald-100 ml-3 space-y-8 py-2">
                {[
                    { step: 1, title: "Tiếp nhận & Khảo sát", desc: "Lắng nghe nhu cầu, khảo sát quy trình vận hành thực tế của doanh nghiệp." },
                    { step: 2, title: "Tư vấn & Báo giá", desc: "Đề xuất giải pháp tối ưu chi phí, lên kế hoạch triển khai chi tiết." },
                    { step: 3, title: "Ký hợp đồng & Triển khai", desc: "Thực hiện cài đặt, cấu hình hệ thống theo yêu cầu đã chốt." },
                    { step: 4, title: "Đào tạo & Bàn giao", desc: "Hướng dẫn nhân sự sử dụng, bàn giao tài liệu và tài khoản quản trị." },
                    { step: 5, title: "Bảo hành & Hỗ trợ", desc: "Hỗ trợ kỹ thuật 24/7, bảo hành vĩnh viễn lỗi hệ thống." }
                ].map((item) => (
                    <div key={item.step} className="relative pl-8">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 bg-emerald-600 rounded-full border-4 border-white shadow-sm"></div>
                        <h4 className="font-bold text-gray-900 text-sm uppercase mb-1">Bước {item.step}: {item.title}</h4>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                ))}
            </div>
        )}

        {/* --- TAB: GIẢNG VIÊN / CHUYÊN GIA --- */}
        {activeTab === 'instructor' && (
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="text-center flex-shrink-0 w-full md:w-auto">
                    {/* ... (Giữ nguyên phần instructor) ... */}
                     <Link href={`/instructor/${product.instructor?.id || '#'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.instructor?.avatar_url || 'https://via.placeholder.com/150'} alt="Instructor" className="w-32 h-32 rounded-full object-cover mx-auto mb-4 border-4 border-white shadow-lg" />
                    </Link>
                    <div className="flex items-center justify-center gap-1 text-yellow-500 text-sm font-bold bg-yellow-50 py-1.5 px-4 rounded-full inline-block">
                        <span>{product.instructor?.rating || 5.0}</span> <Star className="w-4 h-4 fill-current inline-block -mt-1" />
                    </div>
                </div>
                <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{product.instructor?.name || 'Đội ngũ SheetApp'}</h3>
                    <p className="text-emerald-600 font-medium mb-4">{product.instructor?.title || (isService ? 'Chuyên gia tư vấn giải pháp' : 'Giảng viên')}</p>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line bg-gray-50 p-5 rounded-xl border border-gray-100 mb-6 relative">
                        <span className="absolute top-4 left-4 text-4xl text-gray-200 font-serif leading-none">“</span>
                        <span className="relative z-10">{product.instructor?.bio || 'Nhiều năm kinh nghiệm thực chiến...'}</span>
                    </p>
                </div>
            </div>
        )}

        {/* --- TAB: REVIEW (Hiện cho cả Dịch vụ & Khóa học) --- */}
        {activeTab === 'reviews' && (
            <div className="space-y-8">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
                    {!user ? (
                        <>
                            <h4 className="font-bold text-gray-800 mb-2">Bạn có thắc mắc?</h4>
                            <p className="text-sm text-gray-500 mb-4">Đăng nhập để gửi câu hỏi hoặc bình luận ngay.</p>
                            <button onClick={() => setIsReviewModalOpen(true)} className="bg-red-600 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-red-700 transition-all flex items-center gap-2 mx-auto shadow-lg shadow-red-200"><MessageSquare className="w-4 h-4" /> Gửi bình luận</button>
                        </>
                    ) : (
                        <div className="text-left">
                            <div className="flex items-center gap-3 mb-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={user.user_metadata.avatar_url} className="w-8 h-8 rounded-full" alt="User" />
                                <span className="font-bold text-gray-900 text-sm">{user.user_metadata.full_name}</span>
                            </div>
                            <textarea placeholder="Viết đánh giá..." rows={3} className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 text-sm"></textarea>
                            <div className="mt-2 text-right">
                                <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 ml-auto"><Send className="w-4 h-4" /> Gửi ngay</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Modal Comment */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsReviewModalOpen(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">Gửi bình luận</h3>
                <input type="text" placeholder="Họ tên" className="w-full mb-3 p-3 border rounded-lg text-sm" />
                <textarea placeholder="Nội dung" rows={3} className="w-full mb-3 p-3 border rounded-lg text-sm"></textarea>
                <button onClick={() => {alert("Gửi thành công"); setIsReviewModalOpen(false)}} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold">Gửi ngay</button>
                <button onClick={() => setIsReviewModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
            </div>
        </div>
      )}
    </div>
  );
}