import { BaseErrorResponse, BaseSuccessResponse } from "../types";

export type GetExchangeRatesSuccessResponse = {
  data: {
    rates: Record<string, string>; // currency symbol -> rate (as string for precision)
    baseCurrency: string;
    timestamp: string; // ISO timestamp of when rates were fetched
  };
} & BaseSuccessResponse;

export type GetExchangeRatesErrorResponse = {
  details?: string;
  stage?: "validation" | "database" | "fetch";
} & BaseErrorResponse;

export type GetExchangeRatesResponse =
  | GetExchangeRatesSuccessResponse
  | GetExchangeRatesErrorResponse;
