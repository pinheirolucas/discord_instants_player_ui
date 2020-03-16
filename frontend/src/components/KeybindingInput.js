import React, { useState } from "react";

import PropTypes from "prop-types";
import TextField from "@material-ui/core/TextField";

export default function KeybindingInput(props) {
  const [value, setValue] = useState("");

  function handleKeyDown(e) {
    const { onBindingChange } = props;
    const { key, keyCode } = e;

    e.preventDefault();
    setValue(e.key.trim() || "Space");

    onBindingChange && onBindingChange(key, keyCode);
  }

  return (
    <TextField
      label="Atalho to teclado"
      variant="outlined"
      value={value}
      onKeyDown={handleKeyDown}
    />
  );
}

KeybindingInput.propTypes = {
  onBindingChange: PropTypes.func
};
