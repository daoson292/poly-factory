import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TestingExpService } from './testing-exp.service';
import {
  BugStatus,
  BugSeverity,
  BugResolution,
  UserRole,
} from '@prisma/client';

@Injectable()
export class BugsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly testingExpService: TestingExpService,
  ) {}

  /**
   * T051: Tạo báo cáo lỗi Bug (sinh mã BUG-01, liên kết TestResult/TestCase) (FR-polyfactory-305)
   */
  async createBug(
    reporterId: string,
    projectId: string,
    data: {
      title: string;
      severity?: BugSeverity;
      environment?: string;
      stepsToReproduce: string;
      expectedResult: string;
      actualResult: string;
      testCaseId?: string;
      testResultId?: string;
      evidenceUrls?: string[];
      assigneeId?: string;
    },
  ) {
    const count = await this.prisma.bug.count({
      where: { projectId },
    });

    const code = `BUG-${String(count + 1).padStart(2, '0')}`;

    const bug = await this.prisma.bug.create({
      data: {
        projectId,
        code,
        title: data.title,
        severity: data.severity || BugSeverity.MEDIUM,
        severityConfirmedByLead: false,
        status: BugStatus.OPEN,
        environment: data.environment,
        stepsToReproduce: data.stepsToReproduce,
        expectedResult: data.expectedResult,
        actualResult: data.actualResult,
        testCaseId: data.testCaseId,
        testResultId: data.testResultId,
        evidenceUrls: data.evidenceUrls ? data.evidenceUrls : undefined,
        reporterId,
        assigneeId: data.assigneeId,
      },
    });

    // Ghi BugHistory khởi tạo
    await this.prisma.bugHistory.create({
      data: {
        bugId: bug.id,
        changedById: reporterId,
        fromStatus: null,
        toStatus: BugStatus.OPEN,
        note: 'Khởi tạo báo cáo lỗi',
      },
    });

    return bug;
  }

  /**
   * T052: Máy trạng thái Bug, Quy tắc 4 mắt & Trần EXP kiểm thử (Mục 6.15, CD-14)
   * - resolution = FIXED bắt buộc fixReference (E-polyfactory-303)
   * - Quy tắc 4 mắt verifiedById !== fixedById (E-polyfactory-302)
   * - Thưởng +10/+20 EXP cho Tester, +5 EXP cho Dev, thu hồi -5 EXP khi REOPENED
   */
  async updateBugStatus(
    actorId: string,
    actorRole: UserRole,
    bugId: string,
    data: {
      status: BugStatus;
      resolution?: BugResolution;
      fixReference?: string;
      note?: string;
    },
  ) {
    const bug = await this.prisma.bug.findUnique({
      where: { id: bugId },
      include: {
        project: {
          include: { members: true },
        },
      },
    });

    if (!bug) {
      throw new NotFoundException('Không tìm thấy báo cáo lỗi.');
    }

    const fromStatus = bug.status;
    const toStatus = data.status;

    let fixedById = bug.fixedById;
    let verifiedById = bug.verifiedById;
    let resolvedAt = bug.resolvedAt;
    let closedAt = bug.closedAt;
    let expAwardedTester = bug.expAwardedTester;
    let expActiveDev = bug.expActiveDev;

    // 1. Chuyển sang RESOLVED
    if (toStatus === BugStatus.RESOLVED) {
      if (data.resolution === BugResolution.FIXED) {
        if (!data.fixReference || data.fixReference.trim().length === 0) {
          throw new BadRequestException({
            errorCode: 'E-polyfactory-303',
            message: 'Khi báo FIXED bắt buộc đính kèm fixReference (commit hash hoặc PR link).',
          });
        }
      }
      fixedById = actorId;
      resolvedAt = new Date();
    }

    // 2. Chuyển sang CLOSED: ÁP DỤNG QUY TẮC 4 MẮT (verifiedById !== fixedById)
    if (toStatus === BugStatus.CLOSED) {
      const isSoloProject = bug.project.members.length === 1;
      const isElevatedReviewer =
        actorRole === UserRole.DEVELOPER ||
        actorRole === UserRole.MENTOR ||
        actorRole === UserRole.TEAM_LEAD;

      if (fixedById === actorId && !(isSoloProject && isElevatedReviewer)) {
        throw new BadRequestException({
          errorCode: 'E-polyfactory-302',
          message: 'Quy tắc 4 mắt: Người sửa bug không được tự nghiệm thu và đóng bug mình sửa.',
        });
      }

      verifiedById = actorId;
      closedAt = new Date();

      // Thưởng EXP cho Tester (nếu chưa thưởng)
      if (!expAwardedTester) {
        const isCriticalConfirmed =
          bug.severity === BugSeverity.CRITICAL && bug.severityConfirmedByLead;
        const testerExp = isCriticalConfirmed ? 20 : 10;

        await this.testingExpService.awardTestingExp(
          bug.reporterId,
          bug.projectId,
          testerExp,
          'BUG_VALID_REPORTED',
          `Báo cáo lỗi hợp lệ ${bug.code} (${isCriticalConfirmed ? 'CRITICAL +20 EXP' : '+10 EXP'})`,
          bug.id,
        );
        expAwardedTester = true;
      }

      // Thưởng +5 EXP cho Dev sửa bug (nếu resolution = FIXED)
      if (data.resolution === BugResolution.FIXED && fixedById && !expActiveDev) {
        await this.testingExpService.awardTestingExp(
          fixedById,
          bug.projectId,
          5,
          'BUG_FIXED_VERIFIED',
          `Sửa lỗi ${bug.code} thành công và được nghiệm thu (+5 EXP)`,
          bug.id,
        );
        expActiveDev = true;
      }
    }

    // 3. Mở lại Bug (REOPENED)
    if (toStatus === BugStatus.REOPENED) {
      // Nếu Dev đã nhận +5 EXP thì thu hồi tạm thời -5 EXP
      if (expActiveDev && fixedById) {
        await this.testingExpService.revokeDevExp(
          fixedById,
          bug.projectId,
          5,
          `Bug ${bug.code} bị mở lại sau nghiệm thu (-5 EXP)`,
          bug.id,
        );
        expActiveDev = false;
      }
    }

    // Cập nhật Bug
    const updatedBug = await this.prisma.bug.update({
      where: { id: bugId },
      data: {
        status: toStatus,
        resolution: data.resolution ?? bug.resolution,
        fixReference: data.fixReference ?? bug.fixReference,
        fixedById,
        verifiedById,
        resolvedAt,
        closedAt,
        expAwardedTester,
        expActiveDev,
      },
    });

    // Ghi BugHistory
    await this.prisma.bugHistory.create({
      data: {
        bugId,
        changedById: actorId,
        fromStatus,
        toStatus,
        resolution: data.resolution,
        note: data.note,
      },
    });

    return updatedBug;
  }

  /**
   * T052: Phân xử Triage (chỉ Lead/Mentor/Developer) (E-polyfactory-304)
   */
  async triageBug(
    actorId: string,
    actorRole: UserRole,
    bugId: string,
    data: {
      severity?: BugSeverity;
      severityConfirmedByLead?: boolean;
      assigneeId?: string;
    },
  ) {
    const bug = await this.prisma.bug.findUnique({
      where: { id: bugId },
    });

    if (!bug) throw new NotFoundException('Không tìm thấy báo cáo lỗi.');

    const isElevated = actorRole === UserRole.DEVELOPER || actorRole === UserRole.MENTOR;
    if (!isElevated) {
      const member = await this.prisma.projectMember.findFirst({
        where: { projectId: bug.projectId, userId: actorId },
      });

      if (!member || !member.isProjectLead) {
        throw new ForbiddenException({
          errorCode: 'E-polyfactory-304',
          message: 'Chỉ Project Lead, Mentor hoặc Developer mới có quyền phân xử triage lỗi.',
        });
      }
    }

    return this.prisma.bug.update({
      where: { id: bugId },
      data: {
        severity: data.severity ?? bug.severity,
        severityConfirmedByLead: data.severityConfirmedByLead ?? bug.severityConfirmedByLead,
        assigneeId: data.assigneeId ?? bug.assigneeId,
      },
    });
  }

  async getBugs(projectId: string, filter?: { status?: BugStatus; severity?: BugSeverity }) {
    const where: any = { projectId };
    if (filter?.status) where.status = filter.status;
    if (filter?.severity) where.severity = filter.severity;

    return this.prisma.bug.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: true,
        assignee: true,
        fixedBy: true,
        verifiedBy: true,
      },
    });
  }

  async getBugById(bugId: string) {
    const bug = await this.prisma.bug.findUnique({
      where: { id: bugId },
      include: {
        reporter: true,
        assignee: true,
        fixedBy: true,
        verifiedBy: true,
        histories: {
          include: { changedBy: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!bug) throw new NotFoundException('Không tìm thấy báo cáo lỗi.');
    return bug;
  }
}
