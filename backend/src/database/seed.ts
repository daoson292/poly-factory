import { AdminRole, PrismaClient, RoomStatus, TagType, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface SeedPermissionNodeDef {
  nodeId: string;
  module: string;
  description: string;
}

export const PERMISSION_NODES_V220: SeedPermissionNodeDef[] = [
  // M01 - Member
  { nodeId: 'member.view', module: 'auth', description: 'Xem danh sách thành viên xưởng' },
  { nodeId: 'member.create', module: 'auth', description: 'Thêm thành viên vào Whitelist' },
  { nodeId: 'member.status.manage', module: 'auth', description: 'Chuyển UserStatus sang ALUMNI hoặc LOCKED' },
  // M04 - Room
  { nodeId: 'room.status.view', module: 'rooms', description: 'Xem trạng thái phòng xưởng P407' },
  { nodeId: 'room.status.update', module: 'rooms', description: 'Cập nhật đổi/đóng phòng xưởng' },
  // M05 - Schedule
  { nodeId: 'schedule.view', module: 'schedules', description: 'Xem lịch trực xưởng' },
  { nodeId: 'schedule.register', module: 'schedules', description: 'Đăng ký lịch trực trước >= 2 tiếng' },
  { nodeId: 'schedule.assign', module: 'schedules', description: 'Phân công / triệu tập ca trực' },
  // M06 - Attendance
  { nodeId: 'attendance.qr.create', module: 'attendance', description: 'Mở phiên QR điểm danh' },
  { nodeId: 'attendance.qr.delegate', module: 'attendance', description: 'Nút ủy quyền trực ca trên PWA' },
  { nodeId: 'attendance.qr.scan', module: 'attendance', description: 'Tự quét mã QR điểm danh' },
  { nodeId: 'attendance.manual.override', module: 'attendance', description: 'Điểm danh tay & Điểm danh bù' },
  // M07 - Ticket
  { nodeId: 'ticket.create', module: 'tickets', description: 'Tạo đơn xin nghỉ / xin đi muộn' },
  { nodeId: 'ticket.review', module: 'tickets', description: 'Duyệt / từ chối đơn xin phép' },
  // M09 - Training
  { nodeId: 'training.task.view', module: 'training', description: 'Xem danh sách bài tập của mình' },
  { nodeId: 'training.task.submit', module: 'training', description: 'Nộp link kết quả bài làm' },
  { nodeId: 'training.task.manage', module: 'training', description: 'Giao bài tập cho Trainee / Member' },
  { nodeId: 'training.task.review', module: 'training', description: 'Chấm duyệt bài nộp (reviewer_id != assignee_id)' },
  { nodeId: 'training.level.approve', module: 'training', description: 'Duyệt cấp Tag Lv1, Lv2 và tốt nghiệp lên MEMBER' },
  // M10 - Project
  { nodeId: 'project.view.public', module: 'projects', description: 'Xem thẻ dự án công khai' },
  { nodeId: 'project.view.private', module: 'projects', description: 'Xem thẻ dự án riêng tư (ProjectRoleGuard)' },
  { nodeId: 'project.apply', module: 'projects', description: 'Đăng ký tham gia dự án theo Công pháp' },
  { nodeId: 'project.create', module: 'projects', description: 'Tạo thẻ dự án mới' },
  { nodeId: 'project.complete', module: 'projects', description: 'Chốt hoàn thành dự án (qua Release Gate) & cấp chứng chỉ' },
  // M17 - Testing & Bug Tracker
  { nodeId: 'testing.suite.manage', module: 'testing', description: 'Tạo / sửa / xóa mềm Bộ kịch bản & Kịch bản kiểm thử' },
  { nodeId: 'testing.run.create', module: 'testing', description: 'Tạo Đợt kiểm thử (Test Run) mới trong dự án' },
  { nodeId: 'testing.run.execute', module: 'testing', description: 'Chấm kết quả PASSED / FAILED / BLOCKED / SKIPPED' },
  { nodeId: 'testing.run.close', module: 'testing', description: 'Khóa sổ Đợt kiểm thử & xét thưởng +15 EXP' },
  { nodeId: 'testing.bug.report', module: 'testing', description: 'Tạo báo cáo lỗi (Bug Report) kèm ảnh/link video' },
  { nodeId: 'testing.bug.resolve', module: 'testing', description: 'Nhận sửa bug & cập nhật trạng thái RESOLVED kèm fix_reference' },
  { nodeId: 'testing.bug.verify', module: 'testing', description: 'Kiểm thử lại bug (CLOSED hoặc REOPENED, tuân thủ luật 4 mắt)' },
  { nodeId: 'testing.bug.triage', module: 'testing', description: 'Phân xử tranh chấp bug & xác nhận mức độ CRITICAL' },
  // M11 - Reward / Gamification
  { nodeId: 'reward.view', module: 'gamification', description: 'Xem hồ sơ EXP, bảng xếp hạng, chứng chỉ' },
  { nodeId: 'reward.grant', module: 'gamification', description: 'Trao thưởng trực tiếp & xóa tội phong ấn' },
  // M12 - Notification
  { nodeId: 'notification.view', module: 'notifications', description: 'Xem bảng tin và hòm thư thông báo' },
  { nodeId: 'notification.create', module: 'notifications', description: 'Đăng thông báo nội bộ' },
  // System (Developer)
  { nodeId: 'system.config.manage', module: 'system', description: 'Quản trị kỹ thuật cấp cao dành riêng cho DEVELOPER' },
];

export const DEFAULT_ROLE_PERMISSION_MAP: Record<string, string[]> = {
  DEFAULT: [
    'member.view',
    'room.status.view',
    'schedule.view',
    'schedule.register',
    'attendance.qr.scan',
    'ticket.create',
    'project.view.public',
    'reward.view',
    'notification.view',
  ],
  TRAINEE: [
    'training.task.view',
    'training.task.submit',
  ],
  MEMBER: [
    'training.task.view',
    'training.task.submit',
    'project.view.private',
    'project.apply',
    'testing.suite.manage',
    'testing.run.create',
    'testing.run.execute',
    'testing.run.close',
    'testing.bug.report',
    'testing.bug.resolve',
    'testing.bug.verify',
    'testing.bug.triage',
  ],
  TEAM_LEAD: [
    'member.create',
    'room.status.update',
    'schedule.assign',
    'attendance.qr.create',
    'attendance.qr.delegate',
    'attendance.manual.override',
    'ticket.review',
    'training.task.manage',
    'training.task.review',
    'training.level.approve',
    'project.create',
    'notification.create',
  ],
  MENTOR: [
    'member.status.manage',
    'project.complete',
    'reward.grant',
  ],
  DEVELOPER: [
    'system.config.manage',
  ],
};

export const TRAINING_LEVELS_V220 = [
  { levelName: 'Level 1', orderIndex: 1, isGraduationLevel: false },
  { levelName: 'Level 2', orderIndex: 2, isGraduationLevel: false },
  { levelName: 'Level 3', orderIndex: 3, isGraduationLevel: true },
];

export const DEFAULT_BADGE_TAGS_V220 = [
  { name: 'Lv1', tagType: TagType.TRAINING_LEVEL, colorCode: '#3B82F6', isCurse: false },
  { name: 'Lv2', tagType: TagType.TRAINING_LEVEL, colorCode: '#8B5CF6', isCurse: false },
  { name: 'Tốt nghiệp Training', tagType: TagType.TRAINING_LEVEL, colorCode: '#10B981', isCurse: false },
  { name: 'Vua Trốn Học', tagType: TagType.CURSE_DEBUFF, colorCode: '#F59E0B', isCurse: true },
  { name: 'Bóng Ma Phòng Xưởng', tagType: TagType.CURSE_DEBUFF, colorCode: '#EF4444', isCurse: true },
  { name: 'Thánh Hứa Lèo', tagType: TagType.CURSE_DEBUFF, colorCode: '#7F1D1D', isCurse: true },
];

export async function seedDatabase(prisma: Pick<
  PrismaClient,
  'permissionNode' | 'rolePermission' | 'trainingLevel' | 'badgeTag' | 'user' | 'roomConfig' | 'adminAccount'
>) {
  // 1. Seed 37 PermissionNodes
  for (const node of PERMISSION_NODES_V220) {
    await prisma.permissionNode.upsert({
      where: { nodeId: node.nodeId },
      update: { module: node.module, description: node.description },
      create: node,
    });
  }

  // 2. Seed RolePermissions for DEFAULT, TRAINEE, MEMBER, TEAM_LEAD, MENTOR, DEVELOPER
  for (const [roleOrGroup, nodeIds] of Object.entries(DEFAULT_ROLE_PERMISSION_MAP)) {
    for (const nodeId of nodeIds) {
      await prisma.rolePermission.upsert({
        where: { roleOrGroup_nodeId: { roleOrGroup, nodeId } },
        update: { isAllowed: true },
        create: { roleOrGroup, nodeId, isAllowed: true },
      });
    }
  }

  // 3. Seed 3 TrainingLevels
  for (const level of TRAINING_LEVELS_V220) {
    await prisma.trainingLevel.upsert({
      where: { orderIndex: level.orderIndex },
      update: { levelName: level.levelName, isGraduationLevel: level.isGraduationLevel },
      create: level,
    });
  }

  // 4. Seed 6 BadgeTags (3 Training Level Tags + 3 Curse Tags)
  for (const tag of DEFAULT_BADGE_TAGS_V220) {
    await prisma.badgeTag.upsert({
      where: { name: tag.name },
      update: { tagType: tag.tagType, colorCode: tag.colorCode, isCurse: tag.isCurse },
      create: tag,
    });
  }

  // 5. Seed initial DEVELOPER workspace user
  const developerUser = await prisma.user.upsert({
    where: { email: 'developer@fpt.edu.vn' },
    update: {
      role: UserRole.DEVELOPER,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'developer@fpt.edu.vn',
      fullName: 'Dao Son (System Developer)',
      role: UserRole.DEVELOPER,
      status: UserStatus.ACTIVE,
      positions: ['FULLSTACK', 'BACKEND', 'FRONTEND'],
    },
  });

  // 6. Seed default RoomConfig P407 if none exists
  const existingRoom = await prisma.roomConfig.findFirst({
    where: { currentRoom: 'P407' },
  });
  if (!existingRoom) {
    await prisma.roomConfig.create({
      data: {
        currentRoom: 'P407',
        status: RoomStatus.OPEN,
        updatedById: developerUser.id,
      },
    });
  }

  // 7. Seed default SUPER_ADMIN account for Admin Portal
  const defaultPasswordHash = await bcrypt.hash(
    process.env.SUPER_ADMIN_INITIAL_PASSWORD || 'PolyFactory@2026',
    10,
  );
  await prisma.adminAccount.upsert({
    where: { username: 'admin_sondao' },
    update: { adminRole: AdminRole.SUPER_ADMIN, isActive: true },
    create: {
      username: 'admin_sondao',
      passwordHash: defaultPasswordHash,
      fullName: 'Dao Son (Super Admin)',
      adminRole: AdminRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  return {
    permissionNodesCount: PERMISSION_NODES_V220.length,
    trainingLevelsCount: TRAINING_LEVELS_V220.length,
    badgeTagsCount: DEFAULT_BADGE_TAGS_V220.length,
    developerEmail: developerUser.email,
  };
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedDatabase(prisma)
    .then((summary) => {
      console.log('[PolyFactory v2.2.0 Seed Completed]', summary);
    })
    .catch((err) => {
      console.error('[PolyFactory v2.2.0 Seed Failed]', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
