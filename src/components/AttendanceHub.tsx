/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Member, User, UserRole } from '../types/church';
import { db } from '../utils/storage';
import { 
  Users, CheckCircle, XCircle, Search, Calendar, Filter, 
  ChevronRight, TrendingUp, BarChart3, AlertTriangle, Send, 
  CheckCircle2, UserCheck, ShieldCheck, ClipboardCheck, Sparkles, UserPlus
} from 'lucide-react';
import { CustomLineChart, CustomDonutChart, CustomBarChart } from './CustomChart';

interface AttendanceHubProps {
  currentUser: User;
  onRefreshTrail: () => void;
}

export default function AttendanceHub({ currentUser, onRefreshTrail }: AttendanceHubProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedService, setSelectedService] = useState<string>('Ibadah Raya 1 (Pagi)');
  const [activeSubTab, setActiveSubTab] = useState<'JEMAAT' | 'PELAYAN' | 'PENGURUS'>('JEMAAT');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSektor, setFilterSektor] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Load latest state from DB
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const loadData = () => {
    setMembers(db.getMembers().filter(m => m.churchId === currentUser.churchId));
    setUsers(db.getUsers().filter(u => u.churchId === currentUser.churchId));
  };

  useEffect(() => {
    loadData();
  }, [currentUser.churchId]);

  // Handle manual UI toggle or updates
  const handleToggleMember = (memberId: string) => {
    db.toggleMemberAttendance(memberId, selectedDate, currentUser);
    loadData();
    onRefreshTrail();
  };

  const handleToggleUser = (userId: string) => {
    db.toggleUserAttendance(userId, selectedDate, currentUser);
    loadData();
    onRefreshTrail();
  };

  // Helper: batch mark all filtered members
  const handleBatchUpdateMembers = (status: boolean) => {
    const filtered = getFilteredMembers();
    filtered.forEach(m => {
      const currentStatus = m.attendanceHistory?.[selectedDate] || false;
      if (currentStatus !== status) {
        db.toggleMemberAttendance(m.id, selectedDate, currentUser);
      }
    });
    loadData();
    onRefreshTrail();
  };

  // Filter processes
  const getFilteredMembers = () => {
    return members.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            m.nickname.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSektor = filterSektor === 'ALL' || m.sector === filterSektor;
      const matchesCategory = filterCategory === 'ALL' || m.category === filterCategory;
      return matchesSearch && matchesSektor && matchesCategory;
    });
  };

  const getFilteredPelayan = () => {
    // Both members with ministryStatus === 'YA' and users on PELAYAN/KEPALA_DIVISI roles
    const pelayanMembers = members.filter(m => m.ministryStatus === 'YA' && m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const pelayanUsers = users.filter(u => (u.role === 'PELAYAN' || u.role === 'KEPALA_DIVISI') && u.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return {
      members: pelayanMembers,
      users: pelayanUsers
    };
  };

  const getFilteredPengurus = () => {
    // Users with roles of GEMBALA, PENGURUS, KEPALA_DIVISI
    return users.filter(u => 
      (u.role === 'GEMBALA' || u.role === 'PENGURUS' || u.role === 'KEPALA_DIVISI') && 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Collect unique sectors for filters
  const sectors = Array.from(new Set(members.map(m => m.sector).filter(Boolean))) as string[];
  const categories = ['AKTIF', 'KURANG_AKTIF', 'PASIF', 'BARU', 'INTI', 'LANSIA', 'REMAJA', 'PEMUDA'];

  // Calculate stats for current selected date
  const totalMembers = members.length;
  const presentMembers = members.filter(m => m.attendanceHistory?.[selectedDate] === true).length;
  const memberAttendanceRate = totalMembers > 0 ? Math.round((presentMembers / totalMembers) * 100) : 0;

  const { members: pM, users: pU } = getFilteredPelayan();
  const totalPelayan = pM.length + pU.length;
  const presentPelayan = pM.filter(m => m.attendanceHistory?.[selectedDate] === true).length +
                         pU.filter(u => u.attendanceHistory?.[selectedDate] === true).length;
  const pelayanAttendanceRate = totalPelayan > 0 ? Math.round((presentPelayan / totalPelayan) * 100) : 0;

  const totalPengurus = users.filter(u => u.role === 'PENGURUS' || u.role === 'GEMBALA').length;
  const presentPengurus = users.filter(u => (u.role === 'PENGURUS' || u.role === 'GEMBALA') && u.attendanceHistory?.[selectedDate] === true).length;
  const pengurusAttendanceRate = totalPengurus > 0 ? Math.round((presentPengurus / totalPengurus) * 100) : 0;

  // Global Participation Index (Avg of three groups)
  const globalParticipationIndex = Math.round(
    (memberAttendanceRate * 0.6) + (pelayanAttendanceRate * 0.25) + (pengurusAttendanceRate * 0.15)
  );

  // Dynamic Chart 1: Trends over last 5 distinct dates that have data
  const getTrendsData = () => {
    // Scan all dates with any attendance
    const allDatesSet = new Set<string>();
    members.forEach(m => {
      if (m.attendanceHistory) {
        Object.keys(m.attendanceHistory).forEach(d => allDatesSet.add(d));
      }
    });

    // Make sure current date is also in the set for real-time visualization
    allDatesSet.add(selectedDate);

    // Convert to sorted array
    const sortedDates = Array.from(allDatesSet).sort().slice(-5); // Get last 5 dates

    return sortedDates.map(date => {
      const attendees = members.filter(m => m.attendanceHistory?.[date] === true).length;
      // Convert date string of YYYY-MM-DD to Indonesian compact day/month representation
      let label = date;
      try {
        const parts = date.split('-');
        if (parts.length === 3) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
          label = `${parts[2]} ${months[parseInt(parts[1]) - 1]}`;
        }
      } catch (e) {}
      return {
        label,
        value: attendees
      };
    });
  };

  // Dynamic Chart 2: Category distribution of present members
  const getSlicesData = () => {
    const presentList = members.filter(m => m.attendanceHistory?.[selectedDate] === true);
    const result: Record<string, number> = {};
    
    // Default categories to show cleanly
    const colors: Record<string, string> = {
      'AKTIF': '#3b82f6', // blue
      'INTI': '#10b981', // emerald
      'REMAJA': '#f59e0b', // amber
      'PEMUDA': '#8b5cf6', // purple
      'LANSIA': '#ec4899', // pink
      'BARU': '#14b8a6', // teal
      'PASIF': '#64748b' // slate
    };

    presentList.forEach(m => {
      result[m.category] = (result[m.category] || 0) + 1;
    });

    const slices = Object.entries(result).map(([cat, count]) => ({
      label: cat,
      value: count,
      color: colors[cat] || '#94a3b8'
    }));

    if (slices.length === 0) {
      // return default slices empty
      return [
        { label: 'Belum Ada Kehadiran', value: 0, color: '#ebdcd1' }
      ];
    }
    return slices;
  };

  // Dynamic Chart 3: Sector Attendance Rate Bar Graph
  const getSectorBarData = () => {
    if (sectors.length === 0) return [];
    return sectors.map(sector => {
      const sectorMembers = members.filter(m => m.sector === sector);
      const sectorPresence = sectorMembers.filter(m => m.attendanceHistory?.[selectedDate] === true).length;
      return {
        label: sector.replace('Sektor ', ''),
        value1: sectorPresence,
        color1: '#6366f1' // indigo
      };
    }).slice(0, 5); // Limit max 5 sectors to avoid clutter
  };

  // Members needing outreach (pasif or attendance < 50%)
  const getOutreachMembers = () => {
    return members.filter(m => {
      // Check average presence
      const history = m.attendanceHistory ? Object.values(m.attendanceHistory) : [];
      const presents = history.filter(v => v === true).length;
      const rate = history.length > 0 ? (presents / history.length) : 0;
      return (m.category === 'PASIF' || m.category === 'KURANG_AKTIF' || (history.length > 2 && rate < 0.5));
    }).slice(0, 4);
  };

  const [notifMessage, setNotifMessage] = useState('');

  const triggerPastorOutreach = (memberName: string, id: string) => {
    const gembala = users.find(u => u.role === 'GEMBALA');
    db.logAudit(
      currentUser.id, 
      currentUser.fullName, 
      'OUTREACH_REFERRAL', 
      `Delegasi Kunjungan/Penjangkauan Jiwa Baru: Merekomendasikan jemaat "${memberName}" yang kurang aktif ke tim pastoral.`
    );
    setNotifMessage(`📢 Penjangkauan untuk ${memberName} berhasil diluncurkan & didelegasikan ke tim pastoral.`);
    setTimeout(() => setNotifMessage(''), 4500);
  };

  return (
    <div className="space-y-6">
      {/* Notifications banner */}
      {notifMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs p-3.5 rounded-xl font-bold animate-pulse">
          {notifMessage}
        </div>
      )}

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Kehadiran & Absensi Jemaat Terpadu</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full select-none">Live Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Atur presensi ibadah mingguan pengerja dan jemaat. Data terhubung otomatis ke indikator keterlibatan & grafik jemaat.</p>
        </div>

        {/* Date and Service selection controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
          <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200/80 items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400 ml-1" />
            <input 
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none text-slate-800 outline-none focus:ring-0"
            />
          </div>

          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="Ibadah Raya 1 (Pagi)">Ibadah Raya 1 (Pagi)</option>
            <option value="Ibadah Raya 2 (Siang)">Ibadah Raya 2 (Siang)</option>
            <option value="Ibadah Pemuda / Youth Service">Ibadah Pemuda / Youth Service</option>
            <option value="Ibadah Doa Malam & Syafaat">Ibadah Doa Malam & Syafaat</option>
            <option value="Sekolah Alkitab & Doa Fajar">Sekolah Alkitab & Doa Fajar</option>
          </select>
        </div>
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Index Partisipasi</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-lg font-black text-slate-800">{globalParticipationIndex}%</span>
              <span className="text-[9px] text-emerald-600 font-medium font-mono">Keaktifan</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Hadir / Total Jemaat</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-lg font-black text-slate-800">{presentMembers} <span className="font-light text-xs text-slate-400">/ {totalMembers}</span></span>
              <span className="text-[9px] text-indigo-600 font-medium font-mono">({memberAttendanceRate}%)</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-sans">Pelayan Altar Present</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-lg font-black text-slate-800">{presentPelayan} <span className="font-light text-xs text-slate-400">/ {totalPelayan}</span></span>
              <span className="text-[9px] text-emerald-600 font-medium font-mono">({pelayanAttendanceRate}%)</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-sans">Kehadiran Staf/Pengurus</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-lg font-black text-slate-800">{presentPengurus} <span className="font-light text-xs text-slate-400">/ {totalPengurus}</span></span>
              <span className="text-[9px] text-amber-600 font-medium font-mono">({pengurusAttendanceRate}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Core split: Attendance Grid & Analytics Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Interactive Checklist Pane */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            {/* Tab selection for members vs ministers vs leaders */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1.5">
              {[
                { id: 'JEMAAT', label: 'Sidang Jemaat', count: totalMembers },
                { id: 'PELAYAN', label: 'Pelayan Ibadah', count: totalPelayan },
                { id: 'PENGURUS', label: 'Pengurus / Majelis', count: totalPengurus }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => { setActiveSubTab(sub.id as any); setSearchTerm(''); }}
                  className={`px-4 py-2 rounded-lg text-xs font-extrabold transition flex items-center space-x-1.5 cursor-pointer ${
                    activeSubTab === sub.id 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{sub.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeSubTab === sub.id 
                      ? 'bg-slate-800 text-slate-300' 
                      : 'bg-slate-200 text-slate-600'
                  }`}>{sub.count}</span>
                </button>
              ))}
            </div>

            {/* Sub-Filters toolbar for Jemaat Tab */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder={`Cari nama ${activeSubTab === 'JEMAAT' ? 'jemaat...' : activeSubTab === 'PELAYAN' ? 'pelayan...' : 'staf...'}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 focus:bg-white transition"
                />
              </div>

              {activeSubTab === 'JEMAAT' && (
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={filterSektor}
                    onChange={(e) => setFilterSektor(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg text-xs font-semibold bg-white cursor-pointer"
                  >
                    <option value="ALL">Semua Sektor</option>
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg text-xs font-semibold bg-white cursor-pointer"
                  >
                    <option value="ALL">Semua Kategori</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {/* Batch modifiers for members */}
              {activeSubTab === 'JEMAAT' && (
                <div className="flex space-x-1 shrink-0 w-full md:w-auto justify-end">
                  <button 
                    onClick={() => handleBatchUpdateMembers(true)}
                    className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded text-[10px] font-bold hover:bg-indigo-100 transition cursor-pointer"
                  >
                    Set Semua Hadir
                  </button>
                  <button 
                    onClick={() => handleBatchUpdateMembers(false)}
                    className="px-2.5 py-1.5 bg-slate-100 border border-slate-205 text-slate-600 rounded text-[10px] font-bold hover:bg-slate-200 transition cursor-pointer"
                  >
                    Reset Hadir
                  </button>
                </div>
              )}
            </div>

            {/* List checklist core body */}
            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto font-sans pr-1">
              
              {/* RENDERING JEMAAT TAB */}
              {activeSubTab === 'JEMAAT' && (() => {
                const filtered = getFilteredMembers();
                if (filtered.length === 0) {
                  return <div className="p-12 text-center text-slate-400 text-xs italic">Tidak ada anggota jemaat terdaftar sesuai filter.</div>;
                }
                return filtered.map(member => {
                  const isPresent = member.attendanceHistory?.[selectedDate] || false;
                  return (
                    <div key={member.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition">
                      <div className="flex items-center space-x-3 min-w-0 pr-4">
                        <span className="text-xl shrink-0 select-none">{member.gender === 'L' ? '👨' : '👩'}</span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 text-xs truncate">{member.name}</p>
                          <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-slate-400 font-medium">
                            <span>Sektor: {member.sector || 'N/A'}</span>
                            <span>•</span>
                            <span className="text-indigo-600 font-bold uppercase">{member.category}</span>
                            <span>•</span>
                            <span className="font-mono">Nilai Keaktifan: {member.activityScore || 0}%</span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleToggleMember(member.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer border ${
                          isPresent 
                            ? 'bg-emerald-600 border-emerald-700 text-white shadow-3xs' 
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {isPresent ? '✓ HADIR' : 'ABSEN / ALFA'}
                      </button>
                    </div>
                  );
                });
              })()}

              {/* RENDERING PELAYAN MINI TAB */}
              {activeSubTab === 'PELAYAN' && (() => {
                const { members: filteredPm, users: filteredPu } = getFilteredPelayan();
                if (filteredPm.length === 0 && filteredPu.length === 0) {
                  return <div className="p-12 text-center text-slate-400 text-xs italic">Tidak ada pelayan terdaftar sesuai filter.</div>;
                }

                return (
                  <>
                    {/* Combine lists */}
                    {filteredPm.map(member => {
                      const isPresent = member.attendanceHistory?.[selectedDate] || false;
                      return (
                        <div key={member.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition">
                          <div className="flex items-center space-x-3">
                            <span className="text-xl">🎸</span>
                            <div>
                              <p className="font-extrabold text-slate-900 text-xs">{member.name}</p>
                              <p className="text-[10px] text-slate-400">Jemaat Lokal • {member.talents?.join(', ') || 'Pelayan Altar'}</p>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleToggleMember(member.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer border ${
                              isPresent 
                                ? 'bg-indigo-600 border-indigo-700 text-white shadow-3xs' 
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {isPresent ? '✓ DI ALTARE' : 'BELUM CHECKIN'}
                          </button>
                        </div>
                      );
                    })}

                    {filteredPu.map(u => {
                      const isPresent = u.attendanceHistory?.[selectedDate] || false;
                      return (
                        <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition">
                          <div className="flex items-center space-x-3">
                            <span className="text-xl">🎤</span>
                            <div>
                              <p className="font-extrabold text-slate-900 text-xs">{u.fullName}</p>
                              <p className="text-[10px] text-indigo-700 font-semibold">{u.role.replace('_', ' ')} • Staf Gereja</p>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleToggleUser(u.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer border ${
                              isPresent 
                                ? 'bg-indigo-600 border-indigo-700 text-white shadow-3xs' 
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {isPresent ? '✓ DI ALTARE' : 'BELUM CHECKIN'}
                          </button>
                        </div>
                      );
                    })}
                  </>
                );
              })()}

              {/* RENDERING PENGURUS MENU TAB */}
              {activeSubTab === 'PENGURUS' && (() => {
                const filtered = getFilteredPengurus();
                if (filtered.length === 0) {
                  return <div className="p-12 text-center text-slate-400 text-xs italic">Tidak ada staf pengurus gereja terdaftar.</div>;
                }
                return filtered.map(u => {
                  const isPresent = u.attendanceHistory?.[selectedDate] || false;
                  return (
                    <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">💼</span>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{u.fullName}</p>
                          <p className="text-[10px] text-slate-400">Pimpinan • Level Otoritas: <strong className="text-slate-700 uppercase font-bold">{u.role.replace('_', ' ')}</strong></p>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleToggleUser(u.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer border ${
                          isPresent 
                            ? 'bg-amber-600 border-amber-700 text-white shadow-3xs' 
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {isPresent ? '✓ DINAS AKTIF' : 'TANPA ABSEN'}
                      </button>
                    </div>
                  );
                });
              })()}

            </div>
          </div>

          {/* Footer delegation logs info */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-1">
            <span>Otoritas pengisian dipegang oleh Gembala & Pengurus terverifikasi. Sesi dicatat di audit log.</span>
            <span className="font-mono bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded">UUID/DB SHA-AUTO5</span>
          </div>

        </div>

        {/* Right Analytics and Engagement Indicator Details */}
        <div className="space-y-6">
          
          {/* Trends line chart and visual representation */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Garis Perkembangan Kehadiran</span>
            </h3>
            <p className="text-[11px] text-slate-500">Jumlah kehadiran jemaat ibadah raya berdasarkan 5 tanggal log presensi terakhir.</p>
            
            <div className="pt-2">
              <CustomLineChart 
                data={getTrendsData()} 
                strokeColor="#6366f1"
                height={160}
              />
            </div>
          </div>

          {/* Slices representation (Donut chart for categories) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Proporsi Kategori Jemaat Hadir</span>
            </h3>
            <p className="text-[11px] text-slate-400">Rasio diversifikasi jemaat (Lansia, Pemuda, Remaja, Baru) yang check-in pada sesi terpilih.</p>
            
            <div className="pt-1.5 bg-slate-50/50 rounded-lg p-2 border border-slate-100">
              <CustomDonutChart slices={getSlicesData()} />
            </div>
          </div>

          {/* Outreach and Follow-ups suggestions indicator */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Rekomendasi Penjangkauan Jiwa</span>
              </h3>
              <span className="text-[9px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded">Rata-rata &lt; 50%</span>
            </div>
            
            <p className="text-[11px] text-slate-400 leading-snug">Jemaat dengan status pasif atau absensi rendah. Butuh kunjungan doa pastoral agar kembali terhubung di persekutuan.</p>

            <div className="space-y-2.5">
              {getOutreachMembers().length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg">Anggota jemaat terpelihara dengan sangat baik. 0 jemaat pasif kritis!</div>
              ) : (
                getOutreachMembers().map(member => (
                  <div key={member.id} className="p-3 bg-slate-55 border border-slate-150 rounded-lg flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 text-[11px] truncate">{member.name}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Sektor {member.sector || 'N/A'} • Kehadiran: <strong className="text-amber-700 font-bold">{member.activityScore || 0}%</strong></p>
                    </div>

                    <button 
                      onClick={() => triggerPastorOutreach(member.name, member.id)}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-indigo-900 hover:text-white text-white rounded text-[10px] font-black tracking-tight shrink-0 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Send className="w-3 h-3 text-slate-300" />
                      <span>Jangkau</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
