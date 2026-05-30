/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ApprovalRequest, User, ApprovalType, ApprovalStatus, CustomApprovalWorkflow } from '../types/church';
import { db } from '../utils/storage';
import { 
  FileText, ShieldCheck, Clock, CheckCircle2, XCircle, RefreshCw, 
  Plus, Edit3, MessageSquare, AlertCircle, FileUp, Settings, Layers, 
  ArrowRight, Sparkles, Trash2, HelpCircle, Save, CheckCircle, CheckSquare
} from 'lucide-react';

interface ApprovalSystemProps {
  currentUser: User;
  onRefreshTrail: () => void;
}

export default function ApprovalSystem({ currentUser, onRefreshTrail }: ApprovalSystemProps) {
  const [activeTab, setActiveTab2] = useState<'LIST' | 'CONFIG'>('LIST');

  // Filters for requests
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

  // Form states for submitting new request
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ApprovalType>('FINANCE');
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAttachment, setFormAttachment] = useState('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');

  // Revision Form state
  const [revisionText, setRevisionText] = useState('');

  // ---- Workflow Designer States ----
  const [wfName, setWfName] = useState('');
  const [wfDesc, setWfDesc] = useState('');
  const [wfType, setWfType] = useState<ApprovalType>('FINANCE');
  const [wfStepsInput, setWfStepsInput] = useState<string>('Diajukan Pelayan, Peninjauan Diaken, Persetujuan Akhir Gembala');
  const [wfRequireLimit, setWfRequireLimit] = useState(false);
  const [wfMaxAmount, setWfMaxAmount] = useState('');
  const [wfAutoLog, setWfAutoLog] = useState(false);
  const [wfPocketId, setWfPocketId] = useState('');
  const [designerMessage, setDesignerMessage] = useState('');

  // Fetch from DB
  const approvals = db.getApprovals();
  const customWorkflows = db.getCustomWorkflows(currentUser.churchId);
  const pockets = db.getPockets(currentUser.churchId);

  // Auto set pocket if empty and wallets exist
  useEffect(() => {
    if (pockets.length > 0 && !wfPocketId) {
      setWfPocketId(pockets[0].id);
    }
  }, [pockets, wfPocketId]);

  // Handle auto pre-filling type if custom workflow is picked when submitting proposal
  useEffect(() => {
    if (selectedWorkflowId) {
      const selectedWf = customWorkflows.find(w => w.id === selectedWorkflowId);
      if (selectedWf) {
        setFormType(selectedWf.type);
      }
    }
  }, [selectedWorkflowId, customWorkflows]);

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

    const matchedWf = selectedWorkflowId ? customWorkflows.find(w => w.id === selectedWorkflowId) : null;

    // Check budget limit constraint if applicable
    if (matchedWf && matchedWf.requireBudgetLimit && matchedWf.maxAmount && formAmount) {
      const budgetNum = Number(formAmount);
      if (budgetNum > matchedWf.maxAmount) {
        alert(`Gagal mengajukan! Nominal kas pengajuan (Rp ${budgetNum.toLocaleString()}) melebihi batas ketentuan maksimum SOP alur kerja ini (Rp ${matchedWf.maxAmount.toLocaleString()}).`);
        return;
      }
    }

    const newReq: ApprovalRequest = {
      id: 'req-' + Date.now(),
      requesterId: currentUser.id,
      requesterName: currentUser.fullName,
      type: matchedWf ? matchedWf.type : formType,
      title: formTitle,
      description: formDesc,
      amount: (formType === 'FINANCE' || (matchedWf && matchedWf.type === 'FINANCE')) && formAmount ? Number(formAmount) : undefined,
      date: new Date().toISOString().split('T')[0],
      status: 'SUBMITTED',
      attachments: formAttachment ? [formAttachment] : [],
      revisionNote: '',
      history: [],
      customWorkflowId: selectedWorkflowId || undefined,
      currentStepIndex: selectedWorkflowId ? 0 : undefined
    };

    db.addApproval(newReq, currentUser);
    setIsSubmitOpen(false);
    
    // Reset
    setFormTitle('');
    setFormDesc('');
    setFormAmount('');
    setFormAttachment('');
    setSelectedWorkflowId('');
    
    onRefreshTrail();
  };

  // Gembala / Admin Action handlers
  const handleUpdateStatus = (reqId: string, newStatus: ApprovalStatus, feedbackMemo = '') => {
    const list = db.getApprovals();
    const target = list.find(r => r.id === reqId);
    if (!target) return;

    target.status = newStatus;
    if (feedbackMemo) {
      target.revisionNote = `${currentUser.fullName}: ${feedbackMemo}`;
    }

    // Dynamic checks if request conforms to a Custom Workflow
    const matchedWf = target.customWorkflowId ? db.getCustomWorkflows(currentUser.churchId).find(w => w.id === target.customWorkflowId) : null;

    db.updateApproval(target, currentUser);
    
    // Auto post dynamic cash ledger if approved
    if (newStatus === 'APPROVED' && target.amount) {
      // Pick pocket: custom budget pocket or defaultKas
      const targetPocketId = matchedWf && matchedWf.autoLogFinance && matchedWf.pocketId 
        ? matchedWf.pocketId 
        : `pocket-gereja-${currentUser.churchId}`;

      db.addTransaction({
        id: 'tx-auto-' + Date.now(),
        type: 'EXPENSE',
        category: 'EVENT',
        amount: target.amount,
        date: new Date().toISOString().split('T')[0],
        description: `Pengeluaran Otomatis (Linked Approval ID: ${target.id}) - ${target.title}`,
        receipt: target.attachments?.join(', ') || 'Auto-Attached',
        approvalId: target.id,
        pocketId: targetPocketId
      }, currentUser);
    }

    setSelectedRequest(db.getApprovals().find(r => r.id === reqId) || null);
    setRevisionText('');
    onRefreshTrail();
  };

  // Advancing custom workflow steps (exclusive to pastors / validators)
  const handleAdvanceStep = (reqId: string) => {
    const list = db.getApprovals();
    const target = list.find(r => r.id === reqId);
    if (!target || target.currentStepIndex === undefined || !target.customWorkflowId) return;

    const matchedWf = db.getCustomWorkflows(currentUser.churchId).find(w => w.id === target.customWorkflowId);
    if (!matchedWf) return;

    const maxSteps = matchedWf.steps.length;
    const nextIndex = target.currentStepIndex + 1;

    if (nextIndex >= maxSteps - 1) {
      // Reach final signature stage - auto mark as APPROVED
      target.currentStepIndex = maxSteps - 1;
      target.status = 'APPROVED';
      db.updateApproval(target, currentUser);

      // Log transaction if financial
      if (target.amount) {
        const targetPocketId = matchedWf.autoLogFinance && matchedWf.pocketId 
          ? matchedWf.pocketId 
          : `pocket-gereja-${currentUser.churchId}`;

        db.addTransaction({
          id: 'tx-auto-' + Date.now(),
          type: 'EXPENSE',
          category: 'EVENT',
          amount: target.amount,
          date: new Date().toISOString().split('T')[0],
          description: `Pengeluaran Otomatis Alur Kerja (${matchedWf.name}) - ${target.title}`,
          receipt: target.attachments?.join(', ') || 'Auto-Attached',
          approvalId: target.id,
          pocketId: targetPocketId
        }, currentUser);
      }

      db.logAudit(
        currentUser.id, 
        currentUser.fullName, 
        'WF_STEP_COMPLETE', 
        `Persetujuan alur kustom [${matchedWf.name}] untuk "${target.title}" disetujui penuh & dicatat otomatis ke kas jemaat.`
      );
    } else {
      // Step increment
      target.currentStepIndex = nextIndex;
      target.status = 'UNDER_REVIEW';
      db.updateApproval(target, currentUser);
      db.logAudit(
        currentUser.id, 
        currentUser.fullName, 
        'WF_STEP_ADVANCE', 
        `Memajukan modul tahapan pengajuan "${target.title}" ke langkah [${matchedWf.steps[nextIndex]}].`
      );
    }

    setSelectedRequest(db.getApprovals().find(r => r.id === reqId) || null);
    onRefreshTrail();
  };

  // Add a new Custom Workflow Template
  const handleCreateWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wfName || !wfDesc) {
      alert("Harap masukkan nama dan deksripsi alur pelayanan.");
      return;
    }

    const stepsArray = wfStepsInput.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (stepsArray.length < 2) {
      alert("Minimal alur kerja harus memiliki 2 tahapan.");
      return;
    }

    const newWf: CustomApprovalWorkflow = {
      id: 'wf-' + Date.now(),
      name: wfName,
      description: wfDesc,
      churchId: currentUser.churchId,
      type: wfType,
      steps: stepsArray,
      requireBudgetLimit: wfRequireLimit,
      maxAmount: wfRequireLimit && wfMaxAmount ? Number(wfMaxAmount) : undefined,
      autoLogFinance: wfAutoLog,
      pocketId: wfAutoLog && wfPocketId ? wfPocketId : undefined
    };

    db.addCustomWorkflow(newWf, currentUser);
    
    // Reset Form
    setWfName('');
    setWfDesc('');
    setWfStepsInput('Diajukan Pelayan, Peninjauan Diaken, Persetujuan Akhir Gembala');
    setWfRequireLimit(false);
    setWfMaxAmount('');
    setWfAutoLog(false);

    setDesignerMessage('🎉 Alur pelayanan kustom baru berhasil disimpan & langsung aktif!');
    setTimeout(() => setDesignerMessage(''), 4500);
    onRefreshTrail();
  };

  // Delete Custom Workflow Template
  const handleDeleteWorkflow = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus template alur kerja "${name}"?\n\nTindakan ini tidak mematikan pengajuan yang sedang berjalan tetapi mencegah pengajuan baru menggunakan jenis template ini.`)) {
      db.deleteCustomWorkflow(id, currentUser);
      onRefreshTrail();
    }
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
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Alur Kerja Pengajuan & Approval Dinamis</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full select-none">SOP Terpusat</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Sistem peninjauan anggaran, proposal event, rencana kunjungan pastoral jemaat, serta pembagian logistik pelayanan.</p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {currentUser.role === 'GEMBALA' && (
            <div className="flex bg-slate-100 p-1 rounded-lg border mr-2">
              <button
                onClick={() => setActiveTab2('LIST')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${activeTab === 'LIST' ? 'bg-white text-slate-950 shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <span>📋 Daftar Pengajuan</span>
              </button>
              <button
                onClick={() => setActiveTab2('CONFIG')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${activeTab === 'CONFIG' ? 'bg-white text-slate-950 shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>⚙️ Desainer Alur SOP</span>
              </button>
            </div>
          )}

          <button 
            onClick={() => setIsSubmitOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shrink-0 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Pengajuan Baru</span>
          </button>
        </div>
      </div>

      {activeTab === 'LIST' ? (
        <>
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
                  <option value="TRAINING">Kursus Pembinaan Pemimpin</option>
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
                <div className="bg-white p-12 rounded-xl border text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                  <Layers className="w-8 h-8 text-slate-350" />
                  <p className="font-bold text-slate-500">Antrean Bersih</p>
                  <p className="text-[11px] leading-relaxed max-w-xs font-light">Tidak ada draf pengajuan alur kerja yang terdaftar di sistem sesuai kriteria pencarian.</p>
                </div>
              ) : (
                filteredApprovals.map(item => {
                  const wf = item.customWorkflowId ? customWorkflows.find(w => w.id === item.customWorkflowId) : null;
                  return (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedRequest(item)}
                      className={`bg-white rounded-xl border p-4 shadow-3xs hover:shadow-2xs cursor-pointer transition flex flex-col md:flex-row justify-between gap-3 ${selectedRequest?.id === item.id ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-200/80'}`}
                    >
                      <div className="space-y-1.5 max-w-md">
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold tracking-wider">{item.type}</span>
                          
                          {wf && (
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded text-[8px] font-extrabold uppercase flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 shrink-0" />
                              <span>Custom: {wf.name}</span>
                            </span>
                          )}

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
                          <span className="text-sm font-extrabold text-[#0f172a] font-sans">
                            Rp {item.amount.toLocaleString('id-ID')},-
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium">Oleh {item.requesterName}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right pane: Inspection dialog detail & workflow triggers */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[480px]">
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

                    {/* Stepper for custom workflows */}
                    {(() => {
                      const matchedWf = selectedRequest.customWorkflowId 
                        ? db.getCustomWorkflows(currentUser.churchId).find(w => w.id === selectedRequest.customWorkflowId) 
                        : null;

                      if (matchedWf && selectedRequest.currentStepIndex !== undefined) {
                        return (
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2">
                            <span className="text-[9px] text-indigo-700 font-black uppercase tracking-widest block">TAHAPAN PENINJAUAN SOP ({matchedWf.name})</span>
                            <div className="relative pl-3 border-l-2 border-indigo-200 space-y-3 py-1 ml-1.5">
                              {matchedWf.steps.map((step, idx) => {
                                const isDone = idx < selectedRequest.currentStepIndex!;
                                const isActive = idx === selectedRequest.currentStepIndex;
                                const isFuture = idx > selectedRequest.currentStepIndex!;

                                return (
                                  <div key={idx} className="flex items-start space-x-2 relative">
                                    <div className={`absolute -left-[19px] top-1 w-3 h-3 rounded-full flex items-center justify-center font-black select-none ${
                                      isDone ? 'bg-emerald-600 border border-emerald-600 text-white' :
                                      isActive ? 'bg-indigo-600 text-white animate-pulse' :
                                      'bg-white border-2 border-slate-300 text-slate-400'
                                    }`} style={{fontSize: '7px'}}>
                                      {isDone ? '✓' : idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                      <p className={`font-extrabold text-[11px] leading-tight ${
                                        isDone ? 'text-slate-500 line-through' :
                                        isActive ? 'text-indigo-900 font-black' :
                                        'text-slate-400'
                                      }`}>
                                        {step}
                                      </p>
                                      {isActive && (
                                        <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded mt-0.5 inline-block">Menunggu Verifikasi</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Uraian / Permohonan Jemaat</span>
                      <p className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 text-slate-700 font-light leading-relaxed whitespace-pre-line text-[11px]">
                        {selectedRequest.description}
                      </p>
                    </div>

                    {selectedRequest.amount && (
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Dana yang Diajukan</span>
                        <span className="text-base font-black text-[#0f172a] font-sans">
                          Rp {selectedRequest.amount.toLocaleString('id-ID')},-
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
                        <span className="font-bold flex items-center text-[11px]"><MessageSquare className="w-3.5 h-3.5 mr-1" /> Catatan Revisi / Alasan Tolak:</span>
                        <p className="font-light leading-relaxed">{selectedRequest.revisionNote}</p>
                      </div>
                    )}
                  </div>

                  {/* Action buttons section */}
                  {(currentUser.role === 'GEMBALA' || currentUser.role === 'SUPER_ADMIN') && (
                    <div className="pt-4 border-t border-slate-100 space-y-3.5">
                      <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-tight block">Tindakan Otoritas Gembala (Override Controls)</span>
                      
                      {(() => {
                        const matchedWf = selectedRequest.customWorkflowId 
                          ? db.getCustomWorkflows(currentUser.churchId).find(w => w.id === selectedRequest.customWorkflowId) 
                          : null;

                        if (matchedWf && selectedRequest.currentStepIndex !== undefined && !['APPROVED', 'REJECTED'].includes(selectedRequest.status)) {
                          const steps = matchedWf.steps;
                          const nextStepIndex = selectedRequest.currentStepIndex + 1;
                          const nextStepName = nextStepIndex < steps.length ? steps[nextStepIndex] : 'Selesai & Setujui';

                          return (
                            <div className="space-y-2">
                              <button
                                onClick={() => handleAdvanceStep(selectedRequest.id)}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                              >
                                <CheckSquare className="w-4 h-4 text-indigo-200" />
                                <span>Verifikasi Tahap: "{steps[selectedRequest.currentStepIndex]}"</span>
                              </button>
                              
                              <p className="text-[10px] text-slate-400 text-center">Menyetujui tahap saat ini akan memajukan alur kerja ke langkah: <strong>{nextStepName}</strong>.</p>
                              
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <button 
                                  onClick={() => handleUpdateStatus(selectedRequest.id, 'REJECTED', revisionText)}
                                  className="w-full py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg transition text-center cursor-pointer"
                                >
                                  Tolak Pengajuan
                                </button>
                                <button 
                                  onClick={() => {
                                    if (!revisionText) { alert("Harap isi memo revisi terlebih dahulu."); return; }
                                    handleUpdateStatus(selectedRequest.id, 'NEED_REVISION', revisionText);
                                  }}
                                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition text-center cursor-pointer"
                                >
                                {selectedRequest.status === 'NEED_REVISION' ? 'Kirim Revisi Lagi' : 'Kirim Perintah Revisi'}
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // Standard fallbacks for standard workflows
                        return (
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
                                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded transition flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatus(selectedRequest.id, 'REJECTED', revisionText)}
                                  className="w-full py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded transition flex items-center justify-center space-x-1 cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Tolak</span>
                                </button>
                              </>
                            )}

                            {selectedRequest.status === 'APPROVED' && (
                              <button 
                                onClick={() => handleUpdateStatus(selectedRequest.id, 'ON_PROGRESS')}
                                className="w-full col-span-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded transition flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                                <span>Eksekusi (On Progress)</span>
                              </button>
                            )}

                            {selectedRequest.status === 'ON_PROGRESS' && (
                              <button 
                                onClick={() => handleUpdateStatus(selectedRequest.id, 'COMPLETED')}
                                className="w-full col-span-2 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded transition flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Tandai Selesai (Completed)</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {/* Feedback Memo textarea */}
                      {['SUBMITTED', 'UNDER_REVIEW', 'NEED_REVISION'].includes(selectedRequest.status) && (
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400">MEMO REVISI / DRAF KEBERATAN</label>
                          <textarea 
                            placeholder="Tulis alasan khusus untuk draf revisi jemaat sebelum mengklik Tolak / Revisi..."
                            value={revisionText}
                            onChange={(e) => setRevisionText(e.target.value)}
                            className="w-full p-2 text-xs border bg-slate-50/50 rounded outline-none h-12"
                          />
                          {!selectedRequest.customWorkflowId && (
                            <button 
                              type="button" 
                              onClick={() => {
                                if (!revisionText) { alert("Harap isi memo revisi terlebih dahulu."); return; }
                                handleUpdateStatus(selectedRequest.id, 'NEED_REVISION', revisionText);
                              }}
                              className="w-full py-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] rounded transition cursor-pointer"
                            >
                              Kirim Perintah Revisi
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 space-y-2 my-auto">
                  <FileText className="w-8 h-8 text-slate-300" />
                  <p className="text-sm font-medium">Lembar Pemeriksaan</p>
                  <p className="text-[11px] text-slate-40 level leading-relaxed max-w-xs font-light">Silakan klik salah satu draf di panel kiri untuk membuka detail data real-time, memo catatan pengerja, & stepper progres alur pelayanan.</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Dynamic Workflow settings configurator wizard */
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 text-amber-950 p-4 rounded-xl text-xs flex items-start space-x-3">
            <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold uppercase tracking-tight">Kustomisasi SOP Sesuai Pola Pelayanan Cabang Jemaat</h4>
              <p className="font-light">
                Sebagai <strong>Gembala Sidang</strong>, Anda memiliki hak penuh untuk merevisi alur kerja persetujuan sesuai kompleksitas birokrasi kas, kepanitiaan event, atau kunjungan pelayanan jemaat setempat.
                Alur kerja yang Anda buat di sini akan tampil sebagai template wajib yang dapat dipilih oleh para pelayan/diaken di formulir pengajuan mereka.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Creation Form (Left) */}
            <form onSubmit={handleCreateWorkflow} className="lg:col-span-5 bg-white rounded-xl border p-5 space-y-4 shadow-3xs text-xs">
              <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider block w-fit">
                Buat Desain SOP Alur Baru
              </span>

              {designerMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold rounded-lg leading-relaxed">
                  {designerMessage}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">NAMA ALUR PELAYANAN / SOP *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Operasional Diakonia Kasih Jemaat"
                  value={wfName}
                  onChange={(e) => setWfName(e.target.value)}
                  className="w-full p-2.5 border rounded-lg focus:ring-1 focus:ring-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">LATAR BELAKANG / DESKRIPSI SOP *</label>
                <textarea 
                  required 
                  placeholder="Contoh: Alur khusus verifikasi permohonan santunan diakonia sosial dhuafa & panti asuhan."
                  value={wfDesc}
                  onChange={(e) => setWfDesc(e.target.value)}
                  className="w-full p-2.5 border rounded-lg focus:ring-1 focus:ring-slate-900 outline-none h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">JENIS CORE PENGAJUAN *</label>
                  <select
                    value={wfType}
                    onChange={(e) => setWfType(e.target.value as ApprovalType)}
                    className="w-full p-2.5 border rounded-lg focus:ring-1 focus:ring-slate-900 outline-none"
                  >
                    <option value="FINANCE">Pengajuan Anggaran/Dana</option>
                    <option value="VISIT">Kunjungan Pastoral (Visit)</option>
                    <option value="EVENT">Penyelenggaraan Event/Retreat</option>
                    <option value="MINISTRY">Pelayanan Mimbar/Ibadah Raya</option>
                    <option value="INVENTORY">Klaim Pengadaan Inventaris Alat</option>
                    <option value="COUNSELING">Layanan Konseling Pastoral</option>
                    <option value="TRAINING">Kursus Pembinaan Pemimpin</option>
                    <option value="BENEVOLENCE">Bantuan Panti/Diakonia Jemaat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">PASARKAN BATAS BUDGET?</label>
                  <div className="flex items-center space-x-2 h-10">
                    <input 
                      type="checkbox" 
                      id="wfLimit" 
                      checked={wfRequireLimit}
                      onChange={(e) => setWfRequireLimit(e.target.checked)}
                      className="w-3.5 h-3.5 text-indigo-600 rounded"
                    />
                    <label id="wfLimitLabel" htmlFor="wfLimit" className="font-bold text-slate-500 cursor-pointer">Batas Angka Maksimal</label>
                  </div>
                </div>
              </div>

              {wfRequireLimit && (
                <div className="animate-in slide-in-from-top-1 duration-150">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">NOMINAL MAKSIMUM YANG DIIZINKAN (IDR) *</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="Contoh: 15000000"
                    value={wfMaxAmount}
                    onChange={(e) => setWfMaxAmount(e.target.value)}
                    className="w-full p-2.5 border rounded-lg focus:ring-1 focus:ring-slate-900 outline-none font-semibold text-blue-700"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">TAHAPAN VERIFIKASI SEKUENSAL (PISAHKAN DENGAN KOMA) *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Proposal Masuk, Review Kelayakan, Acc Bendahara, Paraf Gembala"
                  value={wfStepsInput}
                  onChange={(e) => setWfStepsInput(e.target.value)}
                  className="w-full p-2.5 border rounded-lg focus:ring-1 focus:ring-slate-900 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Sistem akan secara berurutan meminta tanda tangan verifikator untuk setiap fase di atas secara bertingkat.</p>
              </div>

              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="wfAuto" 
                    checked={wfAutoLog}
                    onChange={(e) => setWfAutoLog(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <label id="wfAutoLabel" htmlFor="wfAuto" className="font-bold text-slate-700 cursor-pointer">Auto-Journal ke Kas saat Approved?</label>
                </div>

                {wfAutoLog && (
                  <div className="animate-in slide-in-from-top-1 duration-150 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400">PILIH SALURAN KANTONG KAS SASARAN</label>
                    <select
                      value={wfPocketId}
                      onChange={(e) => setWfPocketId(e.target.value)}
                      className="w-full p-2.5 border rounded-lg focus:ring-1 focus:ring-slate-900 outline-none"
                    >
                      {pockets.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.description})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <Save className="w-4 h-4 text-indigo-200" />
                <span>Simpan Template SOP Pelayanan</span>
              </button>
            </form>

            {/* Configured Templates List (Right) */}
            <div className="lg:col-span-7 bg-white rounded-xl border p-5 space-y-4 shadow-3xs">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Skema SOP Alur Kas & Pelayanan Aktif ({customWorkflows.length})
              </span>

              {customWorkflows.length === 0 ? (
                <div className="p-16 border rounded-xl border-dashed text-center text-slate-400 space-y-2">
                  <HelpCircle className="w-8 h-8 text-slate-350 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">Belum Ada SOP Kustom</p>
                  <p className="text-[10px] max-w-sm mx-auto leading-relaxed">
                    Default-nya pengajuan jemaat menggunakan sistem approval 1-level (Submitted &rarr; Approved/Rejected).
                    Gunakan panel sebelah kiri untuk menciptakan alur kerja kustom yang dinamis sesuai kebutuhan pelayanan cabang jemaat Anda!
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {customWorkflows.map((wf) => {
                    const pickedPocket = pockets.find(p => p.id === wf.pocketId);
                    return (
                      <div key={wf.id} className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/20">
                        <div className="space-y-1.5 max-w-md">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded text-[9px] font-extrabold uppercase">
                              {wf.type}
                            </span>
                            <span className="text-slate-900 font-extrabold text-sm leading-snug">{wf.name}</span>
                          </div>
                          
                          <p className="text-xs text-slate-500 leading-snug font-light">{wf.description}</p>
                          
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {wf.steps.map((st, i) => (
                              <span key={i} className="px-2 py-0.5 bg-white border rounded text-[9px] font-semibold text-slate-600 flex items-center gap-1">
                                <span>{i + 1}. {st}</span>
                                {i < wf.steps.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-slate-400" />}
                              </span>
                            ))}
                          </div>

                          <div className="text-[10px] text-slate-400 space-y-0.5 pt-1.5">
                            {wf.requireBudgetLimit && wf.maxAmount && (
                              <p className="font-medium text-amber-700">⚠️ Batas Biaya Pengajuan Maksimal: <strong>Rp {wf.maxAmount.toLocaleString()},-</strong></p>
                            )}
                            {wf.autoLogFinance && pickedPocket && (
                              <p className="font-medium text-emerald-700">✓ Sistem otomatis mendaftarkan Kas Keluar pada kantong: <strong>{pickedPocket.name}</strong> saat disetujui penuh.</p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteWorkflow(wf.id, wf.name)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 shrink-0 transition cursor-pointer"
                          title="Hapus SOP ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit application modal */}
      {isSubmitOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden border shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Buat Pengajuan Kas & Kegiatan Jemaat</h3>
              <button onClick={() => setIsSubmitOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-5 space-y-4 text-xs">
              
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">PILIH ALUR SOP PENGAJUAN (OPSIONAL)</label>
                <select
                  value={selectedWorkflowId}
                  onChange={(e) => setSelectedWorkflowId(e.target.value)}
                  className="w-full p-2.5 border rounded-lg focus:ring-1 focus:ring-slate-950 outline-none"
                >
                  <option value="">-- Gunakan SOP Standar Gereja (1-Fase Approval) --</option>
                  {customWorkflows.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.type} • {w.steps.length} Tahapan)</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Memilih SOP khusus otomatis menerapkan aturan limit anggaran & alur peninjauan bertingkat di atas.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">JUDUL PENGAJUAN *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Pengadaan Mixer Digital Behringer X32"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2.5 border rounded-lg outline-none focus:ring-1 focus:ring-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">JENIS PENGAJUAN *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ApprovalType)}
                    className="w-full p-2.5 border rounded-lg outline-none focus:ring-1 focus:ring-slate-950"
                    disabled={!!selectedWorkflowId}
                  >
                    <option value="FINANCE">Pengajuan Anggaran/Dana</option>
                    <option value="VISIT">Kunjungan Pastoral (Visit)</option>
                    <option value="EVENT">Penyelenggaraan Event/Retreat</option>
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
                    className="w-full p-2.5 border rounded-lg outline-none focus:ring-1 focus:ring-slate-950 font-bold"
                    disabled={!selectedWorkflowId && formType !== 'FINANCE'}
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
                  className="w-full p-2.5 border rounded-lg outline-none focus:ring-1 focus:ring-slate-950 h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">LAMPIRAN PROPOSAL (URL/NAMA FILE)</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Proposal_Camp_SS_2026.pdf"
                  value={formAttachment}
                  onChange={(e) => setFormAttachment(e.target.value)}
                  className="w-full p-2.5 border rounded-lg outline-none focus:ring-1 focus:ring-slate-950"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsSubmitOpen(false)}
                  className="px-4 py-1.5 border hover:bg-slate-50 font-bold text-slate-600 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition cursor-pointer"
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
