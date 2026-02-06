"use client";

import { useEffect, useState } from "react";

import { EventGroupsContext } from "./EventGroupsContext";
import {
  EventGroupsContextControllerProps,
  EventGroupsContextType,
  FetchEventGroupResult,
} from "./EventGroupsContext.types";

import { GetEventGroupResponse } from "@/app/api/v1/event-groups/[id]/types";
import { EventGroupData } from "@/app/api/v1/event-groups/types";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";

export const EventGroupsContextController = ({
  children,
}: EventGroupsContextControllerProps) => {
  const routes = useRoutes();
  const [eventGroups, setEventGroups] = useState<EventGroupData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEventGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch(routes.api.v1.eventGroups.list());
      const data = await response.json();

      if (data.success) {
        setEventGroups(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch event groups:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventGroup = async (
    id: string,
  ): Promise<FetchEventGroupResult> => {
    try {
      const response = await fetch(routes.api.v1.eventGroups.detail(id));
      const data: GetEventGroupResponse = await response.json();

      if (data.success) {
        return {
          success: true,
          data: data.data,
        };
      } else {
        return {
          success: false,
          error: data.error || "Failed to fetch event group",
        };
      }
    } catch (err) {
      console.error("Failed to fetch event group:", err);

      return {
        success: false,
        error: "Failed to fetch event group",
      };
    }
  };

  const createEventGroup = async (
    name: string,
    eventIds?: string[],
  ): Promise<EventGroupData | null> => {
    try {
      const response = await fetch(routes.api.v1.eventGroups.create(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          eventIds: eventIds || [],
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add the new event group to the list
        setEventGroups([data.data, ...eventGroups]);

        return data.data;
      } else {
        console.error("Failed to create event group:", data.error);

        return null;
      }
    } catch (err) {
      console.error("Failed to create event group:", err);

      return null;
    }
  };

  const updateEventGroup = async (
    id: string,
    name?: string,
    eventIds?: string[],
  ): Promise<EventGroupData | null> => {
    try {
      const body: { name?: string; eventIds?: string[] } = {};

      if (name !== undefined) body.name = name;
      if (eventIds !== undefined) body.eventIds = eventIds;

      const response = await fetch(routes.api.v1.eventGroups.detail(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        // Update the event group in the list
        setEventGroups(
          eventGroups.map((group) => (group.id === id ? data.data : group)),
        );

        return data.data;
      } else {
        console.error("Failed to update event group:", data.error);

        return null;
      }
    } catch (err) {
      console.error("Failed to update event group:", err);

      return null;
    }
  };

  const deleteEventGroup = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(routes.api.v1.eventGroups.detail(id), {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        // Remove the event group from the list
        setEventGroups(eventGroups.filter((group) => group.id !== id));

        return true;
      } else {
        console.error("Failed to delete event group:", data.error);

        return false;
      }
    } catch (err) {
      console.error("Failed to delete event group:", err);

      return false;
    }
  };

  const addEventsToGroup = async (
    groupId: string,
    eventIds: string[],
  ): Promise<boolean> => {
    try {
      // First get current events in the group
      const getResponse = await fetch(
        routes.api.v1.eventGroups.detail(groupId),
      );
      const getData = await getResponse.json();

      if (!getData.success) {
        console.error("Failed to fetch event group:", getData.error);

        return false;
      }

      // Combine existing event IDs with new ones (avoid duplicates)
      const existingEventIds = getData.data.events.map(
        (event: { id: string }) => event.id,
      );
      const combinedEventIds = Array.from(
        new Set([...existingEventIds, ...eventIds]),
      );

      // Update with combined events
      const result = await updateEventGroup(
        groupId,
        undefined,
        combinedEventIds,
      );

      return result !== null;
    } catch (err) {
      console.error("Failed to add events to group:", err);

      return false;
    }
  };

  // Fetch event groups on mount
  useEffect(() => {
    fetchEventGroups();
  }, []);

  const props: EventGroupsContextType = {
    eventGroups,
    loading,
    fetchEventGroups,
    fetchEventGroup,
    createEventGroup,
    updateEventGroup,
    deleteEventGroup,
    addEventsToGroup,
  };

  return (
    <EventGroupsContext.Provider value={props}>
      {children}
    </EventGroupsContext.Provider>
  );
};
