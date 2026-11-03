import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TestingExpService } from './testing-exp.service';
import {
  TestRunStatus,
  TestResultStatus,
  UserRole,
} from '@prisma/client';

@Injectable()
export class TestRunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly testingExpService: TestingExpService,
  ) {}

  /**
   * T048: Tạo TestRun và sao chụp bất biến caseSnapshot vào từng TestResult (FR-polyfactory-303)
   */
  async createTestRun(
    creatorId: string,
    projectId: string,
    data: {
      name: string;
      environmentInfo?: string;
      testCaseIds: string[];
    },
  ) {
    if (!data.testCaseIds || data.testCaseIds.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 kịch bản kiểm thử.');
    }

    const testCases = await this.prisma.testCase.findMany({
      where: {
        id: { in: data.testCaseIds },
        projectId,
        isDeleted: false,
      },
    });

    const testRun = await this.prisma.testRun.create({
      data: {
        projectId,
        name: data.name,
        environmentInfo: data.environmentInfo,
        status: TestRunStatus.ACTIVE,
        createdById: creatorId,
      },
    });

    // Tạo các TestResult với caseSnapshot bất biến
    for (const tc of testCases) {
      const caseSnapshot = {
        code: tc.code,
        title: tc.title,
        priority: tc.priority,
        preconditions: tc.preconditions,
        steps: tc.steps,
      };

      await this.prisma.testResult.create({
        data: {
          testRunId: testRun.id,
          testCaseId: tc.id,
          caseSnapshot,
          status: TestResultStatus.UNTESTED,
        },
      });
    }

    return this.prisma.testRun.findUnique({
      where: { id: testRun.id },
      include: {
        results: { include: { testCase: true } },
      },
    });
  }

  async getTestRuns(projectId: string) {
    return this.prisma.testRun.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        results: true,
      },
    });
  }

  async getTestRunById(testRunId: string) {
    const run = await this.prisma.testRun.findUnique({
      where: { id: testRunId },
      include: {
        results: {
          include: { testCase: true, executedBy: true, bugs: true },
        },
        createdBy: true,
      },
    });

    if (!run) throw new NotFoundException('Không tìm thấy đợt kiểm thử.');
    return run;
  }

  /**
   * T049: Chấm kết quả kiểm thử (TestResult) & Ràng buộc FAILED (FR-polyfactory-304)
   * - Kiểm tra quyền canTest / TESTER (E-polyfactory-300)
   * - FAILED bắt buộc có actualResult hoặc bugId (E-polyfactory-301)
   */
  async executeTestResult(
    testerId: string,
    testerRole: UserRole,
    resultId: string,
    data: {
      status: TestResultStatus;
      actualResult?: string;
      bugId?: string;
      evidenceUrls?: string[];
    },
  ) {
    const result = await this.prisma.testResult.findUnique({
      where: { id: resultId },
      include: { testRun: true },
    });

    if (!result) {
      throw new NotFoundException('Không tìm thấy kết quả kiểm thử.');
    }

    if (result.testRun.status === TestRunStatus.CLOSED) {
      throw new BadRequestException('Đợt kiểm thử này đã đóng, không thể chấm kết quả.');
    }

    // 1. Kiểm tra quyền kiểm thử (E-polyfactory-300)
    const isElevated = testerRole === UserRole.DEVELOPER || testerRole === UserRole.MENTOR;
    if (!isElevated) {
      const member = await this.prisma.projectMember.findFirst({
        where: { projectId: result.testRun.projectId, userId: testerId },
      });

      if (!member || !member.canTest) {
        throw new ForbiddenException({
          errorCode: 'E-polyfactory-300',
          message: 'Bạn không có quyền thực thi kiểm thử trong dự án này (yêu cầu quyền canTest).',
        });
      }
    }

    // 2. Chấm FAILED bắt buộc có actualResult hoặc bugId (E-polyfactory-301)
    if (data.status === TestResultStatus.FAILED) {
      const hasActualResult = data.actualResult && data.actualResult.trim().length > 0;
      const hasBug = Boolean(data.bugId);

      if (!hasActualResult && !hasBug) {
        throw new BadRequestException({
          errorCode: 'E-polyfactory-301',
          message: 'Khi đánh dấu FAILED, bắt buộc phải nhập kết quả thực tế (actualResult) hoặc đính kèm mã Bug.',
        });
      }
    }

    // 3. Cập nhật kết quả
    const updated = await this.prisma.testResult.update({
      where: { id: resultId },
      data: {
        status: data.status,
        actualResult: data.actualResult,
        evidenceUrls: data.evidenceUrls ? data.evidenceUrls : undefined,
        executedById: testerId,
        executedAt: new Date(),
      },
    });

    // 4. Tăng bộ đếm testCasesExecuted trên ProjectMember
    await this.prisma.projectMember.updateMany({
      where: { projectId: result.testRun.projectId, userId: testerId },
      data: {
        testCasesExecuted: { increment: 1 },
      },
    });

    return updated;
  }

  /**
   * T050: Khóa sổ TestRun & Thưởng +15 EXP cho Tester thực thi >= 5 kịch bản (FR-304, E-polyfactory-304)
   */
  async closeTestRun(closerId: string, closerRole: UserRole, testRunId: string) {
    const testRun = await this.prisma.testRun.findUnique({
      where: { id: testRunId },
      include: { results: true },
    });

    if (!testRun) {
      throw new NotFoundException('Không tìm thấy đợt kiểm thử.');
    }

    if (testRun.status === TestRunStatus.CLOSED) {
      return testRun;
    }

    // 1. Kiểm tra quyền đóng đợt chạy (E-polyfactory-304)
    const isElevated = closerRole === UserRole.DEVELOPER || closerRole === UserRole.MENTOR;
    if (!isElevated) {
      const member = await this.prisma.projectMember.findFirst({
        where: { projectId: testRun.projectId, userId: closerId },
      });

      if (!member || !member.isProjectLead) {
        throw new ForbiddenException({
          errorCode: 'E-polyfactory-304',
          message: 'Chỉ Project Lead, Mentor hoặc Developer mới có quyền đóng đợt kiểm thử.',
        });
      }
    }

    // 2. Cập nhật trạng thái CLOSED
    const closedRun = await this.prisma.testRun.update({
      where: { id: testRunId },
      data: {
        status: TestRunStatus.CLOSED,
        closedById: closerId,
        closedAt: new Date(),
      },
    });

    // 3. Đếm số test cases đã thực thi bởi từng tester trong run này
    const testerCounts = new Map<string, number>();
    for (const res of testRun.results) {
      if (res.executedById && res.status !== TestResultStatus.UNTESTED) {
        testerCounts.set(res.executedById, (testerCounts.get(res.executedById) || 0) + 1);
      }
    }

    // Thưởng +15 EXP cho Tester thực thi >= 5 kịch bản (kiểm soát trần 100 EXP)
    for (const [testerId, count] of testerCounts.entries()) {
      if (count >= 5) {
        await this.testingExpService.awardTestingExp(
          testerId,
          testRun.projectId,
          15,
          'TEST_RUN_COMPLETED',
          `Thực thi ${count} test cases trong TestRun ${testRun.name}`,
          testRun.id,
        );
      }
    }

    return closedRun;
  }
}
