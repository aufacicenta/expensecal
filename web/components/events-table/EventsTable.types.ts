import { ReactNode } from "react";

import { CurrentViewInfo } from "./events-table-header/EventsTableHeader.types";

export type EventsTableProps = {
  children?: ReactNode;
  className?: string;
  /**
   * Information about the currently displayed view (if viewing a saved view)
   */
  currentView?: CurrentViewInfo;
};
