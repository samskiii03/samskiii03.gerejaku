/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Transaction, User, ApprovalRequest } from '../types/church';
import { db } from '../utils/storage';
import { CustomBarChart } from './CustomChart';
import { 
  Plus, DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp, CheckCircle, 
  Trash2, Filter, Receipt, FileText, Download, PieChart, Wallet, FolderHeart, PlusCircle
} from 'lucide-react';

interface FinancialManagementProps {
  currentUser: User;
  onRefreshTrail: () => void;
}

export default function FinancialManagement({ currentUser, onRefreshTrail }: FinancialManagementProps) {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterPocket, setFilterPocket] = useState<string>('ALL');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAddPocketOpen, setIsAddPocketOpen] = useState(false);

  // Form states
  const [formType, setFormType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [formCategory, setFormCategory] = useState<'PERSEMBAHAN' | 'UCAPAN_SYUKUR' | 'DONASI' | 'PEMBANGUNAN' | 'SPONSORSHIP' | 'OPERASIONAL' | 'EVENT' | 'SOCIAL' | 'MAINTENANCE' | 'EQUIPMENT' | 'OTHER'>('PERSEMBAHAN');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formReceipt, setFormReceipt] = useState('');
  const [formPocketId, setFormPocketId] = useState('');

  // New Pocket Form State
  const [newPocketName, setNewPocketName] = useState('');
  const [newPocketDesc, setNewPocketDesc] = useState('');

  // Local refresh seed
  const [refreshSeed, setRefreshSeed] = useState(0);

  const transactions = db.getTransactions();
  const approvalsList = db.getApprovals();
  const pockets = db.getPockets(currentUser.churchId);

  const canManageFinance = currentUser.role === 'GEMBALA' || currentUser.role === 'PENGURUS' || currentUser.customMenus?.includes('finance');

  // Calculate individual balance of pockets
  const pocketBalances = pockets.map(pocket => {
    // For general pocket compatibility fallback
    const isGeneral = pocket.id.includes('pocket-gereja') || pocket.id === 'pocket-1-gereja';
    const pocketIncome = transactions
      .filter(t => t.type === 'INCOME' && (t.pocketId === pocket.id || (isGeneral && !t.pocketId)))
      .reduce((sum, t) => sum + t.amount, 0);

    const pocketExpense = transactions
      .filter(t => t.type === 'EXPENSE' && (t.pocketId === pocket.id || (isGeneral && !t.pocketId)))
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      ...pocket,
      income: pocketIncome,
      expense: pocketExpense,
      balance: pocketIncome - pocketExpense
    };
  });

  // Financial calculations
  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;
  const financialHealthRatio = totalIncome > 0 ? (1 - totalExpense / totalIncome) * 100 : 0;

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'ALL' || t.type === filterType;
    const matchesCategory = filterCategory === 'ALL' || t.category === filterCategory;
    
    // Pocket matching with fallback for older transactions to General church pocket
    const isGeneralPocket = filterPocket.includes('pocket-gereja') || filterPocket === 'pocket-1-gereja';
    const matchesPocket = filterPocket === 'ALL' || 
      t.pocketId === filterPocket || 
      (isGeneralPocket && !t.pocketId);
      
    return matchesType && matchesCategory && matchesPocket;
  });

  // Handle transaction creation
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || !formDescription || Number(formAmount) <= 0) {
      alert("Masukkan nominal transaksi dan deskripsi pengeluaran/pemasukan yang valid.");
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (formDate > todayStr) {
      alert("Tanggal transaksi tidak boleh di masa depan.");
      return;
    }

    // Basic regex validation for YYYY-MM-DD format
    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFormatRegex.test(formDate)) {
      alert("Format tanggal salah. Silakan gunakan format YYYY-MM-DD.");
      return;
    }

    const defaultPocket = pockets.find(p => p.isSystem) || pockets[0];
    const resolvedPocketId = formPocketId || (defaultPocket ? defaultPocket.id : '');

    const newTx: Transaction = {
      id: 'tx-' + Date.now(),
      type: formType,
      category: formCategory,
      amount: Number(formAmount),
      date: formDate,
      description: formDescription,
      receipt: formReceipt || undefined,
      pocketId: resolvedPocketId
    };

    db.addTransaction(newTx, currentUser);
    setIsAddOpen(false);
    
    // Reset forms
    setFormAmount('');
    setFormDescription('');
    setFormReceipt('');
    setFormPocketId('');
    setRefreshSeed(prev => prev + 1);
    onRefreshTrail();
  };

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus data transaksi ini secara permanen dari pembukuan?")) {
      db.deleteTransaction(id, currentUser);
      setRefreshSeed(prev => prev + 1);
      onRefreshTrail();
    }
  };

  const handleAddPocketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPocketName.trim()) {
      alert("Nama kantong kas harus diisi.");
      return;
    }
    const slug = 'pocket-' + Date.now();
    db.addPocket({
      id: slug,
      name: newPocketName.trim(),
      description: newPocketDesc.trim() || 'Kantong kas eksternal / pelayanan lokal',
      churchId: currentUser.churchId
    }, currentUser);
    
    setNewPocketName('');
    setNewPocketDesc('');
    setIsAddPocketOpen(false);
    setRefreshSeed(prev => prev + 1);
    onRefreshTrail();
  };

  const handleDeletePocket = (pocketId: string, pocketName: string) => {
    if (confirm(`⚠️ PERINGATAN HAPUS KANTONG: Apakah Anda yakin ingin menghapus kantong kas "${pocketName}"?\n\nSemua transaksi yang saat ini terhubung ke kantong kas ini akan otomatis dialihkan ke "Kas Gereja" agar pelacakan tidak terputus.`)) {
      const ok = db.deletePocket(pocketId, currentUser);
      if (ok) {
        setRefreshSeed(prev => prev + 1);
        onRefreshTrail();
      } else {
        alert("Gagal menghapus kantong kas. Kantong kas sistem/bawaan tidak boleh dihapus.");
      }
    }
  };

  // Prepare chart datasets for monthly incomes and expenses (mock bars representation)
  const chartData = [
    { label: 'Jan', value1: 38000000, value2: 24500000, color1: '#3b82f6', color2: '#ef4444' },
    { label: 'Feb', value1: 42000000, value2: 29000000, color1: '#3b82f6', color2: '#ef4444' },
    { label: 'Mar', value1: 51000000, value2: 32000000, color1: '#3b82f6', color2: '#ef4444' },
    { label: 'Apr', value1: 48000000, value2: 35000000, color1: '#3b82f6', color2: '#ef4444' },
    { label: 'Mei (Berjalan)', value1: totalIncome, value2: totalExpense, color1: '#2563eb', color2: '#dc2626' }
  ];

  // Budget allocations for planning indicator
  const budgetLimits = [
    { name: 'Operasional Bulanan', allocated: 22000000, spent: transactions.filter(t => t.category === 'OPERASIONAL').reduce((sum, t) => sum + t.amount, 0) },
    { name: 'Kegiatan Pemuda / Event', allocated: 15000000, spent: transactions.filter(t => t.category === 'EVENT').reduce((sum, t) => sum + t.amount, 0) },
    { name: 'Sumbangan Sosial & Diakonia', allocated: 8000000, spent: transactions.filter(t => t.category === 'SOCIAL').reduce((sum, t) => sum + t.amount, 0) },
    { name: 'Perawatan Gedung (Maintenance)', allocated: 6000000, spent: transactions.filter(t => t.category === 'MAINTENANCE').reduce((sum, t) => sum + t.amount, 0) }
  ];

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Tanggal,Tipe,Kategori,Deskripsi,Jumlah (IDR)\n";
    transactions.forEach(t => {
      csvContent += `${t.date},${t.type},${t.category},"${t.description.replace(/"/g, '""')}",${t.amount}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Keuangan_MetaConnect_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div key={refreshSeed} className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Sistem Keuangan & Anggaran Terbuka</h2>
          <p className="text-sm text-slate-500">Transparansi pemasukan, pengeluaran kas, alokasi anggaran belanja departemen, serta verifikasi tanda terima faktur.</p>
        </div>

        <div className="flex space-x-2 shrink-0">
          <button 
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border rounded-lg text-xs font-semibold text-slate-600 transition"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Unduh Laporan (.csv)</span>
          </button>
          
          {canManageFinance && (
            <button 
              onClick={() => setIsAddOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Input Transaksi</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Income */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pemasukan Kas</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg"><ArrowUpRight className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-900 font-sans">Rp {totalIncome.toLocaleString('id-ID')},-</h3>
            <p className="text-[10px] text-slate-400 font-normal mt-0.5">Akumulasi persembahan & donatur Mei</p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pengeluaran Kas</span>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-lg"><ArrowDownRight className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-900 font-sans">Rp {totalExpense.toLocaleString('id-ID')},-</h3>
            <p className="text-[10px] text-slate-400 font-normal mt-0.5">Operasional, sosial, & alat terserap</p>
          </div>
        </div>

        {/* Current Net Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Saldo Bersih (Net)</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg"><TrendingUp className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <h3 className={`text-xl font-extrabold font-sans ${netBalance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              Rp {netBalance.toLocaleString('id-ID')},-
            </h3>
            <p className="text-[10px] text-slate-400 font-normal mt-0.5">Surplus bersih yang siap dialokasikan</p>
          </div>
        </div>

        {/* Financial health Gauge */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Kesehatan Keuangan</span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg"><CheckCircle className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline space-x-1">
              <h3 className="text-xl font-extrabold text-indigo-950 font-sans">{financialHealthRatio.toFixed(0)}%</h3>
              <span className="text-xs font-semibold text-indigo-600">Terjaga</span>
            </div>
            {/* Simple progress bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full ${financialHealthRatio > 60 ? 'bg-indigo-600' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(Math.max(financialHealthRatio, 5), 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION KANTONG KAS (FINANCIAL POCKETS) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-3xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center space-x-1.5">
              <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Kantong Alokasi Kas Pelayanan ({pockets.length})</span>
            </h3>
            <p className="text-[11px] text-slate-500">Saldo dipisahkan per kategori kantong kas agar dana pelayanan pembangunan / sosial tetap terarah.</p>
          </div>
          {canManageFinance && (
            <button
              onClick={() => setIsAddPocketOpen(true)}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition flex items-center space-x-1 border border-emerald-200 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Tambah Kantong Baru</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pocketBalances.map((pocket) => {
            const isSystem = pocket.isSystem;
            const balanceColor = pocket.balance < 0 ? 'text-rose-600' : 'text-slate-900';
            const isActive = filterPocket === pocket.id;
            
            return (
              <div 
                key={pocket.id}
                onClick={() => setFilterPocket(isActive ? 'ALL' : pocket.id)}
                className={`relative p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                  isActive 
                    ? 'border-emerald-600 bg-emerald-50/25 ring-1 ring-emerald-600/50 shadow-xs' 
                    : 'border-slate-200 bg-slate-50/45 hover:bg-slate-50/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {isSystem ? '🟢 KANTONG SISTEM' : '🟡 KANTONG LOKAL'}
                    </span>
                    
                    {!isSystem && canManageFinance && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePocket(pocket.id, pocket.name);
                        }}
                        className="p-1 -mr-1 -mt-1 text-slate-450 hover:text-rose-600 transition"
                        title="Hapus Kantong Kas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <h4 className="text-xs font-extrabold text-slate-800 mt-1 uppercase tracking-tight flex items-center space-x-1.5">
                    {pocket.id.includes('pembangunan') && <FolderHeart className="w-3.5 h-3.5 text-blue-500" />}
                    {pocket.id.includes('sosial') && <FolderHeart className="w-3.5 h-3.5 text-rose-500" />}
                    {!pocket.id.includes('pembangunan') && !pocket.id.includes('sosial') && <Wallet className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{pocket.name}</span>
                  </h4>
                  
                  <p className="text-[10px] text-slate-500 font-light mt-1 pl-5 line-clamp-2 h-7" title={pocket.description}>
                    {pocket.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/50 pl-5">
                  <span className="block text-[9px] font-bold text-slate-400">SALDO BERJALAN</span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className={`text-sm font-extrabold font-mono ${balanceColor}`}>
                      Rp {pocket.balance.toLocaleString('id-ID')},-
                    </span>
                    {isActive && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-sm">MEMFILTER</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {canManageFinance && (
            <div 
              onClick={() => setIsAddPocketOpen(true)}
              className="p-4 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/50 cursor-pointer flex flex-col items-center justify-center text-center space-y-1 transition min-h-[120px]"
            >
              <PlusCircle className="w-6 h-6 text-slate-400" />
              <span className="text-xs font-extrabold text-slate-600">Tambah Kantong Baru</span>
              <span className="text-[9px] text-slate-400">Kas khusus sesuai kebutuhan lokal jemaat</span>
            </div>
          )}
        </div>
      </div>

      {/* Charts panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cashflow visual comparison columns (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Tren Kas Bulanan (Pemasukan vs Pengeluaran)</h3>
              <p className="text-[11px] text-slate-400 font-normal">Komparasi data historis 5 bulan terakhir.</p>
            </div>
            
            <div className="flex space-x-3 text-[10px] font-semibold text-slate-500">
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-xs bg-blue-500 mr-1.5"></span>Pemasukan</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-xs bg-rose-500 mr-1.5"></span>Pengeluaran</span>
            </div>
          </div>

          <div className="pt-2">
            <CustomBarChart data={chartData} label1="Pemasukan" label2="Pengeluaran" height={190} />
          </div>
        </div>

        {/* Budget limit monitoring & alert indicators */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Monitoring Anggaran Berjalan (Budget vs Spent)</h3>
            <p className="text-[11px] text-slate-400">Kejelasan penyerapan sisa anggaran divisi gereja.</p>
          </div>

          <div className="space-y-3 pt-2">
            {budgetLimits.map((b, idx) => {
              const pct = b.allocated > 0 ? (b.spent / b.allocated) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{b.name}</span>
                    <span className="font-mono text-slate-400 font-bold">{pct.toFixed(0)}%</span>
                  </div>
                  
                  {/* Progress lines */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${pct > 95 ? 'bg-rose-600' : pct > 75 ? 'bg-amber-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Terpakai: Rp {b.spent.toLocaleString('id-ID')},-</span>
                    <span>Limit: Rp {b.allocated.toLocaleString('id-ID')},-</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ledger transactions list */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mutasi Buku Kas / Ledger Terdaftar ({filteredTransactions.length})</span>
          
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="INCOME">Pemasukan (Masuk)</option>
              <option value="EXPENSE">Pengeluaran (Keluar)</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              {/* Income categories */}
              <option value="PERSEMBAHAN">Persembahan Ibadah</option>
              <option value="UCAPAN_SYUKUR">Syukur Jemaat</option>
              <option value="DONASI">Donasi Pihak Ketiga</option>
              <option value="PEMBANGUNAN">Pembangunan Fisik</option>
              <option value="SPONSORSHIP">Sponsorship Event</option>
              {/* Expense categories */}
              <option value="OPERASIONAL">Alat Operasional</option>
              <option value="EVENT">Biaya Ibadah/Camp</option>
              <option value="SOCIAL">Bantuan Diakonia</option>
              <option value="MAINTENANCE">Perawatan Gedung</option>
              <option value="EQUIPMENT">Sound & Multimedia</option>
            </select>

            <select
              value={filterPocket}
              onChange={(e) => setFilterPocket(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">Semua Kantong Kas</option>
              {pockets.map(pocket => (
                <option key={pocket.id} value={pocket.id}>{pocket.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3">Kantong Kas</th>
                <th className="px-5 py-3">Deskripsi Transaksi</th>
                <th className="px-5 py-3 text-right">Jumlah</th>
                <th className="px-5 py-3">Lampiran / Attachment</th>
                <th className="px-5 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400 italic">Tidak ada rincian mutasi kas masuk/keluar.</td>
                </tr>
              ) : (
                filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-mono text-slate-400">{t.date}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {t.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {(() => {
                        const pk = pockets.find(p => p.id === t.pocketId);
                        const fallbackPocketName = pockets.find(p => p.id.includes('pocket-gereja') || p.id === 'pocket-1-gereja')?.name || 'Kas Gereja';
                        return (
                          <span className="px-2 py-0.5 rounded bg-slate-100/80 text-slate-700 border border-slate-200 font-bold text-[10px]">
                            {pk ? pk.name : fallbackPocketName}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">{t.description}</td>
                    <td className={`px-5 py-3.5 text-right font-bold text-sm ${t.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {t.type === 'INCOME' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')},-
                    </td>
                    <td className="px-5 py-3.5">
                      {t.receipt ? (
                        <div className="inline-flex items-center space-x-1.5 bg-blue-50 text-blue-800 border border-blue-100 px-2 py-1 rounded text-[11px] font-bold shadow-3xs" title={t.receipt}>
                          <Receipt className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate max-w-[130px]">📎 {t.receipt}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic font-light">Tanpa Lampiran</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {canManageFinance && (
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic input transaction dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden border shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Form Pemasukan & Pengeluaran Kas</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">JENIS TRANSAKSI *</label>
                  <select 
                    value={formType}
                    onChange={(e) => {
                      const type = e.target.value as 'INCOME' | 'EXPENSE';
                      setFormType(type);
                      setFormCategory(type === 'INCOME' ? 'PERSEMBAHAN' : 'OPERASIONAL');
                    }}
                    className="w-full p-2.5 border rounded outline-none"
                  >
                    <option value="INCOME">PEMASUKAN (Arah Kas Masuk)</option>
                    <option value="EXPENSE">PENGELUARAN (Arah Anggaran Keluar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">KATEGORI *</label>
                  {formType === 'INCOME' ? (
                    <select 
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full p-2.5 border rounded outline-none"
                    >
                      <option value="PERSEMBAHAN">Persembahan Kebaktian</option>
                      <option value="UCAPAN_SYUKUR">Syukur / Persepuluhan</option>
                      <option value="DONASI">Donasi Eksternal</option>
                      <option value="PEMBANGUNAN">Dana Pembangunan Lift/Gedung</option>
                      <option value="SPONSORSHIP">Sponsorship Acara Raya</option>
                      <option value="OTHER">Lain - Lain (Pemasukan)</option>
                    </select>
                  ) : (
                    <select 
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full p-2.5 border rounded outline-none"
                    >
                      <option value="OPERASIONAL">Operasional Listrik/Air/Tamu</option>
                      <option value="EVENT">Event / Ibadah / Retreat Camp</option>
                      <option value="SOCIAL">Bantuan Sosial Prasejahtera</option>
                      <option value="MAINTENANCE">Perawatan AC/Gedung Rutin</option>
                      <option value="EQUIPMENT">Inventaris Alat Multimedia/Mixer</option>
                      <option value="OTHER">Lain - Lain (Pengeluaran)</option>
                    </select>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">KANTONG KAS TARGET *</label>
                  <select 
                    value={formPocketId}
                    onChange={(e) => setFormPocketId(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none"
                    required
                  >
                    <option value="">-- Pilih Kantong Kas --</option>
                    {pockets.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-0.5">Aliran pemasukan/pengeluaran kas akan dicatat khusus pada kantong ini.</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">JUMLAH TRANSAKSI (IDR) *</label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    placeholder="Contoh: 15000000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none focus:ring-1 focus:ring-slate-950"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">DESKRIPSI RINCI TRANSAKSI *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Contoh: Persembahan Syukur HUT Pernikahan Keluarga..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">TANGGAL TRANSAKSI *</label>
                  <input 
                    type="date" 
                    required 
                    max={new Date().toISOString().split('T')[0]}
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">Format wajib: YYYY-MM-DD (Maksimal hari ini)</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">LAMPIRAN / ATTACHMENT (OPSIONAL)</label>
                  <input 
                    type="text" 
                    placeholder="Ketik nama lampiran (contoh: Kuitansi_PLN_Mei.pdf)"
                    value={formReceipt}
                    onChange={(e) => setFormReceipt(e.target.value)}
                    className="w-full p-2.5 border rounded outline-none focus:ring-1 focus:ring-slate-950"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Ketik nama/keterangan lampiran bukti fisik jika ada. Lampiran ini bersifat opsional.</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border hover:bg-slate-50 font-semibold text-slate-600 rounded"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 transition"
                >
                  Masukkan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic input pocket dialog */}
      {isAddPocketOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden border shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Buat Kantong Kas Baru</span>
              </h3>
              <button onClick={() => setIsAddPocketOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            <form onSubmit={handleAddPocketSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">NAMA KANTONG KAS *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Kas Diakonia, Kas Pemuda, dll"
                  value={newPocketName}
                  onChange={(e) => setNewPocketName(e.target.value)}
                  className="w-full p-2.5 border rounded outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Gunakan nama yang jelas seperti 'Kas Bakti Sosial Jemaat'.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">DESKRIPSI DAN KEPERLUAN *</label>
                <textarea 
                  required 
                  placeholder="Uraikan peruntukan anggaran dari kantong kas baru ini..."
                  value={newPocketDesc}
                  onChange={(e) => setNewPocketDesc(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 border rounded outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsAddPocketOpen(false)}
                  className="px-4 py-2 border hover:bg-slate-50 font-semibold text-slate-600 rounded"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold transition"
                >
                  Buat Kantong
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
