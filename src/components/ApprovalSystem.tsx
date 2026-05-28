/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ApprovalRequest, User, ApprovalType, ApprovalStatus } from '../types/church';
import { db } from '../utils/storage';
import { 
  FileText, ShieldCheck, Clock, CheckCircle2, XCircle, RefreshCw, 
  Plus, Edit3, MessageSquare, AlertCircle, FileUp
} from 'lucide-react';

interface ApprovalSystemProps {
  currentUser: User;
  onRefreshTrail: () => void;
}

export default function ApprovalSystem({ currentUser, onRefreshTrail }: ApprovalSystemProps) {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

  // Form states for adding request
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ApprovalType>('FINANCE');
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAttachment, setFormAttachment] = useState('');

  // Revision Form state
  const [revisionText, setRevisionText] = useState('');

  const approvals = db.getApprovals();

  const filteredApprovals = approvals.filter(a => {
    const matchesType = filterType === 'ALL' || a.type === filterType;
    const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;
    return matchesType && matchesStatus;
  });

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDesc) {
      alert("Harap isi Judul Pengajuan dan Deskripsi Latar Belakang.");
      return;
    }

    const newReq: ApprovalRequest = {
      id: 'req-' + Date.now(),
      requesterId: currentUser.id,
      requesterName: currentUser.fullName,
      type: formType,
      title: formTitle,
      description: formDesc,
      amount: formType === 'FINANCE' && formAmount ? Number(formAmount) : undefined,
      date: new Date().toISOString().split('T')[0],
      status: 'SUBMITTED',
      attachments: formAttachment ? [formAttachment] : [],
      revisionNote: '',
      history: []
    };

    db.addApproval(newReq, currentUser);
    setIsSubmitOpen(false);
    
    // Reset
    setFormTitle('');
    setFormDesc('');
    setFormAmount('');
    setFormAttachment('');
    
    onRefreshTrail();
  };

  // Gembala / Admin Action handlers
  const handleUpdateStatus = (reqId: string, newStatus: ApprovalStatus, feedbackMemo = '') => {
    const list = db.getApprovals();
    const target = list.find(r => r.id === reqId);
    if (!target) return;

    const previous = JSON.parse(JSON.stringify(target));
    target.status = newStatus;
    if (feedbackMemo) {
      target.revisionNote = `${currentUser.fullName}: ${feedbackMemo}`;
    }

    db.updateApproval(target, currentUser);
    
    // If layout requests financial and is approved, auto record a ledger statement if desired!
    if (newStatus === 'APPROVED' && target.type === 'FINANCE' && target.amount) {
      // Create transaction automatically
      db.addTransaction({
        id: 'tx-auto-' + Date.now(),
        type: 'EXPENSE',
        category: 'EVENT',
        amount: target.amount,
        date: new Date().toISOString().split('T')[0],
        description: `Pengeluaran Otomatis (Linked Approval ID: ${target.id}) - ${target.title}`,
        receipt: target.attachments?.join(', ') || 'Auto-Attached',
        approvalId: target.id
      }, currentUser);
    }

    setSelectedRequest(db.getApprovals().find(r => r.id === reqId) || null);
    setRevisionText('');
    onRefreshTrail();
  };

  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'SUBMITTED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'UNDER_REVIEW': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'NEED_REVISION': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ON_PROGRESS': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'COMPLETED': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'ARCHIVED': return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Arur Kerja Pengajuan & Approval Dinamis</h2>
          <p className="text-sm text-slate-500">Sistem peninjauan anggaran, proposal event, rencana kunjungan pastoral jemaat, serta pembagian logistik pelayanan.</p>
        </div>

        <button 
          onClick={() => setIsSubmitOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shrink-0 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengajuan Baru</span>
        </button>
      </div>

      {/* Toolbar filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Tipe Pengajuan:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">Semua Tipe</option>
              <option value="FINANCE">Pengajuan Anggaran/Dana</option>
              <option value="VISIT">Kunjungan Pastoral (Visit)</option>
              <option value="EVENT">Penyelenggaraan Event/Retreat</option>
              <option value="MINISTRY">Pelayanan Mimbar/Ibadah Raya</option>
              <option value="INVENTORY">Klaim Pengadaan Inventaris Alat</option>
              <option value="COUNSELING">Layanan Konseling Pastoral</option>
              <option value="TRAINING">Kurses Pembinaan Pemimpin</option>
              <option value="BENEVOLENCE">Bantuan Panti/Diakonia Jemaat</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Status Alur:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="SUBMITTED">Diajukan (Submitted)</option>
              <option value="UNDER_REVIEW">Ditinjau (Under Review)</option>
              <option value="NEED_REVISION">Butuh Revisi (Need Revision)</option>
              <option value="APPROVED">Disetujui (Approved)</option>
              <option value="REJECTED">Ditolak Gembala (Rejected)</option>
              <option value="ON_PROGRESS">Sedang Berjalan (On Progress)</option>
              <option value="COMPLETED">Selesai (Completed)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left pane: request cards */}
        <div className="lg:col-span-2 space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {filteredApprovals.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border text-center text-slate-400 text-sm">
              Tidak ada draf pengajuan alur kerja yang terdaftar sesuai kriteria.
            </div>
          ) : (
            filteredApprovals.map(item => (
              <div 
                key={item.id}
                onClick={() => setSelectedRequest(item)}
                className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-sm cursor-pointer transition flex flex-col md:flex-row justify-between gap-3 ${selectedRequest?.id === item.id ? 'border-slate-800 bg-slate-50/50' : 'border-slate-200/80'}`}
              >
                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold tracking-wider">{item.type}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] border font-semibold ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Dibuat: {item.date}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-1 font-light">{item.description}</p>
                </div>

                <div className="flex flex-col items-end md:justify-between shrink-0">
                  {item.amount && (
                    <span className="text-sm font-extrabold text-blue-700 font-sans">
                      Rp {item.amount.toLocaleString('id-ID')}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-medium">Oleh {item.requesterName}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right pane: Inspection dialog detail & workflow triggers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          {selectedRequest ? (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>ID PENGALIRAN: {selectedRequest.id}</span>
                  <span className="font-mono">{selectedRequest.date}</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">{selectedRequest.title}</h3>
              </div>

              {/* Status and core descriptions */}
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Status Saat Ini</span>
                  <span className={`px-3 py-1 text-xs rounded border font-semibold inline-block ${getStatusColor(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Uraian / Permohonan Jemaat</span>
                  <p className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 text-slate-700 font-light leading-relaxed whitespace-pre-line">
                    {selectedRequest.description}
                  </p>
                </div>

                {selectedRequest.amount && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Dana yang Diajukan</span>
                    <span className="text-lg font-black text-slate-900 font-sans">
                      Rp {selectedRequest.amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}

                {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Dokumen Lampiran</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedRequest.attachments.map((file, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-slate-100 border rounded text-[11px] font-medium text-slate-600 flex items-center space-x-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{file}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRequest.revisionNote && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg text-xs space-y-1">
                    <span className="font-bold flex items-center"><MessageSquare className="w-3.5 h-3.5 mr-1" /> Catatan Revisi / Alasan Tolak:</span>
                    <p className="font-light leading-relaxed">{selectedRequest.revisionNote}</p>
                  </div>
                )}
              </div>

              {/* Gembala / Moderator Actions (Requires role validation) */}
              {(currentUser.role === 'GEMBALA' || currentUser.role === 'SUPER_ADMIN') && (
                <div className="pt-4 border-t border-slate-100 space-y-3.5">
                  <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-tight block">Tindakan Otoritas Gembala (Override Controls)</span>
                  
                  {/* Status transitions based on current layout */}
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRequest.status === 'SUBMITTED' && (
                      <button 
                        onClick={() => handleUpdateStatus(selectedRequest.id, 'UNDER_REVIEW')}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded transition flex items-center justify-center space-x-1"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Tinjau (Review)</span>
                      </button>
                    )}

                    {(selectedRequest.status === 'SUBMITTED' || selectedRequest.status === 'UNDER_REVIEW') && (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(selectedRequest.id, 'APPROVED')}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded transition flex items-center justify-center space-x-1 shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(selectedRequest.id, 'REJECTED', revisionText)}
                          className="w-full py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded transition flex items-center justify-center space-x-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                      </>
                    )}

                    {selectedRequest.status === 'APPROVED' && (
                      <button 
                        onClick={() => handleUpdateStatus(selectedRequest.id, 'ON_PROGRESS')}
                        className="w-full col-span-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded transition flex items-center justify-center space-x-1 shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                        <span>Eksekusi (On Progress)</span>
                      </button>
                    )}

                    {selectedRequest.status === 'ON_PROGRESS' && (
                      <button 
                        onClick={() => handleUpdateStatus(selectedRequest.id, 'COMPLETED')}
                        className="w-full col-span-2 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded transition flex items-center justify-center space-x-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Tandai Selesai (Completed)</span>
                      </button>
                    )}
                  </div>

                  {/* Feedback Memo textarea */}
                  {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedRequest.status) && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400">MEMO REVISI / DRAF KEBERATAN</label>
                      <textarea 
                        placeholder="Tulis draf revisi di sini sebelum mengklik Tolak / Revisi jemaat..."
                        value={revisionText}
                        onChange={(e) => setRevisionText(e.target.value)}
                        className="w-full p-2 text-xs border bg-slate-50/50 rounded outline-none h-12"
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          if (!revisionText) { alert("Harap isi memo revisi terlebih dahulu."); return; }
                          handleUpdateStatus(selectedRequest.id, 'NEED_REVISION', revisionText);
                        }}
                        className="w-full py-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] rounded transition"
                      >
                        Kirim Perintah Revisi
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <FileText className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-medium">Silakan klik salah satu draf di panel kiri untuk membuka lembar pemeriksaan.</p>
            </div>
          )}
        </div>
      </div>

      {/* Submit application modal */}
      {isSubmitOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden border shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Buat Pengajuan Kas & Kegiatan</h3>
              <button onClick={() => setIsSubmitOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">JUDUL PENGAJUAN *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Pengadaan Mixer Digital Behringer X32"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none focus:ring-1 focus:ring-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">JENIS PENGAJUAN *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ApprovalType)}
                    className="w-full p-2.5 border rounded outline-none"
                  >
                    <option value="FINANCE">Pengajuan Anggaran/Dana</option>
                    <option value="VISIT">Kunjungan Jemaat Sakit (Visit)</option>
                    <option value="EVENT">Penyelenggaraan Event / Retreat</option>
                    <option value="MINISTRY">Pelayanan Mimbar Khotbah</option>
                    <option value="INVENTORY">Klaim Pengadaan Inventaris Alat</option>
                    <option value="COUNSELING">Layanan Konseling Pastoral</option>
                    <option value="TRAINING">Kursus Pembinaan Pemimpin</option>
                    <option value="BENEVOLENCE">Bantuan Panti/Masyarakat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">NOMINAL (JIKA DANA/FINANSIL)</label>
                  <input 
                    type="number" 
                    placeholder="Contoh: 32500000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none"
                    disabled={formType !== 'FINANCE'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">LATAR BELAKANG & TUJUAN LENGKAP *</label>
                <textarea 
                  required
                  placeholder="Terangkan secara detail alasan pengajuan, rincian biaya, atau jadwal lokasi event yang diusulkan..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">LAMPIRAN PROPOSAL (URL/NAMA FILE)</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Proposal_Camp_SS_2026.pdf"
                  value={formAttachment}
                  onChange={(e) => setFormAttachment(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsSubmitOpen(false)}
                  className="px-4 py-1.5 border hover:bg-slate-50 font-semibold text-slate-600 rounded"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 transition"
                >
                  Kirim Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
