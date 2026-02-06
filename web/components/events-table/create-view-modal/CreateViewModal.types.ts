export type CreateViewModalProps = {
  isOpen: boolean;
  selectedEventIds: string[];
  onClose: () => void;
  onSuccess: (viewId: string) => void;
};
