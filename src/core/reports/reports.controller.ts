import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { sendCsv } from 'src/common/utils/helpers';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('analytics')
  @ApiOperation({
    summary: 'Borrowing analytics summary (defaults to last month)',
  })
  @ApiQuery({ name: 'from', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-01-31' })
  @ApiResponse({ status: 200, description: 'Analytics JSON' })
  getAnalytics(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getAnalytics(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('overdue-last-month/csv')
  @ApiOperation({ summary: 'Export overdue borrows of last month as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportOverdueCsv(@Res() res: Response) {
    const csv = await this.reportsService.getOverdueCsv();
    sendCsv(res, csv, 'overdue-last-month');
  }

  @Get('borrowing-last-month/csv')
  @ApiOperation({ summary: 'Export all borrows of last month as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportAllBorrowingCsv(@Res() res: Response) {
    const csv = await this.reportsService.getAllBorrowingCsv();
    sendCsv(res, csv, 'borrowing-last-month');
  }
}
