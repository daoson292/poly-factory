import React, { useState } from 'react';
import { UserProfile, RoomConfigState, ShiftSchedule, UrgentPopup, AttendanceRecord, ProjectSummary, TestCaseItem, BugItem, Position } from './types';
import { WorkspaceDesktopLayout } from './layouts/WorkspaceDesktopLayout';
import { WorkspacePwaLayout } from './layouts/WorkspacePwaLayout';
import { LoginPage } from './pages/login/LoginPage';
import { RoomStatusBanner } from './features/room/RoomStatusBanner';
import { WeeklyShiftGrid } from './features/schedule/WeeklyShiftGrid';
import { UrgentPopupModal } from './features/notifications/UrgentPopupModal';
import { LeadQrGeneratorView } from './features/attendance/LeadQrGeneratorView';
import { MemberQrScannerView } from './features/attendance/MemberQrScannerView';
import { DelegateShiftModal } from './features/attendance/DelegateShiftModal';
import { TraineeRoadmapView } from './features/training/TraineeRoadmapView';
import { LeadReviewPanel } from './features/training/LeadReviewPanel';
import { UserProfileView } from './features/profile/UserProfileView';
import { AdminLayout } from './admin/AdminLayout';
import { ServerDashboardView } from './admin/ServerDashboardView';
import { MinecraftConsoleView } from './admin/MinecraftConsoleView';
import { AdminDataManageView } from './admin/AdminDataManageView';
import { ProjectListPage } from './features/projects/ProjectListPage';
import { ProjectDetailLayout } from './features/projects/ProjectDetailLayout';
import { ProjectApplyModal } from './features/projects/ProjectApplyModal';
import { ProjectMembersTab } from './features/projects/ProjectMembersTab';
import { ProjectGithubActivityTab } from './features/projects/ProjectGithubActivityTab';
import { ProjectReleaseGatePanel } from './features/projects/ProjectReleaseGatePanel';
import { ProjectCertificateCard } from './features/projects/ProjectCertificateCard';
import { VerifyCertificatePage } from './pages/certificates/VerifyCertificatePage';
import { TestSuitesRepositoryView } from './features/testing/TestSuitesRepositoryView';
import { TestCaseEditorModal } from './features/testing/TestCaseEditorModal';
import { TestRunExecutionSplitView, ResultStatus } from './features/testing/TestRunExecutionSplitView';
import { BugTrackerTableView } from './features/testing/BugTrackerTableView';
import { BugReportModal } from './features/testing/BugReportModal';
import { BugDetailDrawer } from './features/testing/BugDetailDrawer';
import { PolyPermsTreeEditor } from './admin/polyperms/PolyPermsTreeEditor';
import { PermissionSimulatorPanel } from './admin/polyperms/PermissionSimulatorPanel';
import { MemberTalentDirectoryPage } from './features/directory/MemberTalentDirectoryPage';
import { AttendanceAndQualityReportPage } from './features/reports/AttendanceAndQualityReportPage';
import { WardrobeCustomizerView, CosmeticItem } from './features/gamification/WardrobeCustomizerView';
import { QuestBoardView, QuestItem } from './features/gamification/QuestBoardView';
import { AchievementsGalleryView, AchievementItem } from './features/gamification/AchievementsGalleryView';
import { HallOfFameLeaderboardPage, LeaderboardEntry } from './features/gamification/HallOfFameLeaderboardPage';
import { AdminCosmeticsManagerView } from './admin/gamification/AdminCosmeticsManagerView';

export const App: React.FC = () => {
  // Navigation & View Mode
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isMobilePwa, setIsMobilePwa] = useState(false);
  const [isAdminPortal, setIsAdminPortal] = useState(false);
  const [isVerifyCertPage, setIsVerifyCertPage] = useState(false);

  const [desktopMenu, setDesktopMenu] = useState('dashboard');
  const [pwaTab, setPwaTab] = useState(1);
  const [adminSection, setAdminSection] = useState('dashboard');

  // Selected Project State
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetailTab, setProjectDetailTab] = useState(1);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Modals
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false);
  const [isBugReportModalOpen, setIsBugReportModalOpen] = useState(false);
  const [selectedBug, setSelectedBug] = useState<BugItem | null>(null);
  const [isTestingSplitViewOpen, setIsTestingSplitViewOpen] = useState(false);

  // Current User Mock
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'user_sondao_01',
    email: 'sondaopk@fpt.edu.vn',
    fullName: 'Đào Duy Sơn',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    positions: ['FULLSTACK', 'BACKEND'],
    currentLevel: 12,
    currentExp: 140,
    totalExp: 1850,
    unexcusedCount: 0,
    isCurseDebuffed: false,
    activeBadges: ['Lv1', 'Lv2', 'Tốt nghiệp Training', 'Thợ Săn Bug', 'Người Gác Cổng QA']
  });

  // Room state
  const [roomState, setRoomState] = useState<RoomConfigState>({
    currentRoom: 'P407',
    status: 'OPEN',
    note: 'Xưởng mở cửa đón tiếp các ca trực bình thường.'
  });

  // Urgent Popup
  const [urgentPopup, setUrgentPopup] = useState<UrgentPopup | null>({
    id: 'notif_001',
    title: 'Nâng Cấp Hệ Thống PolyFactory v2.2.0',
    content: 'Xưởng P407 kích hoạt chế độ tự hành overnight toàn diện và phân hệ kiểm thử M17.',
    priority: 'CRITICAL',
    createdAt: '2026-11-07'
  });

  // Weekly Shifts
  const [shifts, setShifts] = useState<ShiftSchedule[]>([
    { id: 's1', shiftNumber: 1, workDate: '2026-11-07', startTime: '07:30', endTime: '09:30', isRegistered: true, isAssigned: false, canCancel: true },
    { id: 's2', shiftNumber: 2, workDate: '2026-11-07', startTime: '09:45', endTime: '11:45', isRegistered: false, isAssigned: false, canCancel: true },
    { id: 's3', shiftNumber: 3, workDate: '2026-11-07', startTime: '12:30', endTime: '14:30', isRegistered: false, isAssigned: true, canCancel: false },
    { id: 's4', shiftNumber: 4, workDate: '2026-11-07', startTime: '14:45', endTime: '16:45', isRegistered: false, isAssigned: false, canCancel: true },
    { id: 's5', shiftNumber: 5, workDate: '2026-11-07', startTime: '17:15', endTime: '19:15', isRegistered: false, isAssigned: false, canCancel: true },
    { id: 's6', shiftNumber: 6, workDate: '2026-11-07', startTime: '19:30', endTime: '21:30', isRegistered: false, isAssigned: false, canCancel: true }
  ]);

  // Attendance Records
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([
    { id: 'att_1', userId: 'u1', userName: 'Nguyễn Văn A', userEmail: 'anv@fpt.edu.vn', checkInTime: '07:32', isGpsValid: true, distanceMeters: 45, isWalkIn: false, status: 'ATTENDED' },
    { id: 'att_2', userId: 'u2', userName: 'Trần Thị B', userEmail: 'btt@fpt.edu.vn', checkInTime: '07:35', isGpsValid: true, distanceMeters: 80, isWalkIn: false, status: 'ATTENDED' }
  ]);

  // Projects
  const [projects, setProjects] = useState<ProjectSummary[]>([
    { id: 'p1', code: 'PROJ-PF', name: 'PolyFactory v2.2.0 Monolith', description: 'Nền tảng Quản lý Xưởng Thực Chiến FPT Polytechnic.', status: 'ACTIVE', visibility: 'PUBLIC', leadName: 'Đào Duy Sơn', membersCount: 6 },
    { id: 'p2', code: 'PROJ-LMS', name: 'PolyLMS Learning Portal', description: 'Cổng học tập trực tuyến sinh viên.', status: 'PLANNING', visibility: 'PRIVATE', membersCount: 3 }
  ]);

  // Test Cases
  const testCasesList: TestCaseItem[] = [
    { id: 'tc1', code: 'TC-01', title: 'Xác thực đăng nhập email ngoài Whitelist (E-polyfactory-001)', priority: 'CRITICAL', steps: [{ stepNumber: 1, action: 'Nhập email test@gmail.com', expectedResult: 'Báo lỗi E-polyfactory-001' }] },
    { id: 'tc2', code: 'TC-02', title: 'Kiểm tra điểm danh QR TOTP ngoài bán kính 150m', priority: 'HIGH', steps: [{ stepNumber: 1, action: 'Quét QR với GPS 250m', expectedResult: 'Hiện icon GPS Đỏ và gắn cờ' }] },
    { id: 'tc3', code: 'TC-03', title: 'Quy tắc 4 mắt: Dev sửa không được tự đóng bug', priority: 'CRITICAL', steps: [{ stepNumber: 1, action: 'Bấm đóng bug bởi fixerId', expectedResult: 'Chặn với lỗi E-polyfactory-302' }] }
  ];

  // Bugs
  const [bugsList, setBugsList] = useState<BugItem[]>([
    { id: 'b1', code: 'BUG-01', title: 'Màn hình trắng khi xuất báo cáo Excel tuần', severity: 'HIGH', status: 'RESOLVED', reporterName: 'Tester Hoàng', fixerName: 'Dev Nam', evidenceImages: ['/storage/bugs/b1.png'], fixReference: 'https://github.com/fpt/polyfactory/pull/15' },
    { id: 'b2', code: 'BUG-02', title: 'Lỗi văng mã lỗi 500 khi nộp bài tập link rỗng', severity: 'MEDIUM', status: 'OPEN', reporterName: 'Tester Minh', evidenceImages: [] }
  ]);

  // Cosmetics Inventory
  const [cosmetics, setCosmetics] = useState<CosmeticItem[]>([
    { id: 'c1', name: 'Khung Tân Binh', type: 'AVATAR_FRAME_STATIC', rarity: 'COMMON', filePath: '/storage/cosmetics/frame_tanbinh.png', requiredLevel: 1, isUnlocked: true, isEquipped: false },
    { id: 'c2', name: 'Khung Phượng Hoàng Lửa (GIF)', type: 'AVATAR_FRAME_GIF', rarity: 'LEGENDARY', filePath: '/storage/cosmetics/frame_phoenix.gif', requiredLevel: 10, isUnlocked: true, isEquipped: true },
    { id: 'c3', name: 'Khung Rồng Vàng Neon', type: 'AVATAR_FRAME_GIF', rarity: 'EPIC', filePath: '/storage/cosmetics/frame_dragon.gif', requiredLevel: 15, isUnlocked: false, isEquipped: false },
    { id: 'c4', name: 'Màu Tên Hoàng Kim', type: 'NAME_COLOR', rarity: 'LEGENDARY', filePath: '#f59e0b', requiredLevel: 10, isUnlocked: true, isEquipped: true }
  ]);

  // Quests
  const [questsList, setQuestsList] = useState<QuestItem[]>([
    { id: 'q1', title: 'Đăng ký lịch trực trước 2 tiếng', type: 'DAILY', targetCount: 1, currentCount: 1, expReward: 10, isCompleted: true, isClaimed: false },
    { id: 'q2', title: 'Điểm danh đúng giờ ca sáng', type: 'DAILY', targetCount: 1, currentCount: 0, expReward: 10, isCompleted: false, isClaimed: false },
    { id: 'q3', title: 'Thực thi đủ 5 kịch bản kiểm thử trong tuần', type: 'WEEKLY', targetCount: 5, currentCount: 5, expReward: 30, isCompleted: true, isClaimed: true }
  ]);

  // Achievements
  const achievementsList: AchievementItem[] = [
    { id: 'ach1', code: 'ACH-ATT-10', title: 'Chiến Thần Chuyên Cần', description: 'Có mặt đầy đủ 10 ca trực xưởng.', icon: '🏆', expReward: 50, isUnlocked: true, unlockedAt: '2026-11-05' },
    { id: 'ach2', code: 'ACH-BUG-10', title: 'Thợ Săn Bug Chuyên Nghiệp', description: 'Phát hiện và báo cáo 10 bug hợp lệ.', icon: '🎯', expReward: 50, isUnlocked: true, unlockedAt: '2026-11-06' },
    { id: 'ach3', code: 'ACH-QA-50', title: 'Người Gác Cổng Chất Lượng', description: 'Thực thi 50 kịch bản kiểm thử M17.', icon: '🛡️', expReward: 100, isUnlocked: false }
  ];

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  if (isVerifyCertPage) {
    return (
      <div>
        <div style={{ backgroundColor: '#111827', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setIsVerifyCertPage(false)} style={{ padding: '6px 12px', backgroundColor: '#374151', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            ← Quay lại Workspace
          </button>
        </div>
        <VerifyCertificatePage />
      </div>
    );
  }

  // Switch between Desktop and PWA layout mode
  const renderTopControls = () => (
    <div style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={() => setIsMobilePwa(false)}
          style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: !isMobilePwa ? '#f97316' : '#0f172a', color: '#fff', cursor: 'pointer' }}
        >
          🖥️ Web PC
        </button>
        <button
          onClick={() => setIsMobilePwa(true)}
          style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: isMobilePwa ? '#f97316' : '#0f172a', color: '#fff', cursor: 'pointer' }}
        >
          📱 PWA 4 Tab
        </button>
        <button
          onClick={() => setIsAdminPortal(!isAdminPortal)}
          style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: isAdminPortal ? '#38bdf8' : '#0f172a', color: isAdminPortal ? '#000' : '#fff', cursor: 'pointer', fontWeight: 'bold' }}
        >
          🛡️ Admin Portal
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setIsVerifyCertPage(true)}
          style={{ padding: '4px 8px', backgroundColor: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', borderRadius: '4px', cursor: 'pointer' }}
        >
          🔍 Tra Cứu Chứng Chỉ
        </button>
        <button
          onClick={() => setIsLoggedIn(false)}
          style={{ padding: '4px 8px', backgroundColor: '#7f1d1d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );

  // Admin Portal View
  if (isAdminPortal) {
    return (
      <div>
        {renderTopControls()}
        <AdminLayout
          adminRole="SUPER_ADMIN"
          activeSection={adminSection}
          onNavigate={(sec) => setAdminSection(sec)}
        >
          {adminSection === 'dashboard' && (
            <ServerDashboardView
              metrics={{
                cpuUsagePercent: 24,
                memoryUsedMb: 850,
                memoryLimitMb: 1200,
                postgresConnections: 6,
                maxPostgresConnections: 18,
                uptimeSeconds: 86400
              }}
            />
          )}

          {adminSection === 'console' && <MinecraftConsoleView />}

          {adminSection === 'users' && (
            <AdminDataManageView
              members={[
                { id: '1', email: 'sondaopk@fpt.edu.vn', fullName: 'Đào Duy Sơn', role: 'DEVELOPER', status: 'ACTIVE', currentExp: 140 },
                { id: '2', email: 'hoangnv@fpt.edu.vn', fullName: 'Nguyễn Văn Hoàng', role: 'MEMBER', status: 'ACTIVE', currentExp: 65 }
              ]}
              auditLogs={[
                { id: 'a1', timestamp: '2026-11-07 02:15', actorEmail: 'admin_sondao', action: 'ADJUST_EXP', targetEmail: 'hoangnv@fpt.edu.vn', reason: 'Thưởng đóng góp đồ án kiểm thử M17 hoàn thành 100%' }
              ]}
              onAddMember={async () => {}}
              onUpdateStatus={async () => {}}
              onAdjustExp={async () => true}
            />
          )}

          {adminSection === 'polyperms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <PolyPermsTreeEditor
                rolesHierarchy={[
                  { role: 'DEFAULT', nodes: ['member.view', 'schedule.view'] },
                  { role: 'TRAINEE', inheritsFrom: 'DEFAULT', nodes: ['training.submit', 'attendance.scan'] },
                  { role: 'MEMBER', inheritsFrom: 'TRAINEE', nodes: ['project.apply', 'gamification.view'] },
                  { role: 'TEAM_LEAD', inheritsFrom: 'MEMBER', nodes: ['attendance.open', 'attendance.delegate', 'training.review'] },
                  { role: 'MENTOR', inheritsFrom: 'TEAM_LEAD', nodes: ['project.override', 'report.export'] },
                  { role: 'DEVELOPER', inheritsFrom: 'MENTOR', nodes: ['system.config.manage', 'polyperms.admin'] }
                ]}
                allPermissionNodes={['member.view', 'attendance.scan', 'attendance.open', 'attendance.delegate', 'attendance.close', 'training.submit', 'training.review', 'testing.bug.triage', 'system.config.manage']}
                onToggleNode={async () => {}}
              />

              <PermissionSimulatorPanel
                onSimulate={async (email, node) => ({
                  hasPermission: true,
                  finalStepMatched: 4,
                  reason: `Quyền được cấp thông qua vai trò kế thừa của DEVELOPER.`,
                  steps: [
                    { stepNumber: 1, stepName: 'Kiểm tra trạng thái tài khoản', result: 'PASS', detail: 'Tài khoản ACTIVE, không bị khóa' },
                    { stepNumber: 2, stepName: 'Kiểm tra cấm cá nhân (-node)', result: 'PASS', detail: 'Không có ngoại lệ cấm node' },
                    { stepNumber: 3, stepName: 'Kiểm tra quyền cá nhân (+node)', result: 'SKIPPED', detail: 'Không có node cá nhân' },
                    { stepNumber: 4, stepName: 'Kiểm tra quyền vai trò chính', result: 'MATCHED', detail: `DEVELOPER sở hữu node ${node}` },
                    { stepNumber: 5, stepName: 'Kiểm tra nhóm phụ', result: 'SKIPPED', detail: 'Đã tìm thấy ở bước 4' },
                    { stepNumber: 6, stepName: 'Kiểm tra vai trò ủy quyền', result: 'SKIPPED', detail: 'Đã tìm thấy ở bước 4' },
                    { stepNumber: 7, stepName: 'Kết luận mặc định', result: 'SKIPPED', detail: 'Cho phép' }
                  ]
                })}
              />
            </div>
          )}

          {adminSection === 'cosmetics' && (
            <AdminCosmeticsManagerView
              catalog={cosmetics}
              onCreateCosmetic={async () => {}}
              onMassAwardCosmetic={async () => {}}
            />
          )}

          {adminSection === 'audit' && (
            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '10px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>📜 Toàn bộ Audit Log hệ thống</h3>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>Dữ liệu kiểm toán bảo mật bất biến được ghi nhận tự động.</div>
            </div>
          )}
        </AdminLayout>
      </div>
    );
  }

  // Selected Project Detail View (5 Tabs)
  if (selectedProjectId) {
    const currentProj = projects.find(p => p.id === selectedProjectId) || projects[0];

    return (
      <div>
        {renderTopControls()}
        <div style={{ padding: '24px 32px', backgroundColor: '#090d16', minHeight: 'calc(100vh - 40px)' }}>
          <ProjectDetailLayout
            project={currentProj}
            activeTab={projectDetailTab}
            onTabChange={(tab) => setProjectDetailTab(tab)}
            onBack={() => setSelectedProjectId(null)}
          >
            {projectDetailTab === 1 && (
              <div style={{ backgroundColor: '#111827', padding: '24px', borderRadius: '10px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#ffffff' }}>Tổng Quan Dự Án</h3>
                <p style={{ color: '#cbd5e1', lineHeight: 1.5 }}>{currentProj.description}</p>
                <button
                  onClick={() => setIsApplyModalOpen(true)}
                  style={{ marginTop: '16px', padding: '10px 18px', backgroundColor: '#f97316', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  📝 Đăng Ký Đảm Nhận Công Pháp
                </button>
              </div>
            )}

            {projectDetailTab === 2 && (
              <ProjectMembersTab
                members={[
                  { id: 'm1', fullName: 'Đào Duy Sơn', email: 'sondaopk@fpt.edu.vn', position: 'FULLSTACK', isProjectLead: true, canTest: true, isDeliverableVerified: true },
                  { id: 'm2', fullName: 'Lê Minh Trí', email: 'trilm@fpt.edu.vn', position: 'UI_UX', isProjectLead: false, canTest: false, isDeliverableVerified: true },
                  { id: 'm3', fullName: 'Phạm Thu Hà', email: 'hapt@fpt.edu.vn', position: 'BA', isProjectLead: false, canTest: true, isDeliverableVerified: false }
                ]}
                isProjectLeadOrAdmin={true}
                onVerifyDeliverable={async () => {}}
                onToggleCanTest={async () => {}}
              />
            )}

            {projectDetailTab === 3 && (
              <ProjectGithubActivityTab
                repoUrl="https://github.com/fpt/polyfactory"
                activities={[
                  { id: 'g1', type: 'COMMIT', authorName: 'Đào Duy Sơn', githubUsername: 'sondao', message: 'feat: implement Testing Module M17 with 4-eyes rule', shaOrPrNumber: 'commit 8e4b1a', expAwarded: 5, timestamp: '10 phút trước' },
                  { id: 'g2', type: 'PR_MERGED', authorName: 'Đào Duy Sơn', githubUsername: 'sondao', message: 'merge pull request #14: PolyPerms 7-step simulator', shaOrPrNumber: 'PR #14', expAwarded: 15, timestamp: '1 giờ trước' }
                ]}
              />
            )}

            {projectDetailTab === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {isTestingSplitViewOpen ? (
                  <div>
                    <button
                      onClick={() => setIsTestingSplitViewOpen(false)}
                      style={{ padding: '6px 12px', backgroundColor: '#374151', color: '#cbd5e1', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '12px' }}
                    >
                      ← Đóng Trình Chạy Split-View
                    </button>
                    <TestRunExecutionSplitView
                      testRunTitle="Đợt Kiểm Thử Release Candidate v2.2.0"
                      cases={[
                        { id: 'trc1', testCase: testCasesList[0], status: 'PASSED' },
                        { id: 'trc2', testCase: testCasesList[1], status: 'PASSED' },
                        { id: 'trc3', testCase: testCasesList[2], status: 'UNTESTED' }
                      ]}
                      onSetResult={async () => {}}
                      onCreateBugFromStep={() => setIsBugReportModalOpen(true)}
                      onCloseTestRun={async () => {}}
                    />
                  </div>
                ) : (
                  <>
                    <TestSuitesRepositoryView
                      suites={[{ id: 's1', name: 'Định Danh & Phân Quyền (M01-M02)', testCases: testCasesList }]}
                      onOpenCreateCaseModal={() => setIsCreateCaseModalOpen(true)}
                      onStartTestRun={() => setIsTestingSplitViewOpen(true)}
                    />

                    <BugTrackerTableView
                      bugs={bugsList}
                      onSelectBug={(b) => setSelectedBug(b)}
                      onOpenReportModal={() => setIsBugReportModalOpen(true)}
                    />
                  </>
                )}
              </div>
            )}

            {projectDetailTab === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <ProjectReleaseGatePanel
                  summary={{
                    canComplete: true,
                    criticalBugsCount: 0,
                    highBugsCount: 0,
                    openBugsCount: 1,
                    untestedCasesCount: 0,
                    deliverablesAllVerified: true
                  }}
                  isMentorOrDeveloper={true}
                  onCompleteProject={async () => true}
                />

                <div style={{ backgroundColor: '#111827', borderRadius: '12px', padding: '24px' }}>
                  <h3 style={{ margin: '0 0 16px 0', color: '#ffffff' }}>Thẻ Chứng Chỉ Dự Án Mẫu</h3>
                  <ProjectCertificateCard
                    certificateCode="PF-CERT-2026-0001"
                    recipientName="Đào Duy Sơn"
                    projectName="PolyFactory v2.2.0 Monolith"
                    position="FULLSTACK"
                    issuedDate="2026-11-07"
                    metricsSummary="48 Commits • 14 PRs Merged • 77 Unit Tests Passing"
                  />
                </div>
              </div>
            )}
          </ProjectDetailLayout>
        </div>

        <ProjectApplyModal
          isOpen={isApplyModalOpen}
          userRole={currentUser.role}
          userPositions={currentUser.positions}
          onClose={() => setIsApplyModalOpen(false)}
          onApply={async () => true}
        />

        <TestCaseEditorModal
          isOpen={isCreateCaseModalOpen}
          suiteId="s1"
          onClose={() => setIsCreateCaseModalOpen(false)}
          onSave={async () => {}}
        />

        <BugReportModal
          isOpen={isBugReportModalOpen}
          onClose={() => setIsBugReportModalOpen(false)}
          onSubmitBug={async () => {}}
        />

        <BugDetailDrawer
          bug={selectedBug}
          currentUserId={currentUser.fullName}
          isProjectLead={true}
          onClose={() => setSelectedBug(null)}
          onResolveBug={async () => true}
          onVerifyAndCloseBug={async () => true}
          onReopenBug={async () => true}
        />
      </div>
    );
  }

  // PWA Layout (Mobile 375px)
  if (isMobilePwa) {
    return (
      <div>
        {renderTopControls()}
        <WorkspacePwaLayout
          currentUser={currentUser}
          activeTab={pwaTab}
          onTabChange={(t) => setPwaTab(t)}
        >
          {urgentPopup && (
            <UrgentPopupModal
              popup={urgentPopup}
              onAcknowledge={() => setUrgentPopup(null)}
            />
          )}

          {pwaTab === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <RoomStatusBanner roomState={roomState} />
              <WeeklyShiftGrid
                shifts={shifts}
                onRegisterShift={() => {}}
                onCancelShift={() => {}}
                onCopyLastWeek={() => {}}
              />
            </div>
          )}

          {pwaTab === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <MemberQrScannerView
                onScanSuccess={async () => ({ success: true, expAwarded: 10 })}
              />
            </div>
          )}

          {pwaTab === 3 && (
            <ProjectListPage
              projects={projects}
              onSelectProject={(id) => setSelectedProjectId(id)}
            />
          )}

          {pwaTab === 4 && (
            <UserProfileView
              user={currentUser}
              streakCount={5}
              onUpdatePositions={async (newPos) => {
                setCurrentUser({ ...currentUser, positions: newPos });
              }}
            />
          )}
        </WorkspacePwaLayout>
      </div>
    );
  }

  // Web PC Workspace Layout
  return (
    <div>
      {renderTopControls()}
      {urgentPopup && (
        <UrgentPopupModal
          popup={urgentPopup}
          onAcknowledge={() => setUrgentPopup(null)}
        />
      )}

      <WorkspaceDesktopLayout
        currentUser={currentUser}
        activeMenu={desktopMenu}
        onNavigate={(menu) => setDesktopMenu(menu)}
      >
        {desktopMenu === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <RoomStatusBanner
              roomState={roomState}
              canManageRoom={true}
              onUpdateStatus={(st, note) => setRoomState({ ...roomState, status: st, note })}
            />
            <WeeklyShiftGrid
              shifts={shifts}
              onRegisterShift={(id) => {
                setShifts(shifts.map(s => s.id === id ? { ...s, isRegistered: true } : s));
              }}
              onCancelShift={(id) => {
                setShifts(shifts.map(s => s.id === id ? { ...s, isRegistered: false } : s));
              }}
              onCopyLastWeek={() => {}}
            />
          </div>
        )}

        {desktopMenu === 'attendance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <LeadQrGeneratorView
              shiftNumber={1}
              records={attendanceRecords}
              onDelegateShift={() => setIsDelegateModalOpen(true)}
              onManualCheckIn={() => {}}
            />
            <MemberQrScannerView
              onScanSuccess={async () => ({ success: true, expAwarded: 10 })}
            />
          </div>
        )}

        {desktopMenu === 'training' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <TraineeRoadmapView
              currentLevel={1}
              tasks={[
                { id: 't1', title: 'Đọc và cam kết nội quy phòng xưởng P407', level: 1, isRequired: true, isSubmitted: true, status: 'APPROVED' },
                { id: 't2', title: 'Cài đặt môi trường Docker & Git', level: 1, isRequired: true, isSubmitted: false, status: 'PENDING' }
              ]}
              onSubmitTask={async () => true}
            />
            <LeadReviewPanel
              candidates={[
                { id: 'c1', fullName: 'Lê Hoàng Long', email: 'longlh@fpt.edu.vn', currentLevel: 1, completedTasksPercent: 100, attendancePercent: 85, isRecommended: true }
              ]}
              onApproveLevelUp={async () => {}}
            />
          </div>
        )}

        {desktopMenu === 'projects' && (
          <ProjectListPage
            projects={projects}
            onSelectProject={(id) => {
              setSelectedProjectId(id);
              setProjectDetailTab(1);
            }}
          />
        )}

        {desktopMenu === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <UserProfileView
              user={currentUser}
              streakCount={5}
              onUpdatePositions={async (newPos) => {
                setCurrentUser({ ...currentUser, positions: newPos });
              }}
            />
            <WardrobeCustomizerView
              userLevel={currentUser.currentLevel}
              userName={currentUser.fullName}
              inventory={cosmetics}
              onEquipCosmetic={async (id) => {
                setCosmetics(cosmetics.map(c => c.id === id ? { ...c, isEquipped: true } : (c.type === cosmetics.find(x => x.id === id)?.type ? { ...c, isEquipped: false } : c)));
              }}
              onUnequipCosmetic={async (id) => {
                setCosmetics(cosmetics.map(c => c.id === id ? { ...c, isEquipped: false } : c));
              }}
            />
            <QuestBoardView
              quests={questsList}
              onClaimReward={async (qid) => {
                setQuestsList(questsList.map(q => q.id === qid ? { ...q, isClaimed: true } : q));
              }}
            />
            <AchievementsGalleryView achievements={achievementsList} />
            <HallOfFameLeaderboardPage
              attendanceTop={[
                { rank: 1, userId: 'u1', fullName: 'Đào Duy Sơn', position: 'FULLSTACK', level: 12, metricValue: 24, metricLabel: 'ca trực' },
                { rank: 2, userId: 'u2', fullName: 'Nguyễn Văn Hoàng', position: 'BACKEND', level: 9, metricValue: 21, metricLabel: 'ca trực' },
                { rank: 3, userId: 'u3', fullName: 'Trần Minh Tâm', position: 'FRONTEND', level: 8, metricValue: 18, metricLabel: 'ca trực' }
              ]}
              githubTop={[
                { rank: 1, userId: 'u1', fullName: 'Đào Duy Sơn', position: 'FULLSTACK', level: 12, metricValue: 56, metricLabel: 'commits' },
                { rank: 2, userId: 'u4', fullName: 'Lê Bảo Anh', position: 'FRONTEND', level: 10, metricValue: 42, metricLabel: 'commits' },
                { rank: 3, userId: 'u5', fullName: 'Vũ Quốc Huy', position: 'BACKEND', level: 7, metricValue: 31, metricLabel: 'commits' }
              ]}
              qaTop={[
                { rank: 1, userId: 'u6', fullName: 'Phạm Thu Trang', position: 'TESTER', level: 11, metricValue: 19, metricLabel: 'bugs bắt được' },
                { rank: 2, userId: 'u7', fullName: 'Hoàng Gia Bảo', position: 'TESTER', level: 8, metricValue: 14, metricLabel: 'bugs bắt được' },
                { rank: 3, userId: 'u8', fullName: 'Đỗ Hải Đăng', position: 'TESTER', level: 6, metricValue: 9, metricLabel: 'bugs bắt được' }
              ]}
            />
          </div>
        )}

        {desktopMenu === 'directory' && (
          <MemberTalentDirectoryPage
            members={[
              { id: '1', fullName: 'Đào Duy Sơn', email: 'sondaopk@fpt.edu.vn', positions: ['FULLSTACK', 'BACKEND'], techSkills: ['React 19', 'NestJS', 'PostgreSQL', 'Docker', 'TypeScript'], isAvailable: true, currentLevel: 12, completedProjectsCount: 4 },
              { id: '2', fullName: 'Lê Minh Trí', email: 'trilm@fpt.edu.vn', positions: ['UI_UX'], techSkills: ['Figma', 'Design System', 'Prototyping'], isAvailable: false, currentLevel: 8, completedProjectsCount: 2 }
            ]}
            onContactMember={() => {}}
          />
        )}

        {desktopMenu === 'reports' && (
          <AttendanceAndQualityReportPage
            attendanceMetrics={{
              totalScheduledShifts: 120,
              attendedShifts: 105,
              walkInShifts: 18,
              excusedAbsences: 10,
              unexcusedAbsences: 5,
              attendanceRatePercent: 87.5
            }}
            testingMetrics={{
              totalTestCases: 45,
              executedCasesCount: 45,
              passRatePercent: 95.5,
              totalBugsReported: 12,
              closedBugsCount: 11,
              criticalBugsPending: 0
            }}
            onDownloadAttendanceExcel={() => {}}
            onDownloadTestingExcel={() => {}}
          />
        )}
      </WorkspaceDesktopLayout>

      <DelegateShiftModal
        isOpen={isDelegateModalOpen}
        onClose={() => setIsDelegateModalOpen(false)}
        onConfirmDelegate={async () => true}
      />
    </div>
  );
};

export default App;
