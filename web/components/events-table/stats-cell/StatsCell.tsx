import { Divider } from "@heroui/divider";
import clsx from "clsx";
import Decimal from "decimal.js";
import { TrendingDown, TrendingUp } from "lucide-react";

import { StatsCellProps } from "./StatsCell.types";

import { formatCurrency } from "@/lib/currency/formatter";

const VARIANT_WIDTHS = {
  day: "w-[120px]",
  month: "w-[120px]",
  year: "w-[180px]",
} as const;

export const StatsCell: React.FC<StatsCellProps> = ({
  stats,
  variant,
  label,
  className,
  onIncomeClick,
  onExpenseClick,
}) => {
  const net = new Decimal(stats.net);
  const isPositive = net.greaterThan(0);
  const hasPercentChange = !!stats.netPercentChange;
  const percentChangeValue = stats.netPercentChange
    ? Number(stats.netPercentChange)
    : 0;

  const clickableStyles =
    "cursor-pointer transition-colors hover:bg-default-100 active:bg-default-200";

  return (
    <div
      className={clsx(
        "border-default-300 [&>div]:border-b-default-300 text-right text-xs font-bold [&>div]:px-1",
        variant === "year"
          ? "border-r-[0.5px] border-l-[0.5px] [&>div]:not-[:last-child]:border-b-[0.5px]"
          : "border-x-[0.5px] [&>div]:border-b-[0.5px]",
        VARIANT_WIDTHS[variant],
        className,
      )}
      data-cell-name={`${variant}-stats`}
    >
      {label && (
        <span className="text-default-400 mb-1 block text-center">{label}</span>
      )}

      {/* Total Income */}
      <div
        className={clsx(
          "text-success flex items-center justify-end",
          onIncomeClick && clickableStyles,
        )}
        role={onIncomeClick ? "button" : undefined}
        tabIndex={onIncomeClick ? 0 : undefined}
        onClick={onIncomeClick}
        onKeyDown={(e) => {
          if (onIncomeClick && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onIncomeClick();
          }
        }}
      >
        <span className="w-6/12">{formatCurrency(stats.totalIncome)}</span>
      </div>

      {/* Total Expenses */}
      <div
        className={clsx(
          "text-danger flex items-center justify-end",
          onExpenseClick && clickableStyles,
        )}
        role={onExpenseClick ? "button" : undefined}
        tabIndex={onExpenseClick ? 0 : undefined}
        onClick={onExpenseClick}
        onKeyDown={(e) => {
          if (onExpenseClick && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onExpenseClick();
          }
        }}
      >
        <span className="w-6/12">{formatCurrency(stats.totalExpenses)}</span>
      </div>

      {/* Net with optional percent change */}
      <div
        className={clsx(
          "flex items-center",
          hasPercentChange ? "justify-between gap-1" : "justify-end",
          isPositive ? "text-success" : "text-danger",
        )}
      >
        {hasPercentChange && (
          <>
            <div className="flex items-center gap-1">
              {percentChangeValue >= 0 ? (
                <TrendingUp size={12} />
              ) : (
                <TrendingDown size={12} />
              )}
              {stats.netPercentChange}%
            </div>
            <Divider className="h-3" orientation="vertical" />
          </>
        )}
        <div className="flex w-6/12 items-center justify-end">
          <span>{formatCurrency(net.toString())}</span>
        </div>
      </div>
    </div>
  );
};
