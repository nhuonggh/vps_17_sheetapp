'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Calendar, Eye, ArrowRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface Post {
  id: number; 
  title: string; 
  slug: string; 
  excerpt: string; 
  thumbnail_url: string; 
  views: number; 
  created_at: string;
}

function NewsList() {
  // FIX: Thay <any[]> bằng <Post[]>
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  
  const searchParams = useSearchParams();
  const query = searchParams.get('q');

  useEffect(() => {
    const fetchPosts = async () => {
      const request = supabase.from('posts').select('*').order('created_at', { ascending: false });
      
      const { data } = await request;
      
      if (data) {
        // Ép kiểu dữ liệu trả về từ Supabase thành Post[]
        let filteredData = data as Post[];
        
        if (query) {
            const lowerQ = query.toLowerCase();
            filteredData = filteredData.filter(p => p.title.toLowerCase().includes(lowerQ));
        }
        setPosts(filteredData);
      }
      setLoading(false);
    };
    fetchPosts();
  }, [query]);

  if (loading) {
      return <div className="grid grid-cols-1 md:grid-cols-3 gap-8">{[1,2,3].map(i => <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>)}</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {posts.length > 0 ? posts.map(post => (
        <Link href={`/news/${post.slug}`} key={post.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
            <div className="h-56 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.thumbnail_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2">{post.title}</h2>
                <p className="text-gray-500 text-sm line-clamp-3 mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-4">
                    <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3"/> {post.views}</span>
                    </div>
                    <span className="flex items-center gap-1 text-emerald-600 font-medium group-hover:underline">Đọc tiếp <ArrowRight className="w-3 h-3"/></span>
                </div>
            </div>
        </Link>
        )) : (
        <div className="col-span-3 text-center py-10 text-gray-500">
            Không tìm thấy bài viết nào phù hợp.
        </div>
        )}
    </div>
  );
}

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 pt-28 md:pt-12"> 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 border-l-4 border-emerald-500 pl-4">
            Kiến thức & Tin tức
        </h1>
        <Suspense fallback={<div>Đang tải...</div>}>
            <NewsList />
        </Suspense>
      </div>
    </main>
  );
}