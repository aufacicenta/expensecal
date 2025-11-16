"use client";

import { CalendarV2 } from "@/components/calendar-v2/CalendarV2";
import { EventEditModalRenderer } from "@/components/calendar/event-edit-modal/EventEditModalRenderer";
import { EventTextInput } from "@/components/event-text-input/EventTextInput";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { useEffect, useState } from "react";

export default function CalendarPage() {
  const [eventTextInputPosition, setEventTextInputPosition] = useState({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    setEventTextInputPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight - 100,
    });
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;

    if (active.id === "event-text-input-draggable") {
      setEventTextInputPosition((prev) => ({
        x: prev.x + delta.x,
        y: prev.y + delta.y,
      }));
    }

    // Day modal dragging is handled by the DayModal component itself
    // via the useDraggable hook
  };

  return (
    <section>
      <DndContext onDragEnd={handleDragEnd}>
        <EventTextInput position={eventTextInputPosition} />
        <EventEditModalRenderer />
        <CalendarV2 />
      </DndContext>
    </section>
  );
}
