/**
 * API Types for /api/v1/currencies
 * Protected endpoint for fetching all available currencies
 */

import { CurrencyAttributes } from "@expensecal/database/models/Currency";
import { BaseErrorResponse, BaseSuccessResponse } from "../types";

export type CurrencyData = CurrencyAttributes;

export type GetCurrenciesSuccessResponse = {
  data: CurrencyData[];
} & BaseSuccessResponse;

export type GetCurrenciesErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type GetCurrenciesResponse =
  | GetCurrenciesSuccessResponse
  | GetCurrenciesErrorResponse;
