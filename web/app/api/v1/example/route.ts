import sequelize from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { NextRequest, NextResponse } from "next/server";
import { ExampleRequest, ExampleResponse } from "./types";

/**
 * POST /api/v1/example
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ExampleResponse>> {
  try {
    const body: ExampleRequest = await request.json();

    const { value } = body;

    // Validate required fields
    if (!value) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: user_id, text, starts_at, ends_at, instruction",
        },
        { status: 400 },
      );
    }

    // Initialize models
    const { ExampleModel } = initModels(sequelize);

    // Fetch the campaign with criteria to return complete data
    const exampleModel = await ExampleModel.findAll({
      limit: 1,
    });

    return NextResponse.json(
      {
        success: true,
        data: exampleModel[0]?.toJSON(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create campaign",
      },
      { status: 500 },
    );
  }
}
