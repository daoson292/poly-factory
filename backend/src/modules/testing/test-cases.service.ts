import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TestCasePriority } from '@prisma/client';

@Injectable()
export class TestCasesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * T047: Tạo TestSuite (Kho kịch bản 1 cấp)
   */
  async createSuite(projectId: string, data: { name: string; description?: string; orderIndex?: number }) {
    return this.prisma.testSuite.create({
      data: {
        projectId,
        name: data.name,
        description: data.description,
        orderIndex: data.orderIndex ?? 0,
      },
    });
  }

  async getSuites(projectId: string) {
    return this.prisma.testSuite.findMany({
      where: { projectId },
      orderBy: { orderIndex: 'asc' },
      include: {
        testCases: {
          where: { isDeleted: false },
          orderBy: { code: 'asc' },
        },
      },
    });
  }

  /**
   * T047: Tạo TestCase (sinh mã TC-01, TC-02..., lưu steps JSON)
   */
  async createTestCase(
    creatorId: string,
    projectId: string,
    data: {
      suiteId: string;
      title: string;
      priority?: TestCasePriority;
      preconditions?: string;
      steps: any[];
    },
  ) {
    const count = await this.prisma.testCase.count({
      where: { projectId },
    });

    const code = `TC-${String(count + 1).padStart(2, '0')}`;

    return this.prisma.testCase.create({
      data: {
        projectId,
        suiteId: data.suiteId,
        createdById: creatorId,
        code,
        title: data.title,
        priority: data.priority || TestCasePriority.MEDIUM,
        preconditions: data.preconditions,
        steps: data.steps || [],
        isDeleted: false,
      },
    });
  }

  async getTestCases(projectId: string, suiteId?: string) {
    const where: any = {
      projectId,
      isDeleted: false,
    };
    if (suiteId) where.suiteId = suiteId;

    return this.prisma.testCase.findMany({
      where,
      orderBy: { code: 'asc' },
    });
  }

  async updateTestCase(
    id: string,
    data: {
      title?: string;
      priority?: TestCasePriority;
      preconditions?: string;
      steps?: any[];
      suiteId?: string;
    },
  ) {
    return this.prisma.testCase.update({
      where: { id },
      data: {
        title: data.title,
        priority: data.priority,
        preconditions: data.preconditions,
        steps: data.steps,
        suiteId: data.suiteId,
      },
    });
  }

  /**
   * T047: Xóa mềm TestCase (isDeleted = true)
   */
  async deleteTestCase(id: string) {
    return this.prisma.testCase.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
