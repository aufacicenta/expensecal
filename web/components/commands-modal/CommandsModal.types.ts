import { ReactNode } from "react";

export type CommandsModalProps = {
  children?: ReactNode;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Called after events are created successfully, with the first event's ID for scroll-to behavior
   */
  onEventsCreated?: (firstEventId: string) => void;
  /**
   * If provided, new events/inventory items will be added to this event group
   * instead of creating a new one (for inventory) or being ungrouped (for expenses)
   */
  eventGroupId?: string;
};
