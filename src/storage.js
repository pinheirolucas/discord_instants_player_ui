import createPersistedState from "use-persisted-state";

export const useInstantsState = createPersistedState("instants");
export const useUrlCodeMap = createPersistedState("urlCodeMap");
export const useCodeUrlMap = createPersistedState("codeUrlMap");
export const useCodeKeyMap = createPersistedState("codeKeyMap");
