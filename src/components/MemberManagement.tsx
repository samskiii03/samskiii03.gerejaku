/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Member, User, PastoralNote, FollowUpRecord } from '../types/church';
import { db } from '../utils/storage';
import { 
  Search, Filter, Plus, FileText, Phone, MapPin, Calendar, 
  Trash2, RotateCcw, AlertTriangle, ArrowUpRight, HelpCircle, UserCheck, 
  ChevronRight, Clipboard, Eye, PlusCircle, Sparkles, Clock, Heart, 
  Send, Cake, LineChart, TrendingUp, Smile, Activity, CheckCircle2, ShieldCheck, X
} from 'lucide-react';

interface MemberManagementProps {
  currentUser: User;
  onRefreshTrail: () => void;
}

export default function MemberManagement({ currentUser, onRefreshTrail }: MemberManagementProps) {
  // Queries
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSector, setFilterSector] = useState<string>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'DATABASE' | 'FOLLOW_UP' | 'VERIF_USER' | 'ANALYSIS'>('DATABASE');
  
  // Active selected member for detailed profile drawer
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  // Modals / forms state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isRecycleOpen, setIsRecycleOpen] = useState(false);

  // Form states for creating/editing
  const [formName, setFormName] = useState('');
  const [formNickname, setFormNickname] = useState('');
  const [formGender, setFormGender] = useState<'L' | 'P'>('L');
  const [formBirthPlace, setFormBirthPlace] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('1995-01-01');
  const [formMarital, setFormMarital] = useState<'BELUM_MENIKAH' | 'MENIKAH' | 'JANDA_DUDA'>('BELUM_MENIKAH');
  const [formSpouse, setFormSpouse] = useState('');
  const [formChildren, setFormChildren] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formSector, setFormSector] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formEducation, setFormEducation] = useState('');
  const [formOccupation, setFormOccupation] = useState('');
  const [formBaptism, setFormBaptism] = useState<'YA' | 'TIDAK'>('YA');
  const [formMinistry, setFormMinistry] = useState<'YA' | 'TIDAK'>('TIDAK');
  const [formTalents, setFormTalents] = useState('');
  const [formActivityScore, setFormActivityScore] = useState(90);

  // New pastoral note state
  const [newNoteNotes, setNewNoteNotes] = useState('');
  const [newNoteType, setNewNoteType] = useState<'COUNSELING' | 'VISIT' | 'FOLLOW_UP'>('FOLLOW_UP');
  const [newNoteStatus, setNewNoteStatus] = useState<'BARU' | 'DA_PEMBINAAN' | 'PERLU_KUNJUNGAN' | 'STABIL'>('STABIL');

  // Trigger data updates
  const [refreshSeed, setRefreshSeed] = useState(0);

  const triggerRefresh = () => {
    setRefreshSeed(prev => prev + 1);
    onRefreshTrail();
  };

  const members = db.getMembers();
  const deletedMembers = db.getRecycleMembers();

  // Selected church pending self-registered users awaiting branch pastor (Gembala) verification
  const pendingUsers = db.getUsers().filter(u => u.churchId === currentUser.churchId && u.isVerified === false);

  const handleVerifyUser = (userId: string, fullName: string) => {
    if (confirm(`Apakah Anda yakin ingin menyetujui & memverifikasi akun "${fullName}"?\n\nTindakan ini akan:\n1. Mengaktifkan akun sehingga yang bersangkutan dapat langsung login dengan sandinya.\n2. Secara otomatis mengintegrasikan & mengimpor data dirinya ke dalam Database Jemaat (Kategori Inti).`)) {
      db.verifyAndIntegrateUser(userId, currentUser);
      triggerRefresh();
    }
  };

  const handleRejectUser = (userId: string, fullName: string) => {
    if (confirm(`⚠️ PERINGATAN: Apakah Anda yakin ingin MENOLAK & menghapus pendaftaran akun untuk "${fullName}"?\n\nTindakan ini akan menghapus draf pendaftaran dari antrean secara permanen.`)) {
      db.rejectUserRegistration(userId, currentUser);
      triggerRefresh();
    }
  };

  // Filter logic
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(search.toLowerCase()) || 
                          member.nickname.toLowerCase().includes(search.toLowerCase()) ||
                          member.phone.includes(search);
    const matchesCategory = filterCategory === 'ALL' || member.category === filterCategory;
    const matchesSector = filterSector === 'ALL' || member.sector === filterSector;
    return matchesSearch && matchesCategory && matchesSector;
  });

  // Calculate unique sectors for filter list
  const uniqueSectors = Array.from(new Set(members.map(m => m.sector))).filter(Boolean);

  // Populate form for Edit
  const handleOpenEdit = (m: Member) => {
    setFormName(m.name);
    setFormNickname(m.nickname);
    setFormGender(m.gender);
    setFormBirthPlace(m.birthPlace);
    setFormBirthDate(m.birthDate);
    setFormMarital(m.maritalStatus);
    setFormSpouse(m.spouseName || '');
    setFormChildren(m.childrenNames?.join(', ') || '');
    setFormAddress(m.address);
    setFormSector(m.sector);
    setFormPhone(m.phone);
    setFormEmail(m.email);
    setFormEducation(m.education);
    setFormOccupation(m.occupation);
    setFormBaptism(m.baptismStatus);
    setFormMinistry(m.ministryStatus);
    setFormTalents(m.talents?.join(', ') || '');
    setFormActivityScore(m.activityScore);
    
    setIsEditOpen(true);
  };

  // Submit create member
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formNickname || !formSector || !formPhone) {
      alert("Harap isi field utama: Nama Lengkap, Panggilan, Sektor, dan Nomor Handphone.");
      return;
    }

    const tArray = formTalents ? formTalents.split(',').map(t => t.trim()) : [];
    const childArray = formChildren ? formChildren.split(',').map(c => c.trim()) : [];

    const newMember: Member = {
      id: 'm-' + Date.now(),
      name: formName,
      nickname: formNickname,
      gender: formGender,
      birthPlace: formBirthPlace,
      birthDate: formBirthDate,
      age: 0, // engine calculates
      maritalStatus: formMarital,
      spouseName: formSpouse || undefined,
      childrenNames: childArray.length > 0 ? childArray : undefined,
      address: formAddress,
      sector: formSector,
      phone: formPhone,
      email: formEmail,
      education: formEducation,
      occupation: formOccupation,
      joinDate: new Date().toISOString().split('T')[0],
      baptismStatus: formBaptism,
      ministryStatus: formMinistry,
      talents: tArray,
      category: 'BARU',
      joinYear: new Date().getFullYear(),
      activityScore: Number(formActivityScore),
      pastoralNotes: [],
      attachments: []
    };

    db.addMember(newMember, currentUser);
    
    // Reset forms
    resetForm();
    setIsCreateOpen(false);
    triggerRefresh();
  };

  // Submit edit member
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    const tArray = formTalents ? formTalents.split(',').map(t => t.trim()) : [];
    const childArray = formChildren ? formChildren.split(',').map(c => c.trim()) : [];

    const updated: Member = {
      ...selectedMember,
      name: formName,
      nickname: formNickname,
      gender: formGender,
      birthPlace: formBirthPlace,
      birthDate: formBirthDate,
      maritalStatus: formMarital,
      spouseName: formSpouse || undefined,
      childrenNames: childArray.length > 0 ? childArray : undefined,
      address: formAddress,
      sector: formSector,
      phone: formPhone,
      email: formEmail,
      education: formEducation,
      occupation: formOccupation,
      baptismStatus: formFormValueConversion(formBaptism),
      ministryStatus: formFormValueConversion(formMinistry),
      talents: tArray,
      activityScore: Number(formActivityScore)
    };

    db.updateMember(updated, currentUser);
    setSelectedMember(db.getMembers().find(m => m.id === selectedMember.id) || null);
    setIsEditOpen(false);
    triggerRefresh();
  };

  const formFormValueConversion = (val: string): 'YA' | 'TIDAK' => {
    return val === 'YA' ? 'YA' : 'TIDAK';
  };

  const resetForm = () => {
    setFormName('');
    setFormNickname('');
    setFormGender('L');
    setFormBirthPlace('');
    setFormBirthDate('1995-01-01');
    setFormMarital('BELUM_MENIKAH');
    setFormSpouse('');
    setFormChildren('');
    setFormAddress('');
    setFormSector('');
    setFormPhone('');
    setFormEmail('');
    setFormEducation('');
    setFormOccupation('');
    setFormBaptism('YA');
    setFormMinistry('TIDAK');
    setFormTalents('');
    setFormActivityScore(90);
  };

  // Soft delete a member
  const handleDeleteMember = (memberId: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus data jemaat ini ke Recycle Bin?")) {
      db.softDeleteMember(memberId, currentUser);
      setSelectedMember(null);
      triggerRefresh();
    }
  };

  // Restore soft deleted member
  const handleRestoreMember = (memberId: string) => {
    db.restoreMember(memberId, currentUser);
    triggerRefresh();
  };

  // Post pastoral Notes
  const handleAddPastoralNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !newNoteNotes) return;

    const notesGroup = selectedMember.pastoralNotes || [];
    const nNote: PastoralNote = {
      id: 'n-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      author: currentUser.fullName,
      type: newNoteType,
      notes: newNoteNotes,
      status: newNoteStatus as any
    };

    const updated: Member = {
      ...selectedMember,
      pastoralNotes: [nNote, ...notesGroup]
    };

    db.updateMember(updated, currentUser);
    setSelectedMember(db.getMembers().find(m => m.id === selectedMember.id) || null);
    setNewNoteNotes('');
    setIsNoteModalOpen(false);
    triggerRefresh();
  };

  // Activity colors
  const getActivityMeta = (score: number) => {
    if (score >= 90) return { label: 'Sangat Aktif', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    if (score >= 70) return { label: 'Aktif', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
    if (score >= 50) return { label: 'Mulai Menurun', bg: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-500' };
    if (score >= 30) return { label: 'Perlu Perhatian', bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' };
    return { label: 'Tidak Aktif', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
  };

  // Smart recommendation engine
  const getSmartRecommendation = (m: Member) => {
    if (m.category === 'BARU') {
      return {
        issue: 'Jemaat baru mendaftar di sistem (belum dihubungi pelayan kordinator).',
        action: 'Hubungi Jemaat Baru & Masukkan ke Komsel Sektor setempat.',
        pill: 'Auto Task: Follow-up WA',
        color: 'border-blue-200 bg-blue-50/50 text-blue-800'
      };
    }
    if (m.activityScore < 30) {
      return {
        issue: 'Skor aktivitas pelayanan merosot drastis (tidak hadir > 2 Bulan).',
        action: 'Kunjungan Pastoral Darurat (Home Visit) oleh Tim Penggembalaan.',
        pill: 'Prioritas Kunjungan',
        color: 'border-rose-200 bg-rose-50/50 text-rose-800 animate-pulse'
      };
    }
    if (m.activityScore < 50) {
      return {
        issue: 'Keaktifan menurun signifikan dalam 3 minggu terakhir.',
        action: 'Telepon pribadi & jadwalkan Konseling ringan bersama Gembala Sektor.',
        pill: 'Follow-up Gembala Sektor',
        color: 'border-orange-200 bg-orange-50/50 text-orange-800'
      };
    }
    if (m.activityScore >= 90 && m.ministryStatus === 'YA') {
      return {
        issue: 'Jemaat ini menunjukkan dedikasi pelayanan dan loyalitas tinggi (90%+).',
        action: 'Rekomendasikan Leadership Course / Pembinaan Kepengurusan Inti.',
        pill: 'Rekomendasi Leadership Training',
        color: 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
      };
    }
    return null;
  };

  return (
    <div key={refreshSeed} className="space-y-6">
      {/* Module Title Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Database Jemaat Enterprise</h2>
          <p className="text-sm text-slate-500 font-normal">Manajemen data jemaat yang akurat, klasifikasi terukur, lengkap dengan scoring terintegrasi.</p>
        </div>
        
        <div className="flex items-center space-x-3 shrink-0">
          <button 
            onClick={() => setIsRecycleOpen(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 transition"
          >
            <Trash2 className="w-4 h-4 text-slate-400" />
            <span>Recycle Bin ({deletedMembers.length})</span>
          </button>
          
          {(currentUser.role === 'GEMBALA' || currentUser.role === 'PENGURUS') && (
            <button 
              onClick={() => { resetForm(); setIsCreateOpen(true); }}
              className="flex items-center space-x-2 px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jemaat</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex overflow-x-auto border-b border-slate-200 bg-white p-1 rounded-xl border gap-2 shrink-0">
        <button
          onClick={() => setActiveSubTab('DATABASE')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold border-b-2 tracking-tight transition duration-150 cursor-pointer whitespace-nowrap ${activeSubTab === 'DATABASE' ? 'border-slate-900 text-slate-900 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <span>📋 Database Jemaat</span>
        </button>
        <button
          onClick={() => setActiveSubTab('FOLLOW_UP')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold border-b-2 tracking-tight transition duration-150 cursor-pointer whitespace-nowrap ${activeSubTab === 'FOLLOW_UP' ? 'border-slate-900 text-slate-1000 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <span>⚠️ Follow-Up Jemaat Pasif</span>
        </button>
        {currentUser.role === 'GEMBALA' && (
          <button
            onClick={() => setActiveSubTab('VERIF_USER')}
            className={`flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold border-b-2 tracking-tight transition duration-150 relative cursor-pointer whitespace-nowrap ${activeSubTab === 'VERIF_USER' ? 'border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <span>👤 Verifikasi Pendaftar Baru</span>
            {pendingUsers.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
                {pendingUsers.length}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setActiveSubTab('ANALYSIS')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold border-b-2 tracking-tight transition duration-150 cursor-pointer whitespace-nowrap ${activeSubTab === 'ANALYSIS' ? 'border-slate-900 text-slate-900 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <span>📊 Analisis & Diagram Ulang Tahun</span>
        </button>
      </div>

      {activeSubTab === 'DATABASE' && (
        <>
        {/* Warning Pendaftaran Baru Pending */}
        {pendingUsers.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-905 flex items-start space-x-3 shadow-3xs animate-in slide-in-from-top-2 duration-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-amber-950 uppercase tracking-tight flex items-center space-x-1.5">
                <span>⚠️ PERINGATAN VERIFIKASI SEGERA</span>
                <span className="bg-amber-200 text-amber-800 text-[9px] px-1.5 py-0.2 rounded-full font-extrabold">{pendingUsers.length} AKUN</span>
              </h4>
              <p className="font-light leading-relaxed text-slate-700">
                Terdapat <strong>{pendingUsers.length} akun pelayan/staf baru</strong> yang telah mendaftar mandiri untuk jemaat cabang Anda dan saat ini sedang berada dalam antrean peninjauan. 
                Mereka tidak akan bisa login atau dihitung ke dalam Klasifikasi Database Jemaat sampai disetujui.
              </p>
              {currentUser.role === 'GEMBALA' ? (
                <button
                  onClick={() => setActiveSubTab('VERIF_USER')}
                  className="mt-2 inline-flex items-center space-x-1 text-white hover:text-white bg-indigo-600 hover:bg-indigo-700 font-extrabold py-1 px-3 rounded-lg text-[10px] transition cursor-pointer shadow-3xs"
                >
                  <span>Proses & Setujui Sekarang</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <p className="text-[10px] text-slate-500 font-bold mt-1 bg-white/60 p-1.5 rounded inline-block border border-slate-250/20">
                  💡 Hanya <strong>Gembala Sidang</strong> setempat yang memegang wewenang penuh untuk memverifikasi & menyetujui akun-akun mandiri ini.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama, panggilan, atau nomor handphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Sektor Filter */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 shrink-0"><Filter className="w-3.5 h-3.5 inline mr-1" />Sektor:</span>
            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
            >
              <option value="ALL">Semua Sektor</option>
              {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Klasifikasi Filter */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 shrink-0">Klasifikasi:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
            >
              <option value="ALL">Semua Klasifikasi</option>
              <option value="INTI">Jemaat Inti</option>
              <option value="AKTIF">Jemaat Aktif</option>
              <option value="KURANG_AKTIF">Kurang Aktif</option>
              <option value="PASIF">Jemaat Pasif</option>
              <option value="BARU">Jemaat Baru</option>
              <option value="LANSIA">Jemaat Lansia</option>
              <option value="REMAJA">Jemaat Remaja</option>
              <option value="PEMUDA">Jemaat Pemuda</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Jemaat list (2 cols on wide screen) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Daftar Jemaat Terdaftar Jeda ({filteredMembers.length})</span>
            <span className="text-[10px] font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-600">Terintegrasi</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Tidak ada jemaat yang cocok dengan filter pencarian.
              </div>
            ) : (
              filteredMembers.map(item => {
                const act = getActivityMeta(item.activityScore);
                const recommendation = getSmartRecommendation(item);

                return (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedMember(item)}
                    className={`p-4 hover:bg-slate-50/80 transition cursor-pointer flex flex-col justify-between ${selectedMember?.id === item.id ? 'bg-slate-50 border-r-2 border-slate-900' : ''}`}
                  >
                    <div className="flex items-start justify-between space-x-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0 border border-slate-200">
                          {item.gender === 'L' ? '👦' : '👧'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-semibold text-slate-900 leading-tight">{item.name}</h4>
                            <span className="text-xs font-normal text-slate-400">({item.nickname})</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[10px] bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                              Sektor: {item.sector}
                            </span>
                            <span className="text-[10px] bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                              {item.age} Thn
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold flex items-center space-x-1 ${act.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${act.dot}`}></span>
                          {item.activityScore}% {act.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Join {item.joinYear}</span>
                      </div>
                    </div>

                    {recommendation && (
                      <div className="mt-2.5 ml-13 flex items-center justify-between p-2 rounded-lg border text-[11px] font-normal leading-relaxed border-amber-200 bg-amber-50/40 text-amber-900">
                        <div className="flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-semibold">{recommendation.pill}:</span>
                          <span className="truncate max-w-[250px] md:max-w-[320px] text-slate-600 font-light">{recommendation.action}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Selected Member Detail Panel */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          {selectedMember ? (
            <div className="space-y-5">
              
              {/* Header profile */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 font-bold text-lg border flex items-center justify-center">
                    {selectedMember.gender === 'L' ? '👦' : '👧'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-950 leading-tight">{selectedMember.name}</h3>
                    <p className="text-xs text-slate-400">ID: {selectedMember.id}</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {(currentUser.role === 'GEMBALA' || currentUser.role === 'PENGURUS') && (
                    <>
                      <button 
                        onClick={() => handleOpenEdit(selectedMember)}
                        className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition"
                        title="Ubah Data"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteMember(selectedMember.id)}
                        className="p-1.5 border border-rose-100 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Data metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-medium block">Pekerjaan</span>
                  <span className="text-xs font-semibold text-slate-800">{selectedMember.occupation || '-'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-medium block">Status Nikah</span>
                  <span className="text-xs font-semibold text-slate-800">{selectedMember.maritalStatus}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-medium block">Pendidikan</span>
                  <span className="text-xs font-semibold text-slate-800">{selectedMember.education || '-'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-medium block">Baptis Jemaat</span>
                  <span className="text-xs font-semibold text-slate-800">{selectedMember.baptismStatus === 'YA' ? '✅ Sudah Baptis' : '❌ Belum'}</span>
                </div>
              </div>

              {/* Contact list */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-slate-600 bg-slate-50/50 p-2 rounded">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium">{selectedMember.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600 bg-slate-50/50 p-2 rounded">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-normal">{selectedMember.address}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600 bg-slate-50/50 p-2 rounded">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lahir: {selectedMember.birthPlace}, {selectedMember.birthDate}</span>
                </div>
              </div>

              {/* Smart Recommendations inside detailed drawer */}
              {getSmartRecommendation(selectedMember) && (
                <div className={`p-4 rounded-xl border ${getSmartRecommendation(selectedMember)?.color}`}>
                  <div className="flex items-center space-x-1.5 font-bold text-xs uppercase tracking-wider mb-1">
                    <UserCheck className="w-4 h-4" />
                    <span>Rekomendasi Tindakan</span>
                  </div>
                  <p className="text-xs font-semibold leading-snug">{getSmartRecommendation(selectedMember)?.pill}</p>
                  <p className="text-xs text-slate-600 font-light mt-1.5">{getSmartRecommendation(selectedMember)?.issue}</p>
                  <button className="mt-3 w-full py-1.5 bg-slate-900 text-white text-[11px] font-semibold rounded hover:bg-slate-800 transition">
                    Jadwalkan Tindakan: {getSmartRecommendation(selectedMember)?.action.split('(')[0]}
                  </button>
                </div>
              )}

              {/* Pastoral & Counseling History */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Catatan Pastoral ({selectedMember.pastoralNotes?.length || 0})</span>
                  <button 
                    onClick={() => setIsNoteModalOpen(true)}
                    className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Tambah Catatan</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[160px] overflow-y-auto">
                  {!selectedMember.pastoralNotes || selectedMember.pastoralNotes.length === 0 ? (
                    <p className="text-slate-400 text-xs italic">Belum ada riwayat konseling/kunjungan gembala.</p>
                  ) : (
                    selectedMember.pastoralNotes.map(n => (
                      <div key={n.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{n.type} • {n.status}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{n.date}</span>
                        </div>
                        <p className="text-slate-600 font-light leading-relaxed">{n.notes}</p>
                        <p className="text-[9px] text-slate-400 italic text-right">- Oleh {n.author}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Dokumen Lampiran ({selectedMember.attachments?.length || 0})</span>
                {selectedMember.attachments && selectedMember.attachments.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMember.attachments.map((file, idx) => (
                      <span key={idx} className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[120px]">{file}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic">KTP / Surat Baptis jemaat belum dilampirkan.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <Clipboard className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-medium">Pilih salah satu jemaat dari daftar untuk melihat detail database terintegrasi.</p>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {activeSubTab === 'FOLLOW_UP' && (
        <FollowUpSection currentUser={currentUser} onRefresh={triggerRefresh} />
      )}

      {activeSubTab === 'VERIF_USER' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-indigo-950 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-extrabold text-indigo-950 uppercase tracking-tight">Otoritas Verifikasi Gembala Sidang</h4>
              <p className="font-light leading-relaxed">
                Di bawah ini adalah daftar pendaftar mandiri (Pelayan Jemaat, Kepala Departemen, & Pengurus Gereja) yang memilih cabang gereja Anda. 
                Sesuai kebijakan sistem, verifikasi dilakukan secara desentralisasi oleh <strong>Gembala Sidang setempat</strong>, bukan Synode Pusat. 
                Setelah Anda mengklik <strong>Setujui & Integrasikan</strong>, akun login mereka akan langsung aktif dan data dirinya otomatis masuk sebagai <strong>Jemaat Inti</strong> di database jemaat.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b bg-slate-50/50 flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Antrean Verifikasi Jemaat & Pelayan Pelayanan ({pendingUsers.length})</span>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2 flex flex-col items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 shrink-0" />
                <h5 className="font-bold text-slate-800 text-xs">Antrean Verifikasi Bersih!</h5>
                <p className="text-[11px] font-light max-w-sm">Tidak ada pelayan atau staf baru yang mengajukan pendaftaran mandiri saat ini. Semua akun pelayan Anda telah aktif.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-500 font-bold text-[10px] uppercase">
                      <th className="p-3">Nama Lengkap & Kontak</th>
                      <th className="p-3">Jenis Kelamin</th>
                      <th className="p-3">Peran Pelayanan</th>
                      <th className="p-3">Kredensial Login</th>
                      <th className="p-3">Talenta & Motivasi Pendaftaran</th>
                      <th className="p-3 text-right">Tindakan Persetujuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{user.fullName}</div>
                          {user.phone ? (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">📱 {user.phone}</div>
                          ) : (
                            <span className="text-[9px] text-slate-400 italic font-mono">No. HP Belum Diisi</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            user.gender === 'P' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {user.gender === 'P' ? 'Perempuan (P)' : 'Laki-Laki (L)'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            user.role === 'KEPALA_DIVISI' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            user.role === 'PENGURUS' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                            'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {user.role === 'KEPALA_DIVISI' ? 'KADIV / KEPALA DEPARTEMEN' :
                             user.role === 'PENGURUS' ? 'STAFF BENDAHARA / PENGURUS' :
                             'PELAYAN JEMAAT'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-mono font-medium text-slate-600">@{user.username}</div>
                          <div className="text-[10px] text-slate-400">{user.email}</div>
                        </td>
                        <td className="p-3 max-w-xs">
                          <div className="space-y-1">
                            <div>
                              <span className="font-bold text-[9px] text-slate-400 uppercase tracking-tight">Keahlian & Talenta:</span>
                              <p className="text-[11px] text-slate-700 font-medium">
                                {user.talents ? user.talents : <span className="text-slate-400 italic">- Tidak diisi -</span>}
                              </p>
                            </div>
                            <div>
                              <span className="font-bold text-[9px] text-slate-400 uppercase tracking-tight">Motivasi Bergabung:</span>
                              <p className="text-[11px] text-slate-600 italic leading-relaxed bg-slate-50 p-2 rounded border border-slate-150 font-light whitespace-normal">
                                {user.registrationReason ? `"${user.registrationReason}"` : <span className="text-slate-400 italic">- Tidak diisi -</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleVerifyUser(user.id, user.fullName)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-md transition shadow-2xs cursor-pointer inline-flex items-center space-x-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>
                          <button
                            onClick={() => handleRejectUser(user.id, user.fullName)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold border border-rose-200 rounded-md transition cursor-pointer inline-flex items-center space-x-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'ANALYSIS' && (
        <AnalysisSection />
      )}

      {/* --- MODALS & WORKFLOW DRAWERS --- */}

      {/* 1. Reset / Recycle Bin Modal */}
      {isRecycleOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Recycle Bin (Recovery System)</span>
              </h3>
              <button onClick={() => setIsRecycleOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>
            <div className="p-5 space-y-4 max-h-[350px] overflow-y-auto">
              <p className="text-xs text-slate-500">Anggota yang telah Anda hapus dapat langsung dipulihkan di sini beserta seluruh riwayat lamanya demi mencegah kehilangan data tidak sengaja.</p>
              
              {deletedMembers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Recycle Bin kosong</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {deletedMembers.map(item => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="text-slate-400">Sektor {item.sector} • Lahir {item.birthDate}</p>
                      </div>
                      <button 
                        onClick={() => handleRestoreMember(item.id)}
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border rounded font-semibold text-slate-700 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                        <span>Restore</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-end">
              <button 
                onClick={() => setIsRecycleOpen(false)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Create Member Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border max-w-xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Form Pendaftaran Jemaat Baru</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">NAMA LENGKAP *</label>
                  <input 
                    type="text" 
                    required 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Denny Kurniawan"
                    className="w-full p-2.5 border border-slate-200 rounded focus:ring-1 focus:ring-slate-950 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">NAMA PANGGILAN *</label>
                  <input 
                    type="text" 
                    required 
                    value={formNickname}
                    onChange={(e) => setFormNickname(e.target.value)}
                    placeholder="Contoh: Denny"
                    className="w-full p-2.5 border border-slate-200 rounded focus:ring-1 focus:ring-slate-950 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">JENIS KELAMIN *</label>
                  <select 
                    value={formGender} 
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded focus:ring-1 focus:ring-slate-950 outline-none"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">TEMPAT LAHIR</label>
                  <input 
                    type="text" 
                    value={formBirthPlace}
                    onChange={(e) => setFormBirthPlace(e.target.value)}
                    placeholder="Contoh: Semarang"
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">TANGGAL LAHIR *</label>
                  <input 
                    type="date" 
                    required 
                    value={formBirthDate}
                    onChange={(e) => setFormBirthDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">WILAYAH SEKTOR *</label>
                  <input 
                    type="text" 
                    required 
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value)}
                    placeholder="Contoh: Sektor Utara I"
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">NOMOR HANDPHONE *</label>
                  <input 
                    type="tel" 
                    required 
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Contoh: 08129481232"
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ALAMAT TINGGAL LENGKAP</label>
                  <textarea 
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Masukkan jalan, perumahan, nomor rumah, RT/RW, kelurahan..."
                    className="w-full p-2.5 border border-slate-200 rounded outline-none h-16 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">EMAIL</label>
                  <input 
                    type="email" 
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Contoh: jemaat@gmail.com"
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">PEKERJAAN</label>
                  <input 
                    type="text" 
                    value={formOccupation}
                    onChange={(e) => setFormOccupation(e.target.value)}
                    placeholder="Contoh: Karyawan BUMN"
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 font-sans">STATUS PERNIKAHAN</label>
                  <select 
                    value={formMarital} 
                    onChange={(e) => setFormMarital(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  >
                    <option value="BELUM_MENIKAH">Belum Menikah</option>
                    <option value="MENIKAH">Menikah</option>
                    <option value="JANDA_DUDA">Janda / Duda</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">NAMA PASANGAN (JIKA MENIKAH)</label>
                  <input 
                    type="text" 
                    value={formSpouse}
                    onChange={(e) => setFormSpouse(e.target.value)}
                    placeholder="Nama suami / istri"
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                    disabled={formMarital !== 'MENIKAH'}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">TELAH DIBAPTIS AIR?</label>
                  <select 
                    value={formBaptism} 
                    onChange={(e) => setFormBaptism(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  >
                    <option value="YA">YA - Sudah Dibaptis</option>
                    <option value="TIDAK">TIDAK - Belum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">AKTIF DALAM PELAYANAN?</label>
                  <select 
                    value={formMinistry} 
                    onChange={(e) => setFormMinistry(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  >
                    <option value="TIDAK">TIDAK Aktif Melayani</option>
                    <option value="YA">YA - Aktif Melayani</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">TALENTA / SKILL (PISAH DENGAN KOMA)</label>
                  <input 
                    type="text" 
                    value={formTalents}
                    onChange={(e) => setFormTalents(e.target.value)}
                    placeholder="Contoh: Singer, Multimedia, Musik, Mengajar Sekolah Minggu"
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">SKOR KEAKTIFAN SEKARANG * (0 - 100)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    required 
                    value={formActivityScore}
                    onChange={(e) => setFormActivityScore(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded text-slate-600 font-semibold"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 transition"
                >
                  Daftarkan Jemaat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Edit Member Modal */}
      {isEditOpen && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border max-w-xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Form Koreksi Data Jemaat: {selectedMember.name}</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">NAMA LENGKAP *</label>
                  <input 
                    type="text" 
                    required 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded focus:ring-1 focus:ring-slate-950 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">NAMA PANGGILAN *</label>
                  <input 
                    type="text" 
                    required 
                    value={formNickname}
                    onChange={(e) => setFormNickname(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">JENIS KELAMIN *</label>
                  <select 
                    value={formGender} 
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">TEMPAT LAHIR</label>
                  <input 
                    type="text" 
                    value={formBirthPlace}
                    onChange={(e) => setFormBirthPlace(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">TANGGAL LAHIR *</label>
                  <input 
                    type="date" 
                    required 
                    value={formBirthDate}
                    onChange={(e) => setFormBirthDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 font-sans">WILAYAH SEKTOR *</label>
                  <input 
                    type="text" 
                    required 
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 font-sans">NOMOR HANDPHONE *</label>
                  <input 
                    type="tel" 
                    required 
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ALAMAT TINGGAL LENGKAP</label>
                  <textarea 
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none h-16 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 font-sans">EMAIL</label>
                  <input 
                    type="email" 
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">PEKERJAAN</label>
                  <input 
                    type="text" 
                    value={formOccupation}
                    onChange={(e) => setFormOccupation(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">STATUS PERNIKAHAN</label>
                  <select 
                    value={formMarital} 
                    onChange={(e) => setFormMarital(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  >
                    <option value="BELUM_MENIKAH">Belum Menikah</option>
                    <option value="MENIKAH">Menikah</option>
                    <option value="JANDA_DUDA">Janda / Duda</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 font-sans">NAMA PASANGAN</label>
                  <input 
                    type="text" 
                    value={formSpouse}
                    onChange={(e) => setFormSpouse(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                    disabled={formMarital !== 'MENIKAH'}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 font-sans font-medium">BAPTIS AIR?</label>
                  <select 
                    value={formBaptism} 
                    onChange={(e) => setFormBaptism(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  >
                    <option value="YA">YA - Sudah Dibaptis</option>
                    <option value="TIDAK">TIDAK - Belum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">STATUS PELAYANAN?</label>
                  <select 
                    value={formMinistry} 
                    onChange={(e) => setFormMinistry(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  >
                    <option value="TIDAK">TIDAK Aktif Melayani</option>
                    <option value="YA">YA - Aktif Melayani</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">TALENTA</label>
                  <input 
                    type="text" 
                    value={formTalents}
                    onChange={(e) => setFormTalents(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">PERSENTASE AKTIVITAS KESELURUHAN *</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={formActivityScore}
                    onChange={(e) => setFormActivityScore(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded text-slate-600 font-semibold"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 transition"
                >
                  Koreksi Data Jemaat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Pastoral Note Modal */}
      {isNoteModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Catatan Penggembalaan Jemaat</h3>
              <button onClick={() => setIsNoteModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>
            
            <form onSubmit={handleAddPastoralNote} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">TIPE KONSELING / KUNJUNGAN</label>
                <select 
                  value={newNoteType} 
                  onChange={(e) => setNewNoteType(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded outline-none"
                >
                  <option value="COUNSELING">COUNSELING (Konseling Pribadi/Keluarga)</option>
                  <option value="VISIT">VISIT (Kunjungan Pastoral / Doa Khusus)</option>
                  <option value="FOLLOW_UP">FOLLOW UP (Pendampingan Jemaat Pasif / Baru)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 font-sans">STATUS SETELAH KUNJUNGAN</label>
                <select 
                  value={newNoteStatus} 
                  onChange={(e) => setNewNoteStatus(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded outline-none"
                >
                  <option value="STABIL">STABIL & BERDAYA (Iman Teguh)</option>
                  <option value="DA_PEMBINAAN">DALAM PEMBINAAN / PENDAMPINGAN AKTIF</option>
                  <option value="PERLU_KUNJUNGAN">BUTUH KUNJUNGAN SUSULAN RUTIN</option>
                  <option value="BARU">BARU MASUK (Tahapan Pendataan Pertama)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">CATATAN PASTORAL *</label>
                <textarea 
                  required
                  value={newNoteNotes}
                  onChange={(e) => setNewNoteNotes(e.target.value)}
                  placeholder="Detail pokok permasalahan, hasil percakapan, dukungan rohani, doa khusus..."
                  className="w-full p-2.5 border border-slate-200 rounded outline-none h-24 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-1.5 border hover:bg-slate-50 rounded font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 transition"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AUXILIARY SUBTAB: FOLLOW UP INTERACTION MODULE
// ============================================================================
function FollowUpSection({ currentUser, onRefresh }: { currentUser: User; onRefresh: () => void }) {
  const [selectedMId, setSelectedMId] = useState<string>('');
  
  // Contacts entry form
  const [contactDate, setContactDate] = useState(new Date().toISOString().split('T')[0]);
  const [contactStatus, setContactStatus] = useState<'PENDING' | 'CONTACTED' | 'VISITED' | 'NO_RESPONSE' | 'RE_ENGAGED'>('CONTACTED');
  const [intervalDays, setIntervalDays] = useState<number>(14);
  const [responseType, setResponseType] = useState<'POSITIF' | 'NETRAL' | 'NEGATIF'>('POSITIF');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [scoreAdjustment, setScoreAdjustment] = useState<number>(50);

  const members = db.getMembers();
  const passiveMembers = members.filter(m => m.category === 'PASIF' || m.category === 'KURANG_AKTIF' || m.activityScore < 50);
  const activeSelected = members.find(m => m.id === selectedMId);

  // Indicators
  const totalPassive = passiveMembers.length;
  
  const totalMembersCount = members.length || 1;
  const activeCount = members.filter(m => m.activityScore >= 70).length;
  const activityPercentage = Math.round((activeCount / totalMembersCount) * 100);

  // Calculated attendance rate from member histories
  let totalLogs = 0;
  let presentLogs = 0;
  members.forEach(m => {
    if (m.attendanceHistory) {
      Object.keys(m.attendanceHistory).forEach(k => {
        totalLogs++;
        if (m.attendanceHistory![k]) presentLogs++;
      });
    }
  });
  const attendancePercentage = totalLogs > 0 ? Math.round((presentLogs / totalLogs) * 100) : 84;

  let totalFollows = 0;
  let positiveFollows = 0;
  members.forEach(m => {
    if (m.followUps) {
      m.followUps.forEach(f => {
        totalFollows++;
        if (f.responseType === 'POSITIF') positiveFollows++;
      });
    }
  });
  const positiveRatio = totalFollows > 0 ? Math.round((positiveFollows / totalFollows) * 100) : 75;

  const handleAddFollowUpLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelected) return;

    const parsedDays = Number(intervalDays);
    const dateObj = new Date(contactDate);
    dateObj.setDate(dateObj.getDate() + parsedDays);
    const nextDateStr = dateObj.toISOString().split('T')[0];

    const newLog: FollowUpRecord = {
      id: 'flog-' + Date.now(),
      date: contactDate,
      followUpBy: currentUser.fullName,
      status: contactStatus,
      notes: followUpNotes,
      intervalDays: parsedDays,
      nextFollowUpDate: nextDateStr,
      responseType: responseType
    };

    const currentFollowups = activeSelected.followUps || [];
    
    let newScore = activeSelected.activityScore;
    if (responseType === 'POSITIF') {
       newScore = Math.min(100, newScore + 15);
    } else if (responseType === 'NEGATIF') {
       newScore = Math.max(0, newScore - 5);
    }
    
    if (scoreAdjustment !== 50) {
      newScore = Number(scoreAdjustment);
    }

    // Assign appropriate classification
    let newCategory = activeSelected.category;
    if (newScore >= 90) newCategory = 'INTI';
    else if (newScore >= 70) newCategory = 'AKTIF';
    else if (newScore >= 30) newCategory = 'KURANG_AKTIF';
    else newCategory = 'PASIF';

    const updatedMember: Member = {
      ...activeSelected,
      activityScore: newScore,
      category: newCategory as any,
      followUps: [newLog, ...currentFollowups]
    };

    db.updateMember(updatedMember, currentUser);
    
    setFollowUpNotes('');
    setScoreAdjustment(50);
    alert(`Log follow-up berhasil dicatat untuk ${activeSelected.name}. Skor aktivitas disesuaikan menjadi ${newScore}%.`);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* KPI Indicators Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Jemaat Pasif</span>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{totalPassive} Jiwa</h3>
            <p className="text-[10px] text-slate-500 mt-1">Status penjangkauan aktif</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600"><AlertTriangle className="w-5 h-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Indikator Keaktifan Jemaat</span>
            <h3 className="text-2xl font-black text-indigo-700 mt-1">{activityPercentage}%</h3>
            <p className="text-[10px] text-slate-500 mt-1">Total konsolidasi sistem</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600"><Activity className="w-5 h-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Presentasi Kehadiran Jemaat</span>
            <h3 className="text-2xl font-black text-emerald-700 mt-1">{attendancePercentage}%</h3>
            <p className="text-[10px] text-slate-500 mt-1">Presensi Ibadah Raya</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><UserCheck className="w-5 h-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Indeks Respon Follow-Up</span>
            <h3 className="text-2xl font-black text-amber-700 mt-1">{positiveRatio}% Positif</h3>
            <p className="text-[10px] text-slate-500 mt-1">Tingkat responsivitas</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600"><Smile className="w-5 h-5" /></div>
        </div>
      </div>

      {/* Main split dashboard block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-indigo-100 bg-indigo-50/20">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 block">Daftar Follow-Up Pendataan</span>
            <p className="text-[10px] text-slate-400 font-light mt-0.5">Jemaat pasif / kurang aktif terpantau</p>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px]">
            {passiveMembers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">Semua jemaat terpantau aktif prima!</div>
            ) : (
              passiveMembers.map(item => {
                const isSelected = selectedMId === item.id;
                const lastFollowup = item.followUps?.[0];
                return (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedMId(item.id)}
                    className={`p-4 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between ${isSelected ? 'bg-indigo-50/50 border-r-3 border-indigo-600' : ''}`}
                  >
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                      <p className="text-[10px] text-slate-400">Skor: {item.activityScore}% • Sektor: {item.sector}</p>
                      {lastFollowup ? (
                        <span className="inline-block text-[9px] text-indigo-700 font-semibold bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded mt-0.5">
                          Kontak Terakhir: {lastFollowup.date} ({lastFollowup.responseType})
                        </span>
                      ) : (
                        <span className="inline-block text-[9px] text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.2 rounded mt-0.5">
                          Belum ada sejarah kontak
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {activeSelected ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="border-b pb-3">
                  <h4 className="text-sm font-bold text-slate-900">Catat Tindak Lanjut: {activeSelected.name}</h4>
                  <p className="text-[10px] text-slate-400 font-light mt-0.5">Input log telekomunikasi atau kunjungan rohani.</p>
                </div>

                <form onSubmit={handleAddFollowUpLog} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">TANGGAL KONTAK *</label>
                      <input 
                        type="date"
                        required
                        value={contactDate}
                        onChange={(e) => setContactDate(e.target.value)}
                        className="w-full p-2.5 border rounded outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">METODE HUBUNGAN *</label>
                      <select
                        value={contactStatus}
                        onChange={(e) => setContactStatus(e.target.value as any)}
                        className="w-full p-2.5 border rounded outline-none bg-white text-slate-700"
                      >
                        <option value="CONTACTED">📞 Telepon / WhatsApp Chat</option>
                        <option value="VISITED">🏡 Kunjungan Rumah (Home Visit)</option>
                        <option value="PENDING">⏳ Menunggu Penjadwalan</option>
                        <option value="NO_RESPONSE">🚫 Tidak Ada Respon (Sibuk)</option>
                        <option value="RE_ENGAGED">⛪ Aktif Beribadah Kembali</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">INTERVAL REKTAK (HARI) *</label>
                      <select
                        value={intervalDays}
                        onChange={(e) => setIntervalDays(Number(e.target.value))}
                        className="w-full p-2.5 border rounded outline-none bg-white text-slate-700"
                      >
                        <option value={7}>7 Hari (Sangat Intensif)</option>
                        <option value={14}>14 Hari (Pemantauan Sedang)</option>
                        <option value={30}>30 Hari (Rutin Bulanan)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">RESPON JEMAAT *</label>
                      <select
                        value={responseType}
                        onChange={(e) => setResponseType(e.target.value as any)}
                        className="w-full p-2.5 border rounded outline-none bg-white text-slate-700 font-semibold"
                      >
                        <option value="POSITIF" className="text-emerald-700 bg-emerald-50">🟢 POSITIF (Ramah)</option>
                        <option value="NETRAL" className="text-slate-700 bg-slate-50">🟡 NETRAL (Dingin)</option>
                        <option value="NEGATIF" className="text-rose-700 bg-rose-50">🔴 NEGATIF (Sakit/Keberatan)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                      <span>SET SKOR KEAKTIFAN SEKARANG</span>
                      <span className="font-mono text-indigo-700">{scoreAdjustment}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={scoreAdjustment}
                      onChange={(e) => setScoreAdjustment(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <span className="text-[9px] text-slate-400 block mt-0.5 leading-snug">Nilai keaktifan jemaat setelah interaksi terjalin. (Default: 50% / tengah).</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">CATATAN DETIL PERCAKAPAN *</label>
                    <textarea
                      required
                      placeholder="Detail obrolan, situasi, hambatan ketidakhadiran, atau pokok permohonan doa jemaat..."
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      className="w-full p-2.5 border rounded outline-none h-20 resize-none leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#0f172a] text-white rounded-lg hover:bg-slate-800 transition font-bold cursor-pointer"
                  >
                    Simpan Catatan Follow-Up
                  </button>
                </form>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="border-b pb-3">
                  <h4 className="text-sm font-bold text-slate-900 font-sans">Kronologi Penjangkauan ({activeSelected.followUps?.length || 0})</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Garis waktu kontak yang pernah dilakukan</p>
                </div>

                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {!activeSelected.followUps || activeSelected.followUps.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 italic text-xs">Belum ada riwayat follow-up. Silakan lakukan kontak perdana!</div>
                  ) : (
                    activeSelected.followUps.map(f => {
                      const getStatusBadge = (st: string) => {
                        if (st === 'CONTACTED') return 'bg-blue-50 text-blue-805 border-blue-100';
                        if (st === 'VISITED') return 'bg-purple-50 text-purple-805 border-purple-100';
                        if (st === 'RE_ENGAGED') return 'bg-emerald-50 text-emerald-805 border-emerald-100';
                        return 'bg-slate-100 text-slate-700 border-slate-200';
                      };

                      return (
                        <div key={f.id} className="p-3 bg-slate-50 border rounded-lg space-y-2 text-xs relative hover:shadow-2xs transition">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-900">{f.date}</span>
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-semibold uppercase ${getStatusBadge(f.status)}`}>
                              {f.status}
                            </span>
                          </div>
                          
                          <p className="font-light text-slate-600 leading-relaxed text-[11px] whitespace-pre-line">“{f.notes}”</p>
                          
                          <div className="border-t pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[9px] text-slate-400">
                            <span>Petugas: <strong className="text-slate-600">{f.followUpBy}</strong></span>
                            <span>Interval: {f.intervalDays} Hari • Next: <strong className="text-indigo-600">{f.nextFollowUpDate}</strong></span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white p-12 border rounded-xl text-center text-slate-405 text-xs italic shadow-xs">
              Silakan pilih salah satu jemaat pasif di sebelah kiri untuk mengisi log follow up dan melihat sejarah kontaknya.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AUXILIARY SUBTAB: DEMOGRAPHIC & BIRTHDAY ANALYSIS MODULE
// ============================================================================
function AnalysisSection() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1 - 12
  
  const members = db.getMembers();
  
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const celebrants = members.filter(m => {
    if (!m.birthDate) return false;
    const parts = m.birthDate.split('-');
    if (parts.length < 2) return false;
    const birthMonth = Number(parts[1]);
    return birthMonth === selectedMonth;
  }).sort((a, b) => {
    const dayA = Number(a.birthDate.split('-')[2]);
    const dayB = Number(b.birthDate.split('-')[2]);
    return dayA - dayB;
  });

  const sectorMap: Record<string, number> = {};
  members.forEach(m => {
    if (m.sector) {
      sectorMap[m.sector] = (sectorMap[m.sector] || 0) + 1;
    }
  });
  const sectorData = Object.keys(sectorMap).map(s => ({
    label: s,
    value: sectorMap[s]
  }));

  const catMap: Record<string, number> = {};
  members.forEach(m => {
    if (m.category) {
      catMap[m.category] = (catMap[m.category] || 0) + 1;
    }
  });

  const handleCopyWAGreeting = (item: Member) => {
    const greeting = `Segenap keluarga besar Meta Connect mengucapkan: Selamat Hari Ulang Tahun ke-${item.age || 30} untuk Bapak/Ibu/Saudara/i ${item.name}! Kiranya berkat Tuhan melimpah atas kesehatan, damai sejahtera, dan pertumbuhan iman rohani yang teguh di dalam Kristus Yesus. Tuhan Yesus Memberkati! 🎂⛪`;
    navigator.clipboard.writeText(greeting);
    alert(`Ucapan WA formal berhasil disalin ke clipboard untuk dikirim kepada ${item.name}!`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Birthday Tracker */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-rose-100">
            <div className="flex items-center space-x-2">
              <Cake className="w-4 h-4 text-[#ec4899]" />
              <h4 className="text-sm font-bold text-slate-900 font-sans">Ulang Tahun Bulan Ini</h4>
            </div>
            
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-2.5 py-1 text-xs border rounded bg-slate-50 font-semibold focus:outline-none"
            >
              {monthNames.map((m, idx) => (
                <option key={idx} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[400px] pr-1">
            {celebrants.length === 0 ? (
              <div className="text-center py-16 text-slate-400 italic text-xs">Tidak ada jemaat berulang tahun di bulan {monthNames[selectedMonth - 1]}</div>
            ) : (
              celebrants.map(f => {
                const parts = f.birthDate.split('-');
                const birthdayStr = parts.length >= 3 ? `${Number(parts[2])} ${monthNames[selectedMonth - 1]}` : f.birthDate;
                
                return (
                  <div key={f.id} className="p-3 bg-rose-55/10 border border-rose-200/40 rounded-lg flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-xl">🎂</span>
                      <div>
                        <p className="font-extrabold text-slate-900">{f.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Lahir: <strong className="text-rose-600">{birthdayStr}</strong> • Usia: {f.age || 25} Thn</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleCopyWAGreeting(f)}
                      title="Salin pesan ucapan WA formal"
                      className="p-1.5 bg-rose-50 hover:bg-rose-150 text-rose-700 border border-rose-200 rounded-lg shrink-0 transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Custom Reporting Diagrams */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-indigo-700 animate-pulse" />
              <h4 className="text-sm font-bold text-slate-900 font-sans">Kurva Pembagian & Demografi Pertumbuhan</h4>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700">Enterprise Verified</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Sensus Anggota Per Wilayah Sektor</h5>
              <div className="p-4 bg-slate-50/50 border rounded-lg space-y-3.5">
                {sectorData.length === 0 ? (
                  <div className="text-center italic text-slate-400 text-xs">Database sector kosong</div>
                ) : (
                  sectorData.map((sec, idx) => {
                    const ratio = Math.round((sec.value / Math.max(members.length, 1)) * 100);
                    return (
                      <div key={idx} className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-705">{sec.label}</span>
                          <span className="font-mono text-slate-400 text-[10px]">{sec.value} Jiwa ({ratio}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-1.5 rounded-full" 
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Indeks Rasio Penggolongan Kategori</h5>
              <div className="p-4 bg-slate-50/50 border rounded-lg space-y-3.5">
                {[
                  { label: "Jemaat Inti (90%+)", value: catMap.INTI || 0, color: "bg-emerald-600" },
                  { label: "Jemaat Aktif (70%+)", value: catMap.AKTIF || 0, color: "bg-blue-600" },
                  { label: "Kurang Aktif", value: catMap.KURANG_AKTIF || 0, color: "bg-amber-500" },
                  { label: "Jemaat Pasif", value: catMap.PASIF || 0, color: "bg-rose-500" },
                  { label: "Jemaat Baru", value: catMap.BARU || 0, color: "bg-indigo-505" },
                  { label: "Jemaat Lansia (Senior)", value: catMap.LANSIA || 0, color: "bg-purple-600" }
                ].map((item, idx) => {
                  const ratio = Math.round((item.value / Math.max(members.length, 1)) * 100);
                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-705">{item.label}</span>
                        <span className="font-mono text-slate-500 text-[10px]">{item.value} Jiwa ({ratio}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`${item.color} h-1.5 rounded-full`}
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="p-4 bg-slate-50 border rounded-xl flex items-start space-x-3 text-xs leading-relaxed text-slate-900 font-normal">
            <Sparkles className="w-4 h-4 text-indigo-650 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-bold text-slate-950 text-xs">Analisis Rekonsiliasi Pertumbuhan Bulanan</p>
              <p className="font-light text-slate-500 text-[11px] mt-0.5">Sistem secara otomatis mengaudit pergeseran keaktifan jemaat setiap akhir pekan. Jemaat dengan skor di bawah 50% diklasifikasikan sebagai potensi pasif dan langsung dialihkan ke departemen follow-up penggembalaan demi melancarkan jembatan silih asih.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
