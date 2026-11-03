import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

export function buildPooledDatabaseUrl(rawUrl?: string, connectionLimit = 18): string | undefined {
  if (!rawUrl) return undefined;
  if (rawUrl.includes('connection_limit=')) return rawUrl;
  const separator = rawUrl.includes('?') ? '&' : '?';
  return `${rawUrl}${separator}connection_limit=${connectionLimit}`;
}

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'warn' | 'error'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  public static readonly DEFAULT_CONNECTION_LIMIT = 18;
  public static readonly SLOW_QUERY_THRESHOLD_MS = 200;

  constructor() {
    const pooledUrl = buildPooledDatabaseUrl(
      process.env.DATABASE_URL,
      PrismaService.DEFAULT_CONNECTION_LIMIT,
    );
    super({
      ...(pooledUrl ? { datasources: { db: { url: pooledUrl } } } : {}),
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });

    this.$on('query', (event: Prisma.QueryEvent) => {
      if (event.duration > PrismaService.SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(
          `[SLOW QUERY ${event.duration}ms] ${event.query}`,
        );
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

