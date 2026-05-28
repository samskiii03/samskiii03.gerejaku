/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db } from '../utils/storage';
import { AuditTrail, User } from '../types/church';
import { ListCollapse, ChevronRight, RefreshCcw, ShieldCheck, History, Eye } from 'lucide-react';

interface AuditTrailViewProps {
  currentUser: User;
  onRefresh: () => void;
}

export default function AuditTrailView({ currentUser, onRefresh }: AuditTrailViewProps) {
  const [selectedAudit, setSelectedAudit] = useState<AuditTrail | null>(null);
  
  const audits = db.getAudits();

  const handleRollback = (auditId: string) => {
    if (confirm("Apakah Anda yakin ingin mematikan perubahan ini dan mengembalikan data (Rollback) ke state lama sebelum aktivitas tersebut dilakukan?")) {
      const ok = db.rollbackAudit(auditId, currentUser);
      if (ok) {
        alert("Rollback berhasil diselesaikan!");
        onRefresh();
      } else {
        alert("Gagal melakukan rollback. Informasi state lama tidak tersedia.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Audit Trail & Keamanan Cadangan (Real-time Audit)</h2>
          <p className="text-sm text-slate-500 font-normal">Sistem pelacakan ketat atas aktivitas pengurus gereja, pengubahan draf keuangan, approval gembala, serta verifikasi pemulihan data (rollback).</p>
        </div>

        <div className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 border text-slate-700 rounded-lg text-xs font-semibold select-none font-mono">
          <History className="w-3.5 h-3.5" />
          <span>Incremental Backups On</span>
        </div>
      </div>

      {/* Split views */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Audit Table List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b bg-slate-50/50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Histori Penyesuaian Data ({audits.length})</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {audits.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm italic">Belum ada rekaman audit trail sistem.</div>
            ) : (
              audits.map(item => (
                <div 
                  key={item.id}
                  onClick={() => setSelectedAudit(item)}
                  className={`p-4 flex items-start justify-between cursor-pointer hover:bg-slate-50/50 transition ${selectedAudit?.id === item.id ? 'bg-slate-50' : ''}`}
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-slate-400">{item.timestamp.split('T')[1].substring(0, 8)}</span>
                      <span className="bg-slate-100 text-slate-700 border px-2 py-0.2 rounded-[3px] font-bold tracking-tight text-[9px] uppercase">
                        {item.action}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 leading-snug">{item.details}</p>
                    <p className="text-[10px] text-slate-400">Oleh {item.userName} (ID: {item.userId})</p>
                  </div>

                  <div className="flex flex-col items-end shrink-0 space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-mono">{item.timestamp.split('T')[0]}</span>
                    {item.previousState && (
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded font-bold font-sans">
                        Reversible
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Inspection Panel and Rollback trigger */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          {selectedAudit ? (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100">
                <span className="text-[10px] text-slate-400 font-mono block">AUDIT TRACE ID: {selectedAudit.id}</span>
                <span className="text-[11px] text-slate-400 font-normal">{selectedAudit.timestamp}</span>
                <h4 className="text-sm font-extrabold text-slate-900 mt-1 leading-snug">{selectedAudit.action}</h4>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Deksripsi Log</span>
                  <p className="p-3 bg-slate-50/50 rounded-lg border text-slate-700 leading-normal font-light">{selectedAudit.details}</p>
                </div>

                {selectedAudit.previousState && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">State Sebelum Diubah (Previous)</span>
                    <pre className="p-3 bg-slate-950 text-emerald-400 rounded-lg font-mono text-[9px] max-h-[140px] overflow-auto border border-slate-900">
                      {selectedAudit.previousState}
                    </pre>
                  </div>
                )}

                {selectedAudit.newState && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">State Sesudah Diubah (Current)</span>
                    <pre className="p-3 bg-slate-950 text-blue-400 rounded-lg font-mono text-[9px] max-h-[140px] overflow-auto border border-slate-900">
                      {selectedAudit.newState}
                    </pre>
                  </div>
                )}
              </div>

              {/* Rollback Trigger Button */}
              {selectedAudit.previousState && (
                <div className="pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => handleRollback(selectedAudit.id)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded transition flex items-center justify-center space-x-1.5 shadow-xs"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    <span>Rollback Aktivitas Ini</span>
                  </button>
                  <span className="text-[9px] text-slate-400 text-center block mt-1.5 italic font-light">Rollback akan langsung menyalin ulang database attributes sebelum diubah.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <History className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-medium">Klik salah satu baris histori penyesuaian untuk melihat muatan JSON data lama serta perbandingannya.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
