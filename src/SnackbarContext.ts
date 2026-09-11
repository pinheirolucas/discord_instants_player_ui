import { createContext } from "react";

export interface SnackbarOptions {
  message: string;
  /** One optional action. The dead-clip toast clears the favourite on the
   *  spot; the offline toast opens the server picker. */
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

export interface SnackbarApi {
  openSnackbar: (options: SnackbarOptions) => void;
  closeSnackbar: () => void;
}

const SnackbarContext = createContext<SnackbarApi>({
  openSnackbar: () => {},
  closeSnackbar: () => {}
});

export default SnackbarContext;
