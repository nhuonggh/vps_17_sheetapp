import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, Phone, MapPin, Briefcase, Award, GraduationCap, Star, User } from 'lucide-react';
import Link from 'next/link';

// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU (INTERFACE) ĐỂ KHÔNG DÙNG ANY
interface Experience {
  role: string;
  company: string;
  period: string;
  desc: string;
}

interface Instructor {
  id: number;
  name: string;
  title: string;
  email: string;
  phone: string;
  address: string;
  avatar_url: string;
  bio: string;
  skills: string[];
  experiences: Experience[]; // Khai báo rõ ràng mảng kinh nghiệm
}

// 2. HÀM LẤY DỮ LIỆU (CÓ TYPE)
async function getInstructor(id: string): Promise<Instructor | null> {
  const { data, error } = await supabase.from('instructors').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data as Instructor; // Ép kiểu về Interface đã định nghĩa
}

export default async function InstructorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const instructor = await getInstructor(id);

  if (!instructor) return notFound();

  // Dữ liệu mẫu học vấn (Hardcode demo)
  const education = [
    { school: "Đại học Giao thông vận tải", degree: "Cử nhân", year: "10/2009", desc: "Xếp loại: Khá - Sinh viên ưu tú" }
  ];

  return (
    <main className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-white rounded-none shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[800px]">
            
            {/* --- CỘT TRÁI (SIDEBAR) --- */}
            <div className="w-full md:w-1/3 bg-[#2A3479] text-white p-8 relative">
                {/* Avatar */}
                <div className="w-40 h-40 mx-auto rounded-full border-4 border-white overflow-hidden mb-6 shadow-lg bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={instructor.avatar_url || 'https://via.placeholder.com/150'} alt={instructor.name} className="w-full h-full object-cover" />
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">{instructor.name}</h1>
                    <p className="text-sm opacity-90 uppercase tracking-widest">{instructor.title}</p>
                </div>

                {/* Thông tin liên hệ */}
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

                {/* Kỹ năng */}
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

            {/* --- CỘT PHẢI (MAIN CONTENT) --- */}
            <div className="w-full md:w-2/3 p-8 md:p-12 text-gray-800">
                
                {/* Mục tiêu nghề nghiệp */}
                <div className="mb-10">
                    <h2 className="text-xl font-bold uppercase text-[#2A3479] mb-4 border-b-2 border-[#2A3479] inline-block pb-1">
                        Mục tiêu nghề nghiệp
                    </h2>
                    <p className="text-sm leading-relaxed text-gray-600 text-justify">
                        {instructor.bio}
                    </p>
                </div>

                {/* Kinh nghiệm làm việc */}
                <div className="mb-10">
                    <h2 className="text-xl font-bold uppercase text-[#2A3479] mb-6 border-b-2 border-[#2A3479] inline-block pb-1">
                        Kinh nghiệm làm việc
                    </h2>
                    
                    <div className="space-y-8 border-l-2 border-gray-200 ml-2 pl-6 relative">
                        {/* ĐÃ SỬA LỖI: Dùng kiểu Experience thay vì any */}
                        {instructor.experiences?.map((exp: Experience, idx: number) => (
                            <div key={idx} className="relative">
                                {/* Dot */}
                                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2A3479] border-2 border-white shadow-sm"></div>
                                
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1">
                                    <h3 className="font-bold text-base text-gray-800 uppercase">{exp.role}</h3>
                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{exp.period}</span>
                                </div>
                                <div className="text-xs font-bold text-[#2A3479] uppercase mb-2">{exp.company}</div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {exp.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Học vấn */}
                <div>
                    <h2 className="text-xl font-bold uppercase text-[#2A3479] mb-6 border-b-2 border-[#2A3479] inline-block pb-1">
                        Học vấn
                    </h2>
                    <div className="space-y-6">
                        {education.map((edu, idx) => (
                            <div key={idx} className="flex gap-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-[#2A3479]">
                                    <GraduationCap className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{edu.school}</h3>
                                    <div className="text-sm text-[#2A3479] font-medium">{edu.degree}</div>
                                    <div className="text-xs text-gray-500 mt-1">{edu.year} • {edu.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
      </div>
    </main>
  );
}