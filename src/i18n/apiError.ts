import type { TFunction } from "i18next";
import { ApiError } from "../service";

export function apiErrorMessage(t: TFunction, err: unknown): string {
  if (err instanceof ApiError) {
    return err.label ? t(`api.${err.label}`, { defaultValue: err.message }) : err.message;
  }

  return err instanceof Error ? err.message : String(err);
}
