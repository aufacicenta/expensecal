/**
 * Calculates the optimal position for a modal to keep it within screen boundaries
 * @param triggerRect - The bounding rect of the element triggering the modal
 * @param modalWidth - The width of the modal (default: 320px for w-80)
 * @param modalHeight - The height of the modal (default: 500px estimated)
 * @param padding - Padding from screen edges (default: 16px)
 * @returns {x, y} - The adjusted position that keeps the modal within bounds
 */
export const calculateModalPosition = (
  triggerRect: DOMRect,
  modalWidth: number = 320,
  modalHeight: number = 500,
  padding: number = 16,
): { x: number; y: number } => {
  const gap = 10; // Gap between trigger and modal

  // Available screen dimensions
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  // Initial position: to the right of the trigger
  let x = triggerRect.right + gap;
  let y = triggerRect.top;

  // Check if modal would overflow right edge
  if (x + modalWidth + padding > screenWidth) {
    // Try positioning to the left instead
    x = triggerRect.left - modalWidth - gap;

    // If still overflowing left, center it
    if (x - padding < 0) {
      x = (screenWidth - modalWidth) / 2;
    }
  }

  // Check if modal would overflow bottom edge
  if (y + modalHeight + padding > screenHeight) {
    // Position it above the trigger instead
    y = Math.max(padding, triggerRect.top - modalHeight - gap);
  }

  // Check if modal would overflow top edge
  if (y - padding < 0) {
    y = padding;
  }

  // Final x boundary checks
  x = Math.max(padding, Math.min(x, screenWidth - modalWidth - padding));

  return { x, y };
};
