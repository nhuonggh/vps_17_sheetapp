import { notFound } from 'next/navigation';
import Link from 'next/link';
import { query } from '@/lib/db';
import { Mail, Phone, MapPin, Briefcase, CheckCircle2, GraduationCap, ArrowLeft, BookOpen } from 'lucide-react';

async function getInstructor(id: string) {
  const result = await query('SELECT * FROM instructors WHERE id = $1 LIMIT 1', [id]);
  return result.rows[0] || null;
}

// Lấy danh sách khóa học của giảng viên này
async function getInstructorCourses(instructorId: string) {
  const result = await query('SELECT * FROM products WHERE instructor_id = $1', [instructorId]);
  return result.rows;
}

export default async function InstructorPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ from?: string }> }) {
  const { id } = await params;
  const { from } = await searchParams; // Lấy slug khóa học cũ nếu có
  
  const instructor = await getInstructor(id);
  const courses = await getInstructorCourses(id);

  if (!instructor) return notFound();

  const education = [
    { school: "Đại học Giao thông vận tải", degree: "Cử nhân", year: "10/2009", desc: "Xếp loại: Khá - Sinh viên ưu tú" }
  ];

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Nút quay lại khóa học đang xem (nếu có) */}
        {from && (
            <div className="mb-6">
                <Link href={`/product/${from}`} className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:underline">
                    <ArrowLeft className="w-5 h-5" /> Quay lại khóa học
                </Link>
            </div>
        )}

        <div className="bg-white rounded-none shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[800px]">
            
            {/* --- CỘT TRÁI: ĐỔI MÀU XANH EMERALD --- */}
            <div className="w-full md:w-1/3 bg-emerald-700 text-white p-8 relative">
                <div className="w-40 h-40 mx-auto rounded-full border-4 border-white overflow-hidden mb-6 shadow-lg bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={instructor.avatar_url || 'https://via.placeholder.com/150'} alt={instructor.name} className="w-full h-full object-cover" />
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">{instructor.name}</h1>
                    <p className="text-sm opacity-90 uppercase tracking-widest">{instructor.title}</p>
                </div>

                <div className="space-y-4 mb-8">
                    <h3 className="text-lg font-bold uppercase border-b border-white/30 pb-2 mb-4">Thông tin cá nhân</h3>
                    <div className="flex items-center gap-3 text-sm opacity-90">
                        <Phone className="w-4 h-4 flex-shrink-0" /> <span>{instructor.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm opacity-90">
                        <Mail className="w-4 h-4 flex-shrink-0" /> <span className="break-all">{instructor.email}</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm opacity-90">
                        <MapPin className="w-4 h-4 flex-shrink-0 mt-1" /> <span>{instructor.address}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold uppercase border-b border-white/30 pb-2 mb-4">Kỹ năng</h3>
                    <div className="space-y-3">
                        {instructor.skills?.map((skill: string, idx: number) => (
                            <div key={idx}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span>{skill}</span>
                                    {idx === 0 && <span className="text-yellow-400">★★★★</span>}
                                </div>
                                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white/90" style={{ width: idx === 0 ? '90%' : '80%' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- CỘT PHẢI --- */}
            <div className="w-full md:w-2/3 p-8 md:p-12 text-gray-800">
                <div className="mb-10">
                    <h2 className="text-xl font-bold uppercase text-emerald-700 mb-4 border-b-2 border-emerald-700 inline-block pb-1">Mục tiêu nghề nghiệp</h2>
                    <p className="text-sm leading-relaxed text-gray-600 text-justify">{instructor.bio}</p>
                </div>

                <div className="mb-10">
                    <h2 className="text-xl font-bold uppercase text-emerald-700 mb-6 border-b-2 border-emerald-700 inline-block pb-1">Kinh nghiệm làm việc</h2>
                    <div className="space-y-8 border-l-2 border-gray-200 ml-2 pl-6 relative">
                        {instructor.experiences?.map((exp: any, idx: number) => (
                            <div key={idx} className="relative">
                                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-emerald-700 border-2 border-white shadow-sm"></div>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1">
                                    <h3 className="font-bold text-base text-gray-800 uppercase">{exp.role}</h3>
                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{exp.period}</span>
                                </div>
                                <div className="text-xs font-bold text-emerald-700 uppercase mb-2">{exp.company}</div>
                                <p className="text-sm text-gray-600 leading-relaxed">{exp.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-bold uppercase text-emerald-700 mb-6 border-b-2 border-emerald-700 inline-block pb-1">Học vấn</h2>
                    <div className="space-y-6">
                        {education.map((edu, idx) => (
                            <div key={idx} className="flex gap-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-emerald-700">
                                    <GraduationCap className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{edu.school}</h3>
                                    <div className="text-sm text-emerald-700 font-medium">{edu.degree}</div>
                                    <div className="text-xs text-gray-500 mt-1">{edu.year} • {edu.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* --- DANH SÁCH KHÓA HỌC LIÊN QUAN (MỚI) --- */}
        <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-l-4 border-emerald-600 pl-3">
                Khóa học của giảng viên {instructor.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {courses.length > 0 ? courses.map((course: any) => (
                    <Link href={`/product/${course.slug}`} key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
                        <div className="aspect-video relative overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={course.thumbnail_url} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-emerald-600 transition-colors text-sm">{course.name}</h3>
                            <div className="text-red-600 font-bold">{formatPrice(course.price)}</div>
                        </div>
                    </Link>
                )) : (
                    <p className="text-gray-500">Giảng viên chưa có khóa học nào khác.</p>
                )}
            </div>
        </div>

      </div>
    </main>
  );
}