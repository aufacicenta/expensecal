import { GetChildEventsResponse } from "@/app/api/v1/events/[id]/children/types";
import {
  DeleteMode,
  UpdateEventRequestBody,
  UpdateEventResponse,
} from "@/app/api/v1/events/[id]/types";
import {
  CreateFromTextRequestBody,
  CreateFromTextResponse,
} from "@/app/api/v1/events/create-from-text/types";
import {
  CreateEventRequestBody,
  CreateEventResponse,
} from "@/app/api/v1/events/create/types";
import {
  CreateInstallmentsRequestBody,
  CreateInstallmentsResponse,
  DeleteInstallmentsRequestBody,
  DeleteInstallmentsResponse,
  ListInstallmentsResponse,
} from "@/app/api/v1/events/installments/types";
import {
  ParseRequestBody,
  ParseResponse,
} from "@/app/api/v1/events/parse/types";
import { ReactNode } from "react";

export type EventsContextControllerProps = {
  children: ReactNode;
};

export type EventsContextActionStates = {
  createEventFromText: {
    isLoading: boolean;
    error?: string;
  };
  parseEventText: {
    isLoading: boolean;
    error?: string;
  };
  createEvent: {
    isLoading: boolean;
    error?: string;
  };
  createInstallments: {
    isLoading: boolean;
    error?: string;
  };
  listInstallments: {
    isLoading: boolean;
    error?: string;
  };
  deleteInstallments: {
    isLoading: boolean;
    error?: string;
  };
  updateEvent: {
    isLoading: boolean;
    error?: string;
  };
  deleteEvent: {
    isLoading: boolean;
    error?: string;
  };
  deleteEventMultiple: {
    isLoading: boolean;
    error?: string;
  };
  fetchChildEvents: {
    isLoading: boolean;
    error?: string;
  };
};

export type EventsContextType = {
  /**
   * Action States for all async functions
   */
  actionStates: EventsContextActionStates;
  createEventFromText: (
    body: CreateFromTextRequestBody,
  ) => Promise<CreateFromTextResponse>;
  parseEventText: (body: ParseRequestBody) => Promise<ParseResponse>;
  createEvent: (body: CreateEventRequestBody) => Promise<CreateEventResponse>;
  createInstallments: (
    body: CreateInstallmentsRequestBody,
  ) => Promise<CreateInstallmentsResponse>;
  listInstallments: (
    parentEventId: string,
  ) => Promise<ListInstallmentsResponse>;
  deleteInstallments: (
    body: DeleteInstallmentsRequestBody,
  ) => Promise<DeleteInstallmentsResponse>;
  updateEvent: (
    eventId: string,
    body: UpdateEventRequestBody,
    originalEventDate: Date,
  ) => Promise<UpdateEventResponse>;
  deleteEvent: (
    eventId: string,
    deleteMode?: DeleteMode,
  ) => Promise<UpdateEventResponse>;
  deleteEventMultiple: (
    eventIds: string[],
    deleteMode?: DeleteMode,
  ) => Promise<void>;
  fetchChildEvents: (eventId: string) => Promise<GetChildEventsResponse>;
};
