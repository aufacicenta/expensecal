import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Category } from "@expensecal/database/models/Category";
import { NextRequest, NextResponse } from "next/server";

import { GetCategoriesResponse } from "./types";

import { stackServerApp } from "@/stack/server";

/**
 * GET /api/v1/categories
 * Fetch all categories for the authenticated user
 * Protected endpoint (requires authentication)
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<GetCategoriesResponse>> {
  try {
    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to fetch categories",
        },
        { status: 401 },
      );
    }

    // Initialize database models
    initModels(db);

    // Fetch all categories for the user
    const categories = await Category.findAll({
      where: {
        user_id: user.id,
      },
      order: [["name", "ASC"]],
    });

    // Return categories
    return NextResponse.json(
      {
        success: true,
        data: categories,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get categories endpoint error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
