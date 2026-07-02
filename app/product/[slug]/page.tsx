import { notFound } from 'next/navigation';
import Link from 'next/link';
import { query } from '@/lib/db';
import {
  CheckCircle2, Laptop, Wifi, UserCheck, Calendar, Clock, FileText, MonitorPlay, Users, Share2, Copy, Mail, Send, Smartphone, ShieldCheck, Rocket, Tag, Monitor
} from 'lucide-react';
import ProductActions from '@/components/ProductActions'; 
import CourseTabs from '@/components/CourseTabs';
import ProductImageSlider from '@/components/ProductImageSlider';

// Interfaces
interface Lesson { id: number; title: string; duration: string; is_preview: boolean; sort_order: number; }
interface Chapter { id: number; title: string; lessons: Lesson[]; sort_order: number; }
interface Instructor { id: number; name: string; bio: string; avatar_url: string; rating: number; title: string; }

// SỬA LỖI TẠI ĐÂY: Thêm eslint-disable cho dòng [key: string]: any
interface Product {
  id: number; name: string; slug: string; price: number; old_price: number | null;
  thumbnail_url: string; gallery: string[];
  description: string; content_html: string; total_duration: string;
  benefits: string[]; outcomes: string[]; requirements: string[];
  chapters: Chapter[];
  instructor: Instructor; 
  categories: { name: string; slug: string } | null;
  type: string;
  industry: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; 
}

interface RelatedPost { id: number; title: string; slug: string; thumbnail_url: string; created_at: string; }
interface RelatedProduct { id: number; name: string; slug: string; price: number; thumbnail_url: string; type: string; }

// Các hàm fetch
async function getProduct(slug: string): Promise<Product | null> {
  const productResult = await query(
    `SELECT p.*,
            CASE WHEN c.id IS NOT NULL THEN json_build_object('name', c.name, 'slug', c.slug) END AS categories,
            CASE WHEN i.id IS NOT NULL THEN row_to_json(i.*) END AS instructor
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN instructors i ON i.id = p.instructor_id
     WHERE p.slug = $1
     LIMIT 1`,
    [slug]
  );
  const product: any = productResult.rows[0];
  if (!product) return null;

  const chaptersResult = await query<Chapter>(
    'SELECT * FROM chapters WHERE product_id = $1 ORDER BY sort_order',
    [product.id]
  );
  const chapters = chaptersResult.rows;

  if (chapters.length > 0) {
    const chapterIds = chapters.map((ch) => ch.id);
    const lessonsResult = await query<Lesson & { chapter_id: number }>(
      'SELECT * FROM lessons WHERE chapter_id = ANY($1) ORDER BY sort_order',
      [chapterIds]
    );
    const lessonsByChapter = new Map<number, Lesson[]>();
    for (const lesson of lessonsResult.rows) {
      const list = lessonsByChapter.get(lesson.chapter_id) || [];
      list.push(lesson);
      lessonsByChapter.set(lesson.chapter_id, list);
    }
    for (const chapter of chapters) {
      (chapter as any).lessons = lessonsByChapter.get(chapter.id) || [];
    }
  }

  product.chapters = chapters;
  return product as unknown as Product;
}
async function getRelatedPosts(): Promise<RelatedPost[]> {
  const result = await query<RelatedPost>('SELECT * FROM posts ORDER BY created_at DESC LIMIT 3');
  return result.rows;
}
async function getRelatedProducts(currentId: number, currentType: string): Promise<RelatedProduct[]> {
  const targetType = currentType === 'course' ? 'service' : 'course';
  const result = await query<RelatedProduct>(
    'SELECT * FROM products WHERE type = $1 LIMIT 5',
    [targetType]
  );
  return result.rows;
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const relatedPosts = await getRelatedPosts();
  const relatedProducts = await getRelatedProducts(product.id, product.type);
  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  const productImages = product.gallery && product.gallery.length > 0 ? product.gallery : [product.thumbnail_url];

  const isService = product.type === 'service';
  const relatedTitle = isService ? 'Khóa học liên quan' : 'Dịch vụ nên dùng';
  const relatedLabel = isService ? 'KHÓA HỌC' : 'DỊCH VỤ';
  const relatedColor = isService ? 'bg-red-500' : 'bg-blue-500';

  return (
    <main className="min-h-screen bg-gray-50 pb-20 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <Link href="/" className="hover:text-emerald-600">Trang chủ</Link><span>/</span>
            <Link href={isService ? '/services' : '/categories'} className="hover:text-emerald-600">{isService ? 'Dịch vụ' : 'Khóa học'}</Link><span>/</span>
            <span className="text-gray-900 font-medium">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* --- CỘT TRÁI (CONTENT) --- */}
            <div className="lg:col-span-2 space-y-8">
                {/* Mobile Hero */}
                <div className="lg:hidden bg-white p-4 rounded-2xl shadow-sm mb-4">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
                    <div className="text-red-600 font-bold text-2xl mb-4">{formatPrice(product.price)}</div>
                    <ProductActions product={product} />
                </div>

                <ProductImageSlider images={productImages} alt={product.name} />

                {/* Giới thiệu ngắn */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-l-4 border-emerald-500 pl-3">
                        {isService ? 'Tổng quan giải pháp' : 'Giới thiệu khóa học'}
                    </h3>
                    <p className="text-gray-600 text-sm md:text-base leading-relaxed">{product.description}</p>
                </div>

                {/* TABS */}
                <CourseTabs product={product} />

                {/* Benefits */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-emerald-500 pl-3">
                        {isService ? 'Lợi ích mang lại' : 'Giá trị nhận được'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(product.benefits || ['Tối ưu quy trình vận hành', 'Tiết kiệm chi phí nhân sự', 'Báo cáo realtime mọi lúc']).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700 text-sm">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Yêu cầu hệ thống */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                     <h3 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-orange-500 pl-3">
                        {isService ? 'Yêu cầu hệ thống' : 'Yêu cầu tham gia'}
                     </h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                         <div className="flex items-start gap-3">
                             {isService ? 
                                <Monitor className="w-8 h-8 text-orange-500 bg-orange-50 p-1.5 rounded-lg" /> : 
                                <Laptop className="w-8 h-8 text-orange-500 bg-orange-50 p-1.5 rounded-lg" />
                             }
                             <div>
                                <div className="font-bold text-sm text-gray-900">{isService ? 'Nền tảng' : 'Thiết bị'}</div>
                                <div className="text-xs text-gray-500">{isService ? 'Web Browser, Mobile App' : 'Máy tính/Laptop ổn định'}</div>
                             </div>
                         </div>
                         <div className="flex items-start gap-3">
                             <Wifi className="w-8 h-8 text-blue-500 bg-blue-50 p-1.5 rounded-lg" />
                             <div>
                                <div className="font-bold text-sm text-gray-900">Internet</div>
                                <div className="text-xs text-gray-500">Kết nối mạng tốc độ cao</div>
                             </div>
                         </div>
                         <div className="flex items-start gap-3">
                             <UserCheck className="w-8 h-8 text-purple-500 bg-purple-50 p-1.5 rounded-lg" />
                             <div>
                                <div className="font-bold text-sm text-gray-900">Tài khoản</div>
                                <div className="text-xs text-gray-500">{isService ? 'Google / Zalo ID' : 'Gmail, AppSheet, Supabase'}</div>
                             </div>
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

            {/* --- CỘT PHẢI (SIDEBAR) --- */}
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
                        {isService ? (
                            <>
                                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2"><span className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-gray-400" /> Nền tảng</span><span className="font-bold text-gray-900">{product.categories?.name || 'Đa nền tảng'}</span></div>
                                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2"><span className="flex items-center gap-2"><Tag className="w-4 h-4 text-gray-400" /> Ngành</span><span className="font-bold text-gray-900">{product.industry || 'Đa ngành'}</span></div>
                                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2"><span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gray-400" /> Bảo hành</span><span className="font-bold text-emerald-600">Trọn đời</span></div>
                                <div className="flex justify-between"><span className="flex items-center gap-2"><Rocket className="w-4 h-4 text-gray-400" /> Triển khai</span><span className="font-bold text-gray-900">3 - 7 ngày</span></div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2"><span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> Thời lượng</span><span className="font-bold text-gray-900">{product.total_duration || 'Cập nhật'}</span></div>
                                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2"><span className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> Số bài học</span><span className="font-bold text-gray-900">{product.chapters?.reduce((a, b) => a + (b.lessons?.length||0), 0)} bài</span></div>
                                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2"><span className="flex items-center gap-2"><MonitorPlay className="w-4 h-4 text-gray-400" /> Hình thức</span><span className="font-bold text-gray-900">Online Video</span></div>
                                <div className="flex justify-between"><span className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /> Hỗ trợ</span><span className="font-bold text-gray-900">Zalo nhóm kín</span></div>
                            </>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-3 text-sm">Chia sẻ ngay</h3>
                    <div className="flex gap-4 justify-start">
                        <button className="text-blue-600 hover:scale-110 transition-transform"><Copy className="w-6 h-6" /></button>
                        <button className="text-blue-700 hover:scale-110 transition-transform"><Share2 className="w-6 h-6" /></button>
                        <button className="text-sky-500 hover:scale-110 transition-transform"><Send className="w-6 h-6" /></button>
                        <button className="text-red-500 hover:scale-110 transition-transform"><Mail className="w-6 h-6" /></button>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider border-l-4 border-emerald-500 pl-2">
                        {relatedTitle}
                    </h3>
                    <div className="space-y-4">
                         {relatedProducts.map((p) => (
                             <Link href={`/product/${p.slug}`} key={p.id} className="block group">
                                <div className="h-28 rounded-lg overflow-hidden relative mb-2">
                                     {/* eslint-disable-next-line @next/next/no-img-element */}
                                     <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                     <div className={`absolute top-2 right-2 ${relatedColor} text-white text-[10px] font-bold px-1.5 py-0.5 rounded`}>{relatedLabel}</div>
                                </div>
                                <h4 className="font-bold text-gray-800 text-sm line-clamp-2 group-hover:text-emerald-600 transition-colors">{p.name}</h4>
                                <div className="text-red-600 font-bold text-sm mt-1">{formatPrice(p.price)}</div>
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