"use client";

import { Calendar } from "@/components/calendar/Calendar";
import { EventTextInput } from "@/components/event-text-input/EventTextInput";

export default function Home() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 py-8 md:py-10">
      <Calendar />
      <EventTextInput />
    </section>
  );
}
