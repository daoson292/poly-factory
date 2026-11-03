import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SubmissionStatus, UserRole, TaskType, TagType } from '@prisma/client';
import { ReportsService } from '../reports/reports.service';
import { ExpLedgerService } from '../gamification/core/exp-ledger.service';

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
    private readonly expLedger: ExpLedgerService,
  ) {}

  /**
   * T028: Giao bài tập Trainee/Member (FR-polyfactory-130)
   */
  async createTask(
    creatorId: string,
    data: {
      title: string;
      googleDocsUrl: string;
      driveLink?: string;
      type?: TaskType;
      levelId?: string;
      expReward?: number;
      isMandatory?: boolean;
      deadline?: Date;
    },
  ) {
    if (!data.title || data.title.trim().length === 0) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-130',
        message: 'Tiêu đề bài tập không được để trống.',
      });
    }

    const docsLink = data.googleDocsUrl || '';
    const isValidDocsLink =
      docsLink.includes('docs.google.com') || docsLink.includes('drive.google.com');

    if (!isValidDocsLink) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-130',
        message: 'Link đề bài phải là Google Docs hoặc Google Drive hợp lệ.',
      });
    }

    return this.prisma.trainingTask.create({
      data: {
        title: data.title.trim(),
        docsLink: docsLink.trim(),
        driveLink: data.driveLink,
        taskType: data.type || TaskType.TRAINEE,
        levelId: data.levelId,
        expReward: data.expReward ?? 20,
        isMandatory: data.isMandatory ?? true,
        deadline: data.deadline,
      },
    });
  }

  async getTasks(levelId?: string) {
    return this.prisma.trainingTask.findMany({
      where: levelId ? { levelId } : {},
      orderBy: { createdAt: 'asc' },
      include: { level: true },
    });
  }

  /**
   * T028: Nộp bài tập Trainee/Member (FR-polyfactory-133, 134)
   * - Kiểm tra domain nộp bài hợp lệ (E-polyfactory-133)
   * - Chặn nộp lại khi bài đã COMPLETED (E-polyfactory-134)
   * - Quản lý phiên bản nộp bài (versionNumber, isLatest)
   */
  async submitTask(userId: string, taskId: string, submissionLink: string, notes?: string) {
    const validDomains = ['github.com', 'gitlab.com', 'figma.com', 'docs.google.com', 'drive.google.com'];
    const isDomainValid = validDomains.some((d) => submissionLink && submissionLink.includes(d));

    if (!isDomainValid) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-133',
        message: 'Liên kết nộp bài không hợp lệ. Vui lòng nộp link từ GitHub, GitLab, Figma, Google Docs hoặc Drive.',
      });
    }

    const task = await this.prisma.trainingTask.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      throw new NotFoundException('Không tìm thấy bài tập để nộp.');
    }

    // Chặn nộp lại khi đã COMPLETED (E-polyfactory-134)
    const completedSub = await this.prisma.taskSubmission.findFirst({
      where: {
        taskId,
        userId,
        status: SubmissionStatus.COMPLETED,
      },
    });
    if (completedSub) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-134',
        message: 'Bài tập này đã hoàn thành, không thể nộp lại.',
      });
    }

    // Lấy lịch sử các lần nộp trước
    const previousSubmissions = await this.prisma.taskSubmission.findMany({
      where: { taskId, userId },
      orderBy: { versionNumber: 'desc' },
    });

    const versionNumber = previousSubmissions.length > 0 ? previousSubmissions[0].versionNumber + 1 : 1;

    // Đánh dấu isLatest = false cho các lần nộp cũ
    if (previousSubmissions.length > 0) {
      await this.prisma.taskSubmission.updateMany({
        where: { taskId, userId },
        data: { isLatest: false },
      });
    }

    return this.prisma.taskSubmission.create({
      data: {
        userId,
        taskId,
        versionNumber,
        isLatest: true,
        submissionLink: submissionLink.trim(),
        notes,
        status: SubmissionStatus.SUBMITTED,
      },
    });
  }

  /**
   * T028: Duyệt bài tập (FR-polyfactory-135, 138)
   * - Chặn tự duyệt bài của chính mình (E-polyfactory-135)
   * - Thưởng EXP đúng 1 lần khi chuyển sang COMPLETED
   */
  async reviewSubmission(
    reviewerId: string,
    submissionId: string,
    status: SubmissionStatus,
    feedback?: string,
  ) {
    const sub = await this.prisma.taskSubmission.findUnique({
      where: { id: submissionId },
      include: { task: true },
    });

    if (!sub) {
      throw new NotFoundException('Không tìm thấy bài nộp để xét duyệt.');
    }

    if (sub.userId === reviewerId) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-135',
        message: 'Người nộp bài không được tự duyệt bài tập của chính mình.',
      });
    }

    const isFirstCompletion =
      status === SubmissionStatus.COMPLETED && sub.status !== SubmissionStatus.COMPLETED;

    const updated = await this.prisma.taskSubmission.update({
      where: { id: submissionId },
      data: {
        status,
        reviewerFeedback: feedback,
        reviewedById: reviewerId,
      },
    });

    // Thưởng EXP khi đạt COMPLETED lần đầu
    if (isFirstCompletion) {
      const reward = sub.task?.expReward ?? 20;
      await this.expLedger.recordTransaction(
        sub.userId,
        reward,
        'TRAINING_TASK_COMPLETED',
        `Hoàn thành bài tập: ${sub.task?.title || 'Training Task'}`,
        sub.id,
      );
    }

    return updated;
  }

  /**
   * T029: Gợi ý đủ điều kiện xét Level (>= 70% chuyên cần + 100% bài bắt buộc)
   */
  async getTraineeProgress(traineeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: traineeId },
      include: { trainingLevel: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản học viên.');
    }

    const mandatoryTasks = await this.prisma.trainingTask.findMany({
      where: {
        levelId: user.trainingLevelId ?? undefined,
        isMandatory: true,
      },
    });

    const totalMandatory = mandatoryTasks.length;
    let completedMandatory = 0;

    if (totalMandatory > 0) {
      const completedSubs = await this.prisma.taskSubmission.findMany({
        where: {
          userId: traineeId,
          taskId: { in: mandatoryTasks.map((t) => t.id) },
          status: SubmissionStatus.COMPLETED,
        },
      });
      const uniqueTaskIds = new Set(completedSubs.map((s) => s.taskId));
      completedMandatory = uniqueTaskIds.size;
    }

    const metrics = await this.reportsService.getUserAttendanceMetrics(traineeId);
    const attendanceRate = metrics.attendanceRate;

    const isEligibleForPromotion =
      (totalMandatory === 0 || completedMandatory >= totalMandatory) && attendanceRate >= 70;

    return {
      traineeId,
      currentLevelOrder: user.trainingLevel?.orderIndex ?? 1,
      currentLevelId: user.trainingLevelId,
      totalMandatory,
      completedMandatory,
      attendanceRate,
      isEligibleForPromotion,
    };
  }

  /**
   * T029: Xét duyệt lên Level 1 chạm & Trao Tag Lv1 -> Lv2 -> Tốt nghiệp Training (Mục 6.14)
   */
  async approveLevel(reviewerId: string, traineeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: traineeId },
      include: { trainingLevel: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy học viên.');
    }

    const allLevels = await this.prisma.trainingLevel.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    const currentOrder = user.trainingLevel?.orderIndex ?? 1;

    if (currentOrder === 1) {
      // Trao Tag Lv1, chuyển sang Level 2, thưởng +50 EXP
      const tag = await this.ensureBadgeTag('Lv1', '#3b82f6', TagType.TRAINING_LEVEL);
      await this.awardTagToUser(user.id, tag.id);

      const nextLevel = allLevels.find((l) => l.orderIndex === 2);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { trainingLevelId: nextLevel?.id || user.trainingLevelId },
      });

      await this.expLedger.recordTransaction(user.id, 50, 'TRAINING_LEVEL_UP', 'Thăng cấp Training Level 2');

      return {
        success: true,
        promotedTo: 'LEVEL_2',
        awardedTag: 'Lv1',
        expReward: 50,
        unlockPositionSelection: false,
      };
    } else if (currentOrder === 2) {
      // Trao Tag Lv2, chuyển sang Level 3, thưởng +50 EXP
      const tag = await this.ensureBadgeTag('Lv2', '#10b981', TagType.TRAINING_LEVEL);
      await this.awardTagToUser(user.id, tag.id);

      const nextLevel = allLevels.find((l) => l.orderIndex === 3);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { trainingLevelId: nextLevel?.id || user.trainingLevelId },
      });

      await this.expLedger.recordTransaction(user.id, 50, 'TRAINING_LEVEL_UP', 'Thăng cấp Training Level 3');

      return {
        success: true,
        promotedTo: 'LEVEL_3',
        awardedTag: 'Lv2',
        expReward: 50,
        unlockPositionSelection: false,
      };
    } else {
      // Đã ở Level 3 (hoặc level tốt nghiệp) -> Trao Tag 'Tốt nghiệp Training', role = MEMBER, mở khóa 6 Công pháp
      const tag = await this.ensureBadgeTag('Tốt nghiệp Training', '#f59e0b', TagType.TRAINING_LEVEL);
      await this.awardTagToUser(user.id, tag.id);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.MEMBER },
      });

      await this.expLedger.recordTransaction(
        user.id,
        50,
        'TRAINING_GRADUATED',
        'Tốt nghiệp Training & Thăng cấp Thành viên chính thức (MEMBER)',
      );

      return {
        success: true,
        promotedTo: 'MEMBER',
        awardedTag: 'Tốt nghiệp Training',
        expReward: 50,
        unlockPositionSelection: true,
      };
    }
  }

  /**
   * T029: Duyệt đặc cách thăng cấp MEMBER trực tiếp
   */
  async specialPromote(mentorId: string, traineeId: string) {
    const tag = await this.ensureBadgeTag('Tốt nghiệp Training', '#f59e0b', TagType.TRAINING_LEVEL);
    await this.awardTagToUser(traineeId, tag.id);

    const user = await this.prisma.user.update({
      where: { id: traineeId },
      data: { role: UserRole.MEMBER },
    });

    await this.expLedger.recordTransaction(
      traineeId,
      50,
      'TRAINING_SPECIAL_PROMOTION',
      'Đặc cách tốt nghiệp Training lên MEMBER',
    );

    return {
      success: true,
      promotedTo: 'MEMBER',
      awardedTag: 'Tốt nghiệp Training',
      expReward: 50,
      unlockPositionSelection: true,
    };
  }

  private async ensureBadgeTag(name: string, colorCode: string, tagType: TagType) {
    return this.prisma.badgeTag.upsert({
      where: { name },
      create: { name, colorCode, tagType, isCurse: false },
      update: {},
    });
  }

  private async awardTagToUser(userId: string, tagId: string) {
    return this.prisma.userTag.upsert({
      where: {
        userId_tagId: { userId, tagId },
      },
      create: {
        userId,
        tagId,
        isDisplayed: true,
        isLocked: false,
      },
      update: {
        isDisplayed: true,
      },
    });
  }
}
