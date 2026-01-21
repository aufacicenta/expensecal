import { EventAttributes } from "@expensecal/database/models/Event";

export type EventStructureType = "single" | "recurring" | "installment";

/**
 * Determines the structure type of an event based on its attributes
 *
 * - "single": Standalone event with no parent_event_id
 * - "recurring": Recurring event with parent_event_id, recurrence_rule, but no installment_id
 * - "installment": Installment event with parent_event_id, recurrence_rule, and installment_id
 *
 * @param event EventAttributes object to analyze
 * @returns The structure type of the event
 *
 * @example
 * const event = await Event.findByPk(eventId);
 * const type = getStructureType(event);
 *
 * if (type === "installment") {
 *   // Handle installment-specific logic
 * }
 */
export function getStructureType(event: EventAttributes): EventStructureType {
  if (
    !event.parent_event_id &&
    (event.childEvents === undefined || event.childEvents?.length === 0)
  ) {
    return "single";
  }

  if (
    (event.parent_event_id && !event.installment_id) ||
    (!event.parent_event_id &&
      event.childEvents !== undefined &&
      event.childEvents?.length > 0)
  ) {
    return "recurring";
  }

  if (event.parent_event_id && event.installment_id) {
    return "installment";
  }

  // Default to single if none of the conditions are met
  return "single";
}
