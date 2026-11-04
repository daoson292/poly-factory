export type UserRole = 'TRAINEE' | 'MEMBER' | 'TEAM_LEAD' | 'MENTOR' | 'DEVELOPER';
export type UserStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'ALUMNI' | 'LOCKED';
export type Position = 'FRONTEND' | 'BACKEND' | 'FULLSTACK' | 'TESTER' | 'UI_UX' | 'BA';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  positions: Position[];
  teamId?: string;
  currentLevel: number;
  currentExp: number;
  totalExp: number;
  unexcusedCount: number;
  isCurseDebuffed: boolean;
  activeBadges: string[];
}

export type RoomStatus = 'OPEN' | 'MOVED' | 'CLOSED';

export interface RoomConfigState {
  currentRoom: string;
  status: RoomStatus;
  note?: string;
  revertAt?: string;
}

export interface ShiftSchedule {
  id: string;
  shiftNumber: number; // 1 to 6
  workDate: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  isRegistered: boolean;
  isAssigned: boolean;
  canCancel: boolean;
}

export interface UrgentPopup {
  id: string;
  title: string;
  content: string;
  priority: 'HIGH' | 'CRITICAL';
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  checkInTime: string;
  isGpsValid: boolean;
  distanceMeters: number;
  isWalkIn: boolean;
  status: 'ATTENDED' | 'LATE' | 'EXCUSED_ABSENCE' | 'UNEXCUSED_ABSENCE';
}

export interface ProjectSummary {
  id: string;
  code: string;
  name: string;
  description: string;
  status: 'PLANNING' | 'ACTIVE' | 'TESTING' | 'COMPLETED' | 'ARCHIVED';
  visibility: 'PUBLIC' | 'PRIVATE';
  repoUrl?: string;
  leadName?: string;
  membersCount: number;
}

export interface TestCaseItem {
  id: string;
  code: string;
  title: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  steps: { stepNumber: number; action: string; expectedResult: string }[];
}

export interface BugItem {
  id: string;
  code: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  reporterName: string;
  fixerName?: string;
  verifiedByName?: string;
  evidenceImages: string[];
  fixReference?: string;
}
