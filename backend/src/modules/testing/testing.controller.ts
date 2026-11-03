import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TestCasesService } from './test-cases.service';
import { TestRunsService } from './test-runs.service';
import { BugsService } from './bugs.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  TestCasePriority,
  TestResultStatus,
  BugSeverity,
  BugStatus,
  BugResolution,
} from '@prisma/client';

@Controller('testing')
@UseGuards(JwtAuthGuard)
export class TestingController {
  constructor(
    private readonly testCasesService: TestCasesService,
    private readonly testRunsService: TestRunsService,
    private readonly bugsService: BugsService,
    private readonly prisma: PrismaService,
  ) {}

  // ==============================
  // 1. KHO KỊCH BẢN (TestSuite & TestCase)
  // ==============================
  @Post('projects/:projectId/suites')
  async createSuite(
    @Param('projectId') projectId: string,
    @Body() body: { name: string; description?: string; orderIndex?: number },
  ) {
    return this.testCasesService.createSuite(projectId, body);
  }

  @Get('projects/:projectId/suites')
  async getSuites(@Param('projectId') projectId: string) {
    return this.testCasesService.getSuites(projectId);
  }

  @Post('projects/:projectId/cases')
  async createTestCase(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Body()
    body: {
      suiteId: string;
      title: string;
      priority?: TestCasePriority;
      preconditions?: string;
      steps: any[];
    },
  ) {
    return this.testCasesService.createTestCase(req.user.sub || req.user.id, projectId, body);
  }

  @Get('projects/:projectId/cases')
  async getTestCases(@Param('projectId') projectId: string, @Query('suiteId') suiteId?: string) {
    return this.testCasesService.getTestCases(projectId, suiteId);
  }

  @Patch('cases/:id')
  async updateTestCase(@Param('id') id: string, @Body() body: any) {
    return this.testCasesService.updateTestCase(id, body);
  }

  @Delete('cases/:id')
  async deleteTestCase(@Param('id') id: string) {
    return this.testCasesService.deleteTestCase(id);
  }

  // ==============================
  // 2. ĐỢT KIỂM THỬ (TestRun & TestResult)
  // ==============================
  @Post('projects/:projectId/runs')
  async createTestRun(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Body() body: { name: string; environmentInfo?: string; testCaseIds: string[] },
  ) {
    return this.testRunsService.createTestRun(req.user.sub || req.user.id, projectId, body);
  }

  @Get('projects/:projectId/runs')
  async getTestRuns(@Param('projectId') projectId: string) {
    return this.testRunsService.getTestRuns(projectId);
  }

  @Get('runs/:id')
  async getTestRunById(@Param('id') id: string) {
    return this.testRunsService.getTestRunById(id);
  }

  @Patch('results/:resultId')
  async executeTestResult(
    @Req() req: any,
    @Param('resultId') resultId: string,
    @Body()
    body: {
      status: TestResultStatus;
      actualResult?: string;
      bugId?: string;
      evidenceUrls?: string[];
    },
  ) {
    return this.testRunsService.executeTestResult(
      req.user.sub || req.user.id,
      req.user.role,
      resultId,
      body,
    );
  }

  @Post('runs/:id/close')
  async closeTestRun(@Req() req: any, @Param('id') id: string) {
    return this.testRunsService.closeTestRun(req.user.sub || req.user.id, req.user.role, id);
  }

  // ==============================
  // 3. QUẢN LÝ BUG TRACKER
  // ==============================
  @Post('projects/:projectId/bugs')
  async createBug(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Body()
    body: {
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
    return this.bugsService.createBug(req.user.sub || req.user.id, projectId, body);
  }

  @Get('projects/:projectId/bugs')
  async getBugs(
    @Param('projectId') projectId: string,
    @Query('status') status?: BugStatus,
    @Query('severity') severity?: BugSeverity,
  ) {
    return this.bugsService.getBugs(projectId, { status, severity });
  }

  @Get('bugs/:id')
  async getBugById(@Param('id') id: string) {
    return this.bugsService.getBugById(id);
  }

  @Patch('bugs/:id/status')
  async updateBugStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      status: BugStatus;
      resolution?: BugResolution;
      fixReference?: string;
      note?: string;
    },
  ) {
    return this.bugsService.updateBugStatus(
      req.user.sub || req.user.id,
      req.user.role,
      id,
      body,
    );
  }

  @Patch('bugs/:id/triage')
  async triageBug(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      severity?: BugSeverity;
      severityConfirmedByLead?: boolean;
      assigneeId?: string;
    },
  ) {
    return this.bugsService.triageBug(req.user.sub || req.user.id, req.user.role, id, body);
  }

  // ==============================
  // 4. CHỈ SỐ CHẤT LƯỢNG DỰ ÁN (T057)
  // ==============================
  @Get('projects/:projectId/quality-summary')
  async getQualitySummary(@Param('projectId') projectId: string) {
    const totalCases = await this.prisma.testCase.count({
      where: { projectId, isDeleted: false },
    });

    const results = await this.prisma.testResult.findMany({
      where: { testRun: { projectId } },
    });

    const passed = results.filter((r) => r.status === TestResultStatus.PASSED).length;
    const failed = results.filter((r) => r.status === TestResultStatus.FAILED).length;
    const blocked = results.filter((r) => r.status === TestResultStatus.BLOCKED).length;
    const executed = passed + failed + blocked;
    const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;

    const bugs = await this.prisma.bug.findMany({
      where: { projectId },
    });

    const openBugs = bugs.filter((b) => b.status === BugStatus.OPEN).length;
    const inProgressBugs = bugs.filter((b) => b.status === BugStatus.IN_PROGRESS).length;
    const resolvedBugs = bugs.filter((b) => b.status === BugStatus.RESOLVED).length;
    const closedBugs = bugs.filter((b) => b.status === BugStatus.CLOSED).length;
    const criticalBugs = bugs.filter((b) => b.severity === BugSeverity.CRITICAL).length;
    const highBugs = bugs.filter((b) => b.severity === BugSeverity.HIGH).length;

    return {
      projectId,
      testing: {
        totalCases,
        totalExecuted: executed,
        passed,
        failed,
        blocked,
        passRate,
      },
      bugs: {
        total: bugs.length,
        open: openBugs,
        inProgress: inProgressBugs,
        resolved: resolvedBugs,
        closed: closedBugs,
        critical: criticalBugs,
        high: highBugs,
      },
    };
  }
}
