/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ServiceType, ServiceSchedule, ServiceAssignment, User, AssignmentStatus } from '../types/church';
import { db } from '../utils/storage';
import { 
  Calendar, Clock, UserCheck, Bell, CheckCircle2, XCircle, Plus, 
  Trash2, UserPlus, Info, Check, AlertCircle, Sparkles, BookOpen 
} from 'lucide-react';

interface ServiceManagementProps {
  currentUser: User;
  onRefreshTrail: () => void;
}

export default function ServiceManagement({ currentUser, onRefreshTrail }: ServiceManagementProps) {
  const [activeTab, setActiveTab] = useState<'SCHEDULES' | 'SERVICE_TYPES'>('SCHEDULES');
  const [refreshSeed, setRefreshSeed] = useState(0);

  // Filter states
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Modal open states
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Edit target states
  const [editingType, setEditingType] = useState<ServiceType | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ServiceSchedule | null>(null);

  // Base Service Type Form
  const [typeName, setTypeName] = useState('');
  const [typeDesc, setTypeDesc] = useState('');
  const [typeCat, setTypeCat] = useState<'IBADAH_RAYA' | 'SEKOLAH_MINGGU' | 'YOUTH' | 'UMUM' | 'KOMSEL'>('IBADAH_RAYA');
  const [typeDefaultTime, setTypeDefaultTime] = useState('09:00');

  // Schedule Grid Form
  const [schTypeId, setSchTypeId] = useState('');
  const [schDate, setSchDate] = useState(new Date().toISOString().split('T')[0]);
  const [schTime, setSchTime] = useState('09:00');
  const [schSpeaker, setSchSpeaker] = useState('');
  const [schTheme, setSchTheme] = useState('');
  const [schNotes, setSchNotes] = useState('');
  const [schAssignments, setSchAssignments] = useState<ServiceAssignment[]>([]);

  // Assignment helper row inputs
  const [newAssignUser, setNewAssignUser] = useState('');
  const [newAssignRole, setNewAssignRole] = useState('Praise & Worship Leader');

  const users = db.getUsers();
  const serviceTypes = db.getServiceTypes();
  const schedules = db.getServiceSchedules();

  const handleOpenTypeModal = (type: ServiceType | null) => {
    if (type) {
      setEditingType(type);
      setTypeName(type.name);
      setTypeDesc(type.description);
      setTypeCat(type.category);
      setTypeDefaultTime(type.defaultTime || '09:00');
    } else {
      setEditingType(null);
      setTypeName('');
      setTypeDesc('');
      setTypeCat('IBADAH_RAYA');
      setTypeDefaultTime('09:00');
    }
    setIsTypeModalOpen(true);
  };

  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName) return;

    if (editingType) {
      db.updateServiceType({
        ...editingType,
        name: typeName,
        description: typeDesc,
        category: typeCat,
        defaultTime: typeDefaultTime
      }, currentUser);
    } else {
      db.addServiceType({
        id: 'st-' + Date.now(),
        name: typeName,
        description: typeDesc,
        category: typeCat,
        defaultTime: typeDefaultTime
      }, currentUser);
    }

    setIsTypeModalOpen(false);
    onRefreshTrail();
    setRefreshSeed(s => s + 1);
  };

  const handleDeleteType = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus jenis pelayanan "${name}"? Semua jadwal terkait mungkin perlu disesuaikan.`)) {
      db.deleteServiceType(id, currentUser);
      onRefreshTrail();
      setRefreshSeed(s => s + 1);
    }
  };

  const handleOpenScheduleModal = (sch: ServiceSchedule | null) => {
    if (sch) {
      setEditingSchedule(sch);
      setSchTypeId(sch.serviceTypeId);
      setSchDate(sch.date);
      setSchTime(sch.time);
      setSchSpeaker(sch.speaker);
      setSchTheme(sch.theme || '');
      setSchNotes(sch.notes || '');
      setSchAssignments(sch.assignments || []);
    } else {
      setEditingSchedule(null);
      setSchTypeId(serviceTypes[0]?.id || '');
      setSchDate(new Date().toISOString().split('T')[0]);
      setSchTime(serviceTypes[0]?.defaultTime || '09:00');
      setSchSpeaker('');
      setSchTheme('');
      setSchNotes('');
      setSchAssignments([]);
    }
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schTypeId || !schDate || !schSpeaker) {
      alert("Harap lengkapi jenis pelayanan, tanggal, dan pembicara.");
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (schDate < todayStr) {
      alert("Tanggal penjadwalan tidak boleh di masa lampau.");
      return;
    }

    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFormatRegex.test(schDate)) {
      alert("Format tanggal salah. Silakan gunakan format YYYY-MM-DD.");
      return;
    }

    const tSelected = serviceTypes.find(t => t.id === schTypeId);
    if (!tSelected) return;

    if (editingSchedule) {
      db.updateServiceSchedule({
        ...editingSchedule,
        serviceTypeId: schTypeId,
        serviceTypeName: tSelected.name,
        date: schDate,
        time: schTime,
        speaker: schSpeaker,
        theme: schTheme || undefined,
        notes: schNotes || undefined,
        assignments: schAssignments
      }, currentUser);
    } else {
      db.addServiceSchedule({
        id: 'sch-' + Date.now(),
        serviceTypeId: schTypeId,
        serviceTypeName: tSelected.name,
        date: schDate,
        time: schTime,
        speaker: schSpeaker,
        theme: schTheme || undefined,
        status: 'SCHEDULED',
        notes: schNotes || undefined,
        assignments: schAssignments
      }, currentUser);
    }

    setIsScheduleModalOpen(false);
    onRefreshTrail();
    setRefreshSeed(s => s + 1);
  };

  const handleDeleteSchedule = (id: string) => {
    if (confirm("Apakah anda yakin ingin membatalkan dan menghapus jadwal pelayanan ini?")) {
      db.deleteServiceSchedule(id, currentUser);
      onRefreshTrail();
      setRefreshSeed(s => s + 1);
    }
  };

  // Add Assignment row helper helper
  const handleAddAssignmentRow = () => {
    if (!newAssignUser) return;
    const matchedUser = users.find(u => u.id === newAssignUser);
    if (!matchedUser) return;

    // Check duplicate
    if (schAssignments.some(a => a.userId === matchedUser.id)) {
      alert("Petugas tersebut sudah terdaftar pada tugas lainnya di ibadah ini.");
      return;
    }

    const newAssign: ServiceAssignment = {
      userId: matchedUser.id,
      userName: matchedUser.fullName,
      roleName: newAssignRole,
      status: 'PENDING',
      notified: false
    };

    setSchAssignments([...schAssignments, newAssign]);
    setNewAssignUser('');
  };

  const handleRemoveAssignmentRow = (idx: number) => {
    const next = schAssignments.slice();
    next.splice(idx, 1);
    setSchAssignments(next);
  };

  // Trigger Notifications Simulated Actions
  const handleNotifyServers = (schId: string) => {
    const list = db.getServiceSchedules();
    const sch = list.find(s => s.id === schId);
    if (!sch) return;

    sch.assignments = sch.assignments.map(a => ({ ...a, notified: true }));
    db.updateServiceSchedule(sch, currentUser);

    alert(`SUKSES! Peringatan jadwal terkirim otomatis ke perangkat WhatsApp & Email ${sch.assignments.length} pelayan terdaftar.`);
    setRefreshSeed(s => s + 1);
  };

  // Accept/Decline action for CURRENT logged-in user
  const handleOwnDutyResponse = (schId: string, status: AssignmentStatus) => {
    const list = db.getServiceSchedules();
    const sch = list.find(s => s.id === schId);
    if (!sch) return;

    sch.assignments = sch.assignments.map(a => {
      if (a.userId === currentUser.id) {
        return { ...a, status };
      }
      return a;
    });

    db.updateServiceSchedule(sch, currentUser);
    
    const label = status === 'CONFIRMED' ? 'MENERIMA' : 'MENOLAK';
    db.logAudit(currentUser.id, currentUser.fullName, 'SCHEDULE_RESPONSE', `Pelayan ${currentUser.fullName} ${label} penugasan pelayanan pada jadwal ${sch.serviceTypeName} (${sch.date}).`);
    
    alert(`Konfirmasi kehadiran berhasil diperbarui: Anda menyatakan ${status === 'CONFIRMED' ? 'Bersedia Melayani' : 'Belum Bersedia / Berhalangan'}.`);
    onRefreshTrail();
    setRefreshSeed(s => s + 1);
  };

  // Toggle server active presence checkbox
  const handleToggleAttendance = (schId: string, userId: string) => {
    const list = db.getServiceSchedules();
    const sch = list.find(s => s.id === schId);
    if (!sch) return;

    sch.assignments = sch.assignments.map(a => {
      if (a.userId === userId) {
        return { ...a, attended: !a.attended };
      }
      return a;
    });

    db.updateServiceSchedule(sch, currentUser);
    setRefreshSeed(s => s + 1);
  };

  // Filtering schedules
  const categoryFilteredSchedules = schedules.filter(s => {
    if (selectedCategoryFilter === 'ALL') return true;
    const typeObj = serviceTypes.find(t => t.id === s.serviceTypeId);
    return typeObj?.category === selectedCategoryFilter;
  });

  // Calculate my own upcoming pending assignment duties
  const myDuties = schedules.filter(s => 
    s.status === 'SCHEDULED' && 
    s.assignments.some(a => a.userId === currentUser.id && a.status === 'PENDING')
  );

  return (
    <div key={refreshSeed} className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Penjadwalan Pelayanan & Liturgi Ibadah</h2>
          <p className="text-sm text-slate-500">Tentukan jadwal ibadah raya, atur penugasan divisi musik, multimedia, usher, serta pantau kehadiran pelayan.</p>
        </div>

        <div className="flex space-x-2 shrink-0">
          {activeTab === 'SCHEDULES' ? (
            (currentUser.role === 'GEMBALA' || currentUser.role === 'PENGURUS') && (
              <button 
                onClick={() => handleOpenScheduleModal(null)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Jadwal Baru</span>
              </button>
            )
          ) : (
            (currentUser.role === 'GEMBALA' || currentUser.role === 'SUPER_ADMIN') && (
              <button 
                onClick={() => handleOpenTypeModal(null)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jenis Pelayanan</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* 2. Top Banner Alert for assigned user to confirm invitation */}
      {myDuties.length > 0 && (
        <div className="bg-indigo-950 text-white rounded-2xl p-5 border border-indigo-900 shadow-lg space-y-3 animate-in-fade-in">
          <div className="flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-extrabold text-indigo-300 uppercase tracking-widest block">UNDANGAN PENUGASAN PELAYANAN</span>
              <p className="text-slate-200">Halo **{currentUser.fullName}**, Anda ditugaskan pada beberapa acara ibadah mendatang. Harap berikan konfirmasi kehadiran Anda untuk membantu koordinasi liturgi:</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {myDuties.map(item => {
              const myObj = item.assignments.find(a => a.userId === currentUser.id);
              return (
                <div key={item.id} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-extrabold">{item.serviceTypeName}</span>
                    <h5 className="font-bold text-slate-100">{item.theme || 'Tanpa Tema'}</h5>
                    <p className="text-slate-400 text-[10px] flex items-center"><Calendar className="w-3 h-3 mr-1" /> {item.date} Pukul {item.time}</p>
                    <p className="text-[10px] text-indigo-400 font-semibold uppercase">Tugas: {myObj?.roleName}</p>
                  </div>

                  <div className="flex space-x-1.5 shrink-0">
                    <button 
                      onClick={() => handleOwnDutyResponse(item.id, 'CONFIRMED')}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] transition"
                    >
                      Bersedia
                    </button>
                    <button 
                      onClick={() => handleOwnDutyResponse(item.id, 'DECLINED')}
                      className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold rounded text-[10px] transition"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-250">
        <button
          onClick={() => setActiveTab('SCHEDULES')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'SCHEDULES' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          📅 Jadwal Pelayanan Aktif ({schedules.length})
        </button>
        <button
          onClick={() => setActiveTab('SERVICE_TYPES')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'SERVICE_TYPES' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          ⛪ Jenis Pelayanan Basis ({serviceTypes.length})
        </button>
      </div>

      {/* 4. Tab Contents */}
      {activeTab === 'SCHEDULES' ? (
        
        /* TAB 1: SCHEDULES MANAGEMENT */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-4 items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Filter Kategori:</span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
              >
                <option value="ALL">Semua Ibadah</option>
                <option value="IBADAH_RAYA">Ibadah Raya Mingguan</option>
                <option value="SEKOLAH_MINGGU">Kids / Sekolah Minggu</option>
                <option value="YOUTH">Youth / Pemuda</option>
                <option value="KOMSEL">Komsel (Cell group)</option>
                <option value="UMUM">Ibadah Khusus & Umum</option>
              </select>
            </div>
            
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Siklus update real-time sinkron komsel</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {categoryFilteredSchedules.length === 0 ? (
              <div className="lg:col-span-2 bg-white rounded-xl border p-12 text-center text-slate-400 text-xs italic">
                Tidak ada draf jadwal pelayanan terdaftar. Silakan buat dengan mengklik tombol "Buat Jadwal Baru".
              </div>
            ) : (
              categoryFilteredSchedules.map(sch => {
                const isUserInvolved = sch.assignments.some(a => a.userId === currentUser.id);
                return (
                  <div key={sch.id} className="bg-white rounded-xl border border-slate-200/80 shadow-3xs p-5 space-y-4 flex flex-col justify-between hover:shadow-xs transition">
                    
                    {/* Header info */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 bg-blue-50/80 text-blue-800 border border-blue-100 rounded text-[9px] font-bold uppercase tracking-wider">{sch.serviceTypeName}</span>
                        <div className="flex items-center space-x-1.5">
                          {isUserInvolved && <span className="text-[9px] bg-indigo-50 border-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">Tugas Anda</span>}
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${sch.status === 'SCHEDULED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400'}`}>{sch.status}</span>
                        </div>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 leading-tight">{sch.theme || 'Tanpa Tema Khotbah'}</h4>
                      <p className="text-xs text-slate-500 font-light leading-relaxed">Pembicara: <span className="font-semibold text-slate-700">{sch.speaker}</span></p>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-medium py-1.5 border-y border-dashed border-slate-100">
                        <span className="flex items-center"><Calendar className="w-3.5 h-3.5 text-slate-300 mr-1.5" /> Tanggal: {sch.date}</span>
                        <span className="flex items-center"><Clock className="w-3.5 h-3.5 text-slate-300 mr-1.5" /> Sesi: Pukul {sch.time} WIB</span>
                      </div>
                    </div>

                    {/* Duty assignments list */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daftar Penugasan Pelayan</span>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {sch.assignments.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic">Belum ada pelayan yang ditugaskan ke ibadah ini.</p>
                        ) : (
                          sch.assignments.map((as, idx) => (
                            <div key={idx} className="bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100 flex items-center justify-between text-xs gap-2">
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-[11px] truncate leading-none">{as.userName}</p>
                                <span className="text-[9px] text-slate-400 font-medium uppercase">{as.roleName}</span>
                              </div>

                              <div className="flex items-center space-x-2 shrink-0">
                                {/* Confirm status */}
                                {as.status === 'CONFIRMED' ? (
                                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[9px]">Sedia</span>
                                ) : as.status === 'DECLINED' ? (
                                  <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold text-[9px]">Batal</span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded font-semibold text-[9px]">Pending</span>
                                )}

                                {/* Attendance toggle (Gembala/Pengurus ONLY) */}
                                {(currentUser.role === 'GEMBALA' || currentUser.role === 'PENGURUS') ? (
                                  <label className="flex items-center space-x-1 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={!!as.attended}
                                      onChange={() => handleToggleAttendance(sch.id, as.userId)}
                                      className="w-3 h-3 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-[9px] font-semibold text-slate-500">Hadir</span>
                                  </label>
                                ) : (
                                  as.attended && <span className="text-[9px] text-indigo-600 font-bold">✓ Hadir</span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Notes summary */}
                    {sch.notes && (
                      <div className="p-2.5 bg-slate-50/50 rounded-lg text-[10px] text-slate-500 font-light border shadow-3xs">
                        <span className="font-extrabold uppercase text-[9px] text-slate-400 block mb-0.5">Catatan Teknis</span>
                        {sch.notes}
                      </div>
                    )}

                    {/* Operational Actions (Segregates permissions) */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2 gap-2">
                      <div className="flex space-x-1.5">
                        {(currentUser.role === 'GEMBALA' || currentUser.role === 'PENGURUS') && (
                          <button 
                            onClick={() => handleNotifyServers(sch.id)}
                            className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-[10px] flex items-center space-x-1 transition"
                            title="Kirim pengingat WhatsApp ke semua petugas terdaftar"
                          >
                            <Bell className="w-3 h-3" />
                            <span>Kirim Pengingat</span>
                          </button>
                        )}
                      </div>

                      <div className="flex space-x-1">
                        {(currentUser.role === 'GEMBALA' || currentUser.role === 'PENGURUS') && (
                          <>
                            <button 
                              onClick={() => handleOpenScheduleModal(sch)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded text-slate-600 font-bold text-[10px] transition"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteSchedule(sch.id)}
                              className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-100 transition"
                              title="Batalkan Jadwal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

      ) : (

        /* TAB 2: BASE SERVICE TYPES */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs font-light text-slate-500">
            Daftar rancangan template atau kategori ibadah internal gereja. Data ini dijadikan rujukan default waktu dan nama modul saat menyusun agenda liturgi mingguan.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {serviceTypes.map(st => (
              <div key={st.id} className="bg-white rounded-xl border border-slate-200/85 p-4 flex flex-col justify-between hover:shadow-2xs transition">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold tracking-wider">{st.category}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold flex items-center"><Clock className="w-3 h-3 mr-1" /> Jam {st.defaultTime || '--:--'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-905">{st.name}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-light">{st.description || 'Tidak ada uraian kualifikasi ibadah'}</p>
                </div>

                {(currentUser.role === 'GEMBALA' || currentUser.role === 'SUPER_ADMIN') && (
                  <div className="flex justify-end space-x-1.5 pt-3 border-t mt-3 border-slate-50">
                    <button 
                      onClick={() => handleOpenTypeModal(st)}
                      className="px-2.5 py-1 text-[10px] font-bold border rounded hover:bg-slate-50 text-slate-600"
                    >
                      Ubah
                    </button>
                    <button 
                      onClick={() => handleDeleteType(st.id, st.name)}
                      className="p-1 px-1.5 text-[10px] border border-transparent rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 hover:border-rose-100"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. MODAL: Base Service Type Form */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden border shadow-2xl animate-in-fade-in">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">{editingType ? 'Ubah Jenis Pelayanan' : 'Tambah Jenis Pelayanan Basis'}</h3>
              <button onClick={() => setIsTypeModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleTypeSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">NAMA PELAYANAN / IBADAH *</label>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: Ibadah Kebaktian Raya Sesi I"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">KATEGORI BASIS *</label>
                  <select 
                    value={typeCat}
                    onChange={(e) => setTypeCat(e.target.value as any)}
                    className="w-full p-2.5 border rounded outline-none bg-white"
                  >
                    <option value="IBADAH_RAYA">IBADAH RAYA</option>
                    <option value="SEKOLAH_MINGGU">SEKOLAH MINGGU (KIDS)</option>
                    <option value="YOUTH">YOUTH / PEMUDA</option>
                    <option value="KOMSEL">KOMSEL / SEL GRUP</option>
                    <option value="UMUM">UMUM / KHUSUS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">DEFAULT JAM MULAI</label>
                  <input 
                    type="text"
                    placeholder="HH:MM"
                    value={typeDefaultTime}
                    onChange={(e) => setTypeDefaultTime(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">DESKRIPSI LENGKAP TEMPLATE</label>
                <textarea 
                  placeholder="Peruntukan ibadah, lokasi ruang, atau petunjuk tata cara pelaksanaan liturgis..."
                  value={typeDesc}
                  onChange={(e) => setTypeDesc(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none h-20 resize-none font-light"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 border rounded font-bold text-slate-500 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 transition"
                >
                  Simpan Jenis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: Schedule Service Form */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border shadow-2xl animate-in-fade-in text-xs">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">{editingSchedule ? 'Ubah Penjadwalan Pelayanan' : 'Buat Jadwal Liturgi Ibadah'}</h3>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">JENIS PELAYANAN / TEMPLATE *</label>
                  <select
                    value={schTypeId}
                    onChange={(e) => {
                      setSchTypeId(e.target.value);
                      const defaultT = serviceTypes.find(t => t.id === e.target.value)?.defaultTime;
                      if (defaultT) setSchTime(defaultT);
                    }}
                    className="w-full p-2.5 border rounded outline-none bg-white"
                  >
                    {serviceTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">TANGGAL *</label>
                    <input 
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={schDate}
                      onChange={(e) => setSchDate(e.target.value)}
                      className="w-full p-2 border rounded outline-none"
                    />
                    <p className="text-[9px] text-slate-400 mt-1 font-mono">Min: Hari ini (YYYY-MM-DD)</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">JAM (WIB) *</label>
                    <input 
                      type="text"
                      required
                      value={schTime}
                      onChange={(e) => setSchTime(e.target.value)}
                      className="w-full p-2 border rounded outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">PEMBICARA / PENGKHOTBAH *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Contoh: Pdt. Dr. Thomas Aris"
                    value={schSpeaker}
                    onChange={(e) => setSchSpeaker(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">TEMA KHOTBAH</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Meneguhkan Janji Setia Allah"
                    value={schTheme}
                    onChange={(e) => setSchTheme(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">CATATAN TEKNIS LITURGIS / SOUND CHECK</label>
                <input 
                  type="text"
                  placeholder="Contoh: Pemain musik standby jam 08:30 WIB"
                  value={schNotes}
                  onChange={(e) => setSchNotes(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none"
                />
              </div>

              {/* Assignments Editor Sub-Section */}
              <div className="border-t pt-3 space-y-2">
                <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wide block">Susunan Petugas Sesi Ini</span>
                
                {/* Input row */}
                <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 flex items-center justify-between gap-2">
                  <div className="grow grid grid-cols-2 gap-2">
                    <select
                      value={newAssignUser}
                      onChange={(e) => setNewAssignUser(e.target.value)}
                      className="w-full p-2 border rounded outline-none bg-white text-[11px]"
                    >
                      <option value="">-- Pilih Nama Pelayan --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                      ))}
                    </select>

                    <input 
                      type="text"
                      placeholder="Contoh: WL, Singer, Drummer, Soundman"
                      value={newAssignRole}
                      onChange={(e) => setNewAssignRole(e.target.value)}
                      className="w-full p-2 border rounded outline-none text-[11px]"
                    />
                  </div>

                  <button 
                    type="button"
                    onClick={handleAddAssignmentRow}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
                    title="Daftarkan baris petugas"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sub-list */}
                <div className="space-y-1 max-h-[160px] overflow-y-auto pt-1">
                  {schAssignments.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic text-center p-3">Belum ada baris petugas pelayan liturgis yang disusun.</p>
                  ) : (
                    schAssignments.map((as, index) => (
                      <div key={index} className="bg-slate-50 border p-2 rounded hover:bg-slate-100/55 flex justify-between items-center text-xs gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 leading-none">{as.userName}</p>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">{as.roleName}</span>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-[10px] text-slate-400 italic">{as.status}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveAssignmentRow(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 border rounded font-bold text-slate-500 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 transition"
                >
                  Simpan Jadwal Ibadah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
