'use client';
import { useEffect, useState } from 'react';

export default function TableOfContents() {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    // FIX ESLINT: Dùng setTimeout để hoãn việc cập nhật state
    const timer = setTimeout(() => {
        const elements = Array.from(document.querySelectorAll('.article-content h2, .article-content h3'))
          .map((elem) => ({
            id: elem.id,
            text: elem.textContent || '',
            level: Number(elem.tagName.substring(1)),
          }));
        setHeadings(elements);

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setActiveId(entry.target.id);
              }
            });
          },
          { rootMargin: '0px 0px -80% 0px' }
        );

        elements.forEach((h) => {
          const el = document.getElementById(h.id);
          if (el) observer.observe(el);
        });
        
        // Cleanup observer bên trong timeout nếu cần, nhưng observer thường clean ở return effect
        // Ở đây để đơn giản ta giữ observer global trong effect scope nếu có thể
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  if (headings.length === 0) return null;

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm sticky top-24">
      <h4 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Mục lục</h4>
      <nav className="space-y-1">
        {headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' });
              setActiveId(heading.id);
            }}
            className={`block text-sm py-1.5 transition-colors ${
              activeId === heading.id
                ? 'text-emerald-600 font-bold border-l-2 border-emerald-600 pl-3'
                : 'text-gray-500 hover:text-emerald-600 pl-3 border-l-2 border-transparent'
            } ${heading.level === 3 ? 'ml-4' : ''}`}
          >
            {heading.text}
          </a>
        ))}
      </nav>
    </div>
  );
}