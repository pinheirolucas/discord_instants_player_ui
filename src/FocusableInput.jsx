import React, { useEffect, useRef } from "react";

import InputBase from "@mui/material/InputBase";

function FocusableInput({ focused, ...rest }) {
  const inputRef = useRef(null);

  useEffect(() => {
    const ref = inputRef.current;

    if (focused) {
      ref.firstChild.focus();
    }
  }, [focused]);

  return <InputBase {...rest} ref={inputRef} />;
}

export default FocusableInput;
