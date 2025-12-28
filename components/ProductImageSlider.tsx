'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface SliderProps {
  images: string[];
  alt: string;
}

export default function ProductImageSlider({ images, alt }: SliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Nếu không có ảnh hoặc mảng rỗng, hiện placeholder
  if (!images || images.length === 0) {
    return (
      <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
        <ImageIcon className="w-12 h-12" />
      </div>
    );
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <div className="space-y-4">
      {/* Ảnh chính */}
      <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-lg group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={images[currentIndex]} 
          alt={`${alt} - ${currentIndex + 1}`} 
          className="w-full h-full object-cover transition-all duration-500"
        />
        
        {/* Nút điều hướng (Chỉ hiện nếu có > 1 ảnh) */}
        {images.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.preventDefault(); prevSlide(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); nextSlide(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
        
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
            {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Ảnh Thumbnails bên dưới */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((img, idx) => (
            <button 
              key={idx} 
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                currentIndex === idx ? 'border-emerald-600 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}