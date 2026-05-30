/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, ApprovalRequest, Task, ChecklistItem, ApprovalStatus } from '../types/church';
import { db } from '../utils/storage';
import { 
  Clock, CheckCircle2, AlertCircle, X, Users, ClipboardList, 
  ListChecks, ArrowRight, UserCheck, CheckSquare, MessageSquare, 
  Receipt, PlayCircle, Wallet
} from 'lucide-react';

interface PendingItemsProps {
  currentUser: User;
  onRefreshTrail: () => void;
  defaultTab?: 'USERS' | 'APPROVALS' | 'TASKS';
}

type ActiveCategory = 'USERS' | 'APPROVALS' | 'TASKS';

export default function PendingItems({ currentUser, onRefreshTrail, defaultTab = 'TASKS' }: PendingItemsProps) {
  const [activeTab, setActiveTab] = useState<ActiveCategory>(defaultTab);

  React.useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);
  const [refreshSeed, setRefreshSeed] = useState(0);

  // Modal feedback for approvals
  const [rejectingReqId, setRejectingReqId] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');

  const triggerRefresh = () => {
    setRefreshSeed(prev => prev + 1);
    onRefreshTrail();
  };

  // 1. Pending Users
  const pendingUsers = db.getUsers().filter(u => u.churchId === currentUser.churchId && u.isVerified === false);

  // 2. Pending Approvals
  const pendingApprovals = db.getApprovals().filter(a => {
    // If supervisor, can see submitted
    // Otherwise, can see only what they requested that is currently submitted/under review
    if (currentUser.role === 'GEMBALA' || currentUser.role === 'PENGURUS') {
      return a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW';
    }
    return a.requesterId === currentUser.id && (a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW');
  });

  // 3. Pending Tasks (Board ID Todo or Doing)
  const pendingTasks = db.getTasks().filter(t => t.boardId !== 'DONE');

  const handleVerifyUser = (userId: string, fullName: string) => {
    if (confirm(`Apakah Anda yakin ingin menyetujui & memverifikasi akun "${fullName}"?\n\nTindakan ini akan:\n1. Mengaktifkan akun sehingga yang bersangkutan dapat langsung login.\n2. Secara otomatis mengintegrasikan & mengimpor data dirinya ke dalam Database Jemaat (Kategori Inti).`)) {
      db.verifyAndIntegrateUser(userId, currentUser);
      triggerRefresh();
    }
  };

  const handleRejectUser = (userId: string, fullName: string) => {
    if (confirm(`⚠️ PERINGATAN: Apakah Anda yakin ingin MENOLAK & menghapus pendaftaran akun untuk "${fullName}"?\n\nTindakan ini akan menghapus pendaftaran dari antrean secara permanen.`)) {
      db.rejectUserRegistration(userId, currentUser);
      triggerRefresh();
    }
  };

  const handleApproveRequest = (reqId: string, title: string) => {
    if (confirm(`Setujui pengajuan anggaran/event: "${title}"?\nTindakan ini akan mencatat log status APPROVED.`)) {
      const list = db.getApprovals();
      const target = list.find(r => r.id === reqId);
      if (!target) return;

      target.status = 'APPROVED';
      db.updateApproval(target, currentUser);

      // If financial, record automatic safe ledger
      if (target.type === 'FINANCE' && target.amount) {
        db.addTransaction({
          id: 'tx-auto-' + Date.now(),
          type: 'EXPENSE',
          category: 'EVENT',
          amount: target.amount,
          date: new Date().toISOString().split('T')[0],
          description: `Pengeluaran Otomatis (Linked Approval ID: ${target.id}) - ${target.title}`,
          pocketId: 'pocket-1-gereja' // default standard primary fund
        }, currentUser);
      }

      triggerRefresh();
    }
  };

  const handleRejectRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReqId) return;

    const list = db.getApprovals();
    const target = list.find(r => r.id === rejectingReqId);
    if (target) {
      target.status = 'REJECTED';
      if (feedbackNote.trim()) {
        target.revisionNote = `${currentUser.fullName}: ${feedbackNote}`;
      }
      db.updateApproval(target, currentUser);
      setRejectingReqId(null);
      setFeedbackNote('');
      triggerRefresh();
    }
  };

  const handleTaskStartProgress = (taskId: string) => {
    const list = db.getTasks();
    const target = list.find(t => t.id === taskId);
    if (target) {
      target.boardId = 'DOING';
      db.updateTask(target);
      triggerRefresh();
    }
  };

  const handleTaskCompleteDirect = (taskId: string) => {
    const list = db.getTasks();
    const target = list.find(t => t.id === taskId);
    if (target) {
      target.boardId = 'DONE';
      target.progress = 100;
      // Also complete all checklist items
      target.checklists = target.checklists.map(c => ({ ...c, done: true }));
      db.updateTask(target);
      triggerRefresh();
    }
  };

  const handleToggleTaskChecklistDirect = (taskId: string, checklistId: string) => {
    const list = db.getTasks();
    const target = list.find(t => t.id === taskId);
    if (target) {
      const item = target.checklists.find(c => c.id === checklistId);
      if (item) {
        item.done = !item.done;
        const doneCount = target.checklists.filter(c => c.done).length;
        target.progress = target.checklists.length > 0 ? Math.round((doneCount / target.checklists.length) * 100) : 0;
        db.updateTask(target);
        triggerRefresh();
      }
    }
  };

  return (
    <div key={refreshSeed} className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <CheckSquare className="w-5 h-5 text-indigo-600" />
          <span>Daftar Tugas & Verifikasi Tertunda (Pending)</span>
        </h2>
        <p className="text-xs text-slate-500 font-normal leading-relaxed mt-1">
          Pusat antrean operasional jemaat yang berisi akun pendaftar baru yang butuh persetujuan, permohonan dana pelayanan departemen, dan check-list tugas pelayanan panggung yang belum diselesaikan.
        </p>
      </div>

      {/* METRIC CARD TABS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Task Board Tab Button */}
        <div 
          onClick={() => setActiveTab('TASKS')}
          className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
            activeTab === 'TASKS' 
              ? 'border-indigo-600 bg-indigo-50/30 shadow-xs' 
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Antrean Tugas</span>
            <span className="p-1 px-2 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700">
              {pendingTasks.length} Item
            </span>
          </div>
          <div className="mt-4">
            <h4 className="text-xs font-extrabold text-slate-800">Checklist Persiapan Ibadah</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Tugas panggung, sound system, & multimedia</p>
          </div>
        </div>

        {/* Approval Request Tab Button */}
        <div 
          onClick={() => setActiveTab('APPROVALS')}
          className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
            activeTab === 'APPROVALS' 
              ? 'border-indigo-600 bg-indigo-50/30 shadow-xs' 
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Sertifikasi & Anggaran</span>
            <span className={`p-1 px-2 rounded-full text-[10px] font-extrabold ${pendingApprovals.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
              {pendingApprovals.length} Pengajuan
            </span>
          </div>
          <div className="mt-4">
            <h4 className="text-xs font-extrabold text-slate-800">Persetujuan Workflow Dana</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Pengeluaran kas operasional departemen</p>
          </div>
        </div>

        {/* User verification Tab Button */}
        <div 
          onClick={() => setActiveTab('USERS')}
          className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
            activeTab === 'USERS' 
              ? 'border-indigo-600 bg-indigo-50/30 shadow-xs' 
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Verifikasi Pelayan</span>
            <span className={`p-1 px-2 rounded-full text-[10px] font-extrabold ${pendingUsers.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
              {pendingUsers.length} Jiwa
            </span>
          </div>
          <div className="mt-4">
            <h4 className="text-xs font-extrabold text-slate-800">Verifikasi Antrean Akun</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Akun pendaftaran mandiri pelayan & staff</p>
          </div>
        </div>
      </div>

      {/* CORE CONTENT SWITCHER */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        
        {/* TAB 1: KANBAN PENDING TASKS */}
        {activeTab === 'TASKS' && (
          <div className="p-5 space-y-4">
            <div className="border-b pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Review Tugas/Checklist Tersedia ({pendingTasks.length})</h3>
                <p className="text-[11px] text-slate-400">Log daftar koordinasi tim pelayan yang sedang berada di papan draf (TODO) maupun pelaksanaan (DOING).</p>
              </div>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-slate-400 flex flex-col items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <h5 className="font-bold text-slate-800 text-xs">Semua Tugas Sudah Selesai!</h5>
                <p className="text-[11px] font-light max-w-sm">Selamat, tidak ada tugas pelayan persiapan ibadah yang tertunda di papan pilar kerja gereja.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingTasks.map(task => (
                  <div key={task.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${task.boardId === 'TODO' ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                          {task.boardId === 'TODO' ? '🔴 BELUM MULAI (TODO)' : '🔵 SEDANG BERJALAN (DOING)'}
                        </span>
                        <span className="text-[10px] font-semibold text-rose-600 font-mono">📅 {task.deadline}</span>
                      </div>

                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-tight">{task.title}</h4>
                      <p className="text-[11px] text-slate-500 font-light line-clamp-2 leading-relaxed" title={task.description}>
                        {task.description || 'Tidak ada deskripsi latar belakang.'}
                      </p>

                      <div className="p-2.5 bg-white rounded border border-slate-100 space-y-2">
                        <span className="text-[9px] text-slate-450 font-bold uppercase block">Penerima Tugas: {task.assignedName}</span>
                        {task.checklists.length > 0 ? (
                          <div className="space-y-1.5 pt-1 border-t border-slate-50">
                            {task.checklists.map(chk => (
                              <label key={chk.id} className="flex items-start space-x-2 text-[10px] cursor-pointer select-none">
                                <input 
                                  type="checkbox" 
                                  checked={chk.done}
                                  onChange={() => handleToggleTaskChecklistDirect(task.id, chk.id)}
                                  className="mt-0.5 rounded border-slate-300 text-indigo-600"
                                />
                                <span className={chk.done ? 'line-through text-slate-400 font-light' : 'text-slate-600 font-medium'}>
                                  {chk.text}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Tanpa sub-checklist persiapan</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Progres Kerja</span>
                        <span className="font-bold text-slate-700">{task.progress}% Selesai</span>
                      </div>

                      <div className="flex space-x-1">
                        {task.boardId === 'TODO' && (
                          <button
                            onClick={() => handleTaskStartProgress(task.id)}
                            className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold transition flex items-center space-x-1 border border-blue-200 cursor-pointer"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Mulai Kerja</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleTaskCompleteDirect(task.id)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Selesai</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WORKFLOW & FINANCIAL BUDGET APPROVALS */}
        {activeTab === 'APPROVALS' && (
          <div className="p-5 space-y-4">
            <div className="border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Permohonan & Verifikasi Anggaran/Event ({pendingApprovals.length})</h3>
              <p className="text-[11px] text-slate-400">Semua draf usulan sewa alat musik, ijin seminar, perangkatan sekolah minggu, atau persepuluhan kas.</p>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-slate-400 flex flex-col items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <h5 className="font-bold text-slate-800 text-xs">Semua Pengajuan Telah Ditinjau!</h5>
                <p className="text-[11px] font-light max-w-sm">Tidak ada proposal anggaran yang menunggu verifikasi Gembala Sidang atau kasir saat ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b font-extrabold text-[10px] uppercase">
                      <th className="p-3">Tanggal & Judul</th>
                      <th className="p-3">Pemohon</th>
                      <th className="p-3">Klasifikasi</th>
                      <th className="p-3 text-right">Nominal Diajukan</th>
                      <th className="p-3">Lampiran</th>
                      <th className="p-3 text-center">Verifikasi Otoritas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingApprovals.map(req => {
                      const isFinancial = req.type === 'FINANCE';
                      const isSupervisor = currentUser.role === 'GEMBALA' || currentUser.role === 'PENGURUS';

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-3 space-y-0.5">
                            <div className="text-[10px] text-slate-450 font-mono font-bold">📅 {req.date}</div>
                            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-tight">{req.title}</h4>
                            <p className="text-[11px] text-slate-500 line-clamp-1 italic font-light max-w-xs">{req.description}</p>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-700">{req.requesterName}</span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 border border-slate-200 uppercase">
                              {req.type}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-blue-700">
                            {isFinancial && req.amount ? `Rp ${req.amount.toLocaleString('id-ID')},-` : '-'}
                          </td>
                          <td className="p-3">
                            {req.attachments && req.attachments.length > 0 ? (
                              <div className="inline-flex items-center space-x-1 text-slate-700 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[9px]">
                                <Receipt className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate max-w-[80px]">📎 {req.attachments[0]}</span>
                              </div>
                            ) : (
                              <span className="text-slate-405 italic font-light text-[10px]">Tanpa lampiran</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {isSupervisor ? (
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => handleApproveRequest(req.id, req.title)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition flex items-center space-x-0.5 cursor-pointer shadow-3xs"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Setujui</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingReqId(req.id);
                                    setFeedbackNote('');
                                  }}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold transition flex items-center space-x-0.5 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Tolak</span>
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center space-x-1.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-100">
                                <Clock className="w-3 h-3 animate-pulse" />
                                <span>Menunggu Menit</span>
                              </span>
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
        )}

        {/* TAB 3: NEW USER REGISTRATION VERIFICATIONS */}
        {activeTab === 'USERS' && (
          <div className="p-5 space-y-4">
            <div className="border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Otoritas Persetujuan Anggota & Pelayan Baru ({pendingUsers.length})</h3>
              <p className="text-[11px] text-slate-400">Verifikasi dilakukan mandiri oleh Gembala Sidang setempat untuk menyetujui akun login masuk pelayan pelayanan.</p>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-slate-400 flex flex-col items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <h5 className="font-bold text-slate-800 text-xs">Antrean Registrasi Bersih!</h5>
                <p className="text-[11px] font-light max-w-sm">Semua pendaftar mandiri telah diverifikasi atau tidak ada pelayan baru yang menunggu entri registrasi.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b font-extrabold text-[10px] uppercase">
                      <th className="p-3">Anggota & Telepon</th>
                      <th className="p-3">Kelamin</th>
                      <th className="p-3">Peran Diusulkan</th>
                      <th className="p-3">Login Username</th>
                      <th className="p-3">Keahlian & Motivasi</th>
                      <th className="p-3 text-right">Otoritas Gembala</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingUsers.map(user => {
                      const isGembala = currentUser.role === 'GEMBALA';

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-3 space-y-0.5">
                            <div className="font-bold text-slate-900">{user.fullName}</div>
                            {user.phone ? (
                              <div className="text-[10px] text-slate-550 font-mono">📱 {user.phone}</div>
                            ) : (
                              <span className="text-[9px] text-slate-400 italic">No. HP Belum diisi</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${user.gender === 'P' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>
                              {user.gender === 'P' ? 'P' : 'L'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold uppercase">
                              {user.role}
                            </span>
                          </td>
                          <td className="p-3 text-slate-650 font-mono">
                            @{user.username}
                          </td>
                          <td className="p-3 max-w-xs space-y-1">
                            <div>
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Minat Divisi:</span>
                              <span className="text-[10px] text-slate-700 font-bold">{user.talents ? user.talents : 'Tidak diisi'}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Alasan Bergabung:</span>
                              <p className="text-[10px] bg-slate-50 p-1.5 rounded border border-slate-150 text-slate-600 italic whitespace-normal leading-normal font-light">
                                {user.registrationReason ? `"${user.registrationReason}"` : 'Tidak diisi'}
                              </p>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            {isGembala ? (
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  onClick={() => handleVerifyUser(user.id, user.fullName)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold rounded transition cursor-pointer flex items-center space-x-1 shadow-3xs"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Setujui</span>
                                </button>
                                <button
                                  onClick={() => handleRejectUser(user.id, user.fullName)}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-105 text-rose-700 text-[10px] font-bold border border-rose-200 rounded transition cursor-pointer flex items-center space-x-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Tolak</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded inline-flex items-center space-x-1 border border-amber-100 font-bold">
                                <Clock className="w-3 h-3 animate-pulse" />
                                <span>Butuh Gembala</span>
                              </span>
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
        )}
      </div>

      {/* REJECTION memo modal feedback */}
      {rejectingReqId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-rose-600" />
                <span>Berikan Umpan Balik Penolakan</span>
              </h3>
              <button onClick={() => setRejectingReqId(null)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            <form onSubmit={handleRejectRequestSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 leading-normal uppercase">Catatan / Alasan Penolakan / Revisi</label>
                <textarea 
                  required 
                  placeholder="Ketik mengapa pengajuan ini ditolak atau butuh revisi..."
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  rows={4}
                  className="w-full p-2.5 border rounded outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setRejectingReqId(null)}
                  className="px-4 py-2 border hover:bg-slate-50 text-slate-600 font-semibold rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold transition"
                >
                  Tolak Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
