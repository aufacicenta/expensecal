/**
 * Request body for creating installments from a parent recurring event
 */
export type CreateInstallmentsRequestBody = {
  /**
   * The parent event ID that contains the recurrence rule
   * The parent event will be split into multiple installment events
   */
  parent_event_id: string;

  /**
   * Optional end date for generating recurrence instances
   * If not provided, uses UNTIL or COUNT from the parent event's RRULE
   * ISO 8601 format: "2025-12-31T00:00:00Z"
   */
  end_date?: string | null;
};

/**
 * Single installment event data in response
 */
export type InstallmentEventData = {
  id: string;
  user_id: string;
  type: "EXPENSE" | "INCOME";
  amount: string;
  currency_id: string;
  quantity: number;
  description: string;
  event_date: string; // ISO 8601
  parent_event_id: string;
  recurrence_rule: null; // Installments never have their own recurrence
  recurrence_end_date: null;
  created_at: string;
  updated_at: string;
};

/**
 * Parent event data in response
 */
export type ParentEventData = {
  id: string;
  user_id: string;
  type: "EXPENSE" | "INCOME";
  amount: string;
  currency_id: string;
  quantity: number;
  description: string;
  event_date: string; // ISO 8601
  parent_event_id: null;
  recurrence_rule: string; // RFC 5545 RRULE format
  recurrence_end_date: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Response for successful installment creation
 */
export type CreateInstallmentsSuccessResponse = {
  success: true;
  data: {
    /**
     * The parent event that was used to generate installments
     */
    parent_event: ParentEventData;

    /**
     * Array of created installment events
     */
    installments: InstallmentEventData[];

    /**
     * Total number of installments created
     */
    installment_count: number;

    /**
     * The amount per installment (calculated by dividing parent amount by count)
     */
    amount_per_installment: string;
  };
};

/**
 * Response for failed installment creation
 */
export type CreateInstallmentsErrorResponse = {
  success: false;
  error: string;
  details?: string;
};

/**
 * Response type for creating installments endpoint
 */
export type CreateInstallmentsResponse =
  | CreateInstallmentsSuccessResponse
  | CreateInstallmentsErrorResponse;

/**
 * Request body for listing installments of a parent event
 */
export type ListInstallmentsRequestParams = {
  /**
   * The parent event ID
   * Can be passed as query parameter: ?parent_event_id=...
   */
  parent_event_id?: string;
};

/**
 * Single installment in list response
 */
export type ListInstallmentItem = {
  id: string;
  event_date: string;
  amount: string;
  description: string;
  created_at: string;
};

/**
 * Response for listing installments
 */
export type ListInstallmentsSuccessResponse = {
  success: true;
  data: {
    parent_event_id: string;
    installments: ListInstallmentItem[];
    total_count: number;
    total_amount: string; // Sum of all installments
  };
};

/**
 * Response type for listing installments endpoint
 */
export type ListInstallmentsResponse =
  | ListInstallmentsSuccessResponse
  | CreateInstallmentsErrorResponse;

/**
 * Request body for deleting installments
 */
export type DeleteInstallmentsRequestBody = {
  /**
   * The parent event ID
   * All associated installments will be deleted
   */
  parent_event_id: string;
};

/**
 * Response for deleting installments
 */
export type DeleteInstallmentsSuccessResponse = {
  success: true;
  data: {
    parent_event_id: string;
    deleted_count: number;
  };
};

/**
 * Response type for deleting installments endpoint
 */
export type DeleteInstallmentsResponse =
  | DeleteInstallmentsSuccessResponse
  | CreateInstallmentsErrorResponse;

/**
 * Request body for recreating installments (useful when modifying RRULE)
 */
export type RecreateInstallmentsRequestBody = {
  /**
   * The parent event ID
   */
  parent_event_id: string;

  /**
   * Optional new end date for regenerating instances
   */
  end_date?: string | null;
};

/**
 * Response type for recreating installments endpoint
 */
export type RecreateInstallmentsResponse =
  | CreateInstallmentsSuccessResponse
  | CreateInstallmentsErrorResponse;
