/**
 * API Types for /api/v1/user-preferences
 * Protected endpoint for managing user preferences
 */

import { CurrencyAttributes } from "@expensecal/database/models/Currency";

import { BaseErrorResponse, BaseSuccessResponse } from "../types";

export type BaseCurrencyData = Pick<
  CurrencyAttributes,
  "id" | "symbol" | "name"
>;

export type UserPreferencesData = {
  id: string;
  baseCurrency: BaseCurrencyData;
};

// GET response types
export type GetUserPreferencesSuccessResponse = {
  data: UserPreferencesData;
} & BaseSuccessResponse;

export type GetUserPreferencesErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type GetUserPreferencesResponse =
  | GetUserPreferencesSuccessResponse
  | GetUserPreferencesErrorResponse;

// PUT request/response types
export type UpdateUserPreferencesRequest = {
  baseCurrencyId: string;
};

export type UpdateUserPreferencesSuccessResponse = {
  data: UserPreferencesData;
} & BaseSuccessResponse;

export type UpdateUserPreferencesErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type UpdateUserPreferencesResponse =
  | UpdateUserPreferencesSuccessResponse
  | UpdateUserPreferencesErrorResponse;
