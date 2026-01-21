import { NextResponse } from "next/server";

import { BaseErrorResponse } from "@/app/api/v1/types";

/**
 * Type for validation errors returned by validator functions
 */
export type ValidationError = {
  message: string;
  details?: string;
};

/**
 * Validates that a value is a required non-empty string
 * @param value - The value to validate
 * @param fieldName - The name of the field being validated
 * @returns ValidationError if invalid, null if valid
 */
export function validateRequiredString(
  value: unknown,
  fieldName: string,
): ValidationError | null {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return {
      message: `Invalid ${fieldName}`,
      details: `Field '${fieldName}' is required and must be a non-empty string`,
    };
  }

  return null;
}

/**
 * Validates that a value is an ISO 8601 date string and returns the Date object
 * @param value - The value to validate
 * @param fieldName - The name of the field being validated
 * @param isRequired - Whether the field is required
 * @returns Object with date and error - exactly one will be set
 */
export function validateISO8601Date(
  value: unknown,
  fieldName: string,
  isRequired: boolean = false,
): { date: Date | null; error: ValidationError | null } {
  // If not required and not provided, return null (valid optional)
  if (!isRequired && !value) {
    return { date: null, error: null };
  }

  // If required and not provided
  if (isRequired && !value) {
    return {
      date: null,
      error: {
        message: `Invalid ${fieldName}`,
        details: `Field '${fieldName}' is required`,
      },
    };
  }

  // Validate it's a string
  if (typeof value !== "string") {
    return {
      date: null,
      error: {
        message: `Invalid ${fieldName}`,
        details: `Field '${fieldName}' must be a string`,
      },
    };
  }

  // Parse and validate the date
  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return {
      date: null,
      error: {
        message: `Invalid ${fieldName} format`,
        details: `'${fieldName}' must be a valid ISO 8601 date string`,
      },
    };
  }

  return { date, error: null };
}

/**
 * Validates that a value is a positive number
 * @param value - The value to validate
 * @param fieldName - The name of the field being validated
 * @param options - Optional validation options
 * @returns Object with value and error - exactly one will be set (when valid, value is set)
 */
export function validatePositiveNumber(
  value: unknown,
  fieldName: string,
  options?: { minValue?: number; maxValue?: number; isRequired?: boolean },
): { value: number | null; error: ValidationError | null } {
  const {
    minValue = 0,
    maxValue = Infinity,
    isRequired = true,
  } = options || {};

  // Check if required
  if (isRequired && (value === null || value === undefined || value === "")) {
    return {
      value: null,
      error: {
        message: `Invalid ${fieldName}`,
        details: `Field '${fieldName}' is required`,
      },
    };
  }

  // If optional and not provided
  if (!isRequired && !value) {
    return { value: null, error: null };
  }

  // Try to parse as number
  const numValue = Number(value);

  if (isNaN(numValue)) {
    return {
      value: null,
      error: {
        message: `Invalid ${fieldName}`,
        details: `Field '${fieldName}' must be a valid number`,
      },
    };
  }

  // Validate range
  if (numValue <= minValue) {
    return {
      value: null,
      error: {
        message: `Invalid ${fieldName}`,
        details: `Field '${fieldName}' must be greater than ${minValue}`,
      },
    };
  }

  if (numValue > maxValue) {
    return {
      value: null,
      error: {
        message: `Invalid ${fieldName}`,
        details: `Field '${fieldName}' must be less than or equal to ${maxValue}`,
      },
    };
  }

  return { value: numValue, error: null };
}

/**
 * Validates that a value is one of the allowed enum values
 * @param value - The value to validate
 * @param fieldName - The name of the field being validated
 * @param allowedValues - Array of allowed values
 * @returns ValidationError if invalid, null if valid
 */
export function validateEnum(
  value: unknown,
  fieldName: string,
  allowedValues: string[],
): ValidationError | null {
  if (!value || !allowedValues.includes(String(value))) {
    return {
      message: `Invalid ${fieldName}`,
      details: `Field '${fieldName}' must be one of: ${allowedValues.join(", ")}`,
    };
  }

  return null;
}

/**
 * Validates that a value is a UUID string
 * @param value - The value to validate
 * @param fieldName - The name of the field being validated
 * @param isRequired - Whether the field is required
 * @returns ValidationError if invalid, null if valid
 */
export function validateUUID(
  value: unknown,
  fieldName: string,
  isRequired: boolean = true,
): ValidationError | null {
  // If not required and not provided, return null (valid optional)
  if (!isRequired && !value) {
    return null;
  }

  // Check if required and not provided
  if (isRequired && !value) {
    return {
      message: `Invalid ${fieldName}`,
      details: `Field '${fieldName}' is required`,
    };
  }

  // Check if it's a string
  if (typeof value !== "string") {
    return {
      message: `Invalid ${fieldName}`,
      details: `Field '${fieldName}' must be a valid UUID string`,
    };
  }

  // Simple UUID validation (v4 format)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(value)) {
    return {
      message: `Invalid ${fieldName}`,
      details: `Field '${fieldName}' must be a valid UUID`,
    };
  }

  return null;
}

/**
 * Validates that a query parameter exists and returns its value
 * @param searchParams - The URLSearchParams object
 * @param paramName - The name of the query parameter
 * @returns Object with value and error
 */
export function validateQueryParam(
  searchParams: URLSearchParams,
  paramName: string,
  isRequired: boolean = true,
): { value: string | null; error: ValidationError | null } {
  const value = searchParams.get(paramName);

  if (isRequired && !value) {
    return {
      value: null,
      error: {
        message: `Missing ${paramName}`,
        details: `Query parameter '${paramName}' is required`,
      },
    };
  }

  return { value, error: null };
}

/**
 * Creates a standardized JSON error response for validation failures
 * @param error - The validation error
 * @param statusCode - HTTP status code
 * @returns NextResponse with error JSON
 */
export function createValidationErrorResponse(
  error: ValidationError,
  statusCode: number = 400,
): NextResponse<BaseErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: error.message,
      details: error.details,
    },
    { status: statusCode },
  );
}

/**
 * Creates a standardized JSON error response for validation failures with multiple errors
 * @param errors - Array of validation errors
 * @param statusCode - HTTP status code
 * @returns NextResponse with error JSON
 */
export function createValidationErrorsResponse(
  errors: ValidationError[],
  statusCode: number = 400,
) {
  return NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      errors: errors.map((e) => ({
        message: e.message,
        details: e.details,
      })),
    },
    { status: statusCode },
  );
}

/**
 * Validates that a value is a valid hex color string
 * @param value - The value to validate
 * @param fieldName - The name of the field being validated
 * @returns ValidationError if invalid, null if valid
 */
export function validateHexColor(
  value: unknown,
  fieldName: string,
): ValidationError | null {
  if (!value || typeof value !== "string") {
    return {
      message: `Invalid ${fieldName}`,
      details: `Field '${fieldName}' must be a string`,
    };
  }

  // Validate hex color format (e.g., #FF5733)
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

  if (!hexColorRegex.test(value)) {
    return {
      message: `Invalid ${fieldName} format`,
      details: `Field '${fieldName}' must be a valid hex color (e.g., #FF5733)`,
    };
  }

  return null;
}
