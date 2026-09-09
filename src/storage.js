import createPersistedState from "use-persisted-state";

export const useInstantsState = createPersistedState("instants");
export const useTheme = createPersistedState("theme");
export const useSelectedServer = createPersistedState("selectedServer");
