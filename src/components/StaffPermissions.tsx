import React, { useState, useEffect } from 'react';
import { User } from '../types/church';
import { db } from '../utils/storage';
import { 
  ShieldCheck, Shield, Key, CheckCircle2, UserCheck, Lock,
  ChevronRight, Info, Save, HelpCircle, Users, Settings2, Sparkles, CheckSquare
} from 'lucide-react';

interface StaffPermissionsProps {
  currentUser: User;
  onRefresh: () => void;
}

const AVAILABLE_MENUS = [
  { id: 'dashboard', name: 'Dasbor Analytics', desc: 'Ringkasan jemaat, absensi mingguan, & info penting.' },
  { id: 'members', name: 'Database Jemaat', desc: 'Akses melihat & mengelola list data jemaat aktif/pasif.' },
  { id: 'services', name: 'Pelayanan & Jadwal', desc: 'Mengatur penugasan liturgis, pelayan altar, & musik.' },
  { id: 'approvals', name: 'Approval Workflow', desc: 'Mengajukan & mereview draf anggaran departemen.' },
  { id: 'finance', name: 'Buku Kas & Anggaran', desc: 'Pencatatan pemasukan, persepuluhan, & pengeluaran jemaat.' },
  { id: 'school', name: 'Sekolah Minggu', desc: 'Pengelolaan kelas anak, database murid & absensi.' },
  { id: 'divisions', name: 'Divisi Pelayanan', desc: 'Manajemen struktur kepengurusan diakonia, musik & media.' },
  { id: 'tasks', name: 'Kanban Task Board', desc: 'Tugas kepanitiaan, check list persiapan acara & to-do.' }
];

export default function StaffPermissions({ currentUser, onRefresh }: StaffPermissionsProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState<string>('');

  // Fetch verified church staff (users of the current church, excluding the current Gembala themselves)
  const users = db.getUsers().filter(
    u => u.churchId === currentUser.churchId && 
    u.isVerified !== false && 
    u.id !== currentUser.id
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  useEffect(() => {
    if (selectedUser) {
      setSelectedMenus(selectedUser.customMenus || []);
      setSaveSuccess('');
    } else {
      setSelectedMenus([]);
    }
  }, [selectedUserId, selectedUser]);

  const handleToggleMenu = (menuId: string) => {
    setSelectedMenus(prev => {
      if (prev.includes(menuId)) {
        return prev.filter(id => id !== menuId);
      } else {
        return [...prev, menuId];
      }
    });
    setSaveSuccess('');
  };

  const applyPreset = (presetType: 'PARTIAL' | 'NEAR_FULL' | 'FULL') => {
    if (presetType === 'PARTIAL') {
      // Liturgi & Jadwal
      setSelectedMenus(['dashboard', 'services', 'tasks']);
    } else if (presetType === 'NEAR_FULL') {
      // Operasional & Keuangan
      setSelectedMenus(['dashboard', 'members', 'services', 'approvals', 'finance', 'school', 'divisions', 'tasks']);
    } else if (presetType === 'FULL') {
      // Semua menu di atas
      setSelectedMenus(AVAILABLE_MENUS.map(m => m.id));
    }
    setSaveSuccess('Preset terisi! Klik Simpan Otorisasi untuk menerapkan.');
  };

  const handleSave = () => {
    if (!selectedUser) return;

    const updatedUser = {
      ...selectedUser,
      customMenus: selectedMenus
    };

    db.updateUser(updatedUser);
    
    // Log Audit
    const menuNames = AVAILABLE_MENUS.filter(m => selectedMenus.includes(m.id)).map(m => m.name);
    const menuString = menuNames.length > 0 ? menuNames.join(', ') : 'Tanpa Delegasi Otoritas';
    db.logAudit(
      currentUser.id, 
      currentUser.fullName, 
      'UPDATE_USER_PERMISSIONS', 
      `Gembala Sidang memperbarui delegasi hak akses untuk staf ${selectedUser.fullName} (@${selectedUser.username}): Hak akses yang diberikan [${menuString}].`
    );

    setSaveSuccess('Otorisasi hak akses berhasil diperbarui secara real-time!');
    onRefresh();

    setTimeout(() => {
      setSaveSuccess('');
    }, 4500);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-indigo-950 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1.5 leading-relaxed">
          <h4 className="font-extrabold text-indigo-950 uppercase tracking-tight flex items-center gap-1.5">
            <span>Kebijakan Keamanan & Delegasi Otoritas</span>
            <span className="text-[9px] bg-indigo-600 text-white font-extrabold px-1.5 py-0.5 rounded-full">Sistem Desentralisasi</span>
          </h4>
          <p className="font-light">
            Sebagai <strong>Gembala Sidang</strong>, Anda memiliki kendali teologis dan administratif penuh atas cabang gereja Anda. 
            Di bawah ini Anda dapat melimpahkan wewenang hak akses sebagian atau hampir penuh kepada staf, pelayan gereja, kepala divisi atau pengurus yang diunjuk. 
            Hal ini membantu memperlancar kepanitiaan liturgis dan operasional mingguan tanpa mengekspos kredensial utama Anda.
          </p>
          <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-200/50 flex items-center space-x-2 text-[11px] font-medium text-indigo-900">
            <span className="text-amber-600 font-extrabold">⚠️ KEBIJAKAN SISTEMIS:</span>
            <span>Hak verifikasi database register pendaftar baru dan akses log audit rollback mutlak terkunci hanya untuk peran utama <strong>Gembala Sidang</strong> guna mencegah insiden penyalahgunaan data jemaat.</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Pane - Staff List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col h-[520px]">
          <div className="p-4 border-b bg-slate-50/50 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Daftar Staf Pelayan ({users.length})
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Pilih staf pelayanan jemaat untuk mengkonfigurasi hak akses modul mereka.</p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 bg-slate-50/20">
            {users.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2 h-full">
                <Shield className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-bold text-slate-500">Staf Belum Terverifikasi</p>
                <p className="text-[11px] max-w-xs leading-relaxed font-light text-slate-400">Pastikan pelayan telah mengajukan akun pendaftaran dan disetujui di tab <strong>"Verifikasi Pendaftar Baru"</strong>.</p>
              </div>
            ) : (
              users.map((user) => {
                const userMenusCount = user.customMenus?.length || 0;
                const isSelected = selectedUserId === user.id;

                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full p-3 rounded-lg text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-xs border-indigo-600' 
                        : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 select-none ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {user.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">{user.fullName}</div>
                        <div className={`text-[10px] flex items-center space-x-1.5 ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                          <span>@{user.username}</span>
                          <span>•</span>
                          <span className="font-extrabold uppercase">{user.role}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                      }`}>
                        {userMenusCount} Menu
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane - Configurator */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col h-[520px]">
          {!selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                <Key className="w-10 h-10 stroke-[1.5]" />
              </div>
              <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Konfigurator Hak Akses Pintar</h5>
              <p className="text-[11px] font-light max-w-sm leading-relaxed">
                Silakan pilih salah satu staf pelayan di panel sebelah kiri untuk mulai mengatur pelimpahan wewenang hak akses per modul secara presisi dan instan.
              </p>
            </div>
          ) : (
            <>
              {/* Active Selection Header */}
              <div className="p-4 border-b bg-slate-50/50 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Otorisasi Untuk:</span>
                    <span className="font-extrabold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{selectedUser.fullName} (@{selectedUser.username})</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Berikan akses ke modul-modul spesifik sesuai mandat tugas pelayanan mereka.</p>
                </div>
                
                <div className="flex items-center space-x-1 shrink-0">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mr-1 sm:block hidden">PRESETS:</span>
                  <button
                    onClick={() => applyPreset('PARTIAL')}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[9px] rounded uppercase tracking-wider transition cursor-pointer"
                    title="Hanya Dashboard, Kegiatan & Alur Tugas"
                  >
                    Sebagian
                  </button>
                  <button
                    onClick={() => applyPreset('NEAR_FULL')}
                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[9px] rounded uppercase tracking-wider transition cursor-pointer"
                    title="Akses Semua Kecuali Verifikasi Pokok"
                  >
                    Hampir Penuh
                  </button>
                  <button
                    onClick={() => applyPreset('FULL')}
                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-[9px] rounded uppercase tracking-wider transition cursor-pointer text-nowrap"
                    title="Limpahkan Semua Akses Staf Administrasi"
                  >
                    Akses Penuh
                  </button>
                </div>
              </div>

              {/* Checkboxes List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/20">
                {saveSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-[11px] font-bold flex items-center space-x-2 animate-bounce">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{saveSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_MENUS.map((menu) => {
                    const isChecked = selectedMenus.includes(menu.id);
                    return (
                      <button
                        key={menu.id}
                        onClick={() => handleToggleMenu(menu.id)}
                        className={`p-3 rounded-xl border text-left flex items-start space-x-2.5 transition relative cursor-pointer outline-none ${
                          isChecked 
                            ? 'border-indigo-200 bg-indigo-50/30 shadow-3xs' 
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Hooked via button onClick
                          className="mt-0.5 w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer pointer-events-none"
                        />
                        <div className="min-w-0 select-none">
                          <p className="font-extrabold text-slate-900 text-xs leading-none">{menu.name}</p>
                          <p className="text-[10px] text-slate-400 font-light mt-1 leading-normal">{menu.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Save Action */}
              <div className="p-4 border-t bg-slate-50/50 shrink-0 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Perubahan langsung berefek saat staf melakukan login/refresh.</span>
                </div>

                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Otorisasi</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
