/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SundaySchoolKid, SundaySchoolClass, User } from '../types/church';
import { db } from '../utils/storage';
import { Plus, Users, UserCheck, Calendar, BookOpen, Search, Phone, PlusCircle, Trash, AlertTriangle, Sparkles } from 'lucide-react';

interface SundaySchoolProps {
  currentUser: User;
}

export default function SundaySchool({ currentUser }: SundaySchoolProps) {
  const [activeTab, setActiveTab] = useState<'KIDS' | 'CLASSES' | 'ATTENDANCE'>('KIDS');
  const [searchKids, setSearchKids] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  
  // Registration form states
  const [isKidOpen, setIsKidOpen] = useState(false);
  const [isClassOpen, setIsClassOpen] = useState(false);

  // New kid states
  const [kidName, setKidName] = useState('');
  const [kidBirthDate, setKidBirthDate] = useState('2018-01-01');
  const [kidParent, setKidParent] = useState('');
  const [kidPhone, setKidPhone] = useState('');
  const [kidClass, setKidClass] = useState('cl-pratama');
  const [kidTalents, setKidTalents] = useState('');
  const [kidNote, setKidNote] = useState('');

  // New class states
  const [className, setClassName] = useState('');
  const [classAgeRange, setClassAgeRange] = useState('6 - 10 Tahun');
  const [classTeacher, setClassTeacher] = useState('');
  const [classCurriculum, setClassCurriculum] = useState('');

  // Attendance states
  const [selectedClassId, setSelectedClassId] = useState('cl-pratama');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Refresh seed
  const [refreshSeed, setRefreshSeed] = useState(0);

  // AI Generation States
  const [generatingClassId, setGeneratingClassId] = useState<string | null>(null);

  const handleGenerateCurriculumWithAI = async (cl: SundaySchoolClass) => {
    setGeneratingClassId(cl.id);
    try {
      const response = await fetch('/api/ai/generate-curriculum', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          className: cl.name,
          ageRange: cl.ageRange,
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi asisten AI.');
      }

      const data = await response.json();
      if (data && data.text) {
        const updatedClass: SundaySchoolClass = {
          ...cl,
          curriculum: data.text,
        };
        db.updateClass(updatedClass);
        setRefreshSeed(p => p + 1);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghasilkan kurikulum menggunakan AI.');
    } finally {
      setGeneratingClassId(null);
    }
  };

  const keyKids = db.getKids();
  const keyClasses = db.getClasses();

  const filteredKids = keyKids.filter(k => {
    const matchesSearch = k.name.toLowerCase().includes(searchKids.toLowerCase()) || k.parentName.toLowerCase().includes(searchKids.toLowerCase());
    const matchesClass = filterClass === 'ALL' || k.classId === filterClass;
    return matchesSearch && matchesClass;
  });

  const handleAddKidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kidName || !kidParent || !kidPhone) {
      alert("Harap lengkapi Nama Anak, Nama Orangtua, dan Nomor Handphone wali.");
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (kidBirthDate > todayStr) {
      alert("Tanggal lahir tidak boleh di masa depan.");
      return;
    }

    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFormatRegex.test(kidBirthDate)) {
      alert("Format tanggal lahir salah. Silakan gunakan format YYYY-MM-DD.");
      return;
    }

    const born = new Date(kidBirthDate);
    const today = new Date();
    const age = today.getFullYear() - born.getFullYear();

    const nKid: SundaySchoolKid = {
      id: 'k-' + Date.now(),
      name: kidName,
      birthDate: kidBirthDate,
      age,
      classId: kidClass,
      parentName: kidParent,
      parentPhone: kidPhone,
      attendance: {},
      talents: kidTalents ? kidTalents.split(',').map(t => t.trim()) : [],
      parentNote: kidNote
    };

    db.addKid(nKid);
    setIsKidOpen(false);

    // Reset fields
    setKidName('');
    setKidParent('');
    setKidPhone('');
    setKidNote('');
    setKidTalents('');
    setRefreshSeed(p => p + 1);
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || !classTeacher) {
      alert("Harap lengkapi Nama Kelas dan Nama Guru Pembimbing.");
      return;
    }

    const nClass: SundaySchoolClass = {
      id: 'cl-' + Date.now(),
      name: className,
      teacherId: 'u-kadiv', // default linked
      teacherName: classTeacher,
      ageRange: classAgeRange,
      curriculum: classCurriculum
    };

    db.addClass(nClass);
    setIsClassOpen(false);

    // Reset
    setClassName('');
    setClassTeacher('');
    setClassCurriculum('');
    setRefreshSeed(p => p + 1);
  };

  const handleToggleAttendance = (kidId: string, date: string) => {
    const target = keyKids.find(k => k.id === kidId);
    if (!target) return;

    if (!target.attendance) target.attendance = {};
    target.attendance[date] = !target.attendance[date];

    db.updateKid(target);
    setRefreshSeed(p => p + 1);
  };

  const handleDeleteKid = (kidId: string) => {
    if (confirm("Hapus data anak dari sekolah minggu?")) {
      db.deleteKid(kidId);
      setRefreshSeed(p => p + 1);
    }
  };

  return (
    <div key={refreshSeed} className="space-y-6">
      {/* Module headers */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Portal Sekolah Minggu Terpadu</h2>
          <p className="text-sm text-slate-500">Database anak didik, kurikulum mingguan kelas, guru pembina, absensi digital, serta info proteksi alergi anak.</p>
        </div>

        <div className="flex space-x-2 shrink-0">
          <button 
            onClick={() => setIsKidOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 transition"
          >
            <PlusCircle className="w-4 h-4 text-slate-400" />
            <span>Daftar Anak</span>
          </button>
          
          <button 
            onClick={() => setIsClassOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelas</span>
          </button>
        </div>
      </div>

      {/* Segment tab triggers */}
      <div className="border-b border-slate-200 font-sans flex space-x-4">
        {[
          { label: 'database Anak Didik', value: 'KIDS', icon: <Users className="w-4 h-4" /> },
          { label: 'Kelas & Kurikulum', value: 'CLASSES', icon: <BookOpen className="w-4 h-4" /> },
          { label: 'Absensi Kehadiran Ibadah', value: 'ATTENDANCE', icon: <UserCheck className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value as any)}
            className={`flex items-center space-x-2 pb-2.5 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${activeTab === tab.value ? 'border-slate-900 text-slate-950 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Database Children list */}
      {activeTab === 'KIDS' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari nama anak atau nama orangtua..."
                value={searchKids}
                onChange={(e) => setSearchKids(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 outline-none focus:bg-white focus:ring-1 focus:ring-slate-950 transition"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 shrink-0">Filter Kelas:</span>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border rounded-lg text-xs font-semibold focus:outline-none"
              >
                <option value="ALL">Semua Kelas</option>
                {keyClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredKids.length === 0 ? (
              <div className="col-span-3 bg-white p-12 text-center text-slate-400 text-sm border rounded-xl">Tidak ada anak didik terdaftar sesuai kriteria.</div>
            ) : (
              filteredKids.map(kid => {
                const specClass = keyClasses.find(c => c.id === kid.classId);
                return (
                  <div key={kid.id} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition space-y-3.5 flex flex-col justify-between">
                    <div className="flex items-start justify-between space-x-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl shrink-0">👶</span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">{kid.name}</h4>
                          <span className="text-[10px] font-semibold uppercase text-slate-400">{specClass?.name || 'Belum Ditentukan'} • {kid.age} Tahun</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleDeleteKid(kid.id)}
                        className="text-slate-300 hover:text-rose-600 transition"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 pt-1.5 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Orangtua / Wali:</span>
                        <span className="font-semibold text-slate-800">{kid.parentName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400"><Phone className="w-3 h-3 inline mr-1" />Telepon:</span>
                        <span className="font-mono text-slate-700">{kid.parentPhone}</span>
                      </div>
                    </div>

                    {kid.talents && kid.talents.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {kid.talents.map((t, idx) => (
                          <span key={idx} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded border border-blue-100">
                            🎭 {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {kid.parentNote && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded text-[11px] leading-relaxed flex items-start space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Info Proteksi:</span>
                          <span className="font-light"> {kid.parentNote}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Curriculum & Classes list */}
      {activeTab === 'CLASSES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {keyClasses.map(cl => {
            const countKids = keyKids.filter(k => k.classId === cl.id).length;
            return (
              <div key={cl.id} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg"><BookOpen className="w-4 h-4" /></div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 leading-tight">{cl.name}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">{cl.ageRange}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border rounded text-xs font-bold font-mono">
                    {countKids} Anak Terdaftar
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Guru Kelas (Spam Coordinator)</span>
                    <span className="font-semibold text-slate-800">🧑‍🏫 {cl.teacherName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Kurikulum Pembelajaran</span>
                    <p className="p-3 bg-slate-50/50 rounded-lg border text-slate-600 font-normal leading-relaxed whitespace-pre-line font-serif text-xs min-h-[60px]">{cl.curriculum || "Belum ada kurikulum disusun."}</p>
                    
                    {/* Smart AI Integration */}
                    <div className="mt-2 flex justify-start">
                      <button
                        type="button"
                        onClick={() => handleGenerateCurriculumWithAI(cl)}
                        disabled={generatingClassId === cl.id}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-100 disabled:text-slate-400 text-indigo-750 font-bold rounded-lg border border-indigo-100/80 hover:border-indigo-200 text-[10px] uppercase tracking-wider cursor-pointer hover:shadow-2xs transition duration-200 select-none disabled:cursor-not-allowed"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${generatingClassId === cl.id ? 'animate-spin' : 'animate-pulse text-indigo-600'}`} />
                        <span>{generatingClassId === cl.id ? 'Sedang Memasukkan AI...' : 'AI Isi Otomatis'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Digital Check-in / Attendance logs */}
      {activeTab === 'ATTENDANCE' && (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Presensi Mingguan Sekolah Minggu</h3>
              <p className="text-[11px] text-slate-400">Pencatatan database kehadiran fisik anak per kelas ibadah berjalan.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Kelas:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold focus:outline-none"
                >
                  {keyClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Tanggal:</span>
                <div className="flex flex-col">
                  <input 
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-none"
                  />
                  <span className="text-[8px] text-slate-400 font-mono mt-0.5">YYYY-MM-DD (Maks Hari ini)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 font-sans">
            {keyKids.filter(k => k.classId === selectedClassId).length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic text-xs">Tidak ada anak terdaftar di kelas pilihan ini.</div>
            ) : (
              keyKids.filter(k => k.classId === selectedClassId).map(kid => {
                const isPresent = kid.attendance?.[attendanceDate] || false;
                return (
                  <div key={kid.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-xl">🧒</span>
                      <div>
                        <p className="font-bold text-slate-800">{kid.name}</p>
                        <p className="text-slate-400">Wali: {kid.parentName} ({kid.parentPhone})</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleToggleAttendance(kid.id, attendanceDate)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition border ${isPresent ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                    >
                      {isPresent ? '✓ HADIR' : 'ABSEN / TAK HADIR'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Kid dialog modal creation */}
      {isKidOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden border shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Pendaftaran Anak Sekolah Minggu</h3>
              <button onClick={() => setIsKidOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            <form onSubmit={handleAddKidSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 font-sans">NAMA ANGGOTA LENGKAP *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Contoh: Bryan Kurniawan"
                    value={kidName}
                    onChange={(e) => setKidName(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">TANGGAL LAHIR *</label>
                  <input 
                    type="date" 
                    required 
                    max={new Date().toISOString().split('T')[0]}
                    value={kidBirthDate}
                    onChange={(e) => setKidBirthDate(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">Format wajib: YYYY-MM-DD (Maksimal hari ini)</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ALOKASI KELAS</label>
                  <select 
                    value={kidClass}
                    onChange={(e) => setKidClass(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none"
                  >
                    {keyClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">WALI / ORANGTUA *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Contoh: Denny Kurniawan"
                    value={kidParent}
                    onChange={(e) => setKidParent(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">TELEPON WALI *</label>
                  <input 
                    type="tel" 
                    required 
                    placeholder="Contoh: 08129481232"
                    value={kidPhone}
                    onChange={(e) => setKidPhone(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">TALENTA (PISAH DENGAN KOMA)</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Bernyanyi, Menggambar, Hapalan Ayat"
                    value={kidTalents}
                    onChange={(e) => setKidTalents(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">CATATAN KHUSUS ORANGTUA (ALERGI / KONDISI MEDIS)</label>
                  <textarea 
                    placeholder="Contoh: Alergi parah kacang tanah atau butuh pemantauan khusus..."
                    value={kidNote}
                    onChange={(e) => setKidNote(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none h-16 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsKidOpen(false)}
                  className="px-4 py-1.5 border hover:bg-slate-50 text-slate-600 font-semibold rounded"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 transition"
                >
                  Simpan Registrasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class creation modal dialog */}
      {isClassOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden border shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Buat Kelas Sekolah Minggu</h3>
              <button onClick={() => setIsClassOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            <form onSubmit={handleCreateClass} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">NAMA KELAS *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Pratama Class (Domba)"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">REntang USIA ANAK *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: 6 - 10 Tahun"
                  value={classAgeRange}
                  onChange={(e) => setClassAgeRange(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">GURU PEMBINA / KOORDINATOR *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Angelina Pratama"
                  value={classTeacher}
                  onChange={(e) => setClassTeacher(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 font-sans">RP-KURIKULUM KELAS / RANCANGAN TARGET BELAJAR</label>
                <textarea 
                  placeholder="Kisah tokoh alkitab, tata cara ibadah kecil, dll..."
                  value={classCurriculum}
                  onChange={(e) => setClassCurriculum(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none h-20 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsClassOpen(false)}
                  className="px-4 py-1.5 border hover:bg-slate-50 text-slate-600 font-semibold rounded"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 transition"
                >
                  Buat Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
