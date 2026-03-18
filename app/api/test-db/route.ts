import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { prisma } = await import("@/lib/prisma_client");
    
    // Test connection
    await prisma.$connect();
    
    // Try a raw query
    const result = await prisma.$queryRaw`SELECT current_database(), version()`;
    
    // Try your actual table
    const recordCount = await prisma.dailyRecord.count();
    
    return NextResponse.json({
      status: "success",
      database: result,
      recordCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: error.message,
      code: error.code,
      meta: error.meta,
    }, { status: 500 });
  }
}