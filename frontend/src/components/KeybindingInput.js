import React, { useState } from "react";

import PropTypes from "prop-types";
import TextField from "@material-ui/core/TextField";

export default function KeybindingInput(props) {
  const [code, setCode] = useState();

  const { value } = props;

  function handleKeyDown(e) {
    const { onBindingChange } = props;
    const { key, keyCode } = e;
    const old = { key: value, keyCode: code };

    e.preventDefault();
    setCode(keyCode);

    onBindingChange && onBindingChange(old, { key, keyCode });
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
