import * as R from "ramda";

export const getUrls = R.map(R.prop("url"));
