export type ScanOrigin = "LIVE" | "DEMO";
export type ScanStatus = "COMPLETED" | "FAILED";
export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ShareAccess = "PRIVATE" | "PUBLIC";
export type WorkspaceType = "PERSONAL" | "TEAM";
export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type InviteStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
export type ScanJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
export type AuditEventAction =
  | "SCAN_REQUESTED"
  | "SCAN_STARTED"
  | "SCAN_COMPLETED"
  | "SCAN_FAILED"
  | "SCAN_REUSED"
  | "SCAN_RETRIED"
  | "SHARE_CREATED"
  | "SHARE_REVOKED"
  | "SHARE_OPENED"
  | "REPORT_EXPORTED"
  | "RATE_LIMIT_TRIGGERED"
  | "WORKSPACE_CREATED"
  | "WORKSPACE_SWITCHED"
  | "INVITE_CREATED"
  | "INVITE_ACCEPTED"
  | "INVITE_REVOKED"
  | "INVITE_REFRESHED"
  | "MEMBER_ROLE_UPDATED"
  | "MEMBER_REMOVED";

export interface HeaderSnapshot {
  "content-security-policy": string | null;
  "strict-transport-security": string | null;
  "x-frame-options": string | null;
  "x-content-type-options": string | null;
  "referrer-policy": string | null;
}

export interface CookieSnapshot {
  totalVisible: number;
  secureCount: number;
  httpOnlyCount: number;
  sameSiteCount: number;
  insecureCookies: string[];
  sampleCookies: string[];
}

export interface TlsSnapshot {
  reachable: boolean;
  validTo: string | null;
  daysRemaining: number | null;
  expired: boolean;
  error: string | null;
}

export interface DnsAuthSnapshot {
  spf: boolean | null;
  dmarc: boolean | null;
  spfRecord: string | null;
  dmarcRecord: string | null;
  mtaSts: boolean | null;
  mtaStsRecord: string | null;
  caaPresent: boolean | null;
  caaRecords: string[];
}

export interface RobotsSnapshot {
  reachable: boolean;
  status: number | null;
  location: string | null;
}

export interface SecurityTextSnapshot {
  reachable: boolean;
  status: number | null;
  location: string | null;
  canonicalUrl: string | null;
  contactLines: string[];
  expires: string | null;
  source: "well-known" | "root" | null;
}

export interface DiscoverySnapshot {
  robotsTxt: RobotsSnapshot;
  securityTxt: SecurityTextSnapshot;
}

export interface SignalSnapshot {
  normalizedUrl: string;
  hostname: string;
  httpsReachable: boolean;
  httpRedirectToHttps: boolean;
  httpStatus: number | null;
  httpsStatus: number | null;
  headers: HeaderSnapshot;
  cookieSnapshot: CookieSnapshot;
  tls: TlsSnapshot;
  dnsAuth: DnsAuthSnapshot;
  discovery: DiscoverySnapshot;
  responseNotes: string[];
}

export interface FindingRecord {
  title: string;
  severity: Severity;
  category: string;
  summary: string;
  evidence?: string | null;
  recommendation: string;
  displayOrder: number;
}

export interface RemediationStep {
  priority: "Immediate" | "Next sprint" | "Backlog";
  title: string;
  detail: string;
}

export interface PlainEnglishExplanation {
  term: string;
  explanation: string;
}

export interface ReportRecord {
  technicalNarrative: string;
  remediationPlan: RemediationStep[];
  plainEnglish: PlainEnglishExplanation[];
  generatedByAi: boolean;
}

export interface OrganizationRecord {
  id: string;
  slug: string;
  name: string;
  type: WorkspaceType;
  description: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipRecord {
  id: string;
  organizationId: string;
  userId: string;
  displayName: string | null;
  emailAddress: string | null;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSummary extends OrganizationRecord {
  membershipId: string;
  role: WorkspaceRole;
  memberCount: number;
  scanCount: number;
}

export interface WorkspaceInviteRecord {
  id: string;
  organizationId: string;
  invitedByUserId: string;
  emailAddress: string;
  displayName: string | null;
  role: WorkspaceRole;
  token: string;
  status: InviteStatus;
  acceptedByUserId: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShareLinkRecord {
  id: string;
  scanId: string;
  ownerUserId: string;
  token: string;
  access: ShareAccess;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
}

export interface ReportExportRecord {
  id: string;
  scanId: string;
  ownerUserId: string;
  format: string;
  createdAt: string;
}

export interface ScanJobRecord {
  id: string;
  ownerUserId: string;
  organizationId: string;
  targetInput: string;
  normalizedUrl: string;
  hostname: string;
  dedupeKey: string;
  status: ScanJobStatus;
  progressLabel: string | null;
  errorMessage: string | null;
  attemptCount: number;
  resultScanId: string | null;
  availableAt: string;
  leaseExpiresAt: string | null;
  workerId: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  lastHeartbeatAt: string | null;
  durationMs: number | null;
}

export interface AuditEventRecord {
  id: string;
  actorUserId: string | null;
  organizationId: string | null;
  scanId: string | null;
  jobId: string | null;
  action: AuditEventAction;
  target: string | null;
  detail: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface WorkspaceObservabilitySnapshot {
  queuedJobs: number;
  processingJobs: number;
  completedJobs24h: number;
  failedJobs24h: number;
  retryingJobs24h: number;
  staleJobs: number;
  averageDurationMs: number | null;
  recentFailures: ScanJobRecord[];
  recentJobs: ScanJobRecord[];
}

export interface StoredScan {
  id: string;
  ownerUserId: string | null;
  organizationId: string | null;
  workspace: WorkspaceSummary | null;
  targetInput: string;
  normalizedUrl: string;
  hostname: string;
  origin: ScanOrigin;
  status: ScanStatus;
  overallScore: number;
  executiveSummary: string;
  signalSnapshot: SignalSnapshot;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  findings: FindingRecord[];
  report: ReportRecord;
  shareLink?: ShareLinkRecord | null;
  exportCount?: number;
}
