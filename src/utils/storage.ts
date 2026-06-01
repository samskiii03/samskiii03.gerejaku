/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Church, User, Member, Division, ApprovalRequest, 
  Transaction, Task, SundaySchoolKid, SundaySchoolClass, AuditTrail,
  ServiceType, ServiceSchedule, FinancialPocket, CustomApprovalWorkflow
} from '../types/church';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { dbFirestore } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function sanitizeData(data: any): any {
  if (data === undefined) {
    return null;
  }
  if (data === null) {
    return null;
  }
  if (Array.isArray(data)) {
    return data.map(v => sanitizeData(v));
  }
  if (typeof data === 'object') {
    const clean: any = {};
    for (const key of Object.keys(data)) {
      if (data[key] !== undefined) {
        clean[key] = sanitizeData(data[key]);
      }
    }
    return clean;
  }
  return data;
}

// Storage keys
const DB_MODE_KEY = 'metaconnect_db_mode'; // 'DEMO' | 'REAL'
const STATE_CHURCH_KEY = 'metaconnect_state_church';
export const USER_SESSION_KEY = 'metaconnect_user_session';

// Real empty layouts vs Demo rich datasets
const MOCK_CHURCHES: Church[] = [
  {
    id: 'c1',
    name: 'Meta Connect Community Church',
    address: 'Jl. Boulevard Raya No. 45, Kelapa Gading',
    city: 'Jakarta Utara',
    province: 'DKI Jakarta',
    phone: '021-4587123',
    email: 'contact@metaconnect.org',
    status: 'VERIFIED',
    logo: 'https://images.unsplash.com/photo-1548625361-155deee2614a?w=100&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&auto=format&fit=crop&q=80',
    themeColor: '#0f172a' // Slate 900
  },
  {
    id: 'c2',
    name: 'Kalam Hidup Grace Center',
    address: 'Jl. Jendral Sudirman Kav 21',
    city: 'Bandung',
    province: 'Jawa Barat',
    phone: '022-6014499',
    email: 'office@kalamhidupbandung.or.id',
    status: 'PENDING',
    logo: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=100&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=800&auto=format&fit=crop&q=80',
    themeColor: '#1e3a8a' // Navy
  },
  {
    id: 'c3',
    name: 'Gereja Bethany Sektor Timur',
    address: 'Kawasan Bisnis CBD Blok C3',
    city: 'Surabaya',
    province: 'Jawa Timur',
    phone: '031-8902234',
    email: 'info@bethanyst.org',
    status: 'UNDER_REVIEW',
    logo: '',
    banner: '',
    themeColor: '#1b3b22'
  }
];

const MOCK_USERS: User[] = [
  {
    id: 'u-super',
    username: 'superadmin',
    fullName: 'Pdt. Dr. Andreas Prasetya (Pusat)',
    email: 'pdt.andreas@pusat-metaconnect.org',
    role: 'SUPER_ADMIN',
    churchId: 'c1',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'u-gembala',
    username: 'gembala',
    fullName: 'Pdt. Dr. Thomas Aris, M.Th.',
    email: 'thomas.aris@metaconnect.org',
    role: 'GEMBALA',
    churchId: 'c1',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'u-pengurus',
    username: 'pengurus',
    fullName: 'Bpk. Yohanes Siregar',
    email: 'yohanes.s@metaconnect.org',
    role: 'PENGURUS',
    churchId: 'c1',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'u-kadiv',
    username: 'kadiv',
    fullName: 'Ibu Listya Chandra',
    email: 'listya@metaconnect.org',
    role: 'KEPALA_DIVISI',
    churchId: 'c1',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    divisionId: 'div-school'
  },
  {
    id: 'u-pelayan',
    username: 'pelayan',
    fullName: 'Sdr. Timothy Lukinto',
    email: 'timothy.l@metaconnect.org',
    role: 'PELAYAN',
    churchId: 'c1',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
  }
];

const MOCK_DIVISIONS: Division[] = [
  {
    id: 'div-musik',
    name: 'Musik & Praise Worship',
    description: 'Bertanggung jawab atas jalannya puji-pujian ibadah raya.',
    leadId: 'm-denny',
    leadName: 'Denny Kurniawan',
    subDivisions: ['Pemain Musik', 'Singer', 'Worship Leader'],
    customRoles: ['Music Director', 'Vocal Coach', 'Coordinator'],
    customPermissions: ['Jadwalkan Latihan', 'Pilih Lagu', 'Absensi Pelayan'],
    workflow: 'Pengisian jadwal oleh Koordinator -> Approval Gembala'
  },
  {
    id: 'div-media',
    name: 'Multimedia & IT',
    description: 'Menangani sound system, live streaming, LCD proyektor, dan website.',
    leadId: 'm-robby',
    leadName: 'Robby Hartono',
    subDivisions: ['Soundman', 'Camera Operator', 'Slides & Broadcast'],
    customRoles: ['Director', 'Sound Specialist', 'Broadcaster'],
    customPermissions: ['Urus Inventaris', 'Setting Alat', 'Edit Slide Ibadah'],
    workflow: 'Request kebutuhan -> Approval Gembala'
  },
  {
    id: 'div-school',
    name: 'Sekolah Minggu (Kids Ministry)',
    description: 'Pengajaran rohani untuk anak-anak balita hingga sekolah dasar.',
    leadId: 'm-listya',
    leadName: 'Ibu Listya Chandra',
    subDivisions: ['Kelas Toddler', 'Kelas Pratama', 'Kelas Remaja'],
    customRoles: ['Guru Utama', 'Guru Pendamping', 'Liturgis Cilik'],
    customPermissions: ['Input Nilai Alkitab', 'Upload Kurikulum', 'Kontak Orangtua'],
    workflow: 'Kurikulum Mingguan disusun -> Diketahui Gembala'
  }
];

const MOCK_MEMBERS: Member[] = [
  {
    id: 'm-denny',
    name: 'Denny Kurniawan',
    nickname: 'Denny',
    gender: 'L',
    birthPlace: 'Semarang',
    birthDate: '1995-12-10',
    age: 30,
    maritalStatus: 'MENIKAH',
    spouseName: 'Angelina Pratama',
    childrenNames: ['Bryan Kurniawan'],
    address: 'Komp. Kelapa Gading Permai Blok RT 05/12',
    sector: 'Sektor Utara I',
    phone: '08129481232',
    email: 'denny.k@gmail.com',
    education: 'S1 Teknik Informatika',
    occupation: 'Software Team Lead',
    joinDate: '2021-04-15',
    baptismStatus: 'YA',
    ministryStatus: 'YA',
    talents: ['Gitaris', 'Kepemimpinan', 'Aransemen Musik'],
    category: 'INTI', // Anggota Inti / Sangat aktif
    joinYear: 2021,
    activityScore: 94,
    pastoralNotes: [
      {
        id: 'n-1',
        date: '2026-03-20',
        author: 'Pdt. Thomas Aris',
        type: 'COUNSELING',
        notes: 'Denny siap untuk direkomendasikan mengikuti Sekolah Kepemimpinan (Leadership Training). Memiliki potensi membimbing divisi musik.',
        status: 'STABIL'
      }
    ],
    attachments: ['KTP_Denny.jpg', 'Sertifikat_Baptis.pdf'],
    attendanceHistory: { '2026-05-24': true, '2026-05-17': true, '2026-05-10': true, '2026-05-03': true }
  },
  {
    id: 'm-angelina',
    name: 'Angelina Pratama',
    nickname: 'Angel',
    gender: 'P',
    birthPlace: 'Jakarta',
    birthDate: '1996-08-22',
    age: 29,
    maritalStatus: 'MENIKAH',
    spouseName: 'Denny Kurniawan',
    childrenNames: ['Bryan Kurniawan'],
    address: 'Komp. Kelapa Gading Permai Blok RT 05/12',
    sector: 'Sektor Utara I',
    phone: '08172938128',
    email: 'angel.pratama@gmail.com',
    education: 'S1 Accounting',
    occupation: 'Financial Analyst',
    joinDate: '2021-06-10',
    baptismStatus: 'YA',
    ministryStatus: 'YA',
    talents: ['Penyanyi (Singer)', 'Keuangan', 'Pamong Anak'],
    category: 'AKTIF',
    joinYear: 2021,
    activityScore: 88,
    pastoralNotes: [],
    attachments: ['Sertifikasi_Bendahara.pdf'],
    attendanceHistory: { '2026-05-24': true, '2026-05-17': false, '2026-05-10': true, '2026-05-03': true }
  },
  {
    id: 'm-robby',
    name: 'Robby Hartono',
    nickname: 'Robby',
    gender: 'L',
    birthPlace: 'Bandung',
    birthDate: '1990-03-14',
    age: 36,
    maritalStatus: 'BELUM_MENIKAH',
    address: 'Apartemen Gading Nias, Tower Emerald 12-A',
    sector: 'Sektor Pusat',
    phone: '08139410294',
    email: 'robby.hartono@media.com',
    education: 'D3 Broadcasting',
    occupation: 'Video Editor Freelance',
    joinDate: '2022-01-08',
    baptismStatus: 'YA',
    ministryStatus: 'YA',
    talents: ['Sound Engineering', 'Videography', 'Photoshop'],
    category: 'KURANG_AKTIF', // Mulai Menurun (Kehadiran tidak stabil)
    joinYear: 2022,
    activityScore: 55,
    pastoralNotes: [
      {
        id: 'n-2',
        date: '2026-05-15',
        author: 'Bpk. Yohanes Siregar',
        type: 'FOLLOW_UP',
        notes: 'Kehadiran Robby di komsel menurun dikarenakan tenggat pekerjaan freelance yang padat di akhir pekan. Perlu dukungan doa.',
        status: 'DA_PEMBINAAN'
      }
    ],
    attachments: [],
    attendanceHistory: { '2026-05-24': false, '2026-05-17': false, '2026-05-10': true, '2026-05-03': false }
  },
  {
    id: 'm-maya',
    name: 'Maya Wijaya',
    nickname: 'Maya',
    gender: 'P',
    birthPlace: 'Surabaya',
    birthDate: '1991-05-11',
    age: 35,
    maritalStatus: 'BELUM_MENIKAH',
    address: 'Jl. Janur Asri IV No. 12, Kelapa Gading',
    sector: 'Sektor Timur',
    phone: '08569102934',
    email: 'maya.wijaya91@yahoo.com',
    education: 'S1 Psikologi',
    occupation: 'HR Recruiter',
    joinDate: '2023-09-01',
    baptismStatus: 'YA',
    ministryStatus: 'TIDAK',
    talents: ['Konseling', 'Bicara Publik'],
    category: 'PASIF', // Tidak hadir 3 minggu++ berturut-turut, Perlu Perhatian
    joinYear: 2023,
    activityScore: 32,
    pastoralNotes: [
      {
        id: 'n-3',
        date: '2026-04-28',
        author: 'Pdt. Thomas Aris',
        type: 'VISIT',
        notes: 'Sudah tidak terlihat di ibadah minggu hampir 1 bulan. Hubungi via WA tidak merespon aktif. Direkomendasikan kunjungan pastoral darurat.',
        status: 'PERLU_KUNJUNGAN'
      }
    ],
    attachments: [],
    attendanceHistory: { '2026-05-24': false, '2026-05-17': false, '2026-05-10': false, '2026-05-03': false }
  },
  {
    id: 'm-kezia',
    name: 'Kezia Olivia',
    nickname: 'Kezia',
    gender: 'P',
    birthPlace: 'Yogyakarta',
    birthDate: '2001-11-05',
    age: 24,
    maritalStatus: 'BELUM_MENIKAH',
    address: 'Kost Graha Putri, Jl. Pegangsaan Dua No. 19',
    sector: 'Sektor Timur',
    phone: '08219481023',
    email: 'kezia_olivia@gmail.com',
    education: 'S1 Management',
    occupation: 'Fresh Graduate',
    joinDate: '2026-05-10', // Baru join 2 minggu
    baptismStatus: 'YA',
    ministryStatus: 'TIDAK',
    talents: ['Penyanyi', 'Pramubakti'],
    category: 'BARU', // Jemaat baru, belum tersentuh, auto action
    joinYear: 2026,
    activityScore: 100,
    pastoralNotes: [],
    attachments: [],
    attendanceHistory: { '2026-05-24': true, '2026-05-17': true }
  },
  {
    id: 'm-suryati',
    name: 'Oma Suryati Margaretha',
    nickname: 'Oma Suryati',
    gender: 'P',
    birthPlace: 'Semarang',
    birthDate: '1954-02-18',
    age: 72,
    maritalStatus: 'JANDA_DUDA',
    address: 'Jl. Kelapa Cengkir Raya FH2 No. 8',
    sector: 'Sektor Barat',
    phone: '08129048128',
    email: 'suryati.oma@gmail.com',
    education: 'SMA',
    occupation: 'Pensiunan Pekerja Sosial',
    joinDate: '2015-01-20',
    baptismStatus: 'YA',
    ministryStatus: 'TIDAK',
    talents: ['Doa Syafaat', 'Memasak'],
    category: 'LANSIA',
    joinYear: 2015,
    activityScore: 91,
    pastoralNotes: [
      {
        id: 'n-4',
        date: '2026-05-02',
        author: 'Pdt. Thomas Aris',
        type: 'VISIT',
        notes: 'Kunjungan rutin Oma Suryati, kondisi kesehatan fisik menurun namun iman sangat teguh. Oma memohon doa khusus untuk kestabilan tensi darah.',
        status: 'STABIL'
      }
    ],
    attachments: [],
    attendanceHistory: { '2026-05-24': true, '2026-05-17': true, '2026-05-10': true, '2026-05-03': true }
  },
  {
    id: 'm-samuel',
    name: 'Samuel Christian Baskoro',
    nickname: 'Samuel',
    gender: 'L',
    birthPlace: 'Jakarta',
    birthDate: '2009-07-28',
    age: 16,
    maritalStatus: 'BELUM_MENIKAH',
    address: 'Perumahan Gading Residence Kav C-5',
    sector: 'Sektor Utara I',
    phone: '08781944810',
    email: 'sammy.baskoro@gmail.com',
    education: 'SMA Kelas XI',
    occupation: 'Pelajar',
    joinDate: '2022-10-10',
    baptismStatus: 'TIDAK',
    ministryStatus: 'YA',
    talents: ['Drummer', 'Gaming', 'Sound System'],
    category: 'REMAJA',
    joinYear: 2022,
    activityScore: 92,
    pastoralNotes: [],
    attachments: [],
    attendanceHistory: { '2026-05-24': true, '2026-05-17': true, '2026-05-10': true, '2026-05-03': true }
  },
  {
    id: 'm-listya',
    name: 'Ibu Listya Chandra',
    nickname: 'Ibu Listya',
    gender: 'P',
    birthPlace: 'Surakarta',
    birthDate: '1981-04-30',
    age: 45,
    maritalStatus: 'MENIKAH',
    spouseName: 'Ir. Chandra Wibowo',
    childrenNames: ['Siane Wibowo', 'Matthew Wibowo'],
    address: 'Jl. Kelapa Hybrida III Blok LB No. 19',
    sector: 'Sektor Timur',
    phone: '08121122334',
    email: 'listya.chandra@outlook.com',
    education: 'S1 Sastra Inggris',
    occupation: 'Ibu Rumah Tangga / Guru Freelance',
    joinDate: '2018-02-14',
    baptismStatus: 'YA',
    ministryStatus: 'YA',
    talents: ['Mengajar Anak', 'Bercerita', 'Dekorasi'],
    category: 'INTI',
    joinYear: 2018,
    activityScore: 96,
    pastoralNotes: [],
    attachments: [],
    attendanceHistory: { '2026-05-24': true, '2026-05-17': true }
  }
];

const MOCK_APPROVALS: ApprovalRequest[] = [
  {
    id: 'req-1',
    requesterId: 'u-pengurus',
    requesterName: 'Bpk. Yohanes Siregar',
    type: 'FINANCE',
    title: 'Pengadaan Mixer Sound System Digital Behringer X32',
    description: 'Menggantikan mixer analog lama di Aula Remaja-Pemuda yang sering mengalami noise grounding parah.',
    amount: 32500000,
    date: '2026-05-24',
    status: 'SUBMITTED',
    attachments: ['Quotation_Behringer_X32_PrimaAudio.pdf'],
    revisionNote: '',
    history: []
  },
  {
    id: 'req-2',
    requesterId: 'u-kadiv',
    requesterName: 'Ibu Listya Chandra',
    type: 'EVENT',
    title: 'Camp Kebaktian Padang Anak Sekolah Minggu 2026',
    description: 'Kegiatan luar ruangan di Kebun Raya Bogor untuk mengenalkan ciptaan Tuhan bagi 45 anak Sekolah Minggu.',
    amount: 12000000,
    date: '2026-05-20',
    status: 'APPROVED',
    attachments: ['Proposal_KPA_Sekolah_Minggu_2026.pdf'],
    revisionNote: 'Pdt. Thomas Aris: Harap pastikan jumlah pembina pendamping memadai (minimal rasio 1:5 anak).',
    history: [
      {
        id: 'aud-a1',
        timestamp: '2026-05-21T09:12:00Z',
        userId: 'u-gembala',
        userName: 'Pdt. Dr. Thomas Aris, M.Th.',
        action: 'APPROVE',
        details: 'Menyetujui proposal Camp Kebaktian Padang dengan catatan pembina.'
      }
    ]
  },
  {
    id: 'req-3',
    requesterId: 'u-pelayan',
    requesterName: 'Sdr. Timothy Lukinto',
    type: 'VISIT',
    title: 'Kunjungan Pastoral Jemaat Sakit: Ibu Hanna (Kanker)',
    description: 'Ibu Hanna didiagnosa stadium lanjut dan dalam kemoterapi keras di RS Gading Pluit. Memohon dukungan Gembala untuk visitasi.',
    date: '2026-05-26',
    status: 'ON_PROGRESS',
    history: [
      {
        id: 'aud-a2',
        timestamp: '2026-05-26T14:30:00Z',
        userId: 'u-gembala',
        userName: 'Pdt. Dr. Thomas Aris, M.Th.',
        action: 'UPDATE_STATUS',
        details: 'Merubah status visitasi menjadi On Progress; Terjadwal kunjungan Kamis sore.'
      }
    ]
  }
];

const MOCK_POCKETS: FinancialPocket[] = [
  { id: 'pocket-1-gereja', name: 'Kas Gereja', description: 'Kas operasional umum gereja untuk pelayanan sehari-hari', churchId: 'c1', isSystem: true },
  { id: 'pocket-1-pembangunan', name: 'Kas Pembangunan', description: 'Dana khusus pembangunan gedung, perluasan, & fasilitas gereja', churchId: 'c1', isSystem: true },
  { id: 'pocket-1-sosial', name: 'Kas Sosial', description: 'Dana bantuan sosial, diakonia, kemasyarakatan & jemaat prasejahtera', churchId: 'c1', isSystem: true },
  { id: 'pocket-2-gereja', name: 'Kas Gereja', description: 'Kas operasional umum gereja untuk pelayanan sehari-hari', churchId: 'c2', isSystem: true },
  { id: 'pocket-2-pembangunan', name: 'Kas Pembangunan', description: 'Dana khusus pembangunan gedung, perluasan, & fasilitas gereja', churchId: 'c2', isSystem: true }
];

const MOCK_FINANCE: Transaction[] = [
  // Income 2026 May
  { id: 'tx-1', type: 'INCOME', category: 'PERSEMBAHAN', amount: 48500000, date: '2026-05-03', description: 'Persembahan Ibadah Raya Minggu I (Sesi 1 & Sesi 2)', pocketId: 'pocket-1-gereja' },
  { id: 'tx-2', type: 'INCOME', category: 'UCAPAN_SYUKUR', amount: 15000000, date: '2026-05-05', description: 'Persembahan Syukur HUT Pernikahan Keluarga Budi', pocketId: 'pocket-1-gereja' },
  { id: 'tx-3', type: 'INCOME', category: 'DONASI', amount: 25000000, date: '2026-05-10', description: 'Sumbangan pembangunan lift gereja dari donatur anonim', pocketId: 'pocket-1-pembangunan' },
  { id: 'tx-4', type: 'INCOME', category: 'PERSEMBAHAN', amount: 51200000, date: '2026-05-10', description: 'Persembahan Ibadah Raya Minggu II', pocketId: 'pocket-1-gereja' },
  { id: 'tx-5', type: 'INCOME', category: 'PERSEMBAHAN', amount: 49400000, date: '2026-05-17', description: 'Persembahan Ibadah Raya Minggu III', pocketId: 'pocket-1-gereja' },
  { id: 'tx-6', type: 'INCOME', category: 'UCAPAN_SYUKUR', amount: 8000000, date: '2026-05-20', description: 'Persembahan persepuluhan jemaat', pocketId: 'pocket-1-gereja' },
  { id: 'tx-7', type: 'INCOME', category: 'PERSEMBAHAN', amount: 52300000, date: '2026-05-24', description: 'Persembahan Ibadah Raya Minggu IV', pocketId: 'pocket-1-gereja' },

  // Expenses 2026 May
  { id: 'tx-8', type: 'EXPENSE', category: 'OPERASIONAL', amount: 18500000, date: '2026-05-01', description: 'Tagihan Listrik PLN 3 Pasas, AC Sentral, dan PDAM Mei', pocketId: 'pocket-1-gereja' },
  { id: 'tx-9', type: 'EXPENSE', category: 'MAINTENANCE', amount: 4200000, date: '2026-05-04', description: 'Fogging lingkungan gereja & pembersihan filter AC aula', pocketId: 'pocket-1-gereja' },
  { id: 'tx-10', type: 'EXPENSE', category: 'SOCIAL', amount: 6500000, date: '2026-05-12', description: 'Subsidi sembako bahan pokok untuk 40 jemaat prasejahtera', pocketId: 'pocket-1-sosial' },
  { id: 'tx-11', type: 'EXPENSE', category: 'OPERASIONAL', amount: 12000000, date: '2026-05-15', description: 'Uang transport pelayan mimbar tamu & pembicara', pocketId: 'pocket-1-gereja' },
  { id: 'tx-12', type: 'EXPENSE', category: 'EVENT', amount: 12000000, date: '2026-05-21', description: 'Camp Kebaktian Padang Anak Sekolah Minggu 2026 (Linked ID req-2)', approvalId: 'req-2', pocketId: 'pocket-1-gereja' }
];

const MOCK_TASKS: Task[] = [
  {
    id: 't-1',
    boardId: 'TODO',
    title: 'Audit Kelistrikan Sound System',
    description: 'Menemukan titik grounding bermasalah di Aula Remaja-Pemuda yang memicu dengung.',
    assignedTo: 'm-robby',
    assignedName: 'Robby Hartono',
    deadline: '2026-06-05',
    progress: 33,
    checklists: [
      { id: 'tc-1', text: 'Uji kabel XLR panggung utama', done: true },
      { id: 'tc-2', text: 'Verifikasi pembagian daya genset', done: false },
      { id: 'tc-3', text: 'Pemasangan ground isolator', done: false }
    ]
  },
  {
    id: 't-2',
    boardId: 'DOING',
    title: 'Pendaftaran Peserta Camp Sekolah Minggu',
    description: 'Mendata detail anak-anak, riwayat alergi, dan kontak orang tua.',
    assignedTo: 'm-listya',
    assignedName: 'Ibu Listya Chandra',
    deadline: '2026-05-30',
    progress: 50,
    checklists: [
      { id: 'tc-4', text: 'Pengumpulan formulir cetak jemaat', done: true },
      { id: 'tc-5', text: 'Rekapitulasi riwayat alergi obat/makanan', done: false }
    ]
  },
  {
    id: 't-3',
    boardId: 'DONE',
    title: 'Briefing Pelayan Ibadah Kenaikan Isa Almasih',
    description: 'Koordinasi teknis penempatan kamera live streaming dan run down acara.',
    assignedTo: 'm-denny',
    assignedName: 'Denny Kurniawan',
    deadline: '2026-05-14',
    progress: 100,
    checklists: [
      { id: 'tc-6', text: 'Pembagian posisi mic singer', done: true },
      { id: 'tc-7', text: 'Simulasi transisi slide khotbah', done: true },
      { id: 'tc-8', text: 'Doa persidangan pelayan', done: true }
    ]
  }
];

const MOCK_KIDS: SundaySchoolKid[] = [
  {
    id: 'k-1',
    name: 'Bryan Kurniawan',
    birthDate: '2018-05-10',
    age: 8,
    classId: 'cl-pratama',
    parentName: 'Denny Kurniawan',
    parentPhone: '08129481232',
    attendance: { '2026-05-24': true, '2026-05-17': true, '2026-05-10': true },
    talents: ['Mewarnai', 'Hapalan Alkitab'],
    parentNote: ' Bryan alergi parah kacang tanah. Mohon didampingi saat snack break.'
  },
  {
    id: 'k-2',
    name: 'Siane Wibowo',
    birthDate: '2016-11-20',
    age: 9,
    classId: 'cl-pratama',
    parentName: 'Ibu Listya Chandra',
    parentPhone: '08121122334',
    attendance: { '2026-05-24': true, '2026-05-17': true },
    talents: ['Bernyanyi', 'Sains Cilik'],
    parentNote: ''
  },
  {
    id: 'k-3',
    name: 'Matthew Wibowo',
    birthDate: '2021-02-14',
    age: 5,
    classId: 'cl-toddler',
    parentName: 'Ibu Listya Chandra',
    parentPhone: '08121122334',
    attendance: { '2026-05-24': true, '2026-05-17': false, '2026-05-10': true },
    talents: ['Menyusun Lego'],
    parentNote: 'Cenderung rewel jika mengantuk berat.'
  }
];

const MOCK_CLASSES: SundaySchoolClass[] = [
  {
    id: 'cl-toddler',
    name: 'Toddler Class (Semut)',
    teacherId: 'u-kadiv',
    teacherName: 'Ibu Listya Chandra',
    ageRange: '2 - 5 Tahun',
    curriculum: 'Kurikulum Karakter Asih - Pengenalan Kasih Orangtua dan Sabar.'
  },
  {
    id: 'cl-pratama',
    name: 'Pratama Class (Domba)',
    teacherId: 'm-angelina',
    teacherName: 'Angelina Pratama',
    ageRange: '6 - 10 Tahun',
    curriculum: 'Kurikulum Perjanjian Lama - Kisah Ketaatan Nabi Nuh, Abraham, Yusuf.'
  }
];

const MOCK_AUDITS: AuditTrail[] = [
  {
    id: 'aud-1',
    timestamp: '2026-05-28T03:30:10Z',
    userId: 'u-gembala',
    userName: 'Pdt. Dr. Thomas Aris, M.Th.',
    action: 'LOGIN',
    details: 'Log masuk sukses ke konsol Gembala'
  },
  {
    id: 'aud-2',
    timestamp: '2026-05-27T16:05:22Z',
    userId: 'u-pengurus',
    userName: 'Bpk. Yohanes Siregar',
    action: 'MEMBER_ADD',
    details: 'Mendaftarkan Kezia Olivia sebagai jemaat baru.'
  },
  {
    id: 'aud-3',
    timestamp: '2026-05-26T11:00:15Z',
    userId: 'u-gembala',
    userName: 'Pdt. Dr. Thomas Aris, M.Th.',
    action: 'FIN_APPROVE',
    details: 'Menyetujui dana Camp Sekolah Minggu senilai Rp 12.000.000 (Request req-2)'
  }
];

const MOCK_SERVICE_TYPES: ServiceType[] = [
  {
    id: 'st-1',
    name: 'Ibadah Raya Minggu (Sesi 1)',
    description: 'Ibadah utama hari Minggu sesi pagi untuk seluruh jemaat.',
    category: 'IBADAH_RAYA',
    defaultTime: '07:30'
  },
  {
    id: 'st-2',
    name: 'Ibadah Raya Minggu (Sesi 2)',
    description: 'Ibadah utama hari Minggu sesi siang dengan siaran langsung.',
    category: 'IBADAH_RAYA',
    defaultTime: '10:00'
  },
  {
    id: 'st-3',
    name: 'Kids Ministry (Sekolah Minggu)',
    description: 'Ibadah anak-anak balita hingga usia sekolah dasar.',
    category: 'SEKOLAH_MINGGU',
    defaultTime: '10:00'
  },
  {
    id: 'st-4',
    name: 'Youth Fire & Praise',
    description: 'Ibadah pemuda, remaja, dan mahasiswa penuh dengan praise & worship kontemporer.',
    category: 'YOUTH',
    defaultTime: '17:00'
  }
];

const MOCK_SERVICE_SCHEDULES: ServiceSchedule[] = [
  {
    id: 'sch-1',
    serviceTypeId: 'st-2',
    serviceTypeName: 'Ibadah Raya Minggu (Sesi 2)',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    speaker: 'Pdt. Dr. Thomas Aris, M.Th.',
    theme: 'Kasih yang Mengubahkan Karakter',
    status: 'SCHEDULED',
    assignments: [
      { userId: 'u-pelayan', userName: 'Sdr. Timothy Lukinto', roleName: 'Worship Leader', status: 'CONFIRMED', notified: true, attended: true },
      { userId: 'm-angelina', userName: 'Angelina Pratama', roleName: 'Singer 1', status: 'CONFIRMED', notified: true, attended: true },
      { userId: 'm-denny', userName: 'Denny Kurniawan', roleName: 'Pemain Gitar', status: 'CONFIRMED', notified: true, attended: false },
      { userId: 'm-robby', userName: 'Robby Hartono', roleName: 'Soundman', status: 'PENDING', notified: false }
    ],
    notes: 'Harap hadir 1 jam sebelum ibadah dimulai untuk sound check.'
  },
  {
    id: 'sch-2',
    serviceTypeId: 'st-4',
    serviceTypeName: 'Youth Fire & Praise',
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    time: '17:00',
    speaker: 'Ev. Yohanes Siregar',
    theme: 'Menjaga Integritas Di Era Digital',
    status: 'SCHEDULED',
    assignments: [
      { userId: 'u-pelayan', userName: 'Sdr. Timothy Lukinto', roleName: 'WL / Singer', status: 'PENDING', notified: true }
    ],
    notes: 'Briefing pelayan jam 16:00 di ruangan pemuda.'
  }
];

export interface SystemData {
  churches: Church[];
  users: User[];
  divisions: Division[];
  members: Member[];
  approvals: ApprovalRequest[];
  transactions: Transaction[];
  pockets?: FinancialPocket[];
  customWorkflows?: CustomApprovalWorkflow[];
  tasks: Task[];
  kids: SundaySchoolKid[];
  classes: SundaySchoolClass[];
  audits: AuditTrail[];
  serviceTypes?: ServiceType[];
  serviceSchedules?: ServiceSchedule[];
  recycleBin: {
    members?: Member[];
    divisions?: Division[];
    approvals?: ApprovalRequest[];
    transactions?: Transaction[];
  };
}

// Complete empty system state for Real Mode
const EMPTY_SYSTEM_STATE: SystemData = {
  churches: MOCK_CHURCHES.slice(), // Keep branch databases or starts empty
  users: MOCK_USERS.slice(), // Default accounts so users can log in first
  divisions: [],
  members: [],
  approvals: [],
  transactions: [],
  pockets: [],
  customWorkflows: [],
  tasks: [],
  kids: [],
  classes: [],
  audits: [],
  serviceTypes: [],
  serviceSchedules: [],
  recycleBin: {
    members: [],
    divisions: [],
    approvals: [],
    transactions: []
  }
};

const DEMO_SYSTEM_STATE: SystemData = {
  churches: MOCK_CHURCHES,
  users: MOCK_USERS,
  divisions: MOCK_DIVISIONS,
  members: MOCK_MEMBERS,
  approvals: MOCK_APPROVALS,
  transactions: MOCK_FINANCE,
  pockets: MOCK_POCKETS,
  customWorkflows: [],
  tasks: MOCK_TASKS,
  kids: MOCK_KIDS,
  classes: MOCK_CLASSES,
  audits: MOCK_AUDITS,
  serviceTypes: MOCK_SERVICE_TYPES,
  serviceSchedules: MOCK_SERVICE_SCHEDULES,
  recycleBin: {
    members: [],
    divisions: [],
    approvals: [],
    transactions: []
  }
};

// State Manager class
class DatabaseEngine {
  private data: SystemData = DEMO_SYSTEM_STATE;
  private activeSubscriptions: (() => void)[] = [];

  constructor() {
    this.syncFromStorage();
    this.setupRealtimeListeners();
  }

  private async writeEntity(collectionName: string, id: string, docData: any) {
    if (this.getMode() !== 'REAL') return;
    try {
      const sanitized = sanitizeData(docData);
      await setDoc(doc(dbFirestore, collectionName, id), sanitized);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${id}`);
    }
  }

  private async deleteEntity(collectionName: string, id: string) {
    if (this.getMode() !== 'REAL') return;
    try {
      await deleteDoc(doc(dbFirestore, collectionName, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
    }
  }

  private async seedCollectionIfNecessary(key: string) {
    if (this.getMode() !== 'REAL') return;
    const defaultData = EMPTY_SYSTEM_STATE as any;
    const items = defaultData[key];
    if (items && Array.isArray(items) && items.length > 0) {
      console.log(`Seeding online Firestore collection: ${key}`);
      for (const item of items) {
        if (item && item.id) {
          try {
            const sanitized = sanitizeData(item);
            await setDoc(doc(dbFirestore, key, item.id), sanitized);
          } catch (err) {
            console.error(`Failed to seed ${key}/${item.id}:`, err);
          }
        }
      }
    }
  }

  private setupRealtimeListeners() {
    // Unsubscribe from any active listeners first
    this.activeSubscriptions.forEach(unsub => unsub());
    this.activeSubscriptions = [];

    if (this.getMode() !== 'REAL') {
      return;
    }

    const collections = [
      { key: 'churches', col: 'churches' },
      { key: 'users', col: 'users' },
      { key: 'members', col: 'members' },
      { key: 'divisions', col: 'divisions' },
      { key: 'approvals', col: 'approvals' },
      { key: 'transactions', col: 'transactions' },
      { key: 'pockets', col: 'pockets' },
      { key: 'customWorkflows', col: 'customWorkflows' },
      { key: 'tasks', col: 'tasks' },
      { key: 'kids', col: 'kids' },
      { key: 'classes', col: 'classes' },
      { key: 'serviceTypes', col: 'serviceTypes' },
      { key: 'serviceSchedules', col: 'serviceSchedules' },
      { key: 'audits', col: 'audits' },
    ];

    collections.forEach(({ key, col }) => {
      try {
        const unsub = onSnapshot(collection(dbFirestore, col), (snapshot) => {
          const list: any[] = [];
          snapshot.forEach(docSnap => {
            list.push(docSnap.data());
          });
          
          if (list.length === 0) {
            this.seedCollectionIfNecessary(key);
            return;
          }

          if (key === 'audits') {
            list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          }

          if (key === 'recycleMembers') {
            if (!this.data.recycleBin) this.data.recycleBin = {};
            this.data.recycleBin.members = list;
          } else {
            (this.data as any)[key] = list;
          }

          localStorage.setItem('metaconnect_real_db', JSON.stringify(this.data));
          window.dispatchEvent(new CustomEvent('metaconnect-db-changed'));
        }, (error) => {
          // Silent catch on standard query permissions or report safely
          console.warn(`Firestore subscription noticed permission or network limits for ${col}:`, error);
        });
        
        this.activeSubscriptions.push(unsub);
      } catch (err) {
        console.error(`Error setting up listener on ${col}:`, err);
      }
    });

    try {
      const unsubRecycle = onSnapshot(collection(dbFirestore, 'recycleMembers'), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data());
        });
        if (!this.data.recycleBin) this.data.recycleBin = {};
        this.data.recycleBin.members = list;
        
        localStorage.setItem('metaconnect_real_db', JSON.stringify(this.data));
        window.dispatchEvent(new CustomEvent('metaconnect-db-changed'));
      }, (error) => {
        console.warn('Recycle members listener inactive:', error);
      });
      this.activeSubscriptions.push(unsubRecycle);
    } catch (err) {
      console.error('Error setting up recycleMembers listener:', err);
    }
  }

  public getMode(): 'DEMO' | 'REAL' {
    const mode = localStorage.getItem(DB_MODE_KEY);
    if (!mode) return 'REAL'; // Default to REAL mode instead of DEMO
    return (mode === 'DEMO' ? 'DEMO' : 'REAL') as 'DEMO' | 'REAL';
  }

  public setMode(mode: 'DEMO' | 'REAL') {
    localStorage.setItem(DB_MODE_KEY, mode);
    if (mode === 'REAL') {
      const savedReal = localStorage.getItem('metaconnect_real_db');
      if (savedReal) {
        this.data = JSON.parse(savedReal);
      } else {
        this.data = JSON.parse(JSON.stringify(EMPTY_SYSTEM_STATE));
        this.persist();
      }
    } else {
      const savedDemo = localStorage.getItem('metaconnect_demo_db');
      if (savedDemo) {
        this.data = JSON.parse(savedDemo);
      } else {
        this.data = JSON.parse(JSON.stringify(DEMO_SYSTEM_STATE));
        this.persist();
      }
    }
    this.setupRealtimeListeners();
  }

  private syncFromStorage() {
    const mode = this.getMode();
    const key = mode === 'REAL' ? 'metaconnect_real_db' : 'metaconnect_demo_db';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        this.data = JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse local storage DB, reverting to default mode data", err);
        this.data = mode === 'REAL' ? JSON.parse(JSON.stringify(EMPTY_SYSTEM_STATE)) : JSON.parse(JSON.stringify(DEMO_SYSTEM_STATE));
      }
    } else {
      this.data = mode === 'REAL' ? JSON.parse(JSON.stringify(EMPTY_SYSTEM_STATE)) : JSON.parse(JSON.stringify(DEMO_SYSTEM_STATE));
      this.persist();
    }
  }

  public persist() {
    const mode = this.getMode();
    const key = mode === 'REAL' ? 'metaconnect_real_db' : 'metaconnect_demo_db';
    localStorage.setItem(key, JSON.stringify(this.data));
  }

  public getSessionUser(): User | null {
    const sessionStr = localStorage.getItem(USER_SESSION_KEY);
    if (!sessionStr) return null;
    try {
      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  }

  public setSessionUser(user: User | null) {
    if (user) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
      this.logAudit(user.id, user.fullName, 'LOGIN', `Pengguna ${user.fullName} (${user.role}) masuk ke dalam sistem.`);
    } else {
      const active = this.getSessionUser();
      if (active) {
        this.logAudit(active.id, active.fullName, 'LOGOUT', `Pengguna ${active.fullName} keluar dari sistem.`);
      }
      localStorage.removeItem(USER_SESSION_KEY);
    }
  }

  // Auditing Engine
  public logAudit(userId: string, userName: string, action: string, details: string, previous?: any, current?: any) {
    const audit: AuditTrail = {
      id: 'aud-' + Date.now() + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action,
      details,
      previousState: previous ? JSON.stringify(previous, null, 2) : undefined,
      newState: current ? JSON.stringify(current, null, 2) : undefined
    };
    if (!this.data.audits) this.data.audits = [];
    this.data.audits.unshift(audit);
    // Max 100 audit traces
    if (this.data.audits.length > 100) {
      this.data.audits = this.data.audits.slice(0, 100);
    }
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('audits', audit.id, audit);
    }
  }

  // Rollback System (by placing specific states back)
  public rollbackAudit(auditId: string, currentUser: User): boolean {
    const target = this.data.audits.find(a => a.id === auditId);
    if (!target || !target.previousState) return false;

    try {
      const parsedPrev = JSON.parse(target.previousState);
      const parts = target.action.split('_');
      const domain = parts[0]; // e.g. 'MEMBER', 'FIN', 'DIV'
      
      if (domain === 'MEMBER' && parsedPrev.id) {
        const i = this.data.members.findIndex(m => m.id === parsedPrev.id);
        if (i !== -1) this.data.members[i] = parsedPrev;
        else this.data.members.push(parsedPrev);
      } else if (domain === 'DIV' && parsedPrev.id) {
        const i = this.data.divisions.findIndex(d => d.id === parsedPrev.id);
        if (i !== -1) this.data.divisions[i] = parsedPrev;
        else this.data.divisions.push(parsedPrev);
      } else if (domain === 'FIN' && parsedPrev.id) {
        const i = this.data.transactions.findIndex(t => t.id === parsedPrev.id);
        if (i !== -1) this.data.transactions[i] = parsedPrev;
        else this.data.transactions.push(parsedPrev);
      } else if (domain === 'REQ' && parsedPrev.id) {
        const i = this.data.approvals.findIndex(r => r.id === parsedPrev.id);
        if (i !== -1) this.data.approvals[i] = parsedPrev;
        else this.data.approvals.push(parsedPrev);
      } else {
        return false;
      }
      this.logAudit(currentUser.id, currentUser.fullName, 'ROLLBACK', `Me-rollback aktivitas ${target.action} (Audit ID: ${target.id}) kembali ke state lama.`);
      this.persist();
      return true;
    } catch {
      return false;
    }
  }

  // --- CRUD API ---

  // Churches (Super Admin)
  public getChurches(): Church[] {
    return this.data.churches || [];
  }

  public updateChurch(church: Church, updater: User) {
    const list = this.getChurches();
    const index = list.findIndex(c => c.id === church.id);
    const prev = index !== -1 ? list[index] : null;

    if (index !== -1) {
      list[index] = church;
    } else {
      list.push(church);
    }
    this.data.churches = list;
    this.logAudit(updater.id, updater.fullName, 'CHURCH_EDIT', `Ubah profil/status gereja ${church.name}`, prev, church);
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('churches', church.id, church);
    }
  }

  public createChurch(church: Church, updater: User) {
    if (!this.data.churches) this.data.churches = [];
    this.data.churches.push(church);
    this.logAudit(updater.id, updater.fullName, 'CHURCH_CREATE', `Mendaftarkan gereja lokal baru: ${church.name}`, null, church);
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('churches', church.id, church);
    }
  }

  public deleteChurch(churchId: string, updater: User): boolean {
    if (!this.data.churches) this.data.churches = [];
    const index = this.data.churches.findIndex(c => c.id === churchId);
    if (index !== -1) {
      const deletedChurch = this.data.churches[index];
      
      // Delete church
      this.data.churches.splice(index, 1);
      
      // Cascade delete members belonging to this church
      if (this.data.members) {
        const toDeleteMembers = this.data.members.filter(m => m.churchId === churchId);
        toDeleteMembers.forEach(m => this.deleteEntity('members', m.id));
        this.data.members = this.data.members.filter(m => m.churchId !== churchId);
      }
      
      // Cascade delete users belonging to this church
      if (this.data.users) {
        const toDeleteUsers = this.data.users.filter(u => u.churchId === churchId && u.role !== 'SUPER_ADMIN');
        toDeleteUsers.forEach(u => this.deleteEntity('users', u.id));
        this.data.users = this.data.users.filter(u => u.churchId !== churchId || u.role === 'SUPER_ADMIN');
      }

      this.logAudit(
        updater.id,
        updater.fullName,
        'CHURCH_DELETE',
        `Menghapus cabang gereja "${deletedChurch.name}" beserta dengan seluruh data jemaat dan pengguna pelayan terkait secara permanen.`,
        deletedChurch,
        null
      );
      this.persist();
      if (this.getMode() === 'REAL') {
        this.deleteEntity('churches', churchId);
      }
      return true;
    }
    return false;
  }

  // Users (Dynamic Registration)
  public getUsers(): User[] {
    return this.data.users || [];
  }

  public createUser(user: User) {
    if (!this.data.users) this.data.users = [];
    this.data.users.push(user);
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('users', user.id, user);
    }
  }

  public updateUser(user: User) {
    if (!this.data.users) this.data.users = [];
    const index = this.data.users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      this.data.users[index] = user;
      this.persist();
      if (this.getMode() === 'REAL') {
        this.writeEntity('users', user.id, user);
      }
    }
  }

  public deleteUser(userId: string) {
    if (!this.data.users) this.data.users = [];
    const index = this.data.users.findIndex(u => u.id === userId);
    if (index !== -1) {
      this.data.users.splice(index, 1);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.deleteEntity('users', userId);
      }
    }
  }

  public verifyAndIntegrateUser(userId: string, updater: User): boolean {
    if (!this.data.users) this.data.users = [];
    const index = this.data.users.findIndex(u => u.id === userId);
    if (index === -1) return false;

    const user = this.data.users[index];
    user.isVerified = true;

    // Create a Member entry
    if (!this.data.members) this.data.members = [];
    
    // Check if member already exists (e.g. same email/name)
    const exists = this.data.members.some(m => 
      m.email.toLowerCase() === user.email.toLowerCase() || 
      m.name.toLowerCase() === user.fullName.toLowerCase()
    );
    
    let corrected: Member | null = null;
    if (!exists) {
      const birthDay = '1995-05-30';
      const parsedNickname = user.fullName.split(' ')[0] || user.fullName;
      const initialMember: Member = {
        id: 'm-' + user.id,
        name: user.fullName,
        nickname: parsedNickname,
        gender: user.gender || 'L',
        birthPlace: 'Jakarta',
        birthDate: birthDay,
        age: 31,
        maritalStatus: 'BELUM_MENIKAH',
        address: 'Alamat Anggota Terdaftar Sektor',
        sector: 'Sektor Utama',
        phone: user.phone || '0812-3456-7890',
        email: user.email,
        education: 'S1',
        occupation: user.role === 'KEPALA_DIVISI' ? 'KADIV / KEPALA DEPARTEMEN' : user.role === 'PENGURUS' ? 'Staff/Pengurus Cabang' : 'Pelayan Jemaat',
        joinDate: new Date().toISOString().split('T')[0],
        baptismStatus: 'YA',
        ministryStatus: 'YA',
        talents: user.talents ? user.talents.split(',').map(t => t.trim()) : [],
        category: 'INTI',
        joinYear: new Date().getFullYear(),
        activityScore: 100,
        churchId: user.churchId,
        pastoralNotes: [],
        followUps: [],
        attachments: []
      };
      
      corrected = this.evaluateMember(initialMember);
      this.data.members.push(corrected);
    }

    this.logAudit(
      updater.id,
      updater.fullName,
      'USER_VERIFIED_GEMBALA',
      `Gembala memverifikasi akun pendaftaran ${user.fullName} (${user.role}) dan mengintegrasikannya ke database jemaat.`,
      user,
      null
    );

    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('users', user.id, user);
      if (corrected) {
        this.writeEntity('members', corrected.id, corrected);
      }
    }
    return true;
  }

  public rejectUserRegistration(userId: string, updater: User): boolean {
    if (!this.data.users) this.data.users = [];
    const index = this.data.users.findIndex(u => u.id === userId);
    if (index === -1) return false;
    const user = this.data.users[index];

    this.data.users.splice(index, 1);
    this.logAudit(
      updater.id,
      updater.fullName,
      'USER_REJECTED_GEMBALA',
      `Gembala menolak akun pendaftaran pelayan ${user.fullName} (${user.role}) dan menghapus draf registrasi dari antrean.`,
      user,
      null
    );
    this.persist();
    if (this.getMode() === 'REAL') {
      this.deleteEntity('users', userId);
    }
    return true;
  }

  // Members
  public getMembers(): Member[] {
    return this.data.members || [];
  }

  public addMember(member: Member, updater: User) {
    if (!this.data.members) this.data.members = [];
    
    // Auto actions calculations & scores
    const correctedMember = this.evaluateMember(member);
    this.data.members.push(correctedMember);
    this.logAudit(updater.id, updater.fullName, 'MEMBER_ADD', `Menambahkan jemaat baru: ${member.name} (${member.nickname})`, null, correctedMember);
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('members', correctedMember.id, correctedMember);
    }
  }

  public updateMember(member: Member, updater: User) {
    const index = this.data.members.findIndex(m => m.id === member.id);
    if (index !== -1) {
      const prev = this.data.members[index];
      const correctedMember = this.evaluateMember(member);
      this.data.members[index] = correctedMember;
      this.logAudit(updater.id, updater.fullName, 'MEMBER_EDIT', `Mengubah data jemaat: ${member.name}`, prev, correctedMember);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.writeEntity('members', correctedMember.id, correctedMember);
      }
    }
  }

  public softDeleteMember(memberId: string, updater: User) {
    const index = this.data.members.findIndex(m => m.id === memberId);
    if (index !== -1) {
      const prev = this.data.members[index];
      if (!this.data.recycleBin) this.data.recycleBin = {};
      if (!this.data.recycleBin.members) this.data.recycleBin.members = [];
      
      this.data.recycleBin.members.push(prev);
      this.data.members.splice(index, 1);
      this.logAudit(updater.id, updater.fullName, 'MEMBER_REMOVE', `Memindahkan jemaat ${prev.name} ke Recycle Bin (Soft Delete).`, prev, null);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.deleteEntity('members', memberId);
        this.writeEntity('recycleMembers', prev.id, prev);
      }
    }
  }

  public restoreMember(memberId: string, updater: User) {
    if (!this.data.recycleBin || !this.data.recycleBin.members) return;
    const index = this.data.recycleBin.members.findIndex(m => m.id === memberId);
    if (index !== -1) {
      const member = this.data.recycleBin.members[index];
      this.data.members.push(member);
      this.data.recycleBin.members.splice(index, 1);
      this.logAudit(updater.id, updater.fullName, 'MEMBER_RESTORE', `Memulihkan jemaat ${member.name} dari Recycle Bin.`, null, member);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.deleteEntity('recycleMembers', memberId);
        this.writeEntity('members', member.id, member);
      }
    }
  }

  // Helper to re-evaluate Member Activity Levels and Classifications
  public evaluateMember(member: Member): Member {
    const born = new Date(member.birthDate);
    const today = new Date();
    let age = today.getFullYear() - born.getFullYear();
    const monthDiff = today.getMonth() - born.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) {
      age--;
    }
    member.age = Math.max(0, age);

    // Auto classify category based on age or core parameters
    if (member.age >= 60) {
      member.category = 'LANSIA';
    } else if (member.age >= 12 && member.age <= 18) {
      member.category = 'REMAJA';
    } else if (member.age > 18 && member.age <= 30) {
      member.category = 'PEMUDA';
    } else {
      // Retain or smart-categorize based on activity
      if (member.activityScore >= 90) {
        member.category = member.ministryStatus === 'YA' ? 'INTI' : 'AKTIF';
      } else if (member.activityScore <= 30) {
        member.category = 'PASIF';
      } else if (member.activityScore <= 60) {
        member.category = 'KURANG_AKTIF';
      } else {
        member.category = 'AKTIF';
      }
    }

    if (!member.followUps) {
      member.followUps = [];
    }

    return member;
  }

  // Divisions CRUD
  public getDivisions(): Division[] {
    return this.data.divisions || [];
  }

  public addDivision(div: Division, updater: User) {
    if (!this.data.divisions) this.data.divisions = [];
    this.data.divisions.push(div);
    this.logAudit(updater.id, updater.fullName, 'DIV_ADD', `Membuat divisi pelayanan baru: ${div.name}`, null, div);
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('divisions', div.id, div);
    }
  }

  public updateDivision(div: Division, updater: User) {
    const list = this.getDivisions();
    const index = list.findIndex(d => d.id === div.id);
    const prev = index !== -1 ? list[index] : null;

    if (index !== -1) {
      list[index] = div;
      this.logAudit(updater.id, updater.fullName, 'DIV_EDIT', `Mengubah struktur divisi: ${div.name}`, prev, div);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.writeEntity('divisions', div.id, div);
      }
    }
  }

  public deleteDivision(divId: string, updater: User) {
    const list = this.getDivisions();
    const index = list.findIndex(d => d.id === divId);
    if (index !== -1) {
      const prev = list[index];
      list.splice(index, 1);
      this.logAudit(updater.id, updater.fullName, 'DIV_REMOVE', `Menghapus divisi pelayanan: ${prev.name}`, prev, null);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.deleteEntity('divisions', divId);
      }
    }
  }

  // Approvals & Workflows CRUD
  public getApprovals(): ApprovalRequest[] {
    return this.data.approvals || [];
  }

  public getCustomWorkflows(churchId: string): CustomApprovalWorkflow[] {
    if (!this.data.customWorkflows) this.data.customWorkflows = [];
    return this.data.customWorkflows.filter(w => w.churchId === churchId);
  }

  public addCustomWorkflow(wf: CustomApprovalWorkflow, updater: User) {
    if (!this.data.customWorkflows) this.data.customWorkflows = [];
    this.data.customWorkflows.push(wf);
    this.logAudit(updater.id, updater.fullName, 'WF_ADD', `Menambahkan alur kerja kustom baru: ${wf.name}`, null, wf);
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('customWorkflows', wf.id, wf);
    }
  }

  public updateCustomWorkflow(wf: CustomApprovalWorkflow, updater: User) {
    if (!this.data.customWorkflows) this.data.customWorkflows = [];
    const idx = this.data.customWorkflows.findIndex(w => w.id === wf.id);
    const prev = idx !== -1 ? this.data.customWorkflows[idx] : null;

    if (idx !== -1) {
      this.data.customWorkflows[idx] = wf;
      this.logAudit(updater.id, updater.fullName, 'WF_EDIT', `Mengubah alur kerja kustom: ${wf.name}`, prev, wf);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.writeEntity('customWorkflows', wf.id, wf);
      }
    }
  }

  public deleteCustomWorkflow(wfId: string, updater: User): boolean {
    if (!this.data.customWorkflows) this.data.customWorkflows = [];
    const idx = this.data.customWorkflows.findIndex(w => w.id === wfId);
    if (idx !== -1) {
      const wf = this.data.customWorkflows[idx];
      this.data.customWorkflows.splice(idx, 1);
      this.logAudit(updater.id, updater.fullName, 'WF_DELETE', `Menghapus alur kerja kustom: ${wf.name}`, wf, null);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.deleteEntity('customWorkflows', wfId);
      }
      return true;
    }
    return false;
  }

  public addApproval(req: ApprovalRequest, updater: User) {
    if (!this.data.approvals) this.data.approvals = [];
    this.data.approvals.push(req);
    this.logAudit(updater.id, updater.fullName, 'REQ_SUBMIT', `Membuat pengajuan (${req.type}): ${req.title}`, null, req);
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('approvals', req.id, req);
    }
  }

  public updateApproval(req: ApprovalRequest, updater: User) {
    const list = this.getApprovals();
    const index = list.findIndex(r => r.id === req.id);
    const prev = index !== -1 ? list[index] : null;

    if (index !== -1) {
      list[index] = req;
      this.logAudit(updater.id, updater.fullName, 'REQ_EDIT', `Mengubah detail pengajuan: ${req.title} (Status: ${req.status})`, prev, req);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.writeEntity('approvals', req.id, req);
      }
    }
  }

  // Finance Transactions CRUD
  public getTransactions(): Transaction[] {
    return this.data.transactions || [];
  }

  // Financial Pockets (Kantong Kas)
  public getPockets(churchId: string): FinancialPocket[] {
    if (!this.data.pockets) this.data.pockets = [];
    
    const churchPockets = this.data.pockets.filter(p => p.churchId === churchId);
    if (churchPockets.length === 0) {
      const defaults: FinancialPocket[] = [
        { id: `pocket-gereja-${churchId}`, name: 'Kas Gereja', description: 'Kas operasional umum gereja untuk pelayanan sehari-hari', churchId, isSystem: true },
        { id: `pocket-pembangunan-${churchId}`, name: 'Kas Pembangunan', description: 'Dana khusus pembangunan gedung, perluasan, & fasilitas gereja', churchId, isSystem: true },
        { id: `pocket-sosial-${churchId}`, name: 'Kas Sosial', description: 'Dana bantuan sosial, diakonia, kemasyarakatan & jemaat prasejahtera', churchId, isSystem: true },
      ];
      this.data.pockets.push(...defaults);
      this.persist();
      return defaults;
    }

    return churchPockets;
  }

  public addPocket(pocket: FinancialPocket, updater: User) {
    if (!this.data.pockets) this.data.pockets = [];
    this.data.pockets.push(pocket);
    this.logAudit(updater.id, updater.fullName, 'FIN_POCKET_ADD', `Menambah kantong kas baru: ${pocket.name}`, null, pocket);
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('pockets', pocket.id, pocket);
    }
  }

  public updatePocket(pocket: FinancialPocket, updater: User) {
    if (!this.data.pockets) this.data.pockets = [];
    const idx = this.data.pockets.findIndex(p => p.id === pocket.id);
    const prev = idx !== -1 ? this.data.pockets[idx] : null;

    if (idx !== -1) {
      this.data.pockets[idx] = pocket;
      this.logAudit(updater.id, updater.fullName, 'FIN_POCKET_EDIT', `Mengubah detail kantong kas: ${pocket.name}`, prev, pocket);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.writeEntity('pockets', pocket.id, pocket);
      }
    }
  }

  public deletePocket(pocketId: string, updater: User): boolean {
    if (!this.data.pockets) this.data.pockets = [];
    const idx = this.data.pockets.findIndex(p => p.id === pocketId);
    if (idx !== -1) {
      const p = this.data.pockets[idx];
      if (p.isSystem) return false; // Prevent system pocket deletions
      
      this.data.pockets.splice(idx, 1);
      
      // Also reset any transactions linked to this deleted pocket to general/first pocket available or default
      if (this.data.transactions) {
        this.data.transactions.forEach(t => {
          if (t.pocketId === pocketId) {
            t.pocketId = `pocket-gereja-${p.churchId}`; // Reset to general
            if (this.getMode() === 'REAL') {
              this.writeEntity('transactions', t.id, t);
            }
          }
        });
      }
      
      this.logAudit(updater.id, updater.fullName, 'FIN_POCKET_DELETE', `Menghapus kantong kas: ${p.name}`, p, null);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.deleteEntity('pockets', pocketId);
      }
      return true;
    }
    return false;
  }

  public addTransaction(tx: Transaction, updater: User) {
    if (!this.data.transactions) this.data.transactions = [];
    this.data.transactions.push(tx);
    this.logAudit(updater.id, updater.fullName, 'FIN_TX_ADD', `Menambah data keuangan (${tx.type} - ${tx.category}): Rp ${tx.amount.toLocaleString('id-ID')},-`, null, tx);
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('transactions', tx.id, tx);
    }
  }

  public updateTransaction(tx: Transaction, updater: User) {
    const list = this.getTransactions();
    const index = list.findIndex(t => t.id === tx.id);
    const prev = index !== -1 ? list[index] : null;

    if (index !== -1) {
      list[index] = tx;
      this.logAudit(updater.id, updater.fullName, 'FIN_TX_EDIT', `Mengubah nominal/deskripsi keuangan senilai Rp ${tx.amount.toLocaleString('id-ID')},-`, prev, tx);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.writeEntity('transactions', tx.id, tx);
      }
    }
  }

  public deleteTransaction(txId: string, updater: User) {
    const list = this.getTransactions();
    const index = list.findIndex(t => t.id === txId);
    if (index !== -1) {
      const prev = list[index];
      list.splice(index, 1);
      this.logAudit(updater.id, updater.fullName, 'FIN_TX_REMOVE', `Menghapus transaksi keuangan: ${prev.description}`, prev, null);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.deleteEntity('transactions', txId);
      }
    }
  }

  // Task Kanban Boards
  public getTasks(): Task[] {
    return this.data.tasks || [];
  }

  public addTask(task: Task) {
    if (!this.data.tasks) this.data.tasks = [];
    this.data.tasks.push(task);
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('tasks', task.id, task);
    }
  }

  public updateTask(task: Task) {
    const index = this.data.tasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      this.data.tasks[index] = task;
      this.persist();
      if (this.getMode() === 'REAL') {
        this.writeEntity('tasks', task.id, task);
      }
    }
  }

  public deleteTask(taskId: string) {
    const index = this.data.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      this.data.tasks.splice(index, 1);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.deleteEntity('tasks', taskId);
      }
    }
  }

  // Sunday School Kid & Classes CRUD
  public getKids(): SundaySchoolKid[] {
    return this.data.kids || [];
  }

  public addKid(kid: SundaySchoolKid) {
    if (!this.data.kids) this.data.kids = [];
    this.data.kids.push(kid);
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('kids', kid.id, kid);
    }
  }

  public updateKid(kid: SundaySchoolKid) {
    const index = this.data.kids.findIndex(k => k.id === kid.id);
    if (index !== -1) {
      this.data.kids[index] = kid;
      this.persist();
      if (this.getMode() === 'REAL') {
        this.writeEntity('kids', kid.id, kid);
      }
    }
  }

  public deleteKid(kidId: string) {
    const index = this.data.kids.findIndex(k => k.id === kidId);
    if (index !== -1) {
      this.data.kids.splice(index, 1);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.deleteEntity('kids', kidId);
      }
    }
  }

  public getClasses(): SundaySchoolClass[] {
    return this.data.classes || [];
  }

  public addClass(cl: SundaySchoolClass) {
    if (!this.data.classes) this.data.classes = [];
    this.data.classes.push(cl);
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('classes', cl.id, cl);
    }
  }

  public updateClass(cl: SundaySchoolClass) {
    const index = this.data.classes.findIndex(c => c.id === cl.id);
    if (index !== -1) {
      this.data.classes[index] = cl;
      this.persist();
      if (this.getMode() === 'REAL') {
        this.writeEntity('classes', cl.id, cl);
      }
    }
  }

  // Service Types CRUD
  public getServiceTypes(): ServiceType[] {
    if (!this.data.serviceTypes) {
      this.data.serviceTypes = this.getMode() === 'REAL' ? [] : MOCK_SERVICE_TYPES.slice();
    }
    return this.data.serviceTypes;
  }

  public addServiceType(st: ServiceType, updater: User) {
    const list = this.getServiceTypes();
    list.push(st);
    this.data.serviceTypes = list;
    this.logAudit(updater.id, updater.fullName, 'SERVICE_TYPE_ADD', `Membuat jenis pelayanan baru: ${st.name}`, null, st);
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('serviceTypes', st.id, st);
    }
  }

  public updateServiceType(st: ServiceType, updater: User) {
    const list = this.getServiceTypes();
    const index = list.findIndex(item => item.id === st.id);
    const prev = index !== -1 ? list[index] : null;
    if (index !== -1) {
      list[index] = st;
      this.data.serviceTypes = list;
      this.logAudit(updater.id, updater.fullName, 'SERVICE_TYPE_EDIT', `Mengubah jenis pelayanan: ${st.name}`, prev, st);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.writeEntity('serviceTypes', st.id, st);
      }
    }
  }

  public deleteServiceType(stId: string, updater: User) {
    const list = this.getServiceTypes();
    const index = list.findIndex(item => item.id === stId);
    if (index !== -1) {
      const prev = list[index];
      list.splice(index, 1);
      this.data.serviceTypes = list;
      this.logAudit(updater.id, updater.fullName, 'SERVICE_TYPE_DELETE', `Menghapus jenis pelayanan: ${prev.name}`, prev, null);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.deleteEntity('serviceTypes', stId);
      }
    }
  }

  // Service Schedules CRUD
  public getServiceSchedules(): ServiceSchedule[] {
    if (!this.data.serviceSchedules) {
      this.data.serviceSchedules = this.getMode() === 'REAL' ? [] : MOCK_SERVICE_SCHEDULES.slice();
    }
    return this.data.serviceSchedules;
  }

  public addServiceSchedule(sch: ServiceSchedule, updater: User) {
    const list = this.getServiceSchedules();
    list.push(sch);
    this.data.serviceSchedules = list;
    this.logAudit(updater.id, updater.fullName, 'SCHEDULE_ADD', `Menjadwalkan ibadah baru: ${sch.serviceTypeName} pada tanggal ${sch.date}`, null, sch);
    this.persist();
    if (this.getMode() === 'REAL') {
      this.writeEntity('serviceSchedules', sch.id, sch);
    }
  }

  public updateServiceSchedule(sch: ServiceSchedule, updater: User) {
    const list = this.getServiceSchedules();
    const index = list.findIndex(item => item.id === sch.id);
    const prev = index !== -1 ? list[index] : null;
    if (index !== -1) {
      list[index] = sch;
      this.data.serviceSchedules = list;
      this.logAudit(updater.id, updater.fullName, 'SCHEDULE_EDIT', `Mengubah jadwal ibadah: ${sch.serviceTypeName} (${sch.date})`, prev, sch);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.writeEntity('serviceSchedules', sch.id, sch);
      }
    }
  }

  public deleteServiceSchedule(schId: string, updater: User) {
    const list = this.getServiceSchedules();
    const index = list.findIndex(item => item.id === schId);
    if (index !== -1) {
      const prev = list[index];
      list.splice(index, 1);
      this.data.serviceSchedules = list;
      this.logAudit(updater.id, updater.fullName, 'SCHEDULE_DELETE', `Menghapus jadwal ibadah: ${prev.serviceTypeName} (${prev.date})`, prev, null);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.deleteEntity('serviceSchedules', schId);
      }
    }
  }

  public getAudits(): AuditTrail[] {
    return this.data.audits || [];
  }

  public getRecycleMembers(): Member[] {
    return this.data.recycleBin?.members || [];
  }

  public toggleMemberAttendance(memberId: string, date: string, updater: User): boolean {
    const index = this.data.members.findIndex(m => m.id === memberId);
    if (index !== -1) {
      const member = this.data.members[index];
      if (!member.attendanceHistory) member.attendanceHistory = {};
      const nextVal = !member.attendanceHistory[date];
      member.attendanceHistory[date] = nextVal;
      
      // Recalculate activity score based on logged sessions in history
      const historyVals = Object.values(member.attendanceHistory);
      const presents = historyVals.filter(v => v === true).length;
      member.activityScore = historyVals.length > 0 ? Math.round((presents / historyVals.length) * 100) : 100;

      this.logAudit(updater.id, updater.fullName, 'MEMBER_ATTENDANCE', `Mengubah kehadiran jemaat ${member.name} tanggal ${date}: ${nextVal ? 'HADIR' : 'ABSEN'}`, null, null);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.writeEntity('members', member.id, member);
      }
      return nextVal;
    }
    return false;
  }

  public toggleUserAttendance(userId: string, date: string, updater: User): boolean {
    if (!this.data.users) this.data.users = [];
    const index = this.data.users.findIndex(u => u.id === userId);
    if (index !== -1) {
      const user = this.data.users[index];
      if (!user.attendanceHistory) user.attendanceHistory = {};
      const nextVal = !user.attendanceHistory[date];
      user.attendanceHistory[date] = nextVal;
      this.logAudit(updater.id, updater.fullName, 'STAF_ATTENDANCE', `Mengubah kehadiran pelayan/staf ${user.fullName} tanggal ${date}: ${nextVal ? 'HADIR' : 'ABSEN'}`, null, null);
      this.persist();
      if (this.getMode() === 'REAL') {
        this.writeEntity('users', user.id, user);
      }
      return nextVal;
    }
    return false;
  }
}

export const db = new DatabaseEngine();
