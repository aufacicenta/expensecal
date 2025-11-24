import { CalendarEvent } from "@/app/api/v2/calendar/types";
import Decimal from "decimal.js";

export const aggregateChildEventsQuantity = (
  childEvents: CalendarEvent[],
): number => {
  return childEvents.reduce(
    (sum, event) => sum + Number(event.quantity || 0),
    0,
  );
};

export const aggregateChildEventsTotalAmount = (
  childEvents: CalendarEvent[],
): string => {
  return childEvents
    .reduce((sum, event) => {
      const eventTotal = new Decimal(event.amount || 0).times(
        new Decimal(event.quantity || 0),
      );
      return sum.plus(eventTotal);
    }, new Decimal(0))
    .toString();
};

export const aggregateChildEventsExchangeRate = (
  childEvents: CalendarEvent[],
  parentEvent: CalendarEvent,
): string => {
  if (childEvents.length === 0 || !parentEvent.exchangeRate) return "0";

  return childEvents
    .reduce((sum, event) => {
      return sum.plus(new Decimal(parentEvent.exchangeRate));
    }, new Decimal(parentEvent.exchangeRate))
    .toString();

  // @TODO childEvents have no exchangeRate yet

  const totalWeightedRate = childEvents.reduce((sum, event) => {
    const eventTotal = new Decimal(event.amount || 0).times(
      new Decimal(event.quantity || 0),
    );
    const weightedRate = eventTotal.times(new Decimal(event.exchangeRate || 0));
    return sum.plus(weightedRate);
  }, new Decimal(0));

  const totalAmount = childEvents.reduce((sum, event) => {
    const eventTotal = new Decimal(event.amount || 0).times(
      new Decimal(event.quantity || 0),
    );
    return sum.plus(eventTotal);
  }, new Decimal(0));

  if (totalAmount.equals(0)) return "0";

  return totalWeightedRate.dividedBy(totalAmount).toString();
};
