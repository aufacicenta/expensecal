/**
 * Shared event deletion logic to avoid code duplication between
 * single and bulk delete endpoints
 */

import { Op } from "@expensecal/database";
import { Event } from "@expensecal/database/models/Event";

import { DeleteMode } from "./[id]/types";

export interface DeleteEventOptions {
  eventId: string;
  userId: string;
  deleteMode: DeleteMode;
}

/**
 * Validates and deletes a single event
 * Handles both single and all-future deletion modes
 * Returns the deleted event data on success, throws error on failure
 */
export async function deleteEventWithValidation(
  options: DeleteEventOptions,
): Promise<Event> {
  const { eventId, userId, deleteMode } = options;

  // Find the event
  const event = await Event.findByPk(eventId);

  if (!event) {
    const error = new Error(`No event found with id: ${eventId}`);

    (error as any).status = 404;
    (error as any).errorType = "NotFound";
    throw error;
  }

  // Verify ownership
  if (event.user_id !== userId) {
    const error = new Error("You do not have permission to delete this event");

    (error as any).status = 403;
    (error as any).errorType = "Forbidden";
    throw error;
  }

  if (deleteMode === "all-future") {
    // Delete this event and all future child events if recurring
    if (event.parent_event_id || event.recurrence_rule) {
      // Get parent event if this is a child
      const parentId = event.parent_event_id || event.id;

      // Delete this event and all child events with event_date >= this event's date
      await Event.destroy({
        where: {
          user_id: userId,
          [Op.or]: [
            {
              id: event.id,
            },
            {
              parent_event_id: parentId,
              event_date: {
                [Op.gte]: event.event_date,
              },
            },
          ],
        },
      });
    } else {
      // Not a recurring event, just delete it
      await event.destroy();
    }
  } else {
    // Delete only this single event
    await event.destroy();
  }

  return event;
}
