import * as RadixToast from "@radix-ui/react-toast";
import type { ReactNode } from "react";
import { CloseIcon } from "../icons";
import "./overlays.css";

export interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  /** Optional single action. The dead-clip toast clears the favourite on the
   *  spot; the offline toast opens the server picker. */
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <RadixToast.Provider swipeDirection="down" duration={6000}>
      {children}
      <RadixToast.Viewport className="toast-viewport" />
    </RadixToast.Provider>
  );
}

export function Toast({
  open,
  onOpenChange,
  message,
  actionLabel,
  onAction,
  duration = 6000
}: ToastProps) {
  return (
    <RadixToast.Root
      className="toast"
      open={open}
      onOpenChange={onOpenChange}
      duration={duration}
    >
      <span className="lead" />
      <RadixToast.Description className="tm">{message}</RadixToast.Description>
      {actionLabel && onAction && (
        <RadixToast.Action asChild altText={actionLabel}>
          <button type="button" className="ta" onClick={onAction}>
            {actionLabel}
          </button>
        </RadixToast.Action>
      )}
      <RadixToast.Close className="tx" aria-label="Fechar">
        <CloseIcon size={14} />
      </RadixToast.Close>
    </RadixToast.Root>
  );
}
