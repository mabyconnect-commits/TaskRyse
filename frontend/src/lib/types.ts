// Shared API types mirroring the backend contract (openapi.yaml / schema.prisma).
export type Role = 'CONTRIBUTOR' | 'SPONSOR' | 'REVIEWER' | 'SUPPORT' | 'ADMIN';
export type Eligibility = 'ELIGIBLE' | 'QUALIFICATION_REQUIRED' | 'PLAN_LOCKED';

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  ryseLevel?: string;
}

export interface Task {
  id: string;
  title: string;
  categoryId: string;
  difficulty: string;
  payMinor: number;
  currency: string;
  deadline: string | null;
  totalSlots: number;
  slotsTaken: number;
  requiresQualification: boolean;
  isSponsored?: boolean;
  eligibility: Eligibility;
}

export interface TaskDetail extends Task {
  description: string;
  instructions: string;
  countries: string[];
  requiredSkills: string[];
  reviewType: string;
  org?: { id: string; name: string; verificationStatus: string };
}

export interface Wallet {
  totalEarnedMinor: number;
  approvedMinor: number;
  pendingMinor: number;
  withdrawableMinor: number;
  promoCreditMinor: number;
  refundMinor: number;
  currency: string;
}

export interface WalletEntry {
  id: string;
  type: string;
  grossMinor: number;
  feeMinor: number;
  netMinor: number;
  currency: string;
  status: string;
  reference: string;
  relatedTaskId: string | null;
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  priceMinor: number;
  currency: string;
  billingPeriod: string;
  maxActiveApplications: number;
  categoryScope: string[];
  qualificationAccess: string;
  supportTier: string;
  sponsoredAccess: boolean;
}

export interface Subscription {
  id: string;
  planId: string;
  status: string;
  renewsAt?: string;
  plan?: Plan;
}

export interface Assignment {
  id: string;
  taskId: string;
  status: string;
  acceptedAt: string;
  deadline: string | null;
}

export interface RyseProgress {
  level: string;
  nextLevel: string | null;
  metrics: {
    approvedTaskCount: number;
    rejectedCount: number;
    qualificationsPassed: number;
    qualityScore: number;
  };
  basis: string;
  note: string;
}

export interface QueueItem {
  submissionId: string;
  assignmentId: string;
  taskId: string;
  taskTitle: string;
  difficulty: string;
  reviewType: string;
  submittedAt: string;
  evidence: unknown;
  payMinor?: number;
  currency?: string;
}
