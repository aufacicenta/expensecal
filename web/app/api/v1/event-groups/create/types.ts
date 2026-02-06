/**
 * API Types for /api/v1/event-groups/create
 * Protected endpoint for creating new event groups
 */

import { BaseErrorResponse, BaseSuccessResponse } from "../../types";
import { EventGroupData } from "../types";

export type CreateEventGroupRequestBody = {
  name: string;
  eventIds?: string[]; // Optional initial events to add to the group
};

export type CreateEventGroupSuccessResponse = {
  data: EventGroupData & {
    events_added: number;
  };
} & BaseSuccessResponse;

export type CreateEventGroupErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type CreateEventGroupResponse =
  | CreateEventGroupSuccessResponse
  | CreateEventGroupErrorResponse;
