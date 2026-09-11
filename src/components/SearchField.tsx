import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { SearchIcon } from "../icons";
import "./controls.css";

export interface SearchFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** The find shortcut, rendered as a hint. Per-platform: on macOS the
   *  modifier is Cmd, and showing "Ctrl+F" there would be wrong twice over. */
  shortcut?: string;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField({ shortcut, className, ...rest }, ref) {
    return (
      <div className={["search", className].filter(Boolean).join(" ")}>
        <SearchIcon style={{ flex: "none" }} />
        <input ref={ref} type="search" {...rest} />
        {shortcut && <span className="kbd">{shortcut}</span>}
      </div>
    );
  }
);
