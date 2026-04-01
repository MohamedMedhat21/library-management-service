import type { Response } from 'express';

export function sendCsv(res: Response, csv: string, filename: string): void {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}-${Date.now()}.csv"`,
  );
  res.send(csv);
}
