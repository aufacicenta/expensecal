"use client";

import { useEventsContext } from "@/context/Events/useEventsContext";
import { Textarea } from "@heroui/input";
import { useState } from "react";

export default function Home() {
  const eventsController = useEventsContext();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && input.trim()) {
      e.preventDefault();
      setLoading(true);
      setResult("");

      try {
        // Step 1: Parse the event text
        const parseResponse = await eventsController.parseEventText({
          text: input,
        });

        if ("error" in parseResponse) {
          setResult(`Error parsing: ${parseResponse.error}`);
          setLoading(false);
          return;
        }

        // Step 2: Create the event from parsed data
        const createResponse = await eventsController.createEvent({
          type: parseResponse.data.type,
          amount: parseResponse.data.amount,
          currency_id: parseResponse.data.currency_id!,
          quantity: parseResponse.data.quantity,
          description: parseResponse.data.description,
          event_date: parseResponse.data.event_date,
          recurrence_rule: parseResponse.data.recurrence_rule || null,
          recurrence_end_date: parseResponse.data.recurrence_end_date || null,
        });

        if ("error" in createResponse) {
          setResult(`Error creating event: ${createResponse.error}`);
        } else {
          setResult(
            `Success! Created event: ${createResponse.data.description}`,
          );
          setInput("");
        }
      } catch (error) {
        setResult(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 py-8 md:py-10">
      <h1 className="text-3xl font-bold">Expense Calculator</h1>
      <Textarea
        label="Enter expense or income"
        placeholder="e.g., Spent $50 on groceries"
        value={input}
        onValueChange={setInput}
        onKeyDown={handleKeyDown}
        disabled={loading}
        isDisabled={loading}
        description="Press Enter to parse and create event (Shift+Enter for new line)"
        className="w-full"
      />
      {result && (
        <div
          className={`w-full rounded-lg p-4 ${
            result.startsWith("Success")
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {result}
        </div>
      )}
    </section>
  );
}
