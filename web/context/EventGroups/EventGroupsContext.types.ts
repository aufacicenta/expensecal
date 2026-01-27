import { ReactNode } from "react";

import { GetEventGroupSuccessResponse } from "@/app/api/v1/event-groups/[id]/types";
import { EventGroupData } from "@/app/api/v1/event-groups/types";

export type EventGroupsContextControllerProps = {
  children: ReactNode;
};

export type EventGroupDetailData = GetEventGroupSuccessResponse["data"];

export type FetchEventGroupResult =
  | {
      success: true;
      data: EventGroupDetailData;
    }
  | {
      success: false;
      error: string;
    };

export type EventGroupsContextType = {
  eventGroups: EventGroupData[];
  loading: boolean;
  fetchEventGroups: () => Promise<void>;
  fetchEventGroup: (id: string) => Promise<FetchEventGroupResult>;
  createEventGroup: (
    name: string,
    eventIds?: string[],
  ) => Promise<EventGroupData | null>;
  updateEventGroup: (
    id: string,
    name?: string,
    eventIds?: string[],
  ) => Promise<EventGroupData | null>;
  deleteEventGroup: (id: string) => Promise<boolean>;
  addEventsToGroup: (groupId: string, eventIds: string[]) => Promise<boolean>;
};
