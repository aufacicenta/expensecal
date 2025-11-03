import { ReactNode } from "react";
import { ParseRequestBody, ParseResponse } from "@web/app/api/v1/events/parse/types";
import { CreateEventRequestBody, CreateEventResponse } from "@web/app/api/v1/events/create/types";

export type EventsContextControllerProps = {
  children: ReactNode;
};

export type EventsContextType = {
  parseEventText: (body: ParseRequestBody) => Promise<ParseResponse>;
  createEvent: (body: CreateEventRequestBody) => Promise<CreateEventResponse>;
};
