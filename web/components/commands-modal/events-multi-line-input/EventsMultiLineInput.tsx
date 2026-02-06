import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { addToast } from "@heroui/toast";
import clsx from "clsx";
import { Paperclip, Send, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

import {
  EventsMultiLineInputMode,
  EventsMultiLineInputProps,
} from "./EventsMultiLineInput.types";

import { CreateFromTextSuccessResponse } from "@/app/api/v1/events/create-from-text/types";
import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import { useEventsContext } from "@/context/Events/useEventsContext";

type LineResult = {
  line: string;
  success: boolean;
  data?: CreateFromTextSuccessResponse["data"];
  error?: string;
};

// Accepted file types for upload
const ACCEPTED_FILE_TYPES = {
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "application/json": [".json"],
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
};

// Binary file types that should be sent as base64
const BINARY_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

// Max file size: 5MB for PDFs, 1MB for text files
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Read a file as base64 string (without the data URL prefix)
 */
const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(",")[1];

      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

export const EventsMultiLineInput: React.FC<EventsMultiLineInputProps> = ({
  className,
  onSubmit,
  eventGroupId,
}) => {
  const router = useRouter();
  const eventsController = useEventsContext();
  const calendarContext = useCalendarV2Context();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [mode, setMode] = useState<EventsMultiLineInputMode>("expense");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isInventoryMode = mode === "inventory";

  useEffect(() => {
    // Autofocus the textarea when the component mounts
    textareaRef.current?.focus();
  }, []);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setFileUploading(true);

      try {
        const isBinaryFile = BINARY_FILE_TYPES.includes(file.type);

        // Read file content based on type
        let fileContent: string;

        if (isBinaryFile) {
          // Read binary files as base64
          fileContent = await readFileAsBase64(file);
        } else {
          // Read text files as text
          fileContent = await file.text();

          if (!fileContent.trim()) {
            addToast({
              title: "Empty file",
              description: "The uploaded file appears to be empty",
              color: "warning",
            });

            return;
          }
        }

        // Call the create-from-file API
        const response = await eventsController.createEventFromFile({
          file_content: fileContent,
          file_name: file.name,
          file_type: file.type || "text/plain",
          current_date: calendarContext.currentMonth.toISOString(),
        });

        if ("error" in response) {
          addToast({
            title: "File processing failed",
            description: response.error,
            color: "danger",
          });

          return;
        }

        // Show results
        const { summary } = response.data;

        if (summary.total_created > 0) {
          addToast({
            title: `Created ${summary.total_created} event${summary.total_created > 1 ? "s" : ""} from file`,
            description: `Assigned to "${summary.category_name}" category${summary.total_failed > 0 ? `. ${summary.total_failed} failed.` : ""}`,
            color: "success",
          });

          if (onSubmit) {
            onSubmit();
          }
        } else if (summary.total_failed > 0) {
          addToast({
            title: "Failed to create events",
            description: `All ${summary.total_failed} parsed events failed to create`,
            color: "danger",
          });
        } else {
          addToast({
            title: "No events found",
            description: "Could not extract any events from the file",
            color: "warning",
          });
        }
      } catch (error) {
        console.error("File upload error:", error);
        addToast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Unknown error",
          color: "danger",
        });
      } finally {
        setFileUploading(false);
      }
    },
    [eventsController, calendarContext.currentMonth, onSubmit],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleFileUpload(acceptedFiles[0]);
      }
    },
    [handleFileUpload],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    noClick: true, // We'll handle click separately with the button
    onDropRejected: (rejections) => {
      const rejection = rejections[0];

      if (rejection?.errors[0]?.code === "file-too-large") {
        addToast({
          title: "File too large",
          description: "Maximum file size is 5MB",
          color: "danger",
        });
      } else if (rejection?.errors[0]?.code === "file-invalid-type") {
        addToast({
          title: "Invalid file type",
          description:
            "Please upload a .txt, .csv, .json, .pdf, or image file (.png, .jpg, .gif, .webp)",
          color: "danger",
        });
      }
    },
  });

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setLoading(true);

    try {
      if (isInventoryMode) {
        // Inventory mode: send all text at once to inventory endpoint
        const response = await eventsController.createInventoryFromText({
          text: input,
          current_date: calendarContext.currentMonth.toISOString(),
          event_group_id: eventGroupId,
        });

        if (!response.success) {
          addToast({
            title: "Failed to create inventory items",
            description: response.error || "Unknown error",
            color: "danger",
          });

          return;
        }

        const { summary, failures, redirect_url } = response.data;

        // Show success toast
        if (summary.total_created > 0) {
          addToast({
            title: `Created ${summary.total_created} inventory item${summary.total_created > 1 ? "s" : ""}`,
            description:
              summary.total_failed > 0
                ? `${summary.total_failed} item(s) failed to parse`
                : "Valuation pending...",
            color: "success",
          });
        }

        // Show failures if any
        if (failures.length > 0) {
          const failureMessages = failures
            .slice(0, 3)
            .map((f) => `"${f.original_text.slice(0, 20)}...": ${f.error}`)
            .join("; ");

          addToast({
            title: `${failures.length} item(s) failed`,
            description: failureMessages,
            color: "warning",
          });
        }

        // Clear input and close modal
        if (summary.total_created > 0) {
          setInput("");

          // If we're on a view page (eventGroupId exists), reload the view data
          // This calls loadEventGroup on the view page since the context is overridden
          if (eventGroupId) {
            await eventsController.reloadCalendar();
          }

          if (onSubmit) {
            const firstEventId = response.data.events?.[0]?.id;

            onSubmit(firstEventId);
          }

          // Navigate to the view page if we have a redirect URL
          // Skip redirect if we already have an eventGroupId (we're already on the view page)
          if (redirect_url && redirect_url !== "/table" && !eventGroupId) {
            router.push(redirect_url);
          }
        }
      } else {
        // Regular expense/income mode: process each line separately
        const lines = input
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length === 0) return;

        // Process all lines in parallel, skipping calendar reload for each
        const results = await Promise.allSettled(
          lines.map(async (line): Promise<LineResult> => {
            try {
              const response = await eventsController.createEventFromText(
                {
                  current_date: calendarContext.currentMonth.toISOString(),
                  text: line,
                  create_installments: false,
                },
                { skipReload: true },
              );

              if ("error" in response) {
                return { line, success: false, error: response.error };
              }

              return { line, success: true, data: response.data };
            } catch (error) {
              return {
                line,
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              };
            }
          }),
        );

        // Reload calendar once after all events are processed
        await eventsController.reloadCalendar();

        // Aggregate results
        const successResults: LineResult[] = [];
        const failedResults: LineResult[] = [];

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            if (result.value.success) {
              successResults.push(result.value);
            } else {
              failedResults.push(result.value);
            }
          } else {
            // Promise rejected (shouldn't happen since we catch inside)
            failedResults.push({
              line: "Unknown",
              success: false,
              error: result.reason?.message || "Unknown error",
            });
          }
        });

        // Show success toast if any events were created
        if (successResults.length > 0) {
          const descriptions = successResults
            .map((r) => r.data?.event.description)
            .filter(Boolean);

          addToast({
            title: `Created ${successResults.length} event${successResults.length > 1 ? "s" : ""}`,
            description:
              descriptions.length <= 3
                ? descriptions.join(", ")
                : `${descriptions.slice(0, 3).join(", ")} and ${descriptions.length - 3} more`,
            color: "success",
          });
        }

        // Show error toast if any events failed
        if (failedResults.length > 0) {
          const errorMessages = failedResults
            .map(
              (r) =>
                `"${r.line.slice(0, 30)}${r.line.length > 30 ? "..." : ""}": ${r.error}`,
            )
            .slice(0, 3);

          addToast({
            title: `Failed to create ${failedResults.length} event${failedResults.length > 1 ? "s" : ""}`,
            description: errorMessages.join("; "),
            color: "danger",
          });
        }

        // Clear input and call callback only if at least one succeeded
        if (successResults.length > 0) {
          setInput("");

          if (onSubmit) {
            const firstEventId = successResults[0]?.data?.event.id;

            onSubmit(firstEventId);
          }
        }
      }
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isLoading =
    loading ||
    fileUploading ||
    eventsController.actionStates.createEventFromText.isLoading ||
    eventsController.actionStates.createEventFromFile.isLoading ||
    eventsController.actionStates.createInventoryFromText.isLoading ||
    calendarContext.actionStates.loadCalendarV2.isLoading;

  const textareaLabel = isInventoryMode
    ? eventGroupId
      ? "Add to current view (one item per line)"
      : "Enter inventory items (one per line)"
    : eventGroupId
      ? "Add to current view"
      : "Enter expenses or income";

  const textareaPlaceholder = isInventoryMode
    ? "e.g., 1965 Fender Stratocaster sunburst, bought in 2018 for $12,000. Vintage Rolex Submariner from grandfather. MacBook Pro M3 Max, purchased last month for $3500"
    : "e.g., Spent $50 on groceries tomorrow. Got paid $2000 next Friday. Or drop a file (.txt, .csv, .json, .pdf, or image)";

  const submitButtonLabel = () => {
    if (fileUploading) return "Processing file...";
    if (loading) return isInventoryMode ? "Adding items..." : "Creating...";
    if (calendarContext.actionStates.loadCalendarV2.isLoading)
      return "Refreshing Calendar";

    return isInventoryMode ? "Add Inventory Items" : "Create Events";
  };

  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <Button
          className="transition-all"
          color={isInventoryMode ? "secondary" : "default"}
          size="sm"
          variant={isInventoryMode ? "solid" : "bordered"}
          onPress={() => setMode(isInventoryMode ? "expense" : "inventory")}
        >
          🔮 Inventory Valuation
        </Button>
        {isInventoryMode && (
          <span className="text-foreground-500 text-xs">
            AI will estimate market values
          </span>
        )}
      </div>

      <div
        {...getRootProps()}
        className={clsx(
          "relative rounded-lg transition-all duration-200",
          isDragActive && "ring-primary ring-2 ring-offset-2",
        )}
      >
        <input {...getInputProps()} />

        {/* Drag overlay */}
        {isDragActive && (
          <div className="bg-primary/10 absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-sm">
            <div className="text-primary flex flex-col items-center gap-2">
              <Upload size={32} />
              <span className="text-sm font-medium">Drop file to upload</span>
            </div>
          </div>
        )}

        <Textarea
          ref={textareaRef}
          className="w-full"
          description={
            isInventoryMode
              ? "Ctrl+Enter to submit | Each line is a separate inventory item"
              : "Ctrl+Enter to submit | Drag & drop or click clip icon to upload file"
          }
          disabled={isLoading}
          isDisabled={isLoading}
          label={textareaLabel}
          maxRows={8}
          minRows={4}
          placeholder={textareaPlaceholder}
          value={input}
          variant="bordered"
          onKeyDown={handleKeyDown}
          onValueChange={setInput}
        />
      </div>

      <div className="flex gap-2">
        {!isInventoryMode && (
          <Button
            isIconOnly
            aria-label="Upload file"
            color="default"
            isDisabled={isLoading}
            isLoading={fileUploading}
            title="Upload file (.txt, .csv, .json, .pdf, or image)"
            variant="bordered"
            onPress={open}
          >
            {!fileUploading && <Paperclip size={16} />}
          </Button>
        )}

        <Button
          className="flex-1"
          color={isInventoryMode ? "secondary" : "primary"}
          endContent={isLoading ? undefined : <Send size={16} />}
          isDisabled={!input.trim() && !isLoading}
          isLoading={isLoading && !fileUploading}
          variant="bordered"
          onPress={handleSubmit}
        >
          {submitButtonLabel()}
        </Button>
      </div>
    </div>
  );
};
