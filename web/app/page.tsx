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
        // Single call: Parse text, create event, and optionally create installments
        const response = await eventsController.createEventFromText({
          text: input,
          create_installments: true, // Automatically create installments if recurrence rule detected
        });

        if ("error" in response) {
          setResult(`Error: ${response.error}`);
        } else {
          const eventData = response.data;
          let successMessage = `Success! Created event: ${eventData.event.description}`;

          // Add installment info if installments were created
          if (eventData.installments) {
            successMessage += ` (${eventData.installments.installment_count} installments created)`;
          }

          setResult(successMessage);
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
