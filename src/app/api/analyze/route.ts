import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/analyze
 * Placeholder for server-side analysis endpoint.
 * Currently, analysis runs client-side. This endpoint will be used
 * for heavier processing or when we add ML-based features.
 */
export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({
      message: "Analysis currently runs client-side. This endpoint is reserved for future server-side processing.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
