/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Division, User } from '../types/church';
import { db } from '../utils/storage';
import { Plus, Users, ShieldAlert, Edit, Trash2, Tag, Layers, Settings, ChevronRight } from 'lucide-react';

interface DivisionsProps {
  currentUser: User;
  onRefreshTrail: () => void;
}

export default function Divisions({ currentUser, onRefreshTrail }: DivisionsProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDiv, setSelectedDiv] = useState<Division | null>(null);

  // Form states for creating/editing
  const [divName, setDivName] = useState('');
  const [divDesc, setDivDesc] = useState('');
  const [divLead, setDivLead] = useState('');
  const [subDivs, setSubDivs] = useState('');
  const [roles, setRoles] = useState('');
  const [permissions, setPermissions] = useState('');
  const [workflow, setWorkflow] = useState('');

  // Editing state toggler
  const [isEditing, setIsEditing] = useState(false);

  const divisions = db.getDivisions();
  const members = db.getMembers();

  const handleOpenEdit = (div: Division) => {
    setSelectedDiv(div);
    setDivName(div.name);
    setDivDesc(div.description);
    setDivLead(div.leadName || '');
    setSubDivs(div.subDivisions.join(', '));
    setRoles(div.customRoles.join(', '));
    setPermissions(div.customPermissions.join(', '));
    setWorkflow(div.workflow);
    setIsEditing(true);
    setIsAddOpen(true);
  };

  const handleOpenCreate = () => {
    setSelectedDiv(null);
    setDivName('');
    setDivDesc('');
    setDivLead('');
    setSubDivs('');
    setRoles('');
    setPermissions('');
    setWorkflow('');
    setIsEditing(false);
    setIsAddOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!divName || !divDesc) {
      alert("Harap lengkapi nama divisi dan deskripsi utamanya.");
      return;
    }

    const arrSubs = subDivs ? subDivs.split(',').map(s => s.trim()) : [];
    const arrRoles = roles ? roles.split(',').map(r => r.trim()) : [];
    const arrPerms = permissions ? permissions.split(',').map(p => p.trim()) : [];

    if (isEditing && selectedDiv) {
      const updated: Division = {
        ...selectedDiv,
        name: divName,
        description: divDesc,
        leadName: divLead,
        subDivisions: arrSubs,
        customRoles: arrRoles,
        customPermissions: arrPerms,
        workflow: workflow
      };
      db.updateDivision(updated, currentUser);
    } else {
      const nDiv: Division = {
        id: 'div-' + Date.now(),
        name: divName,
        description: divDesc,
        leadId: 'm-denny', // Default mock reference
        leadName: divLead || 'Belum Ditunjuk',
        subDivisions: arrSubs,
        customRoles: arrRoles,
        customPermissions: arrPerms,
        workflow: workflow || 'Konfirmasi Anggota -> Setujui Pengurus'
      };
      db.addDivision(nDiv, currentUser);
    }

    setIsAddOpen(false);
    onRefreshTrail();
  };

  const handleDelete = (divId: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus divisi pelayanan ini secara permanen dari bagan gereja?")) {
      db.deleteDivision(divId, currentUser);
      onRefreshTrail();
    }
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Sistem Struktur Divisi & Departemen Dinamis</h2>
          <p className="text-sm text-slate-500 font-normal">Buat divisi pelayanan baru, tentukan sub-divisi, kelola hak akses custom, serta workflow operasional di tingkat kordinator jemaat.</p>
        </div>

        {currentUser.role === 'GEMBALA' && (
          <button 
            onClick={handleOpenCreate}
            className="flex items-center space-x-2 px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shrink-0 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Divisi Baru</span>
          </button>
        )}
      </div>

      {/* Main layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left pane: lists */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {divisions.length === 0 ? (
              <div className="col-span-2 bg-white p-12 text-center text-slate-400 border rounded-xl text-sm italic">
                Belum ada divisi pelayanan terdaftar. Silakan klik + Tambah Divisi untuk memulai.
              </div>
            ) : (
              divisions.map(item => {
                // Find members inside this division (simple check if their talents match or assigned)
                const associatedCount = members.filter(m => m.talents?.some(t => t.toLowerCase().includes(item.name.toLowerCase().split(' ')[0]))).length;
                
                return (
                  <div key={item.id} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg"><Layers className="w-4 h-4 text-slate-500" /></div>
                          <h4 className="text-sm font-extrabold text-slate-900 leading-tight">{item.name}</h4>
                        </div>

                        <div className="flex space-x-1">
                          {currentUser.role === 'GEMBALA' && (
                            <>
                              <button 
                                onClick={() => handleOpenEdit(item)}
                                className="p-1 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded transition"
                                title="Edit structure"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDelete(item.id)}
                                className="p-1 border border-rose-100 hover:bg-rose-50 text-rose-600 rounded transition"
                                title="Delete Division"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 font-normal leading-relaxed leading-snug">{item.description}</p>
                    </div>

                    {/* Meta stats block */}
                    <div className="pt-3 border-t border-slate-100 space-y-2.5 text-[11px] text-slate-600 leading-snug">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Kepala Divisi (Kordinator):</span>
                        <span className="font-semibold text-slate-800">🧑‍💼 {item.leadName || 'Belum Ditunjuk'}</span>
                      </div>

                      {item.subDivisions && item.subDivisions.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.subDivisions.map((s, i) => (
                            <span key={i} className="bg-slate-50 text-slate-600 border border-slate-200/60 font-medium px-2 py-0.5 rounded text-[10px]">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                      <span>Workflow: {item.workflow}</span>
                      <span className="font-semibold text-slate-500">{associatedCount} Pelayan Terdeteksi</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Info Section */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Settings className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Standard Kompetensi Pelayanan</h3>
          </div>

          <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed font-light">
            <p>Platform Meta Connect dikonfigurasi untuk gereja multi-kantor / multi-cabang. Divisi pelayanan dibentuk dinamis guna melayani kebutuhan praktis di lapangan.</p>
            
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg text-indigo-950 flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-xs">Peringatan Keamanan!</span>
                <span className="text-[11px]">Hanya akun berkedudukan **Gembala (Lead Pastor)** yang diizinkan memodifikasi atau menambah divisi pelayanan utama. Semua pengubahan dicatat di draf Audit Trail secara real-time.</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Grup Divisi Populer</span>
              {[
                { name: 'Multimedia', desc: 'LCD, live streams, video documentation, slides' },
                { name: 'Praise & Worship', desc: 'Singer, worship leader, music director, musicians' },
                { name: 'Diakonia', desc: 'Bantuan sosial, kunjungan duka, konseling psikologi' },
                { name: 'Usher / Greeter', desc: 'Penyambut jemaat ibadah minggu rona ramah' }
              ].map((g, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">{g.name}</span>
                    <span className="text-[10px] text-slate-400">{g.desc}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic creation dialog modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden border shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">{isEditing ? 'Ubah Struktur Divisi' : 'Buat Divisi Baru'}</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">NAMA DIVISI / DEPARTEMEN *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Media & Creative IT"
                  value={divName}
                  onChange={(e) => setDivName(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">DESKRIPSI TUGAS *</label>
                <textarea 
                  required 
                  placeholder="Terangkan peran departemen ini..."
                  value={divDesc}
                  onChange={(e) => setDivDesc(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none h-16 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">KEPALA KOORDINATOR / LEADER</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Robby Hartono"
                  value={divLead}
                  onChange={(e) => setDivLead(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">SUB-DIVISI (PISAH DENGAN KOMA)</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Soundman, Cam-Op, Editor"
                  value={subDivs}
                  onChange={(e) => setSubDivs(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">HAK AKSES / PERMISSIONS CUSTOM (PISAH DENGAN KOMA)</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Inventaris, Jadwalkan Latihan, Absen"
                  value={permissions}
                  onChange={(e) => setPermissions(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ALUR WORKFLOW STANDARD</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Submit Kordinator -> Approve Gembala"
                  value={workflow || 'Submit Kordinator -> Approve Gembala'}
                  onChange={(e) => setWorkflow(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-1.5 border hover:bg-slate-50 text-slate-600 font-semibold rounded"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 transition"
                >
                  {isEditing ? 'Simpan Perubahan' : 'Buat Divisi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
