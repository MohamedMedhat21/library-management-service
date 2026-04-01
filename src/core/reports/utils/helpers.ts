export function getLastMonthRange(): { from: Date; to: Date } {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
  };
}

export interface AnalyticsReport {
  period: { from: string; to: string };
  totalCheckouts: number;
  totalReturned: number;
  totalOverdue: number;
  activeCheckouts: number;
  topUsers: { name: string; email: string; checkouts: number }[];
  topBooks: { title: string; isbn: string; checkouts: number }[];
}
