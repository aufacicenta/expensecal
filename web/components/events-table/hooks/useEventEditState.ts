import { useState, useRef, useCallback } from "react";

import { type EventCellAmountEditHandle } from "../event-cell-amount-edit/EventCellAmountEdit";
import { type EventCellQuantityEditHandle } from "../event-cell-quantity-edit/EventCellQuantityEdit";

type FieldType = "quantity" | "amount";

export const useEventEditState = () => {
  const [dirtyEventIds, setDirtyEventIds] = useState<
    Map<string, Set<FieldType>>
  >(new Map());
  const [loadingEventIds, setLoadingEventIds] = useState<Set<string>>(
    new Set(),
  );

  const amountEditRefs = useRef<Map<string, EventCellAmountEditHandle>>(
    new Map(),
  );
  const quantityEditRefs = useRef<Map<string, EventCellQuantityEditHandle>>(
    new Map(),
  );

  const markEventAsDirty = useCallback(
    (eventId: string, fieldType: FieldType) => {
      setDirtyEventIds((prev) => {
        const newMap = new Map(prev);
        const fieldSet = newMap.get(eventId) || new Set();

        fieldSet.add(fieldType);
        newMap.set(eventId, fieldSet);

        return newMap;
      });
    },
    [],
  );

  const clearEventDirty = useCallback(
    (eventId: string, fieldType?: FieldType) => {
      setDirtyEventIds((prev) => {
        const newMap = new Map(prev);
        const fieldSet = newMap.get(eventId);

        if (!fieldSet) return prev;

        if (fieldType) {
          // Clear only specific field type
          fieldSet.delete(fieldType);
          if (fieldSet.size === 0) {
            newMap.delete(eventId);
          }
        } else {
          // Clear all fields for this event
          newMap.delete(eventId);
        }

        return newMap;
      });
    },
    [],
  );

  const isAnyFieldLoading = useCallback(
    (eventId: string): boolean => {
      return loadingEventIds.has(eventId);
    },
    [loadingEventIds],
  );

  const isEventDirty = useCallback(
    (eventId: string): boolean => {
      return dirtyEventIds.has(eventId);
    },
    [dirtyEventIds],
  );

  const handleLoadingChange = useCallback(
    (eventId: string, isLoading: boolean) => {
      setLoadingEventIds((prev) => {
        const newSet = new Set(prev);

        if (isLoading) {
          newSet.add(eventId);
        } else {
          newSet.delete(eventId);
        }

        return newSet;
      });
    },
    [],
  );

  const registerAmountEditRef = useCallback(
    (eventId: string, ref: EventCellAmountEditHandle | null) => {
      if (ref) {
        amountEditRefs.current.set(eventId, ref);
      } else {
        amountEditRefs.current.delete(eventId);
      }
    },
    [],
  );

  const registerQuantityEditRef = useCallback(
    (eventId: string, ref: EventCellQuantityEditHandle | null) => {
      if (ref) {
        quantityEditRefs.current.set(eventId, ref);
      } else {
        quantityEditRefs.current.delete(eventId);
      }
    },
    [],
  );

  const handleSaveAllDirtyFields = useCallback(
    (eventId: string) => {
      const dirtyFields = dirtyEventIds.get(eventId);

      if (!dirtyFields) return;

      try {
        if (dirtyFields.has("quantity")) {
          quantityEditRefs.current.get(eventId)?.save();
        }
        if (dirtyFields.has("amount")) {
          amountEditRefs.current.get(eventId)?.save();
        }
      } catch (error) {
        console.error("Failed to save event:", error);
      }
    },
    [dirtyEventIds],
  );

  return {
    dirtyEventIds,
    loadingEventIds,
    markEventAsDirty,
    clearEventDirty,
    isAnyFieldLoading,
    isEventDirty,
    handleLoadingChange,
    registerAmountEditRef,
    registerQuantityEditRef,
    handleSaveAllDirtyFields,
  };
};
