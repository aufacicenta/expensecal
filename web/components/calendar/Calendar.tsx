import clsx from "clsx";
import { CalendarProps } from "./Calendar.types";

export const Calendar: React.FC<CalendarProps> = ({ children, className }) => {
  return <div className={clsx(className)}>Test</div>;
};
