import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  const isConfigured = Boolean(dbUrl);

  const maskedUrl = dbUrl
    ? dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@')
    : 'DATABASE_URL_NOT_CONFIGURED';

  let dbConnected = false;
  let dbError = null;
  let stats = {};

  if (isConfigured) {
    try {
      const [fleetCount, customerCount, txCount, expenseCount, settingsCount] = await Promise.all([
        prisma.fleet.count({ where: { deletedAt: null } }),
        prisma.customer.count({ where: { deletedAt: null } }),
        prisma.transaction.count({ where: { deletedAt: null } }),
        prisma.expense.count({ where: { deletedAt: null } }),
        prisma.setting.count(),
      ]);

      dbConnected = true;
      stats = {
        activeFleet: fleetCount,
        activeCustomers: customerCount,
        activeTransactions: txCount,
        activeExpenses: expenseCount,
        settings: settingsCount,
      };
    } catch (err) {
      dbError = err.message;
    }
  }

  return NextResponse.json(
    {
      status: dbConnected ? 'healthy' : 'unhealthy',
      vercelDeployment: Boolean(process.env.VERCEL),
      environment: process.env.NODE_ENV,
      isDatabaseConfigured: isConfigured,
      databaseUrlMasked: maskedUrl,
      databaseConnected: dbConnected,
      databaseError: dbError,
      dataCounts: stats,
      timestamp: new Date().toISOString(),
    },
    {
      status: dbConnected ? 200 : 503,
    }
  );
}
