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

export type EventsContextType = {
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
};
