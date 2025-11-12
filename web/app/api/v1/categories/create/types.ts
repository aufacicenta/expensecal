/**
 * API Types for /api/v1/categories/create
 * Protected endpoint for creating new categories
 */

import { BaseErrorResponse, BaseSuccessResponse } from "../../types";

export type CreateCategoryRequestBody = {
  name: string;
  description?: string | null; // Optional description
  color: string; // Hex color value (e.g., "#FF5733")
};

export type CreatedCategoryData = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

export type CreateCategorySuccessResponse = {
  data: CreatedCategoryData;
} & BaseSuccessResponse;

export type CreateCategoryErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type CreateCategoryResponse =
  | CreateCategorySuccessResponse
  | CreateCategoryErrorResponse;
