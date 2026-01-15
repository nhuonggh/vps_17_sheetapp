import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { Calendar, Eye, Facebook, Link as LinkIcon, MessageCircle, ArrowLeft, ArrowRight, Share2, List, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import TableOfContents from '@/components/TableOfContents';

// --- INTERFACES ---
interface Post {
  id: number; title: string; slug: string; excerpt: string; thumbnail_url: string; views: number; created_at: string; content_html: string; video_url: string | null; category_id: number;
}
interface Category { id: number; name: string; slug: string; }

// --- SERVER FUNCTIONS ---
async function getPost(slug: string) {
  const { data: post } = await supabase.from('posts').select('*').eq('slug', slug).single();
  return post as Post;
}

async function getRelatedPosts(categoryId: number, currentPostId: number) {
  const { data } = await supabase.from('posts')
    .select('id, title, slug, thumbnail_url, created_at')
    .eq('category_id', categoryId)
    .neq('id', currentPostId)
    .limit(4);
  return data as Partial<Post>[] || [];
}

async function getCategory(id: number) {
    if (!id) return null;
    const { data } = await supabase.from('post_categories').select('*').eq('id', id).single();
    return data as Category;
}

async function getAdjacentPosts(createdAt: string) {
    const { data: prev } = await supabase.from('posts').select('title, slug').lt('created_at', createdAt).order('created_at', { ascending: false }).limit(1).single();
    const { data: next } = await supabase.from('posts').select('title, slug').gt('created_at', createdAt).order('created_at', { ascending: true }).limit(1).single();
    return { prev, next };
}

// --- MAIN PAGE COMPONENT ---
export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const post = await getPost(slug);
  if (!post) notFound();

  const [relatedPosts, category, adjacentPosts] = await Promise.all([
    getRelatedPosts(post.category_id, post.id),
    post.category_id ? getCategory(post.category_id) : null,
    getAdjacentPosts(post.created_at)
  ]);

  const { prev, next } = adjacentPosts;

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      
      {/* 1. HERO SECTION */}
      <div className="relative h-[300px] md:h-[400px] w-full">
         {/* eslint-disable-next-line @next/next/no-img-element */}
         <img src={post.thumbnail_url} alt={post.title} className="w-full h-full object-cover" />
         <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
         <div className="absolute bottom-0 left-0 w-full p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {category && (
                    <span className="inline-block bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                        {category.name}
                    </span>
                )}
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight shadow-sm">
                    {post.title}
                </h1>
                <div className="flex items-center gap-6 text-gray-300 text-sm font-medium">
                    <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-400"/> {new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
                    <span className="flex items-center gap-2"><Eye className="w-4 h-4 text-emerald-400"/> {post.views} lượt xem</span>
                </div>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* --- LEFT SIDEBAR (Desktop: Share Buttons) --- */}
            <div className="hidden lg:block lg:col-span-1">
                <div className="sticky top-24 flex flex-col gap-4 items-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest rotate-180 py-4" style={{writingMode: 'vertical-rl'}}>Chia sẻ</p>
                    <button className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md"><Facebook className="w-5 h-5"/></button>
                    <button className="w-10 h-10 rounded-full bg-blue-400 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md"><MessageCircle className="w-5 h-5"/></button>
                    <button className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-md"><LinkIcon className="w-5 h-5"/></button>
                </div>
            </div>

            {/* --- CENTER CONTENT --- */}
            <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-10">
                
                {/* [MOBILE ONLY] Nút chia sẻ */}
                <div className="flex items-center justify-between lg:hidden mb-6 border-b border-gray-100 pb-4">
                    <span className="text-sm font-bold text-gray-500 flex items-center gap-2"><Share2 className="w-4 h-4"/> Chia sẻ:</span>
                    <div className="flex gap-3">
                        <button className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"><Facebook className="w-4 h-4"/></button>
                        <button className="w-8 h-8 rounded-full bg-blue-400 text-white flex items-center justify-center"><MessageCircle className="w-4 h-4"/></button>
                        <button className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"><LinkIcon className="w-4 h-4"/></button>
                    </div>
                </div>

                {/* [MOBILE ONLY] Mục lục bài viết (Đưa lên đầu) */}
                <div className="block lg:hidden mb-8 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                    <details className="group" open>
                        <summary className="flex items-center justify-between p-4 font-bold text-gray-900 cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors list-none">
                            <span className="flex items-center gap-2"><List className="w-5 h-5 text-emerald-600"/> Mục lục nội dung</span>
                            <span className="transition-transform group-open:rotate-180">
                                <ChevronDown className="w-5 h-5 text-gray-500"/>
                            </span>
                        </summary>
                        <div className="p-4 bg-white">
                            <TableOfContents />
                        </div>
                    </details>
                </div>

                {/* Sapo */}
                <div className="font-serif text-lg md:text-xl text-gray-600 italic border-l-4 border-emerald-500 pl-5 mb-8 leading-relaxed">
                    {post.excerpt}
                </div>

                {/* Video Embed */}
                {post.video_url && (
                    <div className="aspect-video w-full rounded-xl overflow-hidden mb-8 shadow-lg">
                        <iframe src={post.video_url} title={post.title} className="w-full h-full" allowFullScreen></iframe>
                    </div>
                )}

                {/* Main Content */}
                <article className="prose prose-emerald prose-lg max-w-none article-content">
                    {post.content_html ? <div dangerouslySetInnerHTML={{ __html: post.content_html }} /> : <p className="text-gray-500">Nội dung đang được cập nhật...</p>}
                </article>

                {/* Tags */}
                <div className="mt-10 pt-6 border-t border-gray-100 flex flex-wrap gap-2">
                    <span className="text-sm font-bold text-gray-500 mr-2">Tags:</span>
                    {['AI', 'Công nghệ', 'Hot Trend'].map(tag => (
                        <span key={tag} className="bg-gray-100 text-gray-600 px-3 py-1 rounded text-xs font-medium hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer transition-colors">#{tag}</span>
                    ))}
                </div>

                {/* --- NAVIGATION: BÀI TRƯỚC / SAU (Đặt dưới cùng nội dung) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-gray-100">
                    {prev ? (
                        <Link href={`/news/${prev.slug}`} className="group flex flex-col items-start p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all">
                            <span className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mb-2 group-hover:text-emerald-600"><ArrowLeft className="w-3 h-3"/> Bài trước</span>
                            <span className="font-bold text-gray-800 line-clamp-2 group-hover:text-emerald-700">{prev.title}</span>
                        </Link>
                    ) : <div></div>}
                    {next ? (
                        <Link href={`/news/${next.slug}`} className="group flex flex-col items-end text-right p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all">
                            <span className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mb-2 group-hover:text-emerald-600">Bài tiếp theo <ArrowRight className="w-3 h-3"/></span>
                            <span className="font-bold text-gray-800 line-clamp-2 group-hover:text-emerald-700">{next.title}</span>
                        </Link>
                    ) : <div></div>}
                </div>

                {/* --- COMMENT SECTION (Thêm mới) --- */}
                <div className="mt-12 bg-gray-50 rounded-xl p-6 border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-lg">
                        <MessageCircle className="w-5 h-5 text-emerald-600"/> Bình luận
                    </h3>
                    
                    {/* Form bình luận */}
                    <div className="flex gap-4 mb-8">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex-shrink-0 flex items-center justify-center text-emerald-700 font-bold">You</div>
                        <div className="flex-1">
                            <textarea 
                                className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm bg-white min-h-[100px]"
                                placeholder="Chia sẻ ý kiến của bạn về bài viết này..."
                            ></textarea>
                            <div className="flex justify-end mt-3">
                                <button className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm">
                                    Gửi bình luận
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Danh sách bình luận demo */}
                    <div className="space-y-6">
                        <p className="text-center text-gray-400 text-sm italic py-4">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                    </div>
                </div>
            </div>

            {/* --- RIGHT SIDEBAR --- */}
            <div className="lg:col-span-3 space-y-8">
                
                {/* Desktop TOC (Ẩn trên mobile vì đã có ở trên) */}
                <div className="hidden lg:block">
                    <TableOfContents />
                </div>
                
                {relatedPosts.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <h4 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Bài viết liên quan</h4>
                        <div className="space-y-4">
                            {relatedPosts.map(rel => (
                                <Link href={`/news/${rel.slug}`} key={rel.id} className="flex gap-3 group">
                                    <div className="w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden relative border border-gray-100">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={rel.thumbnail_url} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-emerald-600 transition-colors">{rel.title}</h5>
                                        <span className="text-[10px] text-gray-400">{rel.created_at ? new Date(rel.created_at).toLocaleDateString('vi-VN') : ''}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-6 text-white text-center shadow-lg">
                    <h4 className="font-bold text-lg mb-2">Cần giải pháp AI?</h4>
                    <p className="text-emerald-100 text-sm mb-4">Tư vấn xây dựng hệ thống tự động hóa cho doanh nghiệp.</p>
                    <button className="bg-white text-emerald-700 w-full py-2 rounded-lg font-bold text-sm hover:bg-emerald-50 transition-colors">Liên hệ ngay</button>
                </div>
            </div>

        </div>
      </div>
    </main>
  );
}