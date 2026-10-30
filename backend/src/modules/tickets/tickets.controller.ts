import { Controller, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TicketStatus, TicketType } from '@prisma/client';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  async create(
    @Req() req: any,
    @Body()
    body: {
      scheduleId?: string;
      workDate?: string;
      shiftNumber?: number;
      ticketType: TicketType;
      reason: string;
      expectedArrivalTime?: string;
    },
  ) {
    return this.ticketsService.createTicket(req.user.sub || req.user.id, body);
  }

  @Patch(':id/review')
  async review(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: TicketStatus; feedback?: string },
  ) {
    return this.ticketsService.reviewTicket(req.user.sub || req.user.id, id, body);
  }
}
