export type EventsTableHeaderProps = {
  selectedCount: number;
  totalCount: number;
  showOriginalText: boolean;
  onToggleAll: () => void;
  onToggleTextMode: () => void;
  className?: string;
};
