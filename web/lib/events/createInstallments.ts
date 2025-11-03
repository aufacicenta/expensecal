import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Event } from "@expensecal/database/models/Event";
import { EventInstallment } from "@expensecal/database/models/EventInstallment";
import Decimal from "decimal.js";
import { generateRecurrenceInstances } from "./generateRecurrenceInstances";

/**
 * Options for creating installments from a parent event
 */
export interface CreateInstallmentsOptions {
  /**
   * The parent event ID that will be split into installments
   */
  parentEventId: string;

  /**
   * Optional end date for generating instances
   * If not provided, uses UNTIL or COUNT from RRULE
   */
  endDate?: Date;
}

/**
 * Result of creating installments
 */
export interface CreateInstallmentsResult {
  success: boolean;
  parentEventId: string;
  installmentCount: number;
  installmentIds: string[];
  error?: string;
}

/**
 * Creates installment events from a parent recurring event
 *
 * The function:
 * 1. Retrieves the parent event
 * 2. Validates it has a recurrence_rule
 * 3. Generates recurrence instances
 * 4. Creates individual installment events with equal amount distribution
 * 5. Links them via EventInstallment junction table
 *
 * @param options Configuration for creating installments
 * @returns Result with created installment IDs
 * @throws Error if parent event doesn't exist or validation fails
 *
 * @example
 * const result = await createInstallments({
 *   parentEventId: "event-123",
 * });
 *
 * if (result.success) {
 *   console.log(`Created ${result.installmentCount} installments`);
 * }
 */
export async function createInstallments(
  options: CreateInstallmentsOptions,
): Promise<CreateInstallmentsResult> {
  const { parentEventId, endDate } = options;

  try {
    // Initialize models
    initModels(db);

    // Fetch the parent event
    const parentEvent = await Event.findByPk(parentEventId);

    if (!parentEvent) {
      throw new Error(`Parent event with ID ${parentEventId} not found`);
    }

    // Validate that the parent event has a recurrence rule
    if (!parentEvent.recurrence_rule) {
      throw new Error(
        `Parent event ${parentEventId} does not have a recurrence_rule`,
      );
    }

    // Generate recurrence instances
    const instances = generateRecurrenceInstances({
      rruleString: parentEvent.recurrence_rule,
      startDate: parentEvent.event_date,
      endDate: endDate || parentEvent.recurrence_end_date || undefined,
    });

    if (instances.length === 0) {
      throw new Error(
        "No recurrence instances generated from the recurrence rule",
      );
    }

    // Calculate the amount per installment (equal distribution)
    const parentAmount = new Decimal(parentEvent.amount);
    const installmentCount = instances.length;
    const amountPerInstallment = parentAmount
      .dividedBy(installmentCount)
      .toDecimalPlaces(8); // 8 decimals for crypto support

    // Create installment events and links
    const installmentIds: string[] = [];

    for (const instance of instances) {
      // Create the installment event
      const installmentEvent = await Event.create({
        user_id: parentEvent.user_id,
        type: parentEvent.type,
        amount: amountPerInstallment.toString(),
        currency_id: parentEvent.currency_id,
        quantity: 1,
        description: `${parentEvent.description} - Installment`,
        event_date: instance.date,
        parent_event_id: parentEventId,
        // Installments themselves don't have recurrence
        recurrence_rule: null,
        recurrence_end_date: null,
      });

      // Create the junction record
      await EventInstallment.create({
        parent_event_id: parentEventId,
        installment_event_id: installmentEvent.id,
      });

      installmentIds.push(installmentEvent.id);
    }

    return {
      success: true,
      parentEventId,
      installmentCount: installmentIds.length,
      installmentIds,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      parentEventId,
      installmentCount: 0,
      installmentIds: [],
      error: errorMessage,
    };
  }
}

/**
 * Gets all installments for a parent event
 *
 * @param parentEventId The parent event ID
 * @returns Array of installment events
 *
 * @example
 * const installments = await getInstallmentsForParent("event-123");
 */
export async function getInstallmentsForParent(
  parentEventId: string,
): Promise<Event[]> {
  try {
    initModels(db);

    const eventInstallments = await EventInstallment.findAll({
      where: { parent_event_id: parentEventId },
      attributes: ["installment_event_id"],
    });

    const installmentIds = eventInstallments.map(
      (ei) => ei.installment_event_id,
    );

    if (installmentIds.length === 0) {
      return [];
    }

    const installments = await Event.findAll({
      where: { id: installmentIds },
      order: [["event_date", "ASC"]],
    });

    return installments;
  } catch (error) {
    console.error("Error fetching installments:", error);
    return [];
  }
}

/**
 * Deletes all installments for a parent event
 *
 * @param parentEventId The parent event ID
 * @returns true if successful, false otherwise
 *
 * @example
 * const deleted = await deleteInstallmentsForParent("event-123");
 */
export async function deleteInstallmentsForParent(
  parentEventId: string,
): Promise<boolean> {
  try {
    initModels(db);

    // Get all installment IDs
    const eventInstallments = await EventInstallment.findAll({
      where: { parent_event_id: parentEventId },
      attributes: ["installment_event_id"],
    });

    const installmentIds = eventInstallments.map(
      (ei) => ei.installment_event_id,
    );

    if (installmentIds.length === 0) {
      return true;
    }

    // Delete installment events (cascade will delete junction records)
    await Event.destroy({
      where: { id: installmentIds },
    });

    return true;
  } catch (error) {
    console.error("Error deleting installments:", error);
    return false;
  }
}

/**
 * Recreates installments for a parent event (deletes old ones and creates new ones)
 *
 * Useful when modifying the recurrence rule of a parent event
 *
 * @param parentEventId The parent event ID
 * @param newEndDate Optional new end date
 * @returns Result with new installment IDs
 *
 * @example
 * const result = await recreateInstallments("event-123");
 */
export async function recreateInstallments(
  parentEventId: string,
  newEndDate?: Date,
): Promise<CreateInstallmentsResult> {
  try {
    // Delete existing installments
    await deleteInstallmentsForParent(parentEventId);

    // Create new installments
    return await createInstallments({
      parentEventId,
      endDate: newEndDate,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      parentEventId,
      installmentCount: 0,
      installmentIds: [],
      error: errorMessage,
    };
  }
}
