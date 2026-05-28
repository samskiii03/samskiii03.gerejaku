/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Task, User, ChecklistItem } from '../types/church';
import { db } from '../utils/storage';
import { 
  Plus, ClipboardList, Clock, Calendar, CheckSquare, 
  Trash, ArrowRight, CheckCircle2, UserCheck, AlertCircle 
} from 'lucide-react';

interface TasksManagementProps {
  currentUser: User;
}

export default function TasksManagement({ currentUser }: TasksManagementProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [refreshSeed, setRefreshSeed] = useState(0);

  // Form states for creating a task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDeadline, setTaskDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [taskChecklist, setTaskChecklist] = useState('');

  const tasks = db.getTasks();
  const members = db.getMembers();

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskAssignee) {
      alert("Harap masukkan Judul Tugas dan Pelayan yang ditugasi.");
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (taskDeadline < todayStr) {
      alert("Tenggat deadline tidak boleh di masa lampau.");
      return;
    }

    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFormatRegex.test(taskDeadline)) {
      alert("Format tanggal salah. Silakan gunakan format YYYY-MM-DD.");
      return;
    }

    // Convert comma-separated checklist to ChecklistItem objects
    const checks: ChecklistItem[] = taskChecklist
      ? taskChecklist.split(',').map((text, idx) => ({
          id: 'tc-' + idx + '-' + Date.now(),
          text: text.trim(),
          done: false
        }))
      : [];

    const nTask: Task = {
      id: 't-' + Date.now(),
      boardId: 'TODO',
      title: taskTitle,
      description: taskDesc,
      assignedTo: 'm-denny', // reference placeholder
      assignedName: taskAssignee,
      deadline: taskDeadline,
      progress: 0,
      checklists: checks
    };

    db.addTask(nTask);
    setIsAddOpen(false);

    // Reset fields
    setTaskTitle('');
    setTaskDesc('');
    setTaskAssignee('');
    setTaskChecklist('');
    setRefreshSeed(p => p + 1);
  };

  const handleToggleChecklist = (taskId: string, checklistId: string) => {
    const list = db.getTasks();
    const target = list.find(t => t.id === taskId);
    if (!target) return;

    const item = target.checklists.find(c => c.id === checklistId);
    if (item) {
      item.done = !item.done;
      // Recalculate progress %
      const doneCount = target.checklists.filter(c => c.done).length;
      target.progress = target.checklists.length > 0 ? Math.round((doneCount / target.checklists.length) * 100) : 0;
      
      // If 100% and boardId is TODO/DOING, do NOT auto shift but user can see completion
      db.updateTask(target);
      setRefreshSeed(p => p + 1);
    }
  };

  const handleCycleBoard = (taskId: string) => {
    const list = db.getTasks();
    const target = list.find(t => t.id === taskId);
    if (!target) return;

    if (target.boardId === 'TODO') target.boardId = 'DOING';
    else if (target.boardId === 'DOING') target.boardId = 'DONE';
    else target.boardId = 'TODO';

    db.updateTask(target);
    setRefreshSeed(p => p + 1);
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus kartu tugas ini dari papan?")) {
      db.deleteTask(taskId);
      setRefreshSeed(p => p + 1);
    }
  };

  const boards: { id: 'TODO' | 'DOING' | 'DONE'; name: string; bg: string; dot: string }[] = [
    { id: 'TODO', name: 'Butuh Dikerjakan (Backlog)', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-400' },
    { id: 'DOING', name: 'Sedang Dilakukan (Active)', bg: 'bg-slate-50/50 border-slate-200/80', dot: 'bg-blue-500' },
    { id: 'DONE', name: 'Selesai Sempurna (Completed)', bg: 'bg-emerald-50/20 border-emerald-100', dot: 'bg-emerald-500' }
  ];

  return (
    <div key={refreshSeed} className="space-y-6">
      {/* Title card header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Task Board & Manajemen Project</h2>
          <p className="text-sm text-slate-500 font-normal">Koordinasi tugas mingguan pelayan gereja, checklist penugasan panggung, audit sistem sound, hingga log perkunjungan.</p>
        </div>

        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shrink-0 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kartu Tugas</span>
        </button>
      </div>

      {/* Board grids layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {boards.map(b => {
          const colTasks = tasks.filter(t => t.boardId === b.id);
          return (
            <div key={b.id} className={`rounded-xl border p-4 ${b.bg} space-y-4`}>
              <div className="flex items-center justify-between font-sans border-b pb-2">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${b.dot}`}></span>
                  <span className="text-xs font-extrabold uppercase text-slate-700 tracking-wider font-bold">{b.name}</span>
                </div>
                <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px] text-slate-600 font-bold font-mono">{colTasks.length}</span>
              </div>

              {/* Dynamic Task lists */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic">Belum ada tugas di kolom ini.</div>
                ) : (
                  colTasks.map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-3 hover:shadow-xs transition">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-bold text-slate-800 leading-snug">{t.title}</h4>
                        <button 
                          onClick={() => handleDeleteTask(t.id)}
                          className="text-slate-300 hover:text-rose-600 transition shrink-0"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {t.description && (
                        <p className="text-xs text-slate-500 font-light leading-relaxed leading-snug">{t.description}</p>
                      )}

                      {/* Checklist items list */}
                      {t.checklists && t.checklists.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Checklist Tugas ({t.progress}%)</span>
                          {t.checklists.map(c => (
                            <label key={c.id} className="flex items-start space-x-2 text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                              <input 
                                type="checkbox" 
                                checked={c.done}
                                onChange={() => handleToggleChecklist(t.id, c.id)}
                                className="w-3.5 h-3.5 mt-0.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                              />
                              <span className={`leading-tight font-light ${c.done ? 'line-through text-slate-400' : ''}`}>{c.text}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Assignment metadata info */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs mt-1 text-slate-600 leading-snug">
                        <div className="flex items-center space-x-1 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px] font-semibold">{t.assignedName}</span>
                        </div>

                        <span className="text-[10px] text-rose-500 font-mono font-bold flex items-center">
                          <Clock className="w-3 h-3 mr-1 shrink-0" />
                          {t.deadline}
                        </span>
                      </div>

                      {/* Quick Shift button */}
                      <button 
                        onClick={() => handleCycleBoard(t.id)}
                        className="w-full mt-2 py-1.5 bg-slate-50 hover:bg-slate-100 border text-slate-700 text-[11px] font-semibold rounded flex items-center justify-center space-x-1 transition"
                      >
                        <span>Pindahkan Status</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden border shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Buat Kartu Tugas Baru</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">JUDUL TUGAS *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Setting Sound Monitor Floor"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 font-sans">DESKRIPSI TUGAS / TARGET DETAIL</label>
                <textarea 
                  placeholder="Uraikan detail pekerjaan yang diharapkan..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none h-16 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">DITUGASKAN KEPADA *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Nama pelayan, contoh: Robby Hartono"
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">TENGGAT DEADLINE *</label>
                <input 
                  type="date" 
                  required 
                  min={new Date().toISOString().split('T')[0]}
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Format wajib: YYYY-MM-DD (Minimal hari ini)</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 font-sans">LIST CHECKLIST (PISAH DENGAN KOMA)</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Tes Kabel XLR, Pasang Casing, Tes Sound"
                  value={taskChecklist}
                  onChange={(e) => setTaskChecklist(e.target.value)}
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
                  Buat Kartu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
