import { ReactNode } from "react";

export type CommandsModalProps = {
  children?: ReactNode;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
};
