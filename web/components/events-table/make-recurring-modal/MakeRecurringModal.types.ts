import { EventAttributes } from "@expensecal/database/models/Event";

import { RecurrenceFrequency } from "@/app/api/v1/events/[id]/make-recurring/types";

/**
 * Parameters for making an event recurring
 */
export type MakeRecurringParams = {
  frequency: RecurrenceFrequency;
  interval: number;
  count: number;
  splitAmount: boolean;
};

/**
 * Props for the MakeRecurringModal component
 */
export type MakeRecurringModalProps = {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * The event to make recurring
   */
  event: EventAttributes | null;

  /**
   * Whether a request is in progress
   */
  isLoading?: boolean;

  /**
   * Callback when the modal is closed
   */
  onClose: () => void;

  /**
   * Callback when the user confirms the action
   */
  onConfirm: (params: MakeRecurringParams) => void;
};
