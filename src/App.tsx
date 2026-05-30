/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Church, UserRole } from './types/church';
import { db } from './utils/storage';

// Rendered sub-modules
import MemberManagement from './components/MemberManagement';
import FinancialManagement from './components/FinancialManagement';
import ApprovalSystem from './components/ApprovalSystem';
import SundaySchool from './components/SundaySchool';
import Divisions from './components/Divisions';
import TasksManagement from './components/TasksManagement';
import ChurchManagement from './components/ChurchManagement';
import AuditTrailView from './components/AuditTrailView';
import KPICard from './components/KPICard';
import { CustomDonutChart, CustomLineChart } from './components/CustomChart';
import ServiceManagement from './components/ServiceManagement';
import PendingItems from './components/PendingItems';

// Lucide Icons
import { 
  Users, DollarSign, ListChecks, Landmark, Network, Sparkles, BookOpen, 
  RotateCcw, History, ShieldAlert, BadgeCheck, LogOut, LayoutDashboard, 
  Bell, HelpCircle, ArrowRight, UserPlus, FileText, Settings, Key, 
  Menu, X, CheckCircle, Info, ChevronRight, CheckCircle2, Calendar, CheckSquare,
  Camera, Upload
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(db.getSessionUser());
  const [dbMode, setDbMode] = useState<'DEMO' | 'REAL'>(db.getMode());
  const [activeMenu, setActiveMenu] = useState<string>(() => {
    const user = db.getSessionUser();
    if (user?.role === 'SUPER_ADMIN') return 'synod';
    return 'dashboard';
  });
  const [auditedChurchId, setAuditedChurchId] = useState<string>('');
  
  // Registration form toggles
  const [isRegisterChurch, setIsRegisterChurch] = useState(false);
  const [regMode, setRegMode] = useState<'USER_LINKED' | 'NEW_CHURCH'>('USER_LINKED');
  const [regSelectedChurchId, setRegSelectedChurchId] = useState('');
  const [regUserRole, setRegUserRole] = useState<UserRole>('PELAYAN');
  
  // Login form values
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register Church form values
  const [regChurchName, setRegChurchName] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regProvince, setRegProvince] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPastor, setRegPastor] = useState('');
  const [regUser, setRegUser] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPassConfirm, setRegPassConfirm] = useState('');
  
  // Verification considerations fields
  const [regUserPhone, setRegUserPhone] = useState('');
  const [regUserGender, setRegUserGender] = useState<'L' | 'P'>('L');
  const [regUserTalents, setRegUserTalents] = useState('');
  const [regUserReason, setRegUserReason] = useState('');

  // Notifications alert states
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  // Responsive mobile sidebar
  const [mobileSbarOpen, setMobileSbarOpen] = useState(false);

  // Seed for refresh triggers
  const [seed, setSeed] = useState(0);

  // Profile Picture (Avatar) update states
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarInputUrl, setAvatarInputUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Pending default tab redirect
  const [pendingDefaultTab, setPendingDefaultTab] = useState<'USERS' | 'APPROVALS' | 'TASKS' | undefined>(undefined);

  // Auditing context simulation parameters
  const effectiveRole = (currentUser?.role === 'SUPER_ADMIN' && auditedChurchId) ? 'GEMBALA' : currentUser?.role;
  const effectiveChurchId = (currentUser?.role === 'SUPER_ADMIN' && auditedChurchId) ? auditedChurchId : currentUser?.churchId;
  const effectiveUser = currentUser ? {
    ...currentUser,
    role: effectiveRole as UserRole,
    churchId: effectiveChurchId
  } : null;

  const permittedMenus = currentUser ? (
    effectiveRole === 'SUPER_ADMIN' ? [
      { id: 'synod', name: 'Verifikasi Cabang', icon: <Network className="w-4 h-4 shrink-0" />, desc: 'Kelola pendaftaran cabang baru, peninjauan legalitas, & audit' },
      { id: 'audit', name: 'Audit Trail Nasional', icon: <History className="w-4 h-4 shrink-0" />, desc: 'Lacak riwayat perubahan, penambahan data jemaat & rollback keuangan' }
    ] : [
      { id: 'dashboard', name: 'Dasbor Analytics', icon: <LayoutDashboard className="w-4 h-4 shrink-0" />, desc: 'Ringkasan performa jemaat, grafik kehadiran, & info penting' },
      { id: 'members', name: 'Database Jemaat', icon: <Users className="w-4 h-4 shrink-0" />, desc: 'Kelola dan klasifikasi data jemaat aktif, pasif, remaja & lansia' },
      { id: 'services', name: 'Pelayanan & Jadwal', icon: <Calendar className="w-4 h-4 shrink-0" />, desc: 'Jadwalkan pelayan mimbar, petugas musik, perlengkapan & liturgis' },
      { id: 'approvals', name: 'Approval Workflow', icon: <ListChecks className="w-4 h-4 shrink-0" />, desc: 'Persetujuan proposal divisi pelayanan, inventaris & anggaran dana' },
      { id: 'finance', name: 'Buku Kas & Anggaran', icon: <Landmark className="w-4 h-4 shrink-0" />, desc: 'Metrik akuntansi double-entry, persepuluhan, pemasukan & pengeluaran' },
      { id: 'school', name: 'Sekolah Minggu', icon: <BookOpen className="w-4 h-4 shrink-0" />, desc: 'Pencatatan kelas anak, database murid, absensi & pendataan pengajar' },
      { id: 'divisions', name: 'Divisi Pelayanan', icon: <Network className="w-4 h-4 shrink-0" />, desc: 'Manajemen staf departemen, divisi musik, multimedia, & diakonia' },
      { id: 'tasks', name: 'Kanban Task Board', icon: <Key className="w-4 h-4 shrink-0" />, desc: 'Tabel papan tugas to-do list persiapan peribadatan & operasional' },
      { id: 'pending', name: 'Tugas & Verifikasi Pending', icon: <CheckSquare className="w-4 h-4 shrink-0" />, desc: 'Antrean verifikasi akun pendaftar, checklist tugas persiapan, & approval' },
      { id: 'audit', name: 'Audit Log & Rollback', icon: <History className="w-4 h-4 shrink-0" />, desc: 'Catetan log audit trail, verifikasi aktivitas, & fitur pemulihan' }
    ].filter(menu => {
      const dbMenu = [
        { id: 'dashboard', roles: ['GEMBALA', 'PENGURUS', 'KEPALA_DIVISI', 'PELAYAN'] },
        { id: 'members', roles: ['GEMBALA', 'PENGURUS'] },
        { id: 'services', roles: ['GEMBALA', 'PENGURUS', 'KEPALA_DIVISI', 'PELAYAN'] },
        { id: 'approvals', roles: ['GEMBALA', 'PENGURUS', 'PELAYAN'] },
        { id: 'finance', roles: ['GEMBALA', 'PENGURUS'] },
        { id: 'school', roles: ['GEMBALA', 'PENGURUS', 'KEPALA_DIVISI'] },
        { id: 'divisions', roles: ['GEMBALA', 'KEPALA_DIVISI'] },
        { id: 'tasks', roles: ['GEMBALA', 'PENGURUS', 'KEPALA_DIVISI', 'PELAYAN'] },
        { id: 'pending', roles: ['GEMBALA', 'PENGURUS', 'KEPALA_DIVISI', 'PELAYAN'] },
        { id: 'audit', roles: ['GEMBALA'] }
      ].find(m => m.id === menu.id);
      return dbMenu ? dbMenu.roles.includes(effectiveRole) : false;
    })
  ) : [];

  useEffect(() => {
    const verifiedChurches = db.getChurches().filter(c => c.status === 'VERIFIED');
    if (verifiedChurches.length > 0) {
      setRegSelectedChurchId(verifiedChurches[0].id);
    }
  }, [seed, dbMode]);

  // Sync state helpers
  const handleToggleDbMode = (mode: 'DEMO' | 'REAL') => {
    db.setMode(mode);
    setDbMode(mode);
    // Automatic logout on database context swap to prevent session leak
    setCurrentUser(null);
    db.setSessionUser(null);
    setActiveMenu('dashboard');
    setSeed(p => p + 1);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setLoginError("Harap masukkan nama pengguna dan kata sandi.");
      return;
    }

    // Standard credential login is always in REAL mode as requested
    db.setMode('REAL');
    setDbMode('REAL');

    const allUsers = db.getUsers();
    const match = allUsers.find(u => u.username === username.trim().toLowerCase());

    const isPassValid = match && (
      match.password 
        ? match.password === password 
        : username.trim().toLowerCase() === password
    );

     if (match && isPassValid) {
       if (match.isVerified === false) {
         const lChurch = db.getChurches().find(c => c.id === match.churchId);
         setLoginError(`Akun Anda (${match.fullName}) sedang berada dalam antrean. Anda harus disetujui/diverifikasi oleh Gembala Sidang cabang "${lChurch?.name || match.churchId}" terlebih dahulu sebelum dapat menggunakan sistem.`);
         return;
       }
       setCurrentUser(match);
       db.setSessionUser(match);
       setLoginError('');
       if (match.role === 'SUPER_ADMIN') {
         setActiveMenu('synod');
       } else {
         setActiveMenu('dashboard');
       }
     } else {
      setLoginError("Kombinasi nama pengguna atau kata sandi salah. Pastikan kredensial Anda valid untuk Mode Real.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    db.setSessionUser(null);
    setActiveMenu('dashboard');
  };

  const handleRegisterUserLinkedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regPastor || !regUser || !regPass || !regPassConfirm || !regSelectedChurchId) {
      alert("Harap lengkapi nama, username, password, konfirmasi password, dan pilih gereja terverifikasi.");
      return;
    }

    if (regPass !== regPassConfirm) {
      alert("⚠️ Sandi login tidak cocok! Harap ketik ulang kedua sandi login dengan sama persis.");
      return;
    }

    const usernameClean = regUser.trim().toLowerCase();
    const isDuplicate = db.getUsers().some(u => u.username.trim().toLowerCase() === usernameClean);
    if (isDuplicate) {
      alert(`⚠️ USERNAME SUDAH TERDAFTAR: Nama pengguna "${regUser.trim()}" sudah digunakan di sistem. Harap gunakan nama pengguna (username) lain yang unik agar tidak terjadi data ganda!`);
      return;
    }

    const matchedChurch = db.getChurches().find(c => c.id === regSelectedChurchId);
    if (!matchedChurch) return;

    const nUser: User = {
      id: 'u-' + Date.now(),
      username: usernameClean,
      fullName: regPastor,
      email: regEmail || `${usernameClean}@metaconnect.org`,
      role: regUserRole,
      churchId: regSelectedChurchId,
      password: regPass,
      isVerified: false, // Needs Gembala approval
      phone: regUserPhone,
      gender: regUserGender,
      talents: regUserTalents,
      registrationReason: regUserReason
    };

    db.createUser(nUser);
    db.logAudit(nUser.id, nUser.fullName, 'USER_REGISTER', `Pendaftaran akun baru (${nUser.role}: ${nUser.fullName}) menunggu persetujuan verifikasi Gembala Sidang cabang: ${matchedChurch.name}`);

    alert(`Pendaftaran Berhasil! Akun Anda (${nUser.fullName}) telah dicatat di sistem dan saat ini sedang menunggu VERIFIKASI dari Gembala Sidang di cabang "${matchedChurch.name}". Anda baru dapat masuk setelah disetujui Gembala setempat.`);
    setIsRegisterChurch(false);

    // Clear
    setRegPastor('');
    setRegUser('');
    setRegPass('');
    setRegPassConfirm('');
    setRegEmail('');
    setRegUserPhone('');
    setRegUserGender('L');
    setRegUserTalents('');
    setRegUserReason('');
  };

  const handleRegisterChurchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regChurchName || !regPastor || !regUser || !regPass || !regPassConfirm) {
      alert("Harap lengkapi semua field registrasi gereja.");
      return;
    }

    if (regPass !== regPassConfirm) {
      alert("⚠️ Sandi login tidak cocok! Harap ketik ulang kedua sandi login dengan sama persis.");
      return;
    }

    const usernameClean = regUser.trim().toLowerCase();
    const isDuplicate = db.getUsers().some(u => u.username.trim().toLowerCase() === usernameClean);
    if (isDuplicate) {
      alert(`⚠️ USERNAME SUDAH TERDAFTAR: Nama pengguna "${regUser.trim()}" sudah digunakan di sistem. Harap gunakan nama pengguna (username) lain yang unik agar tidak terjadi data ganda!`);
      return;
    }

    const nChurch: Church = {
      id: 'c-' + Date.now(),
      name: regChurchName,
      address: regAddress,
      city: regCity,
      province: regProvince,
      phone: regPhone,
      email: regEmail,
      status: 'PENDING'
    };

    const nUser: User = {
      id: 'u-' + Date.now(),
      username: regUser.trim().toLowerCase(),
      fullName: regPastor,
      email: regEmail,
      role: 'GEMBALA',
      churchId: nChurch.id,
      password: regPass,
      isVerified: true // Gembala initiating church registers with instant verification setup
    };

    // Save to DB
    db.createChurch(nChurch, nUser);
    db.createUser(nUser);
    
    alert("Registrasi Berhasil! Cabang gereja Anda masuk dalam antrean verifikasi Yayasan Pusat. Silakan login menggunakan akun Gembala yang baru saja dibuat.");
    setIsRegisterChurch(false);
    
    // Clear registration forms
    setRegChurchName('');
    setRegAddress('');
    setRegCity('');
    setRegProvince('');
    setRegPhone('');
    setRegEmail('');
    setRegPastor('');
    setRegUser('');
    setRegPass('');
    setRegPassConfirm('');
  };

  // Profile icon/avatar update handlers
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2.5 * 1024 * 1024) {
      alert("⚠️ File gambar terlalu besar! Batas maksimum adalah 2.5MB agar performa database lokal tetap ringan.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatarInputUrl(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = () => {
    if (!currentUser) return;
    
    const updatedUser = {
      ...currentUser,
      avatar: avatarInputUrl ? avatarInputUrl.trim() : undefined
    };

    // Update in users collection
    db.updateUser(updatedUser);
    
    // Update active user session
    db.setSessionUser(updatedUser);
    
    // Update local state
    setCurrentUser(updatedUser);
    
    // Log audit trail
    db.logAudit(
      currentUser.id, 
      currentUser.fullName, 
      'USER_EDIT_AVATAR', 
      "Memperbarui foto profil akun pengguna melalui menu pengaturan foto profil."
    );

    alert("🎉 Foto profil Anda berhasil diperbarui di sistem!");
    setIsAvatarModalOpen(false);
  };

  // Direct quick logins for demo setup
  const handleQuickDemoLogin = (role: 'GEMBALA' | 'PENGURUS' | 'PELAYAN' | 'SUPER_ADMIN') => {
    // Force mode to DEMO as they clicked the demo testing bypass buttons
    db.setMode('DEMO');
    setDbMode('DEMO');

    const uname = role === 'SUPER_ADMIN' ? 'superadmin' : role.toLowerCase();
    const allUsers = db.getUsers();
    const match = allUsers.find(u => u.username === uname);
    if (match) {
      setCurrentUser(match);
      db.setSessionUser(match);
      if (role === 'SUPER_ADMIN') {
        setActiveMenu('synod');
      } else {
        setActiveMenu('dashboard');
      }
    }
  };

  // Dynamic colors matching church network specifications
  const activeChurch = db.getChurches().find(c => c.id === effectiveUser?.churchId) || db.getChurches()[0];
  const churchThemeColor = activeChurch?.themeColor || '#0f172a';

  // Smart Alert generation
  interface SystemAlert {
    id: string;
    title: string;
    desc: string;
    type: 'WARNING' | 'DANGER' | 'INFO';
    targetMenu: string;
    targetSubTab?: 'USERS' | 'APPROVALS' | 'TASKS';
    actionLabel: string;
  }
  const computedAlerts: SystemAlert[] = [];
  const activeMembers = db.getMembers();
  const inactiveCount = activeMembers.filter(m => m.activityScore < 40).length;
  const newMembersCount = activeMembers.filter(m => m.category === 'BARU').length;
  const pendingApprovalsCount = db.getApprovals().filter(a => a.status === 'SUBMITTED').length;
  const pendingUsersCount = currentUser ? db.getUsers().filter(u => u.churchId === (effectiveUser || currentUser)?.churchId && !u.isVerified).length : 0;

  if (inactiveCount > 0) {
    computedAlerts.push({
      id: 'al-1',
      title: 'Jemaat Mulai Pasif',
      desc: `${inactiveCount} Jemaat memiliki skor aktivitas di bawah 40%. Butuh kunjungan pastoral jemaat.`,
      type: 'WARNING',
      targetMenu: 'members',
      actionLabel: 'Lihat Database Jemaat'
    });
  }
  if (newMembersCount > 0) {
    computedAlerts.push({
      id: 'al-2',
      title: 'Follow-up Jemaat Baru',
      desc: `Ada ${newMembersCount} jemaat baru belum dihubungi kordinator sektor pelayanan.`,
      type: 'INFO',
      targetMenu: 'members',
      actionLabel: 'Tindak Lanjuti Jemaat'
    });
  }
  if (pendingApprovalsCount > 0) {
    computedAlerts.push({
      id: 'al-3',
      title: 'Persetujuan Anggaran',
      desc: `${pendingApprovalsCount} Pengajuan departemen butuh verifikasi pimpinan Gembala Sidang.`,
      type: 'DANGER',
      targetMenu: 'approvals',
      actionLabel: 'Buka Workflow Approval'
    });
  }
  if (pendingUsersCount > 0) {
    computedAlerts.push({
      id: 'al-4',
      title: 'Verifikasi Pendaftar Baru',
      desc: `Terdapat ${pendingUsersCount} pendaftar baru yang menunggu persetujuan & integrasi database.`,
      type: 'WARNING',
      targetMenu: 'pending',
      targetSubTab: 'USERS',
      actionLabel: 'Verifikasi Akun Baru'
    });
  }

  // Categories metrics for dynamic donut charts
  const categoriesCount = {
    INTI: activeMembers.filter(m => m.category === 'INTI').length,
    AKTIF: activeMembers.filter(m => m.category === 'AKTIF').length,
    PASIF: activeMembers.filter(m => m.category === 'PASIF').length,
    LANSIA: activeMembers.filter(m => m.category === 'LANSIA').length,
    REMAJA: activeMembers.filter(m => m.category === 'REMAJA').length,
    PEMUDA: activeMembers.filter(m => m.category === 'PEMUDA').length,
    BARU: activeMembers.filter(m => m.category === 'BARU').length
  };

  const donutSlices = [
    { label: 'Jemaat Inti', value: categoriesCount.INTI, color: '#0f172a' },
    { label: 'Aktif Kebaktian', value: categoriesCount.AKTIF, color: '#3b82f6' },
    { label: 'Pasif Jeda', value: categoriesCount.PASIF, color: '#94a3b8' },
    { label: 'Lansia Senior', value: categoriesCount.LANSIA, color: '#f59e0b' },
    { label: 'Remaja (Youth)', value: categoriesCount.REMAJA, color: '#ec4899' },
    { label: 'Pemuda (Cell)', value: categoriesCount.PEMUDA, color: '#10b981' },
    { label: 'Sidi Baru', value: categoriesCount.BARU, color: '#6366f1' }
  ].filter(s => s.value > 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950 font-sans flex flex-col justify-between">
      
      {/* Mode Impersonation Audit Banner */}
      {auditedChurchId && (
        <div className="bg-indigo-900 border-b border-indigo-950 text-white px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between text-xs font-bold leading-relaxed relative z-50 select-none shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="p-1 bg-yellow-400 text-slate-900 rounded font-black text-[9px] tracking-wider uppercase animate-pulse shrink-0 font-sans">MODE AUDIT CABANG</span>
            <span className="text-[11px] font-sans antialiased font-semibold">
              Sedang mengaudit & mensimulasikan sistem lokal cabang: <span className="underline decoration-yellow-405 font-extrabold">{db.getChurches().find(c => c.id === auditedChurchId)?.name || auditedChurchId}</span> as <span className="text-yellow-400">Gembala Sidang</span>.
            </span>
          </div>
          <button 
            onClick={() => {
              setAuditedChurchId('');
              setActiveMenu('synod');
            }}
            className="mt-2 sm:mt-0 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg font-black text-[10px] tracking-wider uppercase cursor-pointer transition shadow-sm hover:scale-[1.03]"
          >
            ← Keluar Mode Audit (Kembali Ke Sektor Pusat)
          </button>
        </div>
      )}

      {/* 1. Global Header with Live Swap Demo/Real context */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-6 py-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center space-x-3 group select-none">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-650 via-blue-600 to-indigo-500 text-white shadow-sm shadow-indigo-100/50 transition duration-350 group-hover:scale-105 border border-indigo-400/20">
            {/* Ambient visual layers */}
            <span className="absolute inset-0 rounded-xl bg-indigo-500/10 blur-xs animate-pulse opacity-80"></span>
            <div className="absolute w-1.5 h-1.5 rounded-full bg-white shine-effect animate-pulse"></div>
            <Network className="w-5 h-5 relative z-11 text-white stroke-[2.2]" />
            <div className="absolute inset-0.5 border border-white/10 rounded-lg"></div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-sm font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition leading-none">
                META <span className="text-indigo-600 group-hover:text-slate-900 transition font-black">CONNECT</span>
              </h1>
              <span className="text-[8px] bg-indigo-50 text-indigo-705 px-1 rounded-sm font-black border border-indigo-100 uppercase tracking-widest leading-none">v4.1</span>
            </div>
            <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mt-1">Church Operating System</p>
          </div>
        </div>

        {/* Real / Demo Toggle Swapper - Only visible when NOT logged in */}
        {!currentUser && (
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200/80 shadow-3xs select-none">
            <button
              onClick={() => handleToggleDbMode('DEMO')}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-extrabold rounded-lg transition-all cursor-pointer ${dbMode === 'DEMO' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
              title="Gunakan database contoh bawaan untuk eksplorasi simulasi"
            >
              Mode Demo
            </button>
            <button
              onClick={() => handleToggleDbMode('REAL')}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-extrabold rounded-lg transition-all cursor-pointer ${dbMode === 'REAL' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
              title="Gunakan database kosong untuk merekam transaksi nyata"
            >
              Mode Real (Bersih)
            </button>
          </div>
        )}
      </header>

      {/* 2. Main Content Frame */}
      <main className="grow flex flex-col">
        {!currentUser ? (
          
          /* --- LANDING PAGE WITH AUTH & SPECIFICATIONS --- */
          <div className="bg-[#f8fafc]">
            {/* Elegant Hero and Description */}
            <div className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center space-y-4">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-bold border border-blue-100">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Enterprise Church ERP & CRM v4.1</span>
              </span>
              <h2 className="text-4xl md:text-5xl font-black font-sans tracking-tight text-slate-950 leading-tight">
                Satu Dasbor Pintar <br className="hidden sm:inline" />
                <span className="text-[#0f172a] underline decoration-slate-300 decoration-wavy">Untuk Pelayanan Gereja</span>
              </h2>
              <p className="text-base max-w-2xl mx-auto text-slate-500 font-normal leading-relaxed">
                Platform management gereja yang stabil, jelas, aman, dan mudah digunakan untuk koordinasi penggembalaan jemaat, tata kelola keuangan terbuka, verifikasi yayasan pusat, sekolah minggu, serta pelaporan log audit digital.
              </p>
            </div>

            {/* Split login and features highlights - Reordered so Login is on top on mobile screens */}
            <div className="max-w-5xl mx-auto px-6 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-10">
              
              {/* Features overview column (7 spans) - Displayed second on mobile */}
              <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2">Modul Utama Meta Connect</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'f-m', title: 'Database Jemaat Terintegrasi', desc: 'Sistem scoring kehadiran 90%+, klasifikasi otomatis jemaat pasif, baru, lansia, pemuda secara dinamis.' },
                    { id: 'f-f', title: 'Double-Entry Keuangan & Nota', desc: 'Pembukuan transparan persepuluhan, korelasi invoice fisik, grafik cash flow komparatif bulanan.' },
                    { id: 'f-a', title: 'Approval Alur Kerja Jemaat', desc: 'Pengajuan retreat, proposal Sound Mixer dari koordinasi pengurus ke Gembala Sidang.' },
                    { id: 'f-c', title: 'Backups & Rollback System', desc: 'Pencegahan kehilangan data update. Undo pengubahan data dengan mengklik draf log audit trail.' }
                  ].map(f => (
                    <div key={f.id} id={f.id} className="bg-white p-5 border border-slate-200/80 rounded-xl space-y-1 hover:shadow-xs transition duration-200">
                      <h4 className="text-sm font-extrabold text-slate-900 leading-tight">{f.title}</h4>
                      <p className="text-xs text-slate-500 font-normal leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="p-5 bg-slate-900 text-white rounded-xl space-y-1.5 border border-slate-950 flex items-start space-x-3.5 shadow-sm">
                  <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-extrabold uppercase tracking-wider block text-amber-400">Pengamanan Isolat Multi-Tenant</span>
                    <p className="font-light text-slate-300 leading-relaxed">Seluruh role login terpisah sekuritas total. Gembala, pengurus, pelayan, dan super admin kantor pusat diisolasi tanpa kebocoran data lintasan gereja lokal.</p>
                  </div>
                </div>
              </div>

              {/* Login and signup Column (5 spans) - Displayed first on mobile */}
              <div className="lg:col-span-5 bg-white p-6 border border-slate-200/80 rounded-2xl shadow-xs space-y-5 order-1 lg:order-2">
                
                {/* Mode indicators */}
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    {isRegisterChurch ? 'Registrasi Gereja Baru' : 'Masuk Portal Sistem'}
                  </span>
                  <span className="text-[10px] bg-indigo-50 border border-indigo-100 px-2 py-0.5 font-bold font-mono rounded text-indigo-700">
                    {dbMode === 'DEMO' ? 'MODE TESTING' : 'DATABASE BERSIH'}
                  </span>
                </div>

                {isRegisterChurch ? (
                  <div className="space-y-4">
                    {/* Inner Mode toggle */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setRegMode('USER_LINKED')}
                        className={`py-1.5 text-center text-[10px] sm:text-xs font-bold rounded-md transition ${regMode === 'USER_LINKED' ? 'bg-[#0f172a] text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Hubung Gereja
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegMode('NEW_CHURCH')}
                        className={`py-1.5 text-center text-[10px] sm:text-xs font-bold rounded-md transition ${regMode === 'NEW_CHURCH' ? 'bg-[#0f172a] text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Cabang Baru
                      </button>
                    </div>

                    {regMode === 'USER_LINKED' ? (
                      /* USER REGISTER LINKED TO VERIFIED CHURCH */
                      <form onSubmit={handleRegisterUserLinkedSubmit} className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">PILIH GEREJA TERVERIFIKASI *</label>
                          <select
                            value={regSelectedChurchId}
                            onChange={(e) => setRegSelectedChurchId(e.target.value)}
                            required
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded focus:bg-white outline-none text-xs font-semibold"
                          >
                            <option value="">-- Pilih Gereja Terdaftar --</option>
                            {db.getChurches().filter(c => c.status === 'VERIFIED').map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">NAMA LENGKAP PENDAFTAR *</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="Contoh: Sdr. Timothy Lukinto"
                            value={regPastor}
                            onChange={(e) => setRegPastor(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded outline-none text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">EMAIL AKSES</label>
                            <input 
                              type="email" 
                              placeholder="pendaftar@metaconnect.org"
                              value={regEmail}
                              onChange={(e) => setRegEmail(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border rounded outline-none text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">PERAN PELAYANAN *</label>
                            <select
                              value={regUserRole}
                              onChange={(e) => setRegUserRole(e.target.value as UserRole)}
                              required
                              className="w-full p-2.5 bg-slate-50 border rounded outline-none text-xs text-slate-700 bg-white"
                            >
                              <option value="PELAYAN">PELAYAN JEMAAT</option>
                              <option value="KEPALA_DIVISI">KEPALA DEPARTEMEN</option>
                              <option value="PENGURUS">STAFF BENDAHARA / PENGURUS</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t pt-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">NO. HANDPHONE / WA</label>
                            <input 
                              type="text" 
                              placeholder="08123xxxx"
                              value={regUserPhone}
                              onChange={(e) => setRegUserPhone(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border rounded outline-none text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">JENIS KELAMIN</label>
                            <select
                              value={regUserGender}
                              onChange={(e) => setRegUserGender(e.target.value as 'L' | 'P')}
                              className="w-full p-2.5 bg-slate-50 border rounded outline-none text-xs text-slate-700 bg-white"
                            >
                              <option value="L">LAKI-LAKI (L)</option>
                              <option value="P">PEREMPUAN (P)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">MINAT DEPARTEMEN / TALENTA PELAYANAN</label>
                          <input 
                            type="text" 
                            placeholder="Contoh: Pemusik, Singer, Guru Sekolah Minggu, Multimedia"
                            value={regUserTalents}
                            onChange={(e) => setRegUserTalents(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border rounded outline-none text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">ALASAN & MOTIVASI BERGABUNG / PELAYANAN</label>
                          <textarea 
                            placeholder="Tuliskan alasan singkat atau rekomendasi dari pengurus jemaat yang mendukung..."
                            value={regUserReason}
                            onChange={(e) => setRegUserReason(e.target.value)}
                            rows={2}
                            className="w-full p-2.5 bg-slate-50 border rounded outline-none text-xs resize-none"
                          />
                        </div>

                        <div className="border-t pt-3 space-y-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">USERNAME LOGIN *</label>
                            <input 
                              type="text" 
                              required 
                              placeholder="username_anda"
                              value={regUser}
                              onChange={(e) => setRegUser(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded outline-none font-mono text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">SANDI LOGIN *</label>
                              <input 
                                type="password" 
                                required 
                                placeholder="Ketik sandi"
                                value={regPass}
                                onChange={(e) => setRegPass(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded outline-none text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">KONFIRMASI SANDI *</label>
                              <input 
                                type="password" 
                                required 
                                placeholder="Ulangi sandi"
                                value={regPassConfirm}
                                onChange={(e) => setRegPassConfirm(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded outline-none text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          className="w-full py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white font-semibold rounded-lg transition mt-3"
                        >
                          Daftar Akun Anggota
                        </button>

                        <button 
                          type="button" 
                          onClick={() => setIsRegisterChurch(false)}
                          className="w-full py-1.5 text-center text-[11px] text-slate-500 hover:text-slate-700"
                        >
                          Batal, Kembali Ke Login
                        </button>
                      </form>
                    ) : (
                      /* CHURCH SIGNUP MODE */
                      <form onSubmit={handleRegisterChurchSubmit} className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">NAMA GEREJA LOKAL *</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="Contoh: Gereja Bethany Kelapa Gading"
                            value={regChurchName}
                            onChange={(e) => setRegChurchName(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded focus:bg-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">ALAMAT LENGKAP SEKRETARIAT</label>
                          <input 
                            type="text" 
                            placeholder="Alamat jalan lengkap"
                            value={regAddress}
                            onChange={(e) => setRegAddress(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border rounded focus:bg-white outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">KOTA</label>
                            <input 
                              type="text" 
                              placeholder="Jakarta"
                              value={regCity}
                              onChange={(e) => setRegCity(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border rounded outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">PROVINSI</label>
                            <input 
                              type="text" 
                              placeholder="DKI Jakarta"
                              value={regProvince}
                              onChange={(e) => setRegProvince(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border rounded outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">EMAIL GEREJA / GEMBALA *</label>
                          <input 
                            type="email" 
                            required
                            placeholder="gereja@gmail.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded outline-none"
                          />
                        </div>

                        <div className="border-t pt-2.5 mt-2.5 space-y-2.5">
                          <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Akun Kredensial Gembala</span>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">NAMA GEMBALA SIDANG *</label>
                            <input 
                              type="text" 
                              required 
                              placeholder="Contoh: Pdt. Dr. Thomas Aris, M.Th."
                              value={regPastor}
                              onChange={(e) => setRegPastor(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">USERNAME LOGIN *</label>
                            <input 
                              type="text" 
                              required 
                              placeholder="Contoh: gembalanya"
                              value={regUser}
                              onChange={(e) => setRegUser(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded outline-none font-mono text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">SANDI LOGIN *</label>
                              <input 
                                type="password" 
                                required 
                                placeholder="Ketik sandi"
                                value={regPass}
                                onChange={(e) => setRegPass(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded outline-none text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">KONFIRMASI SANDI *</label>
                              <input 
                                type="password" 
                                required 
                                placeholder="Ulangi sandi"
                                value={regPassConfirm}
                                onChange={(e) => setRegPassConfirm(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded outline-none text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          className="w-full py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white font-semibold rounded-lg transition mt-3"
                        >
                          Daftarkan Cabang & Ajukan Legalitas
                        </button>

                        <button 
                          type="button" 
                          onClick={() => setIsRegisterChurch(false)}
                          className="w-full py-1.5 text-center text-[11px] text-slate-500 hover:text-slate-700"
                        >
                          Batal, Kembali Ke Login
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  
                  /* STANDARD LOGIN MODE */
                  <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
                    {loginError && (
                      <div className="p-3 bg-rose-50 border border-rose-100 rounded text-rose-700 text-[11px] leading-relaxed">
                        ⚠️ {loginError}
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">NAMA PENGGUNA *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Contoh: gembala"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-2.5 border rounded focus:ring-1 focus:ring-slate-900 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">KATA SANDI *</label>
                      <input 
                        type="password" 
                        required 
                        placeholder="Ketik password login"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2.5 border rounded focus:ring-1 focus:ring-slate-900 outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <label className="flex items-center space-x-1 text-slate-600">
                        <input type="checkbox" className="rounded" />
                        <span>Ingat saya</span>
                      </label>
                      <span className="text-slate-400 cursor-help" title="Gunakan quick login demo / reset db jika lupa password.">Lupa Sandi?</span>
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-2.5 bg-[#0f172a] hover:bg-slate-850 text-white font-bold rounded-lg transition shadow-xs mt-2"
                    >
                      Masuk Ke Dasbor
                    </button>

                    <div className="border-t pt-3 flex flex-col space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider block">Registrasi</span>
                      <button 
                        type="button" 
                        onClick={() => setIsRegisterChurch(true)}
                        className="w-full border py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold rounded-lg transition"
                      >
                        ⛪ Daftarkan Cabang Gereja Baru
                      </button>
                    </div>

                    {/* Compact testing options (Demo Mode Only) integrated directly in the login container */}
                    {dbMode === 'DEMO' && (
                      <div className="pt-3 border-t space-y-2 text-center">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Uji Coba Hak Akses Cabang (Demo)</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button 
                            type="button" 
                            onClick={() => handleQuickDemoLogin('GEMBALA')}
                            className="py-1.5 px-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-800 cursor-pointer flex flex-col items-center justify-center space-y-0.5 transition shadow-3xs"
                          >
                            <span>👨‍💼</span>
                            <span className="text-[9px]">Gembala</span>
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleQuickDemoLogin('PENGURUS')}
                            className="py-1.5 px-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-800 cursor-pointer flex flex-col items-center justify-center space-y-0.5 transition shadow-3xs"
                          >
                            <span>✍️</span>
                            <span className="text-[9px]">Pengurus</span>
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleQuickDemoLogin('PELAYAN')}
                            className="py-1.5 px-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-800 cursor-pointer flex flex-col items-center justify-center space-y-0.5 transition shadow-3xs"
                          >
                            <span>📋</span>
                            <span className="text-[9px]">Pelayan</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : (
          
          /* --- ENTERPRISE DASHBOARD LAYOUT & CORE STATES --- */
          <div className="grow flex flex-col lg:flex-row">
            
            {/* Sidebar Left Component */}
            <aside className={`lg:w-64 bg-[#0f172a] text-slate-300 lg:sticky lg:top-14 lg:h-[calc(100vh-56px)] select-none shrink-0 border-r border-slate-900 flex flex-col justify-between p-4 ${mobileSbarOpen ? 'block fixed inset-y-14 left-0 z-50 w-64' : 'hidden lg:flex'}`}>
              
              {/* Top part featuring user profile & scrollable menus */}
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden mb-4">
                
                {/* Active user profile block with interactive Avatar edit */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-2 flex flex-col items-center text-center shrink-0 mb-4 select-none">
                  <div 
                    title="Ubah Foto Profil Anda" 
                    onClick={() => {
                      setAvatarInputUrl(currentUser?.avatar || '');
                      setIsAvatarModalOpen(true);
                    }}
                    className="group relative w-12 h-12 rounded-full border-2 border-indigo-500 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:border-white transition shadow-sm"
                  >
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} referrerPolicy="no-referrer" alt="Avatar" className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                    ) : (
                      <span className="text-xl font-bold font-sans">👤</span>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-black truncate max-w-[170px] text-white leading-tight">{currentUser?.fullName}</h4>
                    <span className="inline-block mt-1 text-[9px] font-extrabold uppercase bg-slate-800 tracking-wider text-indigo-400 px-2 py-0.5 rounded-full border border-slate-700/60">
                      {currentUser?.role}
                    </span>
                    <button 
                      onClick={() => {
                        setAvatarInputUrl(currentUser?.avatar || '');
                        setIsAvatarModalOpen(true);
                      }}
                      className="block mx-auto mt-1 text-[9px] font-bold text-indigo-400/90 hover:text-indigo-300 transition hover:underline cursor-pointer"
                    >
                      📸 Ubah Foto
                    </button>
                  </div>
                </div>

                {/* Sidebar Menu items list matches Role segregation - Scrollable area */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#64748b] px-3.5 block mb-2 leading-none">Fitur-Fitur Utama</span>
                  {permittedMenus.map(menu => {
                    const isActive = activeMenu === menu.id;
                    
                    // Dynamic Badge Count for specific menus
                    let badgeCount = 0;
                    let badgeBg = 'bg-rose-600 text-white';
                    if (menu.id === 'approvals') {
                      badgeCount = pendingApprovalsCount;
                      badgeBg = 'bg-rose-500 text-white animate-pulse';
                    } else if (menu.id === 'pending') {
                      badgeCount = pendingUsersCount;
                      badgeBg = 'bg-amber-500 text-slate-950 font-bold';
                    }

                    return (
                      <button 
                        key={menu.id}
                        onClick={() => { setActiveMenu(menu.id); setMobileSbarOpen(false); }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-between group cursor-pointer border ${
                          isActive 
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-indigo-500 shadow-md shadow-indigo-600/20' 
                            : 'bg-transparent text-[#94a3b8] border-transparent hover:bg-slate-900 hover:text-white hover:border-slate-850'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <span className={`p-1 rounded-lg transition-colors duration-150 ${
                            isActive ? 'bg-indigo-500 text-white' : 'bg-slate-900/80 text-[#64748b] group-hover:bg-[#1e293b] group-hover:text-indigo-400'
                          }`}>
                            {React.cloneElement(menu.icon as React.ReactElement, { className: 'w-3.5 h-3.5 shrink-0' })}
                          </span>
                          <span className="tracking-tight truncate">{menu.name}</span>
                        </div>
                        
                        {badgeCount > 0 ? (
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${badgeBg}`}>
                            {badgeCount}
                          </span>
                        ) : isActive ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-ping shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar foot actions */}
              <div className="pt-3 border-t border-slate-900 space-y-2.5 shrink-0">
                <div className="bg-slate-900/60 p-2 rounded-lg text-[10px] text-slate-400 text-center font-semibold border border-slate-800/30">
                  <span className="block text-slate-500 text-[8px] uppercase tracking-widest font-black">Cabang Terhubung</span>
                  <span className="block font-bold text-slate-300 truncate mt-0.5">⛪ {activeChurch?.name || 'Kantor Wilayah Sektor'}</span>
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all duration-205 border border-rose-500/20 hover:border-rose-600 active:scale-[0.98] cursor-pointer shadow-3xs"
                  title="Keluar dari sesi akun Anda secara aman"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluarkan Sesi (Logout)</span>
                </button>
              </div>
            </aside>

            {/* Content body pane (right) */}
            <div className="grow max-w-full lg:max-w-[calc(100vw-256px)] flex flex-col">
              
              {/* Secondary mobile menu toolbar */}
              <div className="lg:hidden shrink-0 bg-white border-b px-4 py-2.5 flex items-center justify-between">
                <button 
                  onClick={() => setMobileSbarOpen(!mobileSbarOpen)}
                  className="p-1.5 border rounded-lg hover:bg-slate-100 transition"
                  title="Buka menu navigasi utama"
                >
                  <Menu className="w-5 h-5 text-slate-700" />
                </button>

                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">
                  {permittedMenus.find(m => m.id === activeMenu)?.name || activeMenu}
                </span>

                {/* Mobile alerts shortcut */}
                <button 
                  onClick={() => setIsAlertsOpen(!isAlertsOpen)}
                  className="relative p-1.5 border rounded-lg hover:bg-slate-100 transition"
                >
                  <Bell className="w-5 h-5 text-slate-600" />
                  {computedAlerts.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-600 absolute right-1.5 top-1.5"></span>
                  )}
                </button>
              </div>

              {/* Mobile Horizontal Scrolling Tabs - Menus are NOT hidden anymore! */}
              <div className="lg:hidden shrink-0 bg-slate-50 border-b overflow-x-auto flex items-center py-2.5 px-4 space-x-2.5 select-none no-scrollbar scrollbar-none">
                {permittedMenus.map(menu => {
                  const isActive = activeMenu === menu.id;
                  let badgeCount = 0;
                  let badgeBg = 'bg-rose-600 text-white';
                  if (menu.id === 'approvals') {
                    badgeCount = pendingApprovalsCount;
                    badgeBg = 'bg-rose-500 text-white';
                  } else if (menu.id === 'pending') {
                    badgeCount = pendingUsersCount;
                    badgeBg = 'bg-amber-500 text-slate-950 font-black';
                  }

                  return (
                    <button
                      key={menu.id}
                      onClick={() => { setActiveMenu(menu.id); setMobileSbarOpen(false); }}
                      className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-150 cursor-pointer border ${
                        isActive 
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/10' 
                          : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {React.cloneElement(menu.icon as React.ReactElement, { className: 'w-3.5 h-3.5 shrink-0' })}
                      <span>{menu.name.replace('Dasbor ', '').replace('Database ', '')}</span>
                      {badgeCount > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-black ${badgeBg}`}>
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sub-modules router switch board */}
              <div className="p-4 md:p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-100px)]">
                
                {activeMenu === 'dashboard' && (
                  
                  /* DASHBOARD SUMMARY WRAPPER */
                  <div className="space-y-6">
                    {/* Upper summary cards */}
                    <div className="p-5 bg-white rounded-2xl border border-slate-200/85">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-black text-indigo-600 tracking-wider">Church KPI Analytics</span>
                          <h2 className="text-xl font-bold tracking-tight text-slate-900">Dasbor Pertumbuhan Gereja Terpadu</h2>
                          <p className="text-xs text-slate-400">Monitoring real-time komsel, keaktifan jemaat aktif {activeMembers.filter(m => m.activityScore >= 70).length} jiwa, & draf pembukuan.</p>
                        </div>

                        {/* Smart recommendation widget shortcut alerts */}
                        <div className="relative shrink-0 flex items-center space-x-2">
                          <button 
                            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
                            className="bg-[#0f172a] text-white hover:bg-slate-800 px-4 py-1.5 rounded-lg text-xs font-bold font-sans flex items-center space-x-1 shadow-xs"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Peringatan Sistem ({computedAlerts.length})</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* KPI widgets rows */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <KPICard 
                        title="Database Jemaat" 
                        value={`${activeMembers.length} Jiwa`} 
                        description="Anggota aktif terdaftar" 
                        change="+4.2%" 
                        isPositive={true} 
                        icon={<Users className="w-4 h-4 text-indigo-700" />} 
                        iconBgColor="bg-indigo-50 text-indigo-600" 
                      />
                      <KPICard 
                        title="Sangat Aktif (90%+)" 
                        value={`${activeMembers.filter(m => m.activityScore >= 90).length} Jiwa`} 
                        description="Target leadership training" 
                        change="Potensial" 
                        isPositive={true} 
                        icon={<BadgeCheck className="w-4 h-4 text-emerald-800" />} 
                        iconBgColor="bg-emerald-50 text-emerald-700" 
                      />
                      <KPICard 
                        title="Butuh Perhatian" 
                        value={`${activeMembers.filter(m => m.activityScore < 50).length} Jiwa`} 
                        description="Tidak hadir 3+ minggu" 
                        change="Follow-up" 
                        isPositive={false} 
                        icon={<ShieldAlert className="w-4 h-4 text-amber-800" />} 
                        iconBgColor="bg-amber-50 text-amber-700" 
                      />
                      <KPICard 
                        title="Persetujuan Aktif" 
                        value={`${db.getApprovals().length}`} 
                        description="Proposal / Retret Camp" 
                        change="Workflow" 
                        isPositive={true} 
                        icon={<ListChecks className="w-4 h-4 text-[#0f172a]" />} 
                        iconBgColor="bg-slate-100 text-slate-700" 
                      />
                    </div>

                    {/* Highly Elegant Module Shortcuts Grid on Dashboard (Not hidden anymore!) */}
                    <div className="bg-slate-100/50 rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="p-1 bg-indigo-100 text-indigo-700 rounded-lg">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-600" />
                          </span>
                          <span className="text-[10px] uppercase font-black text-slate-700 tracking-wider">Akses Pintasan Modul Utama (Menu Langsung)</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium font-sans">Klik Pintasan di bawah untuk melompat langsung ke sistem tanpa laci samping</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {permittedMenus.filter(m => m.id !== 'dashboard').map(menu => {
                          // Dynamic Badge Count for specific menus on dashboard too!
                          let badgeCount = 0;
                          let badgeLabel = '';
                          let badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                          if (menu.id === 'approvals') {
                            badgeCount = pendingApprovalsCount;
                            badgeLabel = `${pendingApprovalsCount} Proposal`;
                            badgeColor = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
                          } else if (menu.id === 'pending') {
                            badgeCount = pendingUsersCount;
                            badgeLabel = `${pendingUsersCount} Akun Baru`;
                            badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                          }

                          return (
                            <button
                              key={menu.id}
                              onClick={() => setActiveMenu(menu.id)}
                              className="bg-white hover:bg-slate-50 p-4 border border-slate-250/80 hover:border-indigo-550 hover:shadow-sm rounded-xl text-left transition duration-200 cursor-pointer group flex flex-col justify-between space-y-3 h-[110px] relative overflow-hidden shadow-3xs"
                            >
                              <div className="flex items-center justify-between w-full relative z-10">
                                <div className="p-2 bg-slate-50 group-hover:bg-indigo-50 text-slate-500 group-hover:text-indigo-600 rounded-lg transition duration-250 border border-slate-100">
                                  {React.cloneElement(menu.icon as React.ReactElement, { className: 'w-4 h-4 shrink-0' })}
                                </div>
                                {badgeCount > 0 ? (
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${badgeColor}`}>
                                    {badgeLabel}
                                  </span>
                                ) : (
                                  <ArrowRight className="w-3.5 h-3.5 text-slate-350 group-hover:text-indigo-500 transition duration-200 transform group-hover:translate-x-0.5" />
                                )}
                              </div>
                              <div className="relative z-10 space-y-0.5">
                                <span className="font-extrabold text-xs text-slate-800 group-hover:text-indigo-950 block leading-tight">{menu.name}</span>
                                <span className="text-[10px] text-slate-400 group-hover:text-slate-500 font-light block truncate leading-none">{menu.desc}</span>
                              </div>
                              {/* Subtle hover background decoration */}
                              <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-indigo-500/0 group-hover:bg-indigo-500/5 rounded-full blur-md transition duration-300 font-sans"></div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Graphics panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      
                      {/* Left Part: Donut ratio breakdown (3 spans) */}
                      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-3xs space-y-3.5">
                        <div>
                          <h4 className="text-sm font-bold tracking-tight text-slate-900">Klasifikasi Jemaat Terpadu</h4>
                          <p className="text-[11px] text-slate-400 font-normal">Persentase umur/keaktifan jemaat</p>
                        </div>
                        
                        <div className="pt-2">
                          <CustomDonutChart slices={donutSlices} />
                        </div>
                      </div>

                      {/* Right Part: Growth Trend Sparkline Graph (3 spans) */}
                      <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5 shadow-3xs space-y-4">
                        <div>
                          <h4 className="text-sm font-bold tracking-tight text-slate-900">Kurva Pertumbuhan Kehadiran Sektor (Mei)</h4>
                          <p className="text-[11px] text-slate-400">Log kehadiran kebaktian raya mingguan (Jiwa).</p>
                        </div>

                        <div className="pt-2">
                          <CustomLineChart 
                            data={[
                              { label: 'Minggu I', value: 120 },
                              { label: 'Minggu II', value: 135 },
                              { label: 'Minggu III', value: 154 },
                              { label: 'Minggu IV', value: 148 },
                              { label: 'Riil (Hari ini)', value: activeMembers.filter(m => m.activityScore >= 70).length + 42 }
                            ]} 
                            height={160} 
                            strokeColor="#3b82f6" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub routing blocks */}
                {activeMenu === 'members' && (
                  <MemberManagement currentUser={effectiveUser || currentUser} onRefreshTrail={() => setSeed(s => s + 1)} />
                )}

                {activeMenu === 'finance' && (
                  <FinancialManagement currentUser={effectiveUser || currentUser} onRefreshTrail={() => setSeed(s => s + 1)} />
                )}

                {activeMenu === 'services' && (
                  <ServiceManagement currentUser={effectiveUser || currentUser} onRefreshTrail={() => setSeed(s => s + 1)} />
                )}

                {activeMenu === 'approvals' && (
                  <ApprovalSystem currentUser={effectiveUser || currentUser} onRefreshTrail={() => setSeed(s => s + 1)} />
                )}

                {activeMenu === 'school' && (
                  <SundaySchool currentUser={effectiveUser || currentUser} />
                )}

                {activeMenu === 'divisions' && (
                  <Divisions currentUser={effectiveUser || currentUser} onRefreshTrail={() => setSeed(s => s + 1)} />
                )}

                {activeMenu === 'tasks' && (
                  <TasksManagement currentUser={effectiveUser || currentUser} />
                )}

                {activeMenu === 'pending' && (
                  <PendingItems 
                    currentUser={effectiveUser || currentUser} 
                    onRefreshTrail={() => setSeed(s => s + 1)} 
                    defaultTab={pendingDefaultTab}
                  />
                )}

                {activeMenu === 'synod' && (
                  <ChurchManagement 
                    currentUser={currentUser} 
                    onRefreshTrail={() => setSeed(s => s + 1)} 
                    onStartImpersonation={(churchId) => {
                      setAuditedChurchId(churchId);
                      setActiveMenu('dashboard');
                    }}
                  />
                )}

                {activeMenu === 'audit' && (
                  <AuditTrailView currentUser={effectiveUser || currentUser} onRefresh={() => setSeed(s => s + 1)} />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. Alerts overlay slider */}
      {isAlertsOpen && (
        <div className="fixed inset-y-0 right-0 max-w-sm w-full bg-white z-50 border-l shadow-2xl p-5 flex flex-col justify-between animate-in slide-in-from-right duration-300">
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
                <Bell className="w-4 h-4 text-indigo-600 animate-bounce" />
                <span>Peringatan Sistem Terintegrasi</span>
              </h3>
              <button 
                onClick={() => setIsAlertsOpen(false)} 
                className="text-slate-400 hover:text-slate-600 font-extrabold text-xl w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center transition"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {computedAlerts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">Sistem aman. Tidak ada peringatan prioritas saat ini.</div>
              ) : (
                computedAlerts.map(alert => {
                  const isPermitted = permittedMenus.some(menu => menu.id === alert.targetMenu);
                  
                  // Color schemes depending on warning level
                  let cardBorder = 'border-slate-200 bg-slate-50 hover:bg-slate-100';
                  let iconColor = 'text-indigo-500 bg-indigo-50';
                  let badgeColor = 'bg-indigo-100 text-indigo-700';

                  if (alert.type === 'DANGER') {
                    cardBorder = 'border-rose-200 bg-rose-50/40 hover:bg-rose-50/70 hover:border-rose-350';
                    iconColor = 'text-rose-600 bg-rose-100/50';
                    badgeColor = 'bg-rose-100 text-rose-700';
                  } else if (alert.type === 'WARNING') {
                    cardBorder = 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 hover:border-amber-300';
                    iconColor = 'text-amber-600 bg-amber-100/50';
                    badgeColor = 'bg-amber-100 text-amber-800';
                  } else if (alert.type === 'INFO') {
                    cardBorder = 'border-blue-200 bg-blue-50/30 hover:bg-blue-50/60 hover:border-blue-300';
                    iconColor = 'text-blue-600 bg-blue-100/50';
                    badgeColor = 'bg-blue-100 text-blue-700';
                  }

                  return (
                    <button
                      key={alert.id}
                      disabled={!isPermitted}
                      onClick={() => {
                        if (isPermitted) {
                          if (alert.targetSubTab) {
                            setPendingDefaultTab(alert.targetSubTab);
                          }
                          setActiveMenu(alert.targetMenu);
                          setIsAlertsOpen(false);
                        }
                      }}
                      className={`w-full p-3.5 rounded-xl border ${cardBorder} flex flex-col gap-2.5 text-left transition-all duration-150 relative group ${isPermitted ? 'cursor-pointer hover:shadow-xs active:scale-[0.99]' : 'opacity-70 cursor-not-allowed'}`}
                      title={isPermitted ? `Klik untuk membuka ${alert.actionLabel}` : 'Anda tidak memiliki hak akses'}
                    >
                      <div className="flex items-start space-x-2.5">
                        <span className={`p-1.5 rounded-lg text-xs font-bold leading-none ${iconColor}`}>
                          ⚠️
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-slate-900 leading-none group-hover:text-indigo-900 transition-colors">{alert.title}</p>
                          <p className="text-slate-500 font-normal leading-relaxed mt-1 text-[11px]">{alert.desc}</p>
                        </div>
                      </div>

                      {isPermitted ? (
                        <div className="flex items-center justify-between mt-0.5 pt-2 border-t border-dashed border-slate-200/60 w-full">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide uppercase ${badgeColor} inline-flex items-center space-x-1`}>
                            <span>{alert.actionLabel}</span>
                          </span>
                          <span className="text-[10px] font-bold text-indigo-600 flex items-start space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                            <span>Kelola</span>
                            <span>➔</span>
                          </span>
                        </div>
                      ) : (
                        <div className="text-[9px] text-slate-400 italic">Terisolasi (Hak akses terbatas)</div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <button 
            onClick={() => setIsAlertsOpen(false)}
            className="w-full py-3 mt-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center cursor-pointer shadow-3xs"
          >
            Tutup Panel Peringatan
          </button>
        </div>
      )}

      {/* 4. Avatar (Profile Photo) Modal */}
      {isAvatarModalOpen && currentUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-950 flex items-center space-x-2 text-sm uppercase tracking-tight">
                <Camera className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Pengaturan Foto Profil</span>
              </h3>
              <button 
                onClick={() => setIsAvatarModalOpen(false)} 
                className="text-slate-450 hover:text-slate-700 font-extrabold text-lg p-1 transition"
                title="Tutup dialog"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5 text-xs">
              <div className="flex items-center space-x-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-16 h-16 rounded-full border-2 border-indigo-600 overflow-hidden flex items-center justify-center bg-slate-200 shrink-0 shadow-3xs">
                  {avatarInputUrl ? (
                    <img src={avatarInputUrl} referrerPolicy="no-referrer" alt="Pratinjau Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">👤</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="font-extrabold text-slate-900 text-xs block">{currentUser.fullName}</span>
                  <span className="text-[10px] text-slate-550 font-mono block">Role: {currentUser.role}</span>
                  <p className="text-[10px] text-slate-400">Pilih rekomendasi karakter, masukkan URL, atau unggah foto Anda sendiri.</p>
                </div>
              </div>

              {/* Preset Avatars Grid */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Pilih Karakter Pelayanan (Rekomendasi)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: 'Pria 1', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
                    { name: 'Wanita 1', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
                    { name: 'Wanita 2', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
                    { name: 'Pria 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
                    { name: 'Pria 3', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
                    { name: 'Pria 4', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
                    { name: 'Wanita 3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
                    { name: 'Wanita 4', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarInputUrl(preset.url)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition hover:scale-105 active:scale-95 duration-150 cursor-pointer ${avatarInputUrl === preset.url ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-sm' : 'border-slate-200 hover:border-slate-400'}`}
                      title={preset.name}
                    >
                      <img src={preset.url} referrerPolicy="no-referrer" alt={preset.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Interface */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Unggah File Foto Anda</label>
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      if (file.size > 2.5 * 1024 * 1024) {
                        alert("⚠️ File gambar terlalu besar! Batas maksimum adalah 2.5MB agar performa database lokal tetap ringan.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64String = reader.result as string;
                        setAvatarInputUrl(base64String);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition ${dragOver ? 'border-indigo-600 bg-indigo-50/20' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60'}`}
                >
                  <div className="flex flex-col items-center space-y-1.5 label-upload cursor-pointer relative h-full justify-center">
                    <Upload className="w-5 h-5 text-indigo-500 shrink-0 pointer-events-none" />
                    <p className="text-[11px] font-bold text-slate-700 pointer-events-none">Tarik & lepas file gambar di sini</p>
                    <p className="text-[10px] text-slate-400 pointer-events-none">Atau cari secara manual melalui dokumen/folder</p>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Direct Url Input */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Atau Tempel Tautan URL Gambar</label>
                <input 
                  type="url"
                  placeholder="https://example.com/foto-anda.jpg"
                  value={avatarInputUrl.startsWith('data:') ? '' : avatarInputUrl}
                  onChange={(e) => setAvatarInputUrl(e.target.value)}
                  className="w-full p-2.5 border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400 italic block mt-0.5">Misalnya, salin tautan file dari internet.</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3 border-t bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Hapus foto profil saat ini dan gunakan avatar default?")) {
                    setAvatarInputUrl('');
                  }
                }}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-bold text-[11px] transition cursor-pointer"
              >
                Hapus Foto
              </button>
              
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="px-4 py-2 border hover:bg-slate-100 text-slate-600 font-bold rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAvatar}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition shadow-3xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Footer credits with legal info */}
      <footer className="bg-slate-900 border-t border-slate-950 px-6 py-3 shrink-0 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400">
        <span>© 2026 Meta Connect — Platform Manajemen Pelayanan & Operasional Terpadu. Semua hak dilindungi undang-undang.</span>
        <div className="flex items-center space-x-3 mt-1 sm:mt-0 font-medium">
          <span className="flex items-center space-x-1 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>API Integration Ready</span>
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-mono text-[10px]">Ver v4.1.2_BuildCJS</span>
        </div>
      </footer>
    </div>
  );
}
