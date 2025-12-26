import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, Star, ArrowRight, Calendar, Eye } from 'lucide-react';
import HeroSlider from '@/components/HeroSlider';

// Định nghĩa Interface
interface Product {
  id: number; name: string; slug: string; price: number; thumbnail_url: string | null; category: string | null; type: string | null; is_featured: boolean | null; created_at: string;
}
interface Partner { id: number; name: string; logo_url: string; is_active: boolean; sort_order: number; }
interface Review { id: number; customer_name: string; customer_role: string; content: string; avatar_url: string | null; is_active: boolean; sort_order: number; }
// Thêm Interface Tin tức
interface Post { id: number; title: string; slug: string; excerpt: string; thumbnail_url: string; views: number; created_at: string; }

async function getHomePageData() {
  const { data: products } = await supabase.from('products').select('*').eq('is_featured', true).order('created_at', { ascending: false });
  const { data: partners } = await supabase.from('partners').select('*').eq('is_active', true).order('sort_order', { ascending: true });
  const { data: reviews } = await supabase.from('testimonials').select('*').eq('is_active', true).order('sort_order', { ascending: true });
  // Lấy tin tức
  const { data: posts } = await supabase.from('posts').select('*').limit(3).order('created_at', { ascending: false });

  return { 
    products: (products as unknown as Product[]) || [], 
    partners: (partners as unknown as Partner[]) || [], 
    reviews: (reviews as unknown as Review[]) || [],
    posts: (posts as unknown as Post[]) || []
  };
}

// Component Sản phẩm (Giữ nguyên)
const CategorySection = ({ title, items, link }: { title: string, items: Product[], link: string }) => {
  if (!items || items.length === 0) return null;
  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-6 px-4 md:px-0">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-emerald-500 pl-3">{title}</h2>
        <Link href={link} className="text-sm text-emerald-600 font-medium hover:underline flex items-center gap-1">Xem tất cả <ArrowRight className="w-4 h-4" /></Link>
      </div>
      <div className="flex overflow-x-auto gap-4 pb-4 px-4 md:px-0 scrollbar-hide snap-x">
        {items.map((product) => (
          <Link href={`/product/${product.slug}`} key={product.id} className="flex-shrink-0 w-48 md:w-64 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden snap-start group hover:shadow-md transition-all">
            <div className="relative h-48 md:h-56 bg-gray-100">
               {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.thumbnail_url || 'https://via.placeholder.com/300'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              {product.type === 'course' && <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded">KHÓA HỌC</div>}
            </div>
            <div className="p-3">
              <h3 className="font-medium text-gray-900 line-clamp-2 text-sm md:text-base min-h-[40px] mb-2">{product.name}</h3>
              <div className="flex items-center justify-between">
                <div className="font-bold text-emerald-600 text-sm md:text-lg">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}</div>
                <button className="bg-gray-100 text-gray-600 p-1.5 rounded-full hover:bg-emerald-600 hover:text-white transition-colors"><Plus size={16} /></button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default async function HomePage() {
  const { products, partners, reviews, posts } = await getHomePageData();
  const categories = Array.from(new Set(products.map(p => p.category || 'Khác')));

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <div className="mb-12"><HeroSlider /></div>

      <div className="max-w-7xl mx-auto md:px-8">
        {categories.map((cat) => (
            <CategorySection key={cat} title={cat} items={products.filter(p => p.category === cat)} link={`/category/${cat}`} />
        ))}

        {/* --- TIN TỨC (MỚI) --- */}
        {posts.length > 0 && (
          <section className="mb-12 px-4 md:px-0">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-emerald-500 pl-3">Kiến thức mới</h2>
                <Link href="/news" className="text-sm text-emerald-600 font-medium hover:underline flex items-center gap-1">Xem blog <ArrowRight className="w-4 h-4" /></Link>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {posts.map(post => (
                   <Link href={`/news/${post.slug}`} key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all">
                      <div className="h-48 overflow-hidden">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img src={post.thumbnail_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="p-4">
                         <h3 className="font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-emerald-600 transition-colors">{post.title}</h3>
                         <p className="text-sm text-gray-500 line-clamp-2 mb-3">{post.excerpt}</p>
                         <div className="flex items-center text-xs text-gray-400 gap-4">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views}</span>
                         </div>
                      </div>
                   </Link>
                ))}
             </div>
          </section>
        )}

        {/* --- ĐỐI TÁC --- */}
        {partners.length > 0 && (
            <section className="py-8 border-t border-gray-200 mt-8">
                <h2 className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Đối tác tin cậy</h2>
                <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                    {partners.map(p => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={p.id} src={p.logo_url} alt={p.name} className="h-8 md:h-10 object-contain" />
                    ))}
                </div>
            </section>
        )}

        {/* --- REVIEW (ĐÃ SỬA THÀNH TRƯỢT NGANG TRÊN MOBILE) --- */}
        {reviews.length > 0 && (
            <section className="py-12 bg-emerald-50/50 -mx-4 md:mx-0 px-4 md:px-8 md:rounded-3xl">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">Khách hàng nói gì?</h2>
                
                {/* Thay đổi class ở đây: flex overflow-x-auto snap-x */}
                <div className="flex md:grid md:grid-cols-3 overflow-x-auto snap-x gap-4 md:gap-6 pb-4 scrollbar-hide">
                    {reviews.map(review => (
                        <div key={review.id} className="min-w-[85%] md:min-w-0 snap-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                            <div className="flex gap-1 text-yellow-400 mb-4">
                                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                            </div>
                            <p className="text-gray-600 mb-6 italic flex-1">&quot;{review.content}&quot;</p>
                            <div className="flex items-center gap-3 mt-auto">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={review.avatar_url || 'https://via.placeholder.com/50'} alt={review.customer_name} className="w-10 h-10 rounded-full" />
                                <div>
                                    <div className="font-bold text-gray-900 text-sm">{review.customer_name}</div>
                                    <div className="text-xs text-emerald-600 font-medium">{review.customer_role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        )}
      </div>
    </main>
  );
}