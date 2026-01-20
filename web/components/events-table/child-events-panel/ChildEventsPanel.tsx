import clsx from "clsx";
import Decimal from "decimal.js";

import { ChildEventsPanelProps } from "./ChildEventsPanel.types";

import { CalendarEvent } from "@/app/api/v2/calendar/types";
import { formatCurrency } from "@/lib/currency/formatter";
import { toDateString } from "@/lib/date/formatters";
import {
  aggregateChildEventsExchangeRate,
  aggregateChildEventsQuantity,
  aggregateChildEventsTotalAmount,
} from "@/lib/events/aggregators";

export const ChildEventsPanel: React.FC<ChildEventsPanelProps> = ({
  parentEvent,
  childEvents,
  className,
}) => {
  const sortedChildEvents = [...childEvents].sort(
    (a, b) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
  );

  return (
    <div className={className}>
      <div className="p-1 text-center text-xs">
        <span>Recurring Instances</span>
      </div>

      {/* Child Event Rows */}
      {sortedChildEvents.map((childEvent) => (
        <div
          key={`child-event-${childEvent.id}`}
          className="hover:bg-content2 last-of-type:border-b-default-300 [&>div]:border-default-300 flex flex-1 text-xs last-of-type:border-b-[0.5px] [&>div]:flex [&>div]:flex-col [&>div]:justify-center [&>div]:border-[0.5px] [&>div]:border-b-0 [&>div]:p-1"
          data-cell-name="child-event-row"
        >
          <div className="w-[70px]" data-cell-name="child-event-checkbox">
            {/* @TODO add a checkbox and allow selecting child events directly */}
          </div>
          <div
            className="w-[120px] text-right"
            data-cell-name="child-event-quantity"
          >
            {/* @TODO allow editing the quantity directly */}
            {childEvent.quantity}
          </div>
          <div
            className="w-[120px] text-right"
            data-cell-name="child-event-amount"
          >
            {/* @TODO allow editing the amount directly */}
            {formatCurrency(childEvent.amount)}
          </div>
          <div
            className="w-[120px] text-right"
            data-cell-name="child-event-total-amount"
          >
            {formatCurrency(
              new Decimal(childEvent.amount)
                .times(new Decimal(childEvent.quantity))
                .toString(),
            )}
          </div>
          <div className="w-[90px]" data-cell-name="child-event-currency">
            {childEvent?.currency?.symbol}
          </div>
          <div
            className={clsx(
              "w-[120px] cursor-no-drop text-right",
              parentEvent.type === "EXPENSE" && "text-danger",
              parentEvent.type === "INCOME" && "text-success",
            )}
            data-cell-name="child-event-exchange-rate"
          >
            {formatCurrency(parentEvent.exchangeRate)}
          </div>
          <div
            className="w-[90px] !flex-row items-center"
            data-cell-name="child-event-structure-type"
          />
          <div
            className="flex w-[210px] !flex-row flex-wrap !justify-start gap-1"
            data-cell-name="child-event-description"
          >
            <span>{childEvent.description}</span>
            <span>-</span>
            <span className="underline">
              {toDateString(childEvent.event_date)}
            </span>
          </div>
          <div className="w-[180px]" data-cell-name="child-event-categories" />
          <div className="w-[120px]" data-cell-name="child-event-actions" />
        </div>
      ))}

      {/* Child Event Calcs Row */}
      <div
        className="hover:bg-content2 last-of-type:border-b-default-300 [&>div]:border-default-300 border-t-success flex flex-1 border-[0.5px] border-x-0 text-xs last-of-type:border-b-[0.5px] [&>div]:flex [&>div]:flex-col [&>div]:justify-center [&>div]:border-[0.5px] [&>div]:border-b-0 [&>div]:p-1"
        data-cell-name="child-event-calc-row"
      >
        <div className="w-[70px]" data-cell-name="child-event-calc-checkbox" />
        <div
          className="w-[120px] text-right"
          data-cell-name="child-event-calc-quantity"
        >
          {aggregateChildEventsQuantity(childEvents as CalendarEvent[]) +
            parentEvent.quantity}
        </div>
        <div
          className="w-[120px] text-right"
          data-cell-name="child-event-calc-amount"
        />
        <div
          className="w-[120px] text-right"
          data-cell-name="child-event-calc-total-amount"
        >
          {formatCurrency(
            new Decimal(
              aggregateChildEventsTotalAmount(childEvents as CalendarEvent[]),
            )
              .plus(
                new Decimal(parentEvent.amount || 0).times(
                  new Decimal(parentEvent.quantity || 0),
                ),
              )
              .toString(),
          )}
        </div>
        <div className="w-[90px]" data-cell-name="child-event-calc-currency" />
        <div
          className={clsx(
            "w-[120px] cursor-no-drop text-right",
            parentEvent.type === "EXPENSE" && "text-danger",
            parentEvent.type === "INCOME" && "text-success",
          )}
          data-cell-name="child-event-calc-exchange-rate"
        >
          {formatCurrency(
            aggregateChildEventsExchangeRate(
              childEvents as CalendarEvent[],
              parentEvent,
            ),
          )}
        </div>
        <div
          className="w-[90px] !flex-row items-center"
          data-cell-name="child-event-calc-structure-type"
        />
        <div
          className="flex w-[210px] !flex-row flex-wrap !justify-start gap-1"
          data-cell-name="child-event-calc-description"
        />
        <div
          className="w-[180px]"
          data-cell-name="child-event-calc-categories"
        />
        <div className="w-[120px]" data-cell-name="child-event-calc-actions">
          {/* @TODO allow deleting or changing the date of a child event directly */}
        </div>
      </div>
    </div>
  );
};
