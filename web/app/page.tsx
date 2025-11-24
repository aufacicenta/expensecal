"use client";

import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { useState } from "react";

import { DayModalsRenderer } from "@/components/calendar/day-modal/DayModalsRenderer";
import { EventEditModalRenderer } from "@/components/calendar/event-edit-modal/EventEditModalRenderer";
import { EventTextInput } from "@/components/event-text-input/EventTextInput";
import { DayModalContextController } from "@/context/DayModal/DayModalContext";

export default function Home() {
  const [eventTextInputPosition, setEventTextInputPosition] = useState({
    x: 0,
    y: 0,
  });

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
    <DayModalContextController>
      <section>
        <DndContext onDragEnd={handleDragEnd}>
          <EventTextInput position={eventTextInputPosition} />
          <DayModalsRenderer />
          <EventEditModalRenderer />
        </DndContext>
      </section>
    </DayModalContextController>
  );
}
