import {
  createValidationErrorResponse,
  validateHexColor,
  validateRequiredString,
} from "@/lib/validators";
import { stackServerApp } from "@/stack/server";
import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Category } from "@expensecal/database/models/Category";
import { NextRequest, NextResponse } from "next/server";
import { CreateCategoryRequestBody, CreateCategoryResponse } from "./types";

/**
 * POST /api/v1/categories/create
 * Create a new category
 * Protected endpoint (requires authentication)
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreateCategoryResponse>> {
  try {
    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to create categories",
        },
        { status: 401 },
      );
    }

    const body: CreateCategoryRequestBody = await request.json();

    // Validate name
    const nameError = validateRequiredString(body.name, "name");
    if (nameError) {
      return createValidationErrorResponse(nameError);
    }

    // Validate color
    const colorError = validateHexColor(body.color, "color");
    if (colorError) {
      return createValidationErrorResponse(colorError);
    }

    // Initialize database models
    initModels(db);

    // Create the category
    const category = await Category.create({
      user_id: user.id,
      name: body.name.trim(),
      description: body.description || null,
      color: body.color.toUpperCase(),
    });

    // Return created category
    return NextResponse.json(
      {
        success: true,
        data: {
          id: category.id,
          user_id: category.user_id,
          name: category.name,
          description: category.description,
          color: category.color,
          created_at: category.created_at.toISOString(),
          updated_at: category.updated_at.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create category endpoint error:", error);
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
