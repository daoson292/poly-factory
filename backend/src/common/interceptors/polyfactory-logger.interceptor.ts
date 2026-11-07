import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PolyFactoryLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('PolyFactory Console');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip } = req;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        const actor = req.user?.email || req.admin?.username || 'anonymous';
        // PolyFactory Terminal Style Log: [INFO] [Actor] METHOD /path took Nms
        this.logger.log(
          `\x1b[32m[INFO]\x1b[0m \x1b[36m[${actor}]\x1b[0m ${method} ${url} - \x1b[33m${responseTime}ms\x1b[0m (IP: ${ip})`,
        );
      }),
    );
  }
}

