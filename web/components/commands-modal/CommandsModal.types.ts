import { ReactNode } from "react";

export type CommandsModalProps = {
  children?: ReactNode;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * If provided, new events/inventory items will be added to this event group
   * instead of creating a new one (for inventory) or being ungrouped (for expenses)
   */
  eventGroupId?: string;
};
