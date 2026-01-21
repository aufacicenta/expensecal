"use client";

import { Alert } from "@heroui/alert";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { useState, useEffect, useMemo } from "react";
import Decimal from "decimal.js";

import {
  MakeRecurringModalProps,
  MakeRecurringParams,
} from "./MakeRecurringModal.types";

import { RecurrenceFrequency } from "@/app/api/v1/events/[id]/make-recurring/types";

const FREQUENCY_OPTIONS: { key: RecurrenceFrequency; label: string }[] = [
  { key: "DAILY", label: "Daily" },
  { key: "WEEKLY", label: "Weekly" },
  { key: "MONTHLY", label: "Monthly" },
  { key: "YEARLY", label: "Yearly" },
];

const DEFAULT_FREQUENCY: RecurrenceFrequency = "MONTHLY";
const DEFAULT_INTERVAL = 1;
const DEFAULT_COUNT = 12;

export const MakeRecurringModal: React.FC<MakeRecurringModalProps> = ({
  isOpen,
  event,
  isLoading = false,
  onClose,
  onConfirm,
}) => {
  const [frequency, setFrequency] =
    useState<RecurrenceFrequency>(DEFAULT_FREQUENCY);
  const [interval, setInterval] = useState<number>(DEFAULT_INTERVAL);
  const [count, setCount] = useState<number>(DEFAULT_COUNT);
  const [splitAmount, setSplitAmount] = useState<boolean>(false);

  // Reset form when modal opens with a new event
  useEffect(() => {
    if (isOpen) {
      setFrequency(DEFAULT_FREQUENCY);
      setInterval(DEFAULT_INTERVAL);
      setCount(DEFAULT_COUNT);
      setSplitAmount(false);
    }
  }, [isOpen]);

  // Calculate the amount per event based on split setting
  const amountPreview = useMemo(() => {
    if (!event?.amount) return null;

    const parentAmount = new Decimal(event.amount);
    const eventCount = count || 1;

    if (splitAmount) {
      const perEvent = parentAmount.dividedBy(eventCount).toDecimalPlaces(2);

      return {
        perEvent: perEvent.toString(),
        total: parentAmount.toString(),
        description: `${eventCount} payments of ${perEvent.toString()} each (total: ${parentAmount.toString()})`,
      };
    } else {
      const total = parentAmount.times(eventCount);

      return {
        perEvent: parentAmount.toString(),
        total: total.toString(),
        description: `${eventCount} payments of ${parentAmount.toString()} each (total: ${total.toString()})`,
      };
    }
  }, [event?.amount, count, splitAmount]);

  // Get frequency label for preview
  const frequencyLabel = useMemo(() => {
    const option = FREQUENCY_OPTIONS.find((opt) => opt.key === frequency);

    if (!option) return "";

    if (interval === 1) {
      return option.label.toLowerCase();
    }

    const unit = option.key.toLowerCase().replace("ly", "");

    return `every ${interval} ${unit}s`;
  }, [frequency, interval]);

  const handleConfirm = () => {
    const params: MakeRecurringParams = {
      frequency,
      interval,
      count,
      splitAmount,
    };

    onConfirm(params);
  };

  const handleFrequencyChange = (keys: Set<string> | string) => {
    // Handle both Set and string for compatibility
    const value = typeof keys === "string" ? keys : Array.from(keys)[0];

    if (value && FREQUENCY_OPTIONS.some((opt) => opt.key === value)) {
      setFrequency(value as RecurrenceFrequency);
    }
  };

  const handleIntervalChange = (value: string) => {
    const num = parseInt(value, 10);

    if (!isNaN(num) && num >= 1) {
      setInterval(num);
    } else if (value === "") {
      setInterval(1);
    }
  };

  const handleCountChange = (value: string) => {
    const num = parseInt(value, 10);

    if (!isNaN(num) && num >= 2) {
      setCount(num);
    } else if (value === "") {
      setCount(2);
    }
  };

  const isValid = count >= 2 && interval >= 1;

  return (
    <Modal isOpen={isOpen} size="lg" onClose={onClose}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Make Event Recurring
        </ModalHeader>
        <ModalBody>
          {event && (
            <div className="space-y-4">
              {/* Event info */}
              <div className="bg-default-100 rounded-lg p-3">
                <p className="text-default-600 text-sm">
                  <span className="font-medium">{event.description}</span>
                  <span className="text-default-400"> · </span>
                  <span>{event.amount}</span>
                </p>
              </div>

              {/* Frequency Selection */}
              <Select
                label="Frequency"
                placeholder="Select frequency"
                selectedKeys={new Set([frequency])}
                onSelectionChange={(keys) =>
                  handleFrequencyChange(keys as Set<string>)
                }
              >
                {FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.key}>{option.label}</SelectItem>
                ))}
              </Select>

              {/* Interval Input */}
              <Input
                description={`${interval === 1 ? "Every" : `Every ${interval}`} ${frequency.toLowerCase().replace("ly", "")}${interval > 1 ? "s" : ""}`}
                label="Repeat every"
                min={1}
                placeholder="1"
                type="number"
                value={String(interval)}
                onValueChange={handleIntervalChange}
              />

              {/* Count Input */}
              <Input
                description="How many recurring events to create (minimum 2)"
                label="Number of occurrences"
                min={2}
                placeholder="12"
                type="number"
                value={String(count)}
                onValueChange={handleCountChange}
              />

              {/* Split Amount Checkbox */}
              <Checkbox isSelected={splitAmount} onValueChange={setSplitAmount}>
                <span className="text-sm">Split amount across occurrences</span>
              </Checkbox>

              {/* Preview */}
              {amountPreview && (
                <Alert
                  className="mt-4"
                  color="primary"
                  description={
                    <>
                      <p className="text-sm">
                        {count} {frequencyLabel} payments of{" "}
                        <span className="font-semibold">
                          {amountPreview.perEvent}
                        </span>
                      </p>
                      <p className="text-default-500 mt-1 text-xs">
                        Total: {amountPreview.total}
                      </p>
                    </>
                  }
                  title="Preview"
                />
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button isDisabled={isLoading} variant="bordered" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            isDisabled={!isValid || isLoading}
            isLoading={isLoading}
            onPress={handleConfirm}
          >
            Create Recurring Events
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
