import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  UseGuards,
  Res,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Response } from 'express';

@Controller('testing/bugs')
export class BugEvidenceController {
  /**
   * T054: Upload ảnh bằng chứng lỗi (tối đa 3 ảnh, mỗi ảnh <= 2MB, E-polyfactory-306)
   */
  @UseGuards(JwtAuthGuard)
  @Post('evidence/upload')
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/)) {
          return cb(
            new BadRequestException({
              errorCode: 'E-polyfactory-306',
              message: 'Chỉ chấp nhận định dạng ảnh JPG, PNG, WEBP hoặc GIF.',
            }),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadEvidence(@UploadedFiles() files: any[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-306',
        message: 'Vui lòng chọn ít nhất 1 ảnh bằng chứng lỗi (tối đa 3 ảnh, <= 2MB/ảnh).',
      });
    }

    if (files.length > 3) {
      throw new BadRequestException({
        errorCode: 'E-polyfactory-306',
        message: 'Chỉ được đính kèm tối đa 3 ảnh bằng chứng cho mỗi báo cáo lỗi.',
      });
    }

    const uploadedUrls = files.map(
      (f, idx) => `/storage/bugs/evidence_${Date.now()}_${idx}_${f.originalname}`,
    );

    return {
      success: true,
      count: files.length,
      urls: uploadedUrls,
    };
  }

  /**
   * T054: Phục vụ bảo mật file ảnh nội bộ qua Nginx X-Accel-Redirect
   */
  @UseGuards(JwtAuthGuard)
  @Get('evidence/view/:filename')
  async serveProtectedEvidence(@Param('filename') filename: string, @Res() res: Response) {
    // Gửi header X-Accel-Redirect cho Nginx phục vụ location internal
    res.setHeader('X-Accel-Redirect', `/storage/bugs/${filename}`);
    res.setHeader('Content-Type', 'image/jpeg');
    res.end();
  }
}
