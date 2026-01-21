/**
 * Formats a currency amount string for display
 * Converts string amounts with up to 8 decimal positions to formatted currency
 * with comma thousand separators and 2 decimal places
 *
 * @param amount - Amount as string or number (e.g., "30000.00" or 30000.00)
 * @returns Formatted currency string (e.g., "30,000.00")
 *
 * @example
 * formatCurrency("30000.00") // "30,000.00"
 * formatCurrency("1234567.89") // "1,234,567.89"
 * formatCurrency(100) // "100.00"
 * formatCurrency("100.123456") // "100.12"
 */
export function formatCurrency(amount: string | number): string {
  // Convert to number and round to 2 decimal places
  const numericAmount =
    typeof amount === "string" ? parseFloat(amount) : amount;

  // Handle invalid numbers
  if (isNaN(numericAmount)) {
    return "0.00";
  }

  // Format with 2 decimal places and thousand separators
  return numericAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
