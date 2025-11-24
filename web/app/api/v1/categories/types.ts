/**
 * API Types for /api/v1/categories
 * Protected endpoint for fetching all user categories
 */

import { CategoryAttributes } from "@expensecal/database/models/Category";

import { BaseErrorResponse, BaseSuccessResponse } from "../types";

export type CategoryData = CategoryAttributes;

export type GetCategoriesSuccessResponse = {
  data: CategoryData[];
} & BaseSuccessResponse;

export type GetCategoriesErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type GetCategoriesResponse =
  | GetCategoriesSuccessResponse
  | GetCategoriesErrorResponse;
