export type EventsMultiLineInputMode = "expense" | "inventory";

export type EventsMultiLineInputProps = {
  className?: string;
  onSubmit?: () => void;
  /**
   * If provided, new events/inventory items will be added to this event group
   * instead of creating a new one (for inventory) or being ungrouped (for expenses)
   */
  eventGroupId?: string;
};
