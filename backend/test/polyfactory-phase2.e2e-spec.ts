import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { PolyPermsService } from '../src/modules/polyperms/polyperms.service';
import { TeamsService } from '../src/modules/teams/teams.service';
import { UsersService } from '../src/modules/auth/users.service';
import { ReportsService } from '../src/modules/reports/reports.service';
import { EmailService } from '../src/modules/email/email.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { UserRole, UserStatus, Position } from '@prisma/client';

describe('PolyFactory Phase 2 E2E Integration Suite (T079)', () => {
  it('E2E Phase 2: Secondary Groups -> 7-step Simulator -> Mentor Groups -> Tech Skills & Export -> Devices', async () => {
    // In-memory data store
    const users: any[] = [
      {
        id: 'usr_mentor_1',
        email: 'mentor@fpt.edu.vn',
        fullName: 'Lead Mentor',
        role: UserRole.MENTOR,
        status: UserStatus.ACTIVE,
        teamId: 'team_1',
        userPermissions: [],
        groupMappings: [],
        positions: [Position.BACKEND],
        techSkills: ['Node.js', 'PostgreSQL', 'Docker'],
        isAvailable: true,
        devices: [],
      },
      {
        id: 'usr_student_1',
        email: 'student1@fpt.edu.vn',
        fullName: 'Student One',
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        teamId: 'team_2',
        userPermissions: [],
        groupMappings: [],
        positions: [Position.FRONTEND],
        techSkills: ['React', 'TypeScript', 'Tailwind'],
        isAvailable: true,
        mentorId: null,
        devices: [],
      },
    ];

    const secondaryGroups: any[] = [];
    const groupPermissions: any[] = [];
    const userGroupMappings: any[] = [];
    const permissionNodes = [
      { nodeId: 'project.create', name: 'Create Project' },
      { nodeId: 'room.status.update', name: 'Update Room' },
    ];

    const prismaMock: any = {
      user: {
        findUnique: async (args: any) => {
          const u = users.find((x) => x.id === args.where.id);
          if (!u) return null;
          return {
            ...u,
            team: { id: u.teamId, name: `Team_${u.teamId}`, viceLeadIds: [] },
            userPermissions: u.userPermissions || [],
            groupMappings: userGroupMappings
              .filter((m) => m.userId === u.id)
              .map((m) => {
                const grp = secondaryGroups.find((g) => g.id === m.groupId);
                return {
                  ...m,
                  group: {
                    ...grp,
                    permissions: groupPermissions.filter((p) => p.groupId === grp?.id),
                  },
                };
              }),
          };
        },
        findMany: async () => users,
        update: async (args: any) => {
          const u = users.find((x) => x.id === args.where.id);
          Object.assign(u, args.data);
          return u;
        },
      },
      secondaryGroup: {
        create: async (args: any) => {
          const g = { id: `grp_${secondaryGroups.length + 1}`, ...args.data };
          secondaryGroups.push(g);
          return g;
        },
      },
      rolePermission: {
        findFirst: async (args: any) =>
          groupPermissions.find((p) => p.secondaryGroupId === args.where.secondaryGroupId && p.nodeId === args.where.nodeId) || null,
        findMany: async () => groupPermissions,
        create: async (args: any) => {
          const p = { id: `rp_${groupPermissions.length + 1}`, ...args.data };
          groupPermissions.push(p);
          return p;
        },
        update: async (args: any) => {
          const p = groupPermissions.find((x) => x.id === args.where.id);
          Object.assign(p, args.data);
          return p;
        },
      },
      userGroupMapping: {
        findFirst: async (args: any) =>
          userGroupMappings.find((m) => m.userId === args.where.userId && m.groupId === args.where.groupId) || null,
        create: async (args: any) => {
          const m = { id: `ugm_${userGroupMappings.length + 1}`, ...args.data };
          userGroupMappings.push(m);
          return m;
        },
      },
      userPermission: {
        findFirst: async () => null,
        create: async (args: any) => args.data,
      },
      permissionNode: {
        findMany: async () => permissionNodes,
      },
      schedule: {
        findMany: async () => [],
      },
      attendance: {
        findMany: async () => [],
      },
      project: {
        findUnique: async () => ({
          name: 'Demo Project',
          testSuites: [{ testCases: [{}, {}] }],
          testRuns: [{}],
          bugs: [{ severity: 'CRITICAL', status: 'OPEN' }],
        }),
      },
    };

    const eventEmitterMock: any = { emit: () => {} };
    const configServiceMock: any = { get: () => '' };

    // Instantiate Services
    const polyPermsService = new PolyPermsService(prismaMock);
    const teamsService = new TeamsService(prismaMock);
    const usersService = new UsersService(prismaMock, eventEmitterMock);
    const reportsService = new ReportsService(prismaMock);
    const emailService = new EmailService(configServiceMock);
    const authService = new AuthService(prismaMock, { sign: () => '' } as any, eventEmitterMock);

    // 1. T070: Create SecondaryGroup & assign permission node
    const group = await polyPermsService.createSecondaryGroup({
      code: 'track.event_crew',
      name: 'Event Organizers',
      description: 'Ban Tổ Chức Sự Kiện',
    });
    assert.strictEqual(group.name, 'Event Organizers');

    await polyPermsService.setGroupPermission(group.id, 'room.status.update', true);
    await polyPermsService.assignUserToSecondaryGroup('usr_student_1', group.id);

    // 2. T071: 7-step Permission Simulator
    const simResult = await polyPermsService.simulatePermission('usr_student_1', 'room.status.update');
    assert.strictEqual(simResult.finalAllowed, true);
    assert.ok(simResult.steps.length >= 4);

    // 3. T072: Mentor student groups across teams
    const assigned = await teamsService.assignMentorToStudent('usr_mentor_1', 'usr_student_1');
    assert.strictEqual(assigned.mentorId, 'usr_mentor_1');

    // 4. T073: Tech skills & multi-dimensional filtering
    await usersService.updateTechSkills('usr_student_1', ['React', 'Next.js', 'TypeScript']);
    const filtered = await usersService.filterMembers({
      position: Position.FRONTEND,
      techSkill: 'React',
    });
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, 'usr_student_1');

    // 5. T074: Export attendance & QA reports
    const attendanceReport = await reportsService.exportAttendanceReport();
    assert.ok(attendanceReport.buffer.length > 0);
    assert.ok(attendanceReport.filename.endsWith('.csv'));

    const qualityReport = await reportsService.exportTestingQualityReport('proj_1');
    assert.ok(qualityReport.buffer.length > 0);

    // 6. T075: Weekly Digest Email
    const digestResult = await emailService.sendWeeklyDigest(
      { email: 'mentor@fpt.edu.vn', name: 'Lead Mentor', role: 'MENTOR' },
      {
        weekNumber: 42,
        totalShifts: 30,
        attendanceRate: 95,
        unexcusedAbsences: 1,
        activeProjectsCount: 4,
        criticalBugsCount: 0,
      },
    );
    assert.strictEqual(digestResult.sent, true);

    // 7. T076: Device login tracking & revocation
    const newDevice = await authService.recordDeviceLogin('usr_student_1', {
      deviceName: 'Chrome on macOS',
      ipAddress: '14.161.20.10',
    });
    assert.ok(newDevice?.id);

    const devices = await authService.getUserDevices('usr_student_1');
    assert.strictEqual(devices.length, 1);

    const revokeResult = await authService.revokeDevice('usr_student_1', newDevice!.id);
    assert.strictEqual(revokeResult.success, true);
  });
});
