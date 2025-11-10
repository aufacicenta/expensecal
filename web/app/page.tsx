"use client";

import { Calendar } from "@/components/calendar/Calendar";
import { EventTextInput } from "@/components/event-text-input/EventTextInput";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { useState } from "react";

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
  };

  return (
    <section>
      <DndContext onDragEnd={handleDragEnd}>
        <EventTextInput position={eventTextInputPosition} />
        <Calendar />
      </DndContext>
    </section>
  );
}
