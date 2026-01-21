import { CurrencyData } from "@/app/api/v1/currencies/types";
import { CalendarEvent } from "@/app/api/v2/calendar/types";

export type EventCellCurrencyEditProps = {
  event: CalendarEvent;
  availableCurrencies: CurrencyData[];
  onUpdate: (
    eventId: string,
    currencyId: string,
    eventDate: Date,
  ) => Promise<void>;
  onClose: () => void;
  className?: string;
};
