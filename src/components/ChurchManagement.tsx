/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Church, User, Member, UserRole, Transaction } from '../types/church';
import { db } from '../utils/storage';
import { 
  Building2, ShieldCheck, AlertCircle, Edit, ExternalLink, RefreshCw, 
  Trash2, Sliders, CheckCircle2, Lock, Sparkles, UploadCloud, Plus, 
  Search, Filter, Users, Key, Mail, Phone, MapPin, Check, X, ShieldAlert, FileText, Database, Activity, TrendingUp, User as UserIcon
} from 'lucide-react';

interface ChurchManagementProps {
  currentUser: User;
  onRefreshTrail: () => void;
  onStartImpersonation?: (churchId: string) => void;
}

export default function ChurchManagement({ currentUser, onRefreshTrail, onStartImpersonation }: ChurchManagementProps) {
  const [activeTab, setActiveTab] = useState<'sectors' | 'credentials' | 'profile' | 'analytics'>('sectors');
  const [refreshSeed, setRefreshSeed] = useState(0);

  // States for Church Tab
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isAddChurchOpen, setIsAddChurchOpen] = useState(false);
  const [editingChurch, setEditingChurch] = useState<Church | null>(null);

  // States for Credentials Tab
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Self Profile Form States
  const [selfFullName, setSelfFullName] = useState(currentUser.fullName);
  const [selfEmail, setSelfEmail] = useState(currentUser.email);
  const [selfUsername, setSelfUsername] = useState(currentUser.username);
  const [selfPassword, setSelfPassword] = useState(currentUser.password || '');
  const [selfSuccess, setSelfSuccess] = useState('');
  const [selfError, setSelfError] = useState('');

  // Account Repair / Restore States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [repairFullName, setRepairFullName] = useState('');
  const [repairEmail, setRepairEmail] = useState('');
  const [repairUsername, setRepairUsername] = useState('');
  const [repairPassword, setRepairPassword] = useState('');
  const [repairRole, setRepairRole] = useState<UserRole>('GEMBALA');
  const [repairChurchId, setRepairChurchId] = useState('');
  const [repairSuccess, setRepairSuccess] = useState('');
  const [repairError, setRepairError] = useState('');

  // Church Form States (Shared for Add & Edit)
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formProvince, setFormProvince] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formColor, setFormColor] = useState('#0f172a');
  const [formLogo, setFormLogo] = useState('');
  const [formBanner, setFormBanner] = useState('');
  const [formStatus, setFormStatus] = useState<Church['status']>('VERIFIED');
  
  // Drag and drop attachment states
  const [logoFileName, setLogoFileName] = useState('');
  const [logoFileSize, setLogoFileSize] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [logoError, setLogoError] = useState('');

  // Credentials Form States
  const [creFullName, setCreFullName] = useState('');
  const [creUsername, setCreUsername] = useState('');
  const [creEmail, setCreEmail] = useState('');
  const [crePassword, setCrePassword] = useState('');
  const [creRole, setCreRole] = useState<UserRole>('GEMBALA');
  const [creChurchId, setCreChurchId] = useState('');
  const [creError, setCreError] = useState('');
  const [creSuccess, setCreSuccess] = useState('');

  // Fetch core DB state
  const churches = db.getChurches();
  const allMembers = db.getMembers();
  const allUsers = db.getUsers();
  const allTransactions = db.getTransactions();
  const audits = db.getAudits().slice(0, 15); // Dynamic audit subset for log tracking

  // Calculate National Aggregate Statistics
  const totalChurchesCount = churches.length;
  const verifiedChurchesCount = churches.filter(c => c.status === 'VERIFIED').length;
  const pendingChurchesCount = churches.filter(c => c.status === 'PENDING').length;
  const suspendedChurchesCount = churches.filter(c => c.status === 'SUSPENDED').length;
  
  const totalNationalMembers = allMembers.length;
  
  const nationalTotalIncome = allTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
  const nationalTotalExpense = allTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);
  const nationalBalance = nationalTotalIncome - nationalTotalExpense;

  // Handle Church Filter Search
  const filteredChurches = churches.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handle User Filter Search
  const filteredUsers = allUsers.filter(u => {
    const matchSearch = 
      u.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase());
    
    return matchSearch;
  });

  // Handle Logo Drag-and-Drop & Browse Select (Base64 conversion)
  const processLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setLogoError('Hanya dapat melampirkan berkas format Gambar (PNG/JPG)!');
      return;
    }
    
    setLogoError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormLogo(reader.result);
        setLogoFileName(file.name);
        setLogoFileSize(`${(file.size / 1024).toFixed(1)} KB`);
      }
    };
    reader.onerror = () => {
      setLogoError('Gagal mengunggah berkas logo, coba lagi.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileBrowseSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processLogoFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processLogoFile(file);
    }
  };

  const clearLogoAttachment = () => {
    setFormLogo('');
    setLogoFileName('');
    setLogoFileSize('');
    setLogoError('');
  };

  // Open Add Church Wizard
  const handleOpenAddChurch = () => {
    setEditingChurch(null);
    setFormName('');
    setFormAddress('');
    setFormCity('');
    setFormProvince('');
    setFormEmail('');
    setFormPhone('');
    setFormColor('#0f172a');
    setFormLogo('');
    setFormBanner('https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&auto=format&fit=crop&q=80');
    setFormStatus('VERIFIED');
    clearLogoAttachment();
    setLogoError('');
    setIsAddChurchOpen(true);
  };

  // Open Edit Church Wizard
  const handleOpenEditChurch = (c: Church) => {
    setEditingChurch(c);
    setFormName(c.name);
    setFormAddress(c.address);
    setFormCity(c.city);
    setFormProvince(c.province);
    setFormEmail(c.email);
    setFormPhone(c.phone);
    setFormColor(c.themeColor || '#0f172a');
    setFormLogo(c.logo || '');
    setFormBanner(c.banner || 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&auto=format&fit=crop&q=80');
    setFormStatus(c.status);
    
    if (c.logo) {
      setLogoFileName('logo_attached.png');
      setLogoFileSize('Terapung di Database');
    } else {
      clearLogoAttachment();
    }
    setLogoError('');
    setIsAddChurchOpen(false); // Make sure add is closed
  };

  // Submit Save Actions
  const handleSaveChurchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // STRICT LOGO REQUIREMENT CHECK
    if (!formLogo) {
      setLogoError('Lampiran Berkas Logo Wajib Diunggah Guna Legalitas Synode!');
      return;
    }

    if (editingChurch) {
      // Edit mode
      const updated: Church = {
        ...editingChurch,
        name: formName,
        address: formAddress,
        city: formCity,
        province: formProvince,
        email: formEmail,
        phone: formPhone,
        themeColor: formColor,
        logo: formLogo,
        banner: formBanner,
        status: formStatus
      };
      
      db.updateChurch(updated, currentUser);
      setEditingChurch(null);
    } else {
      // Create mode
      const newChurch: Church = {
        id: 'c-' + Date.now(),
        name: formName,
        address: formAddress,
        city: formCity,
        province: formProvince,
        email: formEmail,
        phone: formPhone,
        themeColor: formColor,
        logo: formLogo,
        banner: formBanner,
        status: formStatus
      };

      db.createChurch(newChurch, currentUser);
      setIsAddChurchOpen(false);
    }

    setRefreshSeed(p => p + 1);
    onRefreshTrail();
  };

  // Quick Action Switchers
  const handleUpdateStatus = (churchId: string, status: Church['status']) => {
    const list = db.getChurches();
    const target = list.find(c => c.id === churchId);
    if (target) {
      const prev = { ...target };
      target.status = status;
      db.updateChurch(target, currentUser);
      setRefreshSeed(p => p + 1);
      onRefreshTrail();
    }
  };

  const handleDeleteChurch = (churchId: string) => {
    const list = db.getChurches();
    const target = list.find(c => c.id === churchId);
    if (!target) return;

    if (confirm(`⚠️ PERINGATAN KRITIS: Apakah Anda yakin ingin menghapus cabang gereja "${target.name}"?\n\nTindakan ini akan menghapus secara permanen:\n1. Seluruh data registrasi kustomisasi cabang ini.\n2. Seluruh akun pengguna gembala dan pelayan di dalam cabang ini.\n3. Seluruh basis data jemaat aktif & pasif di cabang ini.\n\nTindakan ini bersifat final dan tidak dapat ditarik kembali. Apakah Anda ingin melanjutkan?`)) {
      db.deleteChurch(churchId, currentUser);
      setRefreshSeed(p => p + 1);
      onRefreshTrail();
    }
  };

  // Create User Credentials Action
  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreError('');
    setCreSuccess('');

    if (!creFullName || !creUsername || !crePassword || !creEmail || (!creChurchId && creRole !== 'SUPER_ADMIN')) {
      setCreError('Seluruh bidang/kolom isian wajib diisi.');
      return;
    }

    const allUsersCombined = db.getUsers();
    if (allUsersCombined.some(u => u.username.toLowerCase() === creUsername.toLowerCase())) {
      setCreError('Nama pengguna tersebut sudah digunakan oleh akun lain.');
      return;
    }

    const newUser: User = {
      id: 'u-' + Date.now(),
      username: creUsername.toLowerCase(),
      fullName: creFullName,
      email: creEmail,
      role: creRole,
      churchId: creRole === 'SUPER_ADMIN' ? '' : creChurchId,
      password: crePassword,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
    };

    db.createUser(newUser);
    
    // Log Audit Trace
    db.logAudit(
      currentUser.id, 
      currentUser.fullName, 
      'USER_PROVISION', 
      `Membuat kredensial jabatan baru [${creRole}] untuk ${creFullName} (${creUsername}).`, 
      null, 
      newUser
    );

    setCreSuccess(`Sukses membuat akun login untuk "${creFullName}"!`);
    
    // Reset Form
    setCreFullName('');
    setCreUsername('');
    setCreEmail('');
    setCrePassword('');
    setCreRole('GEMBALA');
    setCreChurchId('');
    
    setRefreshSeed(p => p + 1);
    onRefreshTrail();
    
    // Auto close after brief timeout
    setTimeout(() => {
      setIsAddUserOpen(false);
      setCreSuccess('');
    }, 1500);
  };

  const handleUpdateSelfProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSelfSuccess('');
    setSelfError('');

    if (!selfFullName || !selfUsername || !selfEmail) {
      setSelfError("Nama lengkap, username, dan email wajib diisi.");
      return;
    }

    const allUsersGlobal = db.getUsers();
    const isConflict = allUsersGlobal.some(u => u.username === selfUsername.toLowerCase() && u.id !== currentUser.id);
    if (isConflict) {
      setSelfError("Nama pengguna (username) sudah digunakan oleh akun lain.");
      return;
    }

    const updatedUserDetails: User = {
      ...currentUser,
      fullName: selfFullName,
      email: selfEmail,
      username: selfUsername.toLowerCase(),
      password: selfPassword || undefined
    };

    db.updateUser(updatedUserDetails);
    db.setSessionUser(updatedUserDetails);
    
    // Sync active state attributes directly inside props ref
    currentUser.fullName = selfFullName;
    currentUser.email = selfEmail;
    currentUser.username = selfUsername.toLowerCase();
    currentUser.password = selfPassword || undefined;

    db.logAudit(currentUser.id, currentUser.fullName, 'USER_SELF_UPDATE', `Super Admin mengubah data diri & memperbaharui kata sandi.`);
    setSelfSuccess("Profil Akun Pusat dan kata sandi Anda berhasil diperbarui!");
    onRefreshTrail();
    setRefreshSeed(p => p + 1);
  };

  const handleOpenRepairModal = (user: User) => {
    setEditingUser(user);
    setRepairFullName(user.fullName);
    setRepairEmail(user.email);
    setRepairUsername(user.username);
    setRepairPassword(user.password || '');
    setRepairRole(user.role);
    setRepairChurchId(user.churchId || '');
    setRepairSuccess('');
    setRepairError('');
  };

  const handleSaveRepairUser = (e: React.FormEvent) => {
    e.preventDefault();
    setRepairSuccess('');
    setRepairError('');

    if (!repairFullName || !repairUsername || !repairEmail) {
      setRepairError("Nama lengkap, username, dan email wajib diisi.");
      return;
    }

    if (!editingUser) return;

    const allUsersGlobal = db.getUsers();
    const isConflict = allUsersGlobal.some(u => u.username === repairUsername.toLowerCase() && u.id !== editingUser.id);
    if (isConflict) {
      setRepairError("Nama pengguna (username) sudah digunakan oleh akun lain.");
      return;
    }

    const updatedUser: User = {
      ...editingUser,
      fullName: repairFullName,
      email: repairEmail,
      username: repairUsername.toLowerCase(),
      role: repairRole,
      churchId: repairChurchId,
      password: repairPassword || undefined
    };

    db.updateUser(updatedUser);
    db.logAudit(
      currentUser.id, 
      currentUser.fullName, 
      'USER_RECOVER', 
      `Super admin memulihkan/memperbaiki akun ${editingUser.fullName} (${editingUser.username}).`,
      editingUser,
      updatedUser
    );

    setRepairSuccess("Data akun berhasil dipulihkan & diperbarui dengan aman!");
    onRefreshTrail();
    setRefreshSeed(p => p + 1);

    setTimeout(() => {
      setEditingUser(null);
    }, 1500);
  };

  const handleDeleteUserGlobal = (userId: string, userName: string) => {
    if (userId === currentUser.id) {
      alert("Anda tidak dapat menghapus akun pusat Anda sendiri.");
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus akun pengguna "${userName}" secara permanen? Action ini tidak bisa ditarik.`)) {
      db.deleteUser(userId);
      db.logAudit(currentUser.id, currentUser.fullName, 'USER_DELETE_GLOBAL', `Menghapus akun pengguna ${userName} secara permanen.`);
      setRefreshSeed(p => p + 1);
      onRefreshTrail();
    }
  };

  const getStatusBadge = (status: Church['status']) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'VERIFIED': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'UNDER_REVIEW': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'SUSPENDED': return 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse';
      case 'REJECTED': return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div key={refreshSeed} className="space-y-6">
      
      {/* 1. Header Banner Title with Synod Identity */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-indigo-600 rounded-xl text-white">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 leading-tight">Sinode Pusat & Komando Jaringan Nasional</h2>
            <p className="text-xs text-slate-500 font-normal leading-relaxed mt-1">
              Portal supervisi legalitas, kredensial pimpinan cabang, kustomisasi visual (Logo & Tema Warna), serta konsolidasi sinergi statistik multi-tenant.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center space-x-1 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold select-none font-mono tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pusat Synod Authorized</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1.5 font-mono">ID Sidang: {currentUser.id}</span>
        </div>
      </div>

      {/* 2. Top Executive-level Audit Metrics Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
          <div className="p-3 bg-slate-50 border rounded-lg text-slate-700">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 text-xs">
            <span className="text-slate-400 block font-bold text-[9px] tracking-wider uppercase">Total Cabang Gereja</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-extrabold text-slate-900">{totalChurchesCount}</span>
              <span className="text-[10px] text-slate-500 font-medium">({verifiedChurchesCount} Sah)</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 text-xs">
            <span className="text-slate-400 block font-bold text-[9px] tracking-wider uppercase">Total Jemaat Nasional</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-extrabold text-indigo-950">{totalNationalMembers}</span>
              <span className="text-[10px] text-indigo-500 font-medium">Jiwa Terdata</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 text-xs">
            <span className="text-slate-400 block font-bold text-[9px] tracking-wider uppercase">Keuangan Gabungan</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-sm font-extrabold text-emerald-900">
                Rp {nationalBalance.toLocaleString('id-ID')},-
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg">
            <Key className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 text-xs">
            <span className="text-slate-400 block font-bold text-[9px] tracking-wider uppercase">Petugas Akun Aktif</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-extrabold text-blue-950">{allUsers.length}</span>
              <span className="text-[10px] text-blue-500 font-medium">Pengoperasi</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Sliding Sub-Tabs Module Navigator */}
      <div className="border-b border-slate-200 flex flex-wrap gap-1 p-1 bg-slate-100/60 rounded-lg max-w-lg select-none">
        <button
          onClick={() => setActiveTab('sectors')}
          className={`flex-1 min-w-[100px] py-1.5 text-center text-xs font-bold rounded-md transition duration-150 flex items-center justify-center space-x-1 border cursor-pointer ${activeTab === 'sectors' ? 'bg-white text-slate-900 shadow-2xs border-slate-200' : 'text-slate-500 hover:text-slate-800 border-transparent'}`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Sektor Cabang</span>
        </button>
        <button
          onClick={() => setActiveTab('credentials')}
          className={`flex-1 min-w-[100px] py-1.5 text-center text-xs font-bold rounded-md transition duration-150 flex items-center justify-center space-x-1 border cursor-pointer ${activeTab === 'credentials' ? 'bg-white text-slate-900 shadow-2xs border-slate-200' : 'text-slate-500 hover:text-slate-800 border-transparent'}`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Kelola Akun Global</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 min-w-[100px] py-1.5 text-center text-xs font-bold rounded-md transition duration-150 flex items-center justify-center space-x-1 border cursor-pointer ${activeTab === 'profile' ? 'bg-white text-slate-900 shadow-2xs border-slate-200' : 'text-slate-500 hover:text-slate-800 border-transparent'}`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>Profil & Sandi Saya</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 min-w-[100px] py-1.5 text-center text-xs font-bold rounded-md transition duration-150 flex items-center justify-center space-x-1 border cursor-pointer ${activeTab === 'analytics' ? 'bg-white text-slate-900 shadow-2xs border-slate-200' : 'text-slate-500 hover:text-slate-800 border-transparent'}`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Sinergi Data</span>
        </button>
      </div>

      {/* ======================= TAB 1: SEKTORAL GEREJA ======================= */}
      {activeTab === 'sectors' && (
        <div className="space-y-4">
          
          {/* Controls toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Cari nama gereja, kota, provinsi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none w-full sm:w-64 focus:bg-white"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-650 outline-none select-none bg-white font-semibold cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="VERIFIED">VERIFIED (Aktif)</option>
                  <option value="PENDING">PENDING (Butuh Legalisasi)</option>
                  <option value="SUSPENDED">SUSPENDED (Dibekukan)</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleOpenAddChurch}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shrink-0 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Daftarkan Gereja Baru</span>
            </button>
          </div>

          {/* Table List of Churches */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cabang Gereja Terdaftar Sektoral ({filteredChurches.length})</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredChurches.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <span className="text-3xl">⛪</span>
                  <p className="text-xs text-slate-400 font-medium">Tidak ada cabang gereja yang memenuhi kriteria pencarian.</p>
                </div>
              ) : (
                filteredChurches.map(c => (
                  <div key={c.id} id={c.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-slate-50/50 transition duration-150">
                    
                    {/* Header: Logo, Name & Location */}
                    <div className="flex items-start space-x-4">
                      <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center border-2 border-slate-100 shrink-0 overflow-hidden shadow-2xs">
                        {c.logo ? (
                          <img src={c.logo} referrerPolicy="no-referrer" alt="Logo" className="w-full h-full object-cover rounded" />
                        ) : (
                          <div className="text-center p-1">
                            <span className="text-xl block">⛪</span>
                            <span className="text-[10px] text-rose-500 font-bold leading-none block mt-0.5">Tanpa Logo</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900 leading-tight flex items-center">
                            {c.name}
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] border font-bold ${getStatusBadge(c.status)}`}>
                            {c.status}
                          </span>
                          
                          {/* Color bar indicator */}
                          <div className="w-3.5 h-3.5 rounded border border-slate-350 shrink-0" style={{ backgroundColor: c.themeColor || '#0f172a' }} title={`Warna Tema Halaman Utama: ${c.themeColor}`} />
                        </div>
                        
                        <p className="text-slate-500 font-light flex items-center space-x-1.5 text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.address}, {c.city}, {c.province}</span>
                        </p>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-50">
                          <span className="flex items-center space-x-1">
                            <Mail className="w-3 h-3 text-slate-350 shrink-0" />
                            <span>{c.email}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-slate-350 shrink-0" />
                            <span>{c.phone}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Left Actions Drawer */}
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5 self-end lg:self-center shrink-0">
                      
                      {/* Operational changes */}
                      {c.status === 'PENDING' && (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(c.id, 'VERIFIED')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Sahkan Legalisasi</span>
                          </button>
                          
                          <button 
                            onClick={() => handleUpdateStatus(c.id, 'REJECTED')}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs border border-rose-200 font-medium cursor-pointer"
                          >
                            Tolak
                          </button>
                        </>
                      )}

                      {c.status === 'VERIFIED' && (
                        <>
                          {onStartImpersonation && (
                            <button 
                              onClick={() => onStartImpersonation(c.id)}
                              className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition shadow-3xs"
                              title="Lakukan Peninjauan Data Kas Keuangan, Schedulers Anggota & Administasi Kelas Sekolah Minggu"
                            >
                              <Database className="w-3.5 h-3.5 text-indigo-505 shrink-0" />
                              <span>Audit Cabang</span>
                            </button>
                          )}
                          <button 
                            onClick={() => handleUpdateStatus(c.id, 'SUSPENDED')}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-150 text-rose-700 rounded-lg border border-rose-250 text-xs font-bold cursor-pointer"
                          >
                            Suspend Cabang
                          </button>
                        </>
                      )}

                      {c.status === 'SUSPENDED' && (
                        <button 
                          onClick={() => handleUpdateStatus(c.id, 'VERIFIED')}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-250 text-xs font-bold animate-bounce cursor-pointer flex items-center space-x-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Batalkan Suspend</span>
                        </button>
                      )}

                      <button 
                        onClick={() => handleOpenEditChurch(c)}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition"
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-400" />
                        <span>Kustomisasi Tema Logo</span>
                      </button>

                      <button 
                        onClick={() => handleDeleteChurch(c.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition shadow-3xs"
                        title="Hapus Cabang Gereja Beserta Akun & Jemaatnya Secara Permanen"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Hapus Cabang</span>
                      </button>

                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB 2: OTORITAS AKSES & PEMULIHAN AKUN ======================= */}
      {activeTab === 'credentials' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Cari nama, nama pengguna, email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none w-full sm:w-64 focus:bg-white"
              />
            </div>

            <button 
              onClick={() => { setCreError(''); setCreSuccess(''); setIsAddUserOpen(true); }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shrink-0 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Anggota Pusat / Kredensial Baru</span>
            </button>
          </div>

          {/* User Account List Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Draf Petugas & Multi-Tenant Terdaftar ({filteredUsers.length})</span>
              <p className="text-[10px] text-slate-400 font-normal">Gunakan tombol 'Perbaiki' untuk menyetel ulang password atau merubah data diri akun jemaat mana saja.</p>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 font-medium">
                  Tidak ada kredensial yang cocok dengan kata pencarian.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                        <th className="p-4">NAMA LENGKAP & USERNAME</th>
                        <th className="p-4">AFILIASI GEREJA CABANG</th>
                        <th className="p-4">JABATAN OPERASIONAL</th>
                        <th className="p-4">ALAMAT EMAIL LOGIN</th>
                        <th className="p-4 text-center">STATUS AKSES</th>
                        <th className="p-4 text-right">AKSI KONTROL PUSAT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y animate-fade-in">
                      {filteredUsers.map(u => {
                        const userChurch = churches.find(c => c.id === u.churchId);
                        const isSelf = u.id === currentUser.id;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition duration-150">
                            <td className="p-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border overflow-hidden">
                                  {u.avatar ? (
                                    <img src={u.avatar} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="User" />
                                  ) : (
                                    <span className="text-sm font-bold">👤</span>
                                  )}
                                </div>
                                <div className="space-y-0.5">
                                  <span className="font-extrabold text-slate-900 block leading-tight">
                                    {u.fullName} {isSelf && <span className="text-[9px] bg-slate-900 text-white px-1.5 py-0.2 rounded font-bold ml-1">ANDA</span>}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono block">uname: {u.username}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 font-semibold text-slate-700">
                              {userChurch ? (
                                <div className="flex items-center space-x-1.5">
                                  {userChurch.logo && <img src={userChurch.logo} referrerPolicy="no-referrer" className="w-4 h-4 rounded-full object-cover shrink-0" />}
                                  <span>{userChurch.name}</span>
                                </div>
                              ) : (
                                <span className="text-indigo-600 font-bold font-mono text-[9px] tracking-wide uppercase px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full">Synod Pusat</span>
                              )}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 text-[9px] font-extrabold tracking-wider border rounded-full ${
                                u.role === 'SUPER_ADMIN' ? 'bg-indigo-50 border-indigo-200 text-indigo-800' :
                                u.role === 'GEMBALA' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                                u.role === 'PENGURUS' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                'bg-slate-50 border-slate-200 text-slate-700'
                              }`}>
                                {u.role === 'SUPER_ADMIN' ? '👑 PUSAT SYNOD' : u.role}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-slate-500 whitespace-nowrap">{u.email}</td>
                            <td className="p-4 text-center whitespace-nowrap">
                              {userChurch?.status === 'SUSPENDED' ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 border border-rose-250 text-rose-700 animate-pulse">
                                  ❌ Terblokir (Gereja Suspend)
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 border border-emerald-250 text-emerald-800">
                                  ✅ Aktif
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right whitespace-nowrap space-x-1.5">
                              <button
                                onClick={() => handleOpenRepairModal(u)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-250 text-amber-800 rounded text-[10px] font-black cursor-pointer transition shadow-3xs"
                                title="Setel Ulang Password atau Ubah Data Jabatan Akun"
                              >
                                🔧 Perbaiki
                              </button>
                              {!isSelf && (
                                <button
                                  onClick={() => handleDeleteUserGlobal(u.id, u.fullName)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-250 text-rose-700 rounded text-[10px] font-bold cursor-pointer transition shadow-3xs"
                                  title="Hapus Akun Permanen"
                                >
                                  Hapus
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ======================= TAB 3: PROFIL & SANDI SAYA ======================= */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6 max-w-2xl">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <UserIcon className="w-4 h-4 text-indigo-600" />
              <span>Pengaturan Data Diri & Keamanan Sandi Pusat</span>
            </h3>
            <p className="text-xs text-slate-500 font-normal leading-relaxed mt-1">
              Perbarui nama lengkap, alamat email korespondensi nasional, nama pengguna login, atau sandi masuk Anda ke Meta Connect Pusat.
            </p>
          </div>

          <form onSubmit={handleUpdateSelfProfile} className="space-y-4 text-xs">
            {selfSuccess && (
              <div className="p-3.5 bg-emerald-55 border border-emerald-200 text-emerald-800 rounded-lg font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{selfSuccess}</span>
              </div>
            )}
            {selfError && (
              <div className="p-3.5 bg-rose-55 border border-rose-250 text-rose-800 rounded-lg font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{selfError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block uppercase tracking-wider text-[9px]">Nama Lengkap Administrasi</label>
                <input 
                  type="text" 
                  value={selfFullName}
                  onChange={(e) => setSelfFullName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-lg focus:bg-white outline-none font-semibold text-slate-900"
                  placeholder="Ketik nama lengkap Gembala Synod"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block uppercase tracking-wider text-[9px]">Email Korespondensi</label>
                <input 
                  type="email" 
                  value={selfEmail}
                  onChange={(e) => setSelfEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-lg focus:bg-white outline-none text-slate-900"
                  placeholder="nama@synod.org"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block uppercase tracking-wider text-[9px]">Nama Pengguna (Username)</label>
                <input 
                  type="text" 
                  value={selfUsername}
                  onChange={(e) => setSelfUsername(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-lg focus:bg-white outline-none font-mono text-slate-900 animate-pulse"
                  placeholder="Ketik username untuk masuk portal"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block uppercase tracking-wider text-[9px]">Kata Sandi Baru</label>
                <input 
                  type="text" 
                  value={selfPassword}
                  onChange={(e) => setSelfPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-lg focus:bg-white outline-none font-mono text-slate-900"
                  placeholder="Isi sandi baru untuk mengamankan akun login Anda"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Sandi ini akan langsung menggantikan kata sandi Anda.</span>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button 
                type="submit"
                className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg transition text-xs shadow-xs cursor-pointer"
              >
                Simpan Perubahan & Sandi Baru
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================= TAB 3: SINERGI STATISTIK ======================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* Demographic Categorization across the whole Synod */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* National classification list */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-slate-900 flex items-center space-x-1.5">
                  <span className="text-base">📊</span>
                  <span>Klasifikasi Jemaat Nasional</span>
                </h3>
                <p className="text-[11px] text-slate-500">Korelasi total jemaat di seluruh jaringan gereja lokal.</p>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { label: 'Jemaat Inti', count: allMembers.filter(m => m.category === 'INTI').length, color: 'bg-slate-900' },
                  { label: 'Aktif Kebaktian', count: allMembers.filter(m => m.category === 'AKTIF').length, color: 'bg-blue-600' },
                  { label: 'Sidi Baru', count: allMembers.filter(m => m.category === 'BARU').length, color: 'bg-indigo-600' },
                  { label: 'Mulai Pasif', count: allMembers.filter(m => m.category === 'PASIF').length, color: 'bg-slate-400' },
                  { label: 'Lansia Senior', count: allMembers.filter(m => m.category === 'LANSIA').length, color: 'bg-amber-500' },
                  { label: 'Pemuda (Cell Group)', count: allMembers.filter(m => m.category === 'PEMUDA').length, color: 'bg-emerald-600' }
                ].map(item => {
                  const pct = totalNationalMembers > 0 ? (item.count / totalNationalMembers) * 100 : 0;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between font-semibold text-slate-700 text-[11px]">
                        <span>{item.label}</span>
                        <span>{item.count} Jiwa ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* National Ledger Activity Summary */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-slate-900 flex items-center space-x-1.5">
                    <span className="text-base">📋</span>
                    <span>Log Audit Transaksi & Pelayanan Nasional</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">15 aktivitas pengubahan / validasi sistem secara nasional masa kini.</p>
                </div>
                <div className="flex items-center space-x-1 bg-slate-100 px-2.5 py-1 rounded text-[10px] font-mono font-bold text-slate-600">
                  <Activity className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Real Log</span>
                </div>
              </div>

              <div className="divide-y max-h-72 overflow-y-auto space-y-2 text-xs font-sans pr-2">
                {audits.length === 0 ? (
                  <p className="p-4 text-center text-slate-400">Belum ada log aktivitas terdaftar.</p>
                ) : (
                  audits.map(log => (
                    <div key={log.id} className="pt-2.5 pb-2 flex items-start justify-between gap-3 text-[11px] leading-relaxed">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-slate-800">{log.action}</span>
                        <p className="text-slate-600 font-light">{log.details}</p>
                        <span className="text-[10px] text-slate-400 font-mono block">Oleh: {log.userName} • ID: {log.userId}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono text-right whitespace-nowrap shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          <div className="bg-slate-50 border border-slate-250 p-5 rounded-xl text-xs space-y-2 text-slate-750">
            <h4 className="font-extrabold text-slate-900 uppercase tracking-wide flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span>Standar Keamanan Isolat Multi-Tenant Synode</span>
            </h4>
            <p className="font-light leading-relaxed">
              Seluruh data terintegrasi secara modular. Pusat Synode memiliki hak baca ringkasan statistik (aggregate data), menyahuti legalitas ijin login, membekukan (suspend) akses operasional pimpinan daerah, serta mengubah logo dan kode tema representasi visual masing-masing cabang demi keselarasan visi gereja nasional.
            </p>
          </div>

        </div>
      )}

      {/* ======================= MODAL WIZARD: ADD & EDIT CHURCH ======================= */}
      {isAddChurchOpen || editingChurch ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in transition duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-slate-300 shadow-2xl my-8">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1 px-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold font-sans rounded">
                  SYNOD WIZARD
                </div>
                <h3 className="font-bold text-sm text-slate-900 leading-tight">
                  {editingChurch ? 'Kustomisasi Profil & Tampilan Visual' : 'Daftarkan Cabang Gereja Baru'}
                </h3>
              </div>
              <button 
                onClick={() => { setEditingChurch(null); setIsAddChurchOpen(false); }} 
                className="text-slate-400 hover:text-slate-600 font-bold p-1 border rounded hover:bg-slate-100 text-xs transition"
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleSaveChurchSubmit} className="p-5 space-y-4 text-xs font-sans max-h-[80vh] overflow-y-auto">
              
              {/* Mandatory instructions */}
              <div className="p-3.5 bg-indigo-50/50 border border-indigo-100/80 rounded-lg text-indigo-950 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-extrabold block mb-0.5">Syarat Lampiran Logo Sinode</span>
                  Sebagai bagian pemenuhan akreditasi, <span className="underline font-bold text-indigo-850">setiap cabang gereja wajib melampirkan berkas Logo Resmi</span> dalam bentuk file unggahan.
                </div>
              </div>

              {/* Grid 1: Name and Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">NAMA CABANG GEREJA *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Contoh: Meta Connect Gading Agung"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">STATUS AKREDITASI *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as Church['status'])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:bg-white font-semibold"
                  >
                    <option value="VERIFIED">VERIFIED (Aktif / Sah)</option>
                    <option value="PENDING">PENDING (Butuh Legalisasi)</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="SUSPENDED">SUSPENDED (Bekukan)</option>
                  </select>
                </div>
              </div>

              {/* Field 2: Alamat lengkap */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">ALAMAT LENGKAP SEKRETARIAT *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Nama jalan, gedung, nomor..."
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:bg-white"
                />
              </div>

              {/* Grid 3: City and Province */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">KOTA *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Contoh: Jakarta Agung"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">PROVINSI *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Contoh: DKI Jakarta"
                    value={formProvince}
                    onChange={(e) => setFormProvince(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Grid 4: Email and Phone */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">ALAMAT EMAIL RESMI *</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="kantor@metaconnect.org"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">NOMOR TELEPON KANTOR *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="021-xxxxxx atau HP"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Visual custom theme */}
              <div className="border-t pt-3.5 space-y-3">
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Kustomisasi Visual & Warna Tema</span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">WARNA UTAMA (THEME)</label>
                    <input 
                      type="color" 
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="w-full h-10 p-1 border border-slate-200 rounded-lg cursor-pointer bg-slate-50"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">KODE HEXADECIMAL</label>
                    <input 
                      type="text" 
                      placeholder="#0f172a"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 font-mono focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* ENFORCED FILES/LOGO ATTACHMENT COMPONENT */}
              <div className="border-t pt-3.5 space-y-3">
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Lampirkan Berkas Logo Resmi * (Wajib)</span>

                {/* LOGO STATE CHECK */}
                {formLogo ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg border border-emerald-300 bg-white overflow-hidden p-0.5 shrink-0 flex items-center justify-center">
                        <img src={formLogo} alt="Logo preview" className="w-full h-full object-contain" />
                      </div>
                      <div className="text-xs text-emerald-950">
                        <span className="font-extrabold block text-slate-900 truncate max-w-[190px]">
                          {logoFileName || "logo_terlampir.png"}
                        </span>
                        <span className="text-[9px] text-emerald-800 font-mono block">Ukuran: {logoFileSize || 'Base64 Encoded'}</span>
                        <span className="inline-flex mt-1 items-center space-x-0.5 text-[9px] font-bold bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded">
                          ✓ Logo Siap Diunggah
                        </span>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={clearLogoAttachment}
                      className="px-2 py-1 border hover:bg-rose-50 text-rose-600 rounded-md text-[10px] font-extrabold font-sans hover:border-rose-200 cursor-pointer transition"
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  /* Custom Drag & Drop Dropbox Input */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                      isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-98' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <UploadCloud className="w-8 h-8 mx-auto text-slate-400" />
                    
                    <span className="text-[11px] font-extrabold text-slate-800 block mt-2">
                      Letakkan Berkas Logo di Sini
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Atau klik di bawah untuk menelusuri berkas dari komputer Anda
                    </span>
                    
                    <label className="inline-block mt-3 px-3 py-1.5 bg-slate-950 text-white font-bold rounded-lg text-[10px] tracking-wide cursor-pointer hover:bg-slate-800 transition">
                      Telusuri Berkas Logo
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={handleFileBrowseSelect}
                      />
                    </label>
                  </div>
                )}

                {/* Warn logo error constraint */}
                {logoError ? (
                  <p className="text-[10px] font-extrabold text-rose-600 block animate-shake">
                    ⚠️ {logoError}
                  </p>
                ) : (
                  <p className="text-[9px] text-slate-400 font-normal leading-relaxed">
                    Unggah format PNG atau JPG. Logo akan disandikan menjadi format digital base64 aman 100% dan terikat legalitas database pusat.
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => { setEditingChurch(null); setIsAddChurchOpen(false); }}
                  className="px-4 py-2 border hover:bg-slate-50 text-slate-600 font-bold rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs cursor-pointer transition"
                >
                  {editingChurch ? 'Simpan Visual & Profil' : 'Konfirmasi Pendaftaran Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ======================= MODAL WIZARD: CREATE DYNAMIC BRANCH USER ======================= */}
      {isAddUserOpen ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in transition duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden border border-slate-300 shadow-2xl">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-1.5 leading-tight">
                <Key className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Buat Kredensial Pengurus Cabang</span>
              </h3>
              <button 
                onClick={() => setIsAddUserOpen(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold text-sm hover:bg-slate-150 border rounded p-1"
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-5 space-y-4 text-xs font-sans">
              
              {creError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-[10px] font-bold">
                  ⚠️ {creError}
                </div>
              )}

              {creSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-[10px] font-bold flex items-center space-x-1">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{creSuccess}</span>
                </div>
              )}

              {/* Field 1: Full name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">NAMA PENUH PETUGAS *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Pdt. Dr. Thomas Aris, M.Th."
                  value={creFullName}
                  onChange={(e) => setCreFullName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:bg-white"
                />
              </div>

              {/* Grid 2: Username and password */}
              <div className="grid grid-cols-2 gap-35">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">USERNAME LOGIN *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Contoh: gembala_baru"
                    value={creUsername}
                    onChange={(e) => setCreUsername(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">SANDI LOGIN *</label>
                  <input 
                    type="password" 
                    required 
                    placeholder="Ketik password login"
                    value={crePassword}
                    onChange={(e) => setCrePassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Field 3: Email */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">ALAMAT EMAIL *</label>
                <input 
                  type="email" 
                  required 
                  placeholder="gembala@gmail.com"
                  value={creEmail}
                  onChange={(e) => setCreEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:bg-white font-mono"
                />
              </div>

              {/* Grid 4: Role & Church */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">JABATAN PETUGAS *</label>
                  <select
                    value={creRole}
                    onChange={(e) => setCreRole(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:bg-white font-bold"
                  >
                    <option value="SUPER_ADMIN">👑 ANGGOTA PUSAT (SUPER ADMIN)</option>
                    <option value="GEMBALA">GEMBALA SIDANG</option>
                    <option value="PENGURUS">PENGURUS / STAFF BENDAHARA</option>
                    <option value="KEPALA_DIVISI">KEPALA DEPARTEMEN</option>
                    <option value="PELAYAN">PELAYAN JEMAAT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">AFILIASI CABANG *</label>
                  <select
                    value={creChurchId}
                    onChange={(e) => setCreChurchId(e.target.value)}
                    disabled={creRole === 'SUPER_ADMIN'}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:bg-white font-semibold disabled:opacity-50"
                  >
                    {creRole === 'SUPER_ADMIN' ? (
                      <option value="">-- Synod Pusat --</option>
                    ) : (
                      <>
                        <option value="">-- Pilih Cabang --</option>
                        {churches.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 border hover:bg-slate-50 text-slate-600 font-bold rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer shadow-xs transition"
                >
                  Buat Akun Login
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ======================= ACCOUNT REPAIR & RECOVERY MODAL (UNIVERSAL RECOVERY) ======================= */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in select-none">
          <div className="bg-white rounded-2xl border border-slate-250 shadow-xl max-w-lg w-full overflow-hidden text-xs">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-slate-850 rounded-lg text-amber-400 animate-pulse">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight text-white uppercase leading-none">Pemulihan & Reparasi Akun</h3>
                  <p className="text-[10px] text-slate-400 font-normal leading-relaxed mt-1">Super Admin Authority: Memperbaiki kredensial & memulihkan sandi</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRepairUser} className="p-6 space-y-4 text-xs">
              {repairSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-805 rounded-lg font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{repairSuccess}</span>
                </div>
              )}
              {repairError && (
                <div className="p-3 bg-rose-50 border border-rose-250 text-rose-805 rounded-lg font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{repairError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block uppercase tracking-wider text-[9px]">Nama Lengkap Petugas</label>
                  <input 
                    type="text" 
                    value={repairFullName}
                    onChange={(e) => setRepairFullName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-lg focus:bg-white outline-none font-semibold text-slate-900"
                    placeholder="Nama Gembala/Pelayan"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block uppercase tracking-wider text-[9px]">Username Login</label>
                  <input 
                    type="text" 
                    value={repairUsername}
                    onChange={(e) => setRepairUsername(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-lg focus:bg-white outline-none font-mono text-slate-900"
                    placeholder="username"
                  />
                </div>

                <div className="space-y-1 col-span-1 sm:col-span-2">
                  <label className="font-extrabold text-slate-700 block uppercase tracking-wider text-[9px]">Alamat Email</label>
                  <input 
                    type="email" 
                    value={repairEmail}
                    onChange={(e) => setRepairEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-lg focus:bg-white outline-none text-slate-900"
                    placeholder="email@gereja.org"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block uppercase tracking-wider text-[9px]">Kata Sandi Baru</label>
                  <input 
                    type="text" 
                    value={repairPassword}
                    onChange={(e) => setRepairPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-lg focus:bg-white outline-none font-mono text-slate-900"
                    placeholder="Kosongkan jika ingin kembali ke default"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[9px] text-slate-400 block">Isi sandi khusus jika ingin override kata sandi.</span>
                    <button 
                      type="button"
                      onClick={() => setRepairPassword(repairUsername)}
                      className="text-[9px] text-indigo-650 hover:underline font-bold"
                    >
                      Bawaan (Username)
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block uppercase tracking-wider text-[9px]">Jabatan Otoritas</label>
                  <select 
                    value={repairRole}
                    onChange={(e) => setRepairRole(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-lg focus:bg-white outline-none font-semibold text-slate-805"
                  >
                    <option value="SUPER_ADMIN">👑 ANGGOTA PUSAT (SUPER ADMIN)</option>
                    <option value="GEMBALA">👨‍💼 GEMBALA SIDANG (CABANG)</option>
                    <option value="PENGURUS">✍️ PENGURUS INTI (CABANG)</option>
                    <option value="KEPALA_DIVISI">📋 KEPALA DIVISI PELAYANAN</option>
                    <option value="PELAYAN">📋 PELAYAN JEMAAT MAJELIS</option>
                  </select>
                </div>

                <div className="space-y-1 col-span-1 sm:col-span-2">
                  <label className="font-extrabold text-slate-705 block uppercase tracking-wider text-[9px]">Afiliasi Cabang Gereja</label>
                  <select 
                    value={repairChurchId}
                    onChange={(e) => setRepairChurchId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-lg focus:bg-white outline-none font-semibold text-slate-805"
                  >
                    <option value="">-- Synod Pusat (Administrasi Nasional) --</option>
                    {churches.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end space-x-2">
                <button 
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border hover:bg-slate-50 text-slate-600 rounded-lg font-bold"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Simpan Perubahan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
