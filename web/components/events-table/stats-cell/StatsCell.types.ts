import { ReactNode } from "react";

export type StatsCellVariant = "day" | "month" | "year";

export type StatsCellStats = {
  totalIncome: string;
  totalExpenses: string;
  net: string;
  netPercentChange?: string | null;
};

export type StatsCellProps = {
  stats: StatsCellStats;
  variant: StatsCellVariant;
  label?: ReactNode;
  className?: string;
};
