import { z } from "zod";

/**
 * Validation schema for event quantity updates
 * Quantity must be a positive number
 */
export const eventQuantitySchema = z.object({
  quantity: z
    .union([z.string(), z.number()])
    .transform((val: string | number) =>
      typeof val === "string" ? parseFloat(val) : val,
    )
    .refine((val: number) => !isNaN(val), {
      message: "Quantity must be a valid number",
    })
    .refine((val: number) => val > 0, {
      message: "Quantity must be greater than 0",
    })
    .refine((val: number) => val <= 999999, {
      message: "Quantity must be less than 1,000,000",
    }),
});

export type EventQuantityFormData = z.infer<typeof eventQuantitySchema>;

/**
 * Validation schema for event amount updates
 * Amount must be a positive number up to 999,999.99
 */
export const eventAmountSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform((val: string | number) =>
      typeof val === "string" ? parseFloat(val) : val,
    )
    .refine((val: number) => !isNaN(val), {
      message: "Amount must be a valid number",
    })
    .refine((val: number) => val > 0, {
      message: "Amount must be greater than 0",
    })
    .refine((val: number) => val <= 999999.99, {
      message: "Amount must be less than 1,000,000",
    }),
});

export type EventAmountFormData = z.infer<typeof eventAmountSchema>;
