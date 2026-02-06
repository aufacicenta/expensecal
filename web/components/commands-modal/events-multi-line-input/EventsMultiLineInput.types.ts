export type EventsMultiLineInputMode = "expense" | "inventory";

export type EventsMultiLineInputProps = {
  className?: string;
  /**
   * Called after events are created successfully.
   * @param firstEventId - The ID of the first successfully created event, used for scroll-to behavior
   */
  onSubmit?: (firstEventId?: string) => void;
  /**
   * If provided, new events/inventory items will be added to this event group
   * instead of creating a new one (for inventory) or being ungrouped (for expenses)
   */
  eventGroupId?: string;
};
