import Link from 'next/link';

// CẤU HÌNH QUAN TRỌNG: Chuyển trang 404 sang Dynamic để khớp với Layout
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <h2 className="text-6xl font-bold text-emerald-600 mb-4">404</h2>
      <h3 className="text-2xl font-bold text-gray-800 mb-2">Không tìm thấy trang</h3>
      <p className="text-gray-500 mb-8 max-w-md">
        Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </p>
      <Link 
        href="/" 
        className="px-6 py-3 bg-emerald-600 text-white rounded-full font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
      >
        Quay về Trang chủ
      </Link>
    </div>
  );
}