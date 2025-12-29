import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle2, Laptop, Wifi, UserCheck, Calendar, 
  Clock, FileText, MonitorPlay, Users, Share2, Copy, Mail, Send 
} from 'lucide-react';
import ProductActions from '@/components/ProductActions';
import CourseTabs from '@/components/CourseTabs';
import ProductImageSlider from '@/components/ProductImageSlider';

// 1. ĐỊNH NGHĨA INTERFACE
interface Lesson { id: number; title: string; duration: string; is_preview: boolean; sort_order: number; }
interface Chapter { id: number; title: string; lessons: Lesson[]; sort_order: number; }

interface Instructor { 
  id: number; 
  name: string; 
  bio: string; 
  avatar_url: string; 
  rating: number; 
  title: string; 
}

interface Product {
  id: number; name: string; slug: string; price: number; old_price: number | null;
  thumbnail_url: string; gallery: string[];
  description: string; content_html: string; total_duration: string;
  benefits: string[]; outcomes: string[]; requirements: string[];
  chapters: Chapter[];
  instructor: Instructor; 
  categories: { name: string; slug: string } | null;
}

interface RelatedPost { id: number; title: string; slug: string; thumbnail_url: string; created_at: string; }
interface RelatedCourse { id: number; name: string; slug: string; price: number; thumbnail_url: string; }

// 2. HÀM LẤY DỮ LIỆU
async function getProduct(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (name, slug),
      instructor:instructors(*),
      chapters:chapters(*, lessons(*))
    `)
    .eq('slug', slug)
    .single();

  if (error || !data) return null;

  if (data.chapters) {
    data.chapters.sort((a: Chapter, b: Chapter) => (a.sort_order || 0) - (b.sort_order || 0));
    data.chapters.forEach((ch: Chapter) => {
      if (ch.lessons) ch.lessons.sort((a: Lesson, b: Lesson) => (a.sort_order || 0) - (b.sort_order || 0));
    });
  }
  
  return data as unknown as Product;
}

async function getRelatedPosts(): Promise<RelatedPost[]> {
    const { data } = await supabase.from('posts').select('*').limit(3).order('created_at', { ascending: false });
    return (data as RelatedPost[]) || [];
}
async function getRelatedCourses(currentId: number): Promise<RelatedCourse[]> {
    const { data } = await supabase.from('products').select('*').neq('id', currentId).limit(3);
    return (data as RelatedCourse[]) || [];
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const relatedPosts = await getRelatedPosts();
  const relatedCourses = await getRelatedCourses(product.id);
  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const productImages = product.gallery && product.gallery.length > 0 ? product.gallery : [product.thumbnail_url];

  return (
    <main className="min-h-screen bg-gray-50 pb-20 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <Link href="/" className="hover:text-emerald-600">Trang chủ</Link><span>/</span>
            <Link href="/categories" className="hover:text-emerald-600">Khóa học</Link><span>/</span>
            <span className="text-gray-900 font-medium">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                
                {/* Mobile Hero */}
                <div className="lg:hidden bg-white p-4 rounded-2xl shadow-sm mb-4">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
                    <div className="text-red-600 font-bold text-2xl mb-4">{formatPrice(product.price)}</div>
                    <ProductActions product={product} />
                </div>

                {/* Slider */}
                <ProductImageSlider images={productImages} alt={product.name} />

                {/* Giới thiệu */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-l-4 border-emerald-500 pl-3">Giới thiệu khóa học</h3>
                    <div 
                        className="prose prose-emerald max-w-none text-gray-600 text-sm md:text-base leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: product.content_html || '<p>Đang cập nhật nội dung...</p>' }}
                    />
                </div>

                {/* TAB THÔNG TIN */}
                <CourseTabs product={product} />

                {/* Các section khác... */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-emerald-500 pl-3">Giá trị nhận được</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(product.benefits || ['Tư duy xây dựng hệ thống', 'Thành thạo công cụ', 'Tối ưu quy trình']).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700 text-sm">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-6 md:p-8 shadow-sm border border-emerald-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-emerald-500 pl-3">Kết quả đạt được</h3>
                    <div className="space-y-3">
                         {(product.outcomes || ['Tự tay thiết kế phần mềm', 'Xây dựng báo cáo tự động']).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-emerald-100">
                                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                <span className="text-gray-800 font-medium text-sm">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-orange-500 pl-3">Yêu cầu tham gia</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex items-start gap-3">
                            <Laptop className="w-8 h-8 text-orange-500 bg-orange-50 p-1.5 rounded-lg" />
                            <div><div className="font-bold text-sm text-gray-900">Thiết bị</div><div className="text-xs text-gray-500">Máy tính/Laptop ổn định</div></div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Wifi className="w-8 h-8 text-blue-500 bg-blue-50 p-1.5 rounded-lg" />
                            <div><div className="font-bold text-sm text-gray-900">Internet</div><div className="text-xs text-gray-500">Kết nối mạng tốc độ cao</div></div>
                        </div>
                        <div className="flex items-start gap-3">
                            <UserCheck className="w-8 h-8 text-purple-500 bg-purple-50 p-1.5 rounded-lg" />
                            <div><div className="font-bold text-sm text-gray-900">Tài khoản</div><div className="text-xs text-gray-500">Gmail, AppSheet, Supabase</div></div>
                        </div>
                    </div>
                </div>

                {/* Bài viết liên quan */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Bài viết liên quan</h3>
                    <div className="space-y-4">
                        {relatedPosts.map((post) => (
                            <Link href={`/news/${post.slug}`} key={post.id} className="flex gap-4 group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={post.thumbnail_url} alt={post.title} className="w-24 h-16 object-cover rounded-lg group-hover:opacity-80 transition-opacity" />
                                <div>
                                    <h4 className="font-medium text-gray-900 group-hover:text-emerald-600 line-clamp-2 transition-colors">{post.title}</h4>
                                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(post.created_at).toLocaleDateString('vi-VN')}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sidebar Phải */}
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden hidden lg:block">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-end gap-2 mb-4">
                            <span className="text-3xl font-bold text-red-600">{formatPrice(product.price)}</span>
                            {product.old_price && <span className="text-gray-400 line-through text-sm mb-1">{formatPrice(product.old_price)}</span>}
                        </div>
                        <ProductActions product={product} />
                    </div>
                    <div className="p-6 bg-gray-50/50 space-y-4 text-sm text-gray-600">
                        <div className="flex justify-between border-b border-dashed border-gray-200 pb-2"><span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> Thời lượng</span><span className="font-bold text-gray-900">{product.total_duration || 'Cập nhật'}</span></div>
                        <div className="flex justify-between border-b border-dashed border-gray-200 pb-2"><span className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> Số bài học</span><span className="font-bold text-gray-900">{product.chapters?.reduce((a, b) => a + (b.lessons?.length||0), 0)} bài</span></div>
                        <div className="flex justify-between border-b border-dashed border-gray-200 pb-2"><span className="flex items-center gap-2"><MonitorPlay className="w-4 h-4 text-gray-400" /> Hình thức</span><span className="font-bold text-gray-900">Online Video</span></div>
                        <div className="flex justify-between"><span className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /> Hỗ trợ</span><span className="font-bold text-gray-900">Zalo nhóm kín</span></div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-3 text-sm">Chia sẻ ngay</h3>
                    <div className="flex gap-4 justify-start">
                        <button className="text-blue-600 hover:scale-110 transition-transform"><Copy className="w-6 h-6" /></button>
                        <button className="text-blue-700 hover:scale-110 transition-transform"><svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M9.19795 21.5H13.198V13.4901H16.8021L17.198 9.50977H13.198V7.5C13.198 6.94772 13.6457 6.5 14.198 6.5H17.198V2.5H14.198C11.4365 2.5 9.19795 4.73858 9.19795 7.5V9.50977H7.19795L6.80206 13.4901H9.19795V21.5Z" /></svg></button>
                        <button className="text-sky-500 hover:scale-110 transition-transform"><Send className="w-6 h-6" /></button>
                        <button className="text-red-500 hover:scale-110 transition-transform"><Mail className="w-6 h-6" /></button>
                        <button className="hover:scale-110 transition-transform w-6 h-6 rounded-full overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Icon_of_Zalo.svg/120px-Icon_of_Zalo.svg.png" alt="Zalo" />
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Khóa học gợi ý</h3>
                    <div className="space-y-4">
                         {relatedCourses.map((course) => (
                             <Link href={`/product/${course.slug}`} key={course.id} className="block group">
                                <div className="h-28 rounded-lg overflow-hidden relative mb-2">
                                     {/* eslint-disable-next-line @next/next/no-img-element */}
                                     <img src={course.thumbnail_url} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                     <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">HOT</div>
                                </div>
                                <h4 className="font-bold text-gray-800 text-sm line-clamp-2 group-hover:text-emerald-600 transition-colors">{course.name}</h4>
                                <div className="text-red-600 font-bold text-sm mt-1">{formatPrice(course.price)}</div>
                             </Link>
                         ))}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}