/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'SUPER_ADMIN' | 'GEMBALA' | 'PENGURUS' | 'KEPALA_DIVISI' | 'PELAYAN';

export interface Church {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  status: 'PENDING' | 'VERIFIED' | 'UNDER_REVIEW' | 'SUSPENDED' | 'REJECTED';
  logo?: string;
  banner?: string;
  themeColor?: string; // Hex color
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  churchId: string;
  avatar?: string;
  divisionId?: string;
  password?: string;
}

export interface PastoralNote {
  id: string;
  date: string;
  author: string;
  type: 'COUNSELING' | 'VISIT' | 'FOLLOW_UP';
  notes: string;
  status: 'BARU' | 'DA_PEMBINAAN' | 'PERLU_KUNJUNGAN' | 'PERLU_KONSELING' | 'STABIL' | 'PASIF';
}

export interface FollowUpRecord {
  id: string;
  date: string;
  followUpBy: string; // User Name
  status: 'PENDING' | 'CONTACTED' | 'VISITED' | 'NO_RESPONSE' | 'RE_ENGAGED';
  notes: string;
  intervalDays: number; // Interval days, e.g. 7, 14, 30
  nextFollowUpDate: string; // Calculated next date string
  responseType: 'POSITIF' | 'NETRAL' | 'NEGATIF' | 'BELUM_ADA';
}

export interface Member {
  id: string;
  name: string;
  nickname: string;
  gender: 'L' | 'P';
  birthPlace: string;
  birthDate: string;
  age: number;
  maritalStatus: 'BELUM_MENIKAH' | 'MENIKAH' | 'JANDA_DUDA';
  spouseName?: string;
  childrenNames?: string[];
  address: string;
  sector: string; // Wilayah Sektor
  phone: string;
  email: string;
  education: string;
  occupation: string;
  joinDate: string;
  baptismStatus: 'YA' | 'TIDAK';
  ministryStatus: 'YA' | 'TIDAK';
  talents?: string[];
  category: 'AKTIF' | 'KURANG_AKTIF' | 'PASIF' | 'BARU' | 'INTI' | 'LANSIA' | 'REMAJA' | 'PEMUDA';
  joinYear: number;
  activityScore: number; // Percentage 0 - 100
  pastoralNotes?: PastoralNote[];
  followUps?: FollowUpRecord[];
  attachments?: string[]; // file names / mock URLs
  attendanceHistory?: Record<string, boolean>; // date string -> present
  churchId?: string;
}

export interface Division {
  id: string;
  name: string;
  description: string;
  leadId: string; // references Member id or User id
  leadName?: string;
  subDivisions: string[];
  customRoles: string[];
  customPermissions: string[];
  workflow: string;
}

export type ApprovalType = 
  | 'VISIT' 
  | 'FINANCE' 
  | 'EVENT' 
  | 'MINISTRY' 
  | 'INVENTORY' 
  | 'COUNSELING' 
  | 'TRAINING' 
  | 'BENEVOLENCE' 
  | 'CUSTOM';

export type ApprovalStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'NEED_REVISION' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'ON_PROGRESS' 
  | 'COMPLETED' 
  | 'ARCHIVED';

export interface ApprovalRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  type: ApprovalType;
  title: string;
  description: string;
  amount?: number; // conditional on finance
  date: string;
  status: ApprovalStatus;
  history?: AuditTrail[];
  revisionNote?: string;
  attachments?: string[];
}

export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: 
    | 'PERSEMBAHAN' 
    | 'UCAPAN_SYUKUR' 
    | 'DONASI' 
    | 'PEMBANGUNAN' 
    | 'SPONSORSHIP' 
    | 'OPERASIONAL' 
    | 'EVENT' 
    | 'SOCIAL' 
    | 'MAINTENANCE' 
    | 'EQUIPMENT'
    | 'OTHER';
  amount: number;
  date: string;
  description: string;
  receipt?: string; // invoice image/doc URL
  approvalId?: string; // linked approval request
}

export interface AuditTrail {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string; // e.g. 'LOGIN', 'MEMBER_ADD', 'FIN_APPROVE'
  details: string; // readable text
  previousState?: string; // JSON or brief summary
  newState?: string; // JSON or brief summary
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  boardId: 'TODO' | 'DOING' | 'DONE';
  title: string;
  description: string;
  assignedTo: string; // references Member id or User id
  assignedName: string;
  deadline: string;
  progress: number; // calculated from checklists
  checklists: ChecklistItem[];
}

export interface SundaySchoolKid {
  id: string;
  name: string;
  birthDate: string;
  age: number;
  classId: string; // references class
  parentName: string;
  parentPhone: string;
  attendance: Record<string, boolean>; // date -> present
  talents: string[];
  parentNote?: string;
}

export interface SundaySchoolClass {
  id: string;
  name: string;
  teacherId: string;
  teacherName: string;
  ageRange: string;
  curriculum: string;
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  category: 'IBADAH_RAYA' | 'SEKOLAH_MINGGU' | 'YOUTH' | 'UMUM' | 'KOMSEL';
  defaultTime?: string;
}

export type AssignmentStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

export interface ServiceAssignment {
  userId: string;
  userName: string;
  roleName: string;
  status: AssignmentStatus;
  notified: boolean;
  attended?: boolean;
}

export interface ServiceSchedule {
  id: string;
  serviceTypeId: string;
  serviceTypeName: string;
  date: string;
  time: string;
  speaker: string;
  theme?: string;
  assignments: ServiceAssignment[];
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}
