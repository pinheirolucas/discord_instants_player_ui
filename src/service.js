import axios from "axios";

export const defaultApiUrl = "http://localhost:9001";

const genericErrorMessage = "Erro desconhecido, tente novamente mais tarde";

function backendMessage(err) {
  return (
    (err && err.response && err.response.data && err.response.data.message) ||
    null
  );
}

function unwrapData(response) {
  const body = (response && response.data) || {};

  if (!body.data) {
    throw new Error(body.message || genericErrorMessage);
  }

  return body.data;
}

let apiUrl = defaultApiUrl;

let healthy = true;
const healthListeners = new Set();
const connectionErrorListeners = new Set();

function markHealth(next) {
  if (healthy === next) {
    return;
  }

  healthy = next;
  healthListeners.forEach(listener => listener(healthy));
}

function markFromError(err) {
  const requestFailed = Boolean(err && err.isAxiosError && !err.response);

  markHealth(!requestFailed);

  if (requestFailed) {
    connectionErrorListeners.forEach(listener => listener());
  }
}

export function isHealthy() {
  return healthy;
}

export function onHealthChange(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  healthListeners.add(listener);

  return () => {
    healthListeners.delete(listener);
  };
}

export function onConnectionError(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  connectionErrorListeners.add(listener);

  return () => {
    connectionErrorListeners.delete(listener);
  };
}

function normalizeApiUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch (err) {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  if (!parsed.hostname || parsed.search || parsed.hash) {
    return null;
  }

  return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "");
}

export function getApiUrl() {
  return apiUrl;
}

export function setApiUrl(value) {
  const normalized = normalizeApiUrl(value);

  if (!normalized) {
    return false;
  }

  apiUrl = normalized;
  markHealth(true);
  return true;
}

export function resetApiUrl() {
  apiUrl = defaultApiUrl;
  markHealth(true);
}

export async function playOnDiscord(url) {
  let response;

  try {
    response = await axios.post(`${apiUrl}/bot/play`, { url });
    markHealth(true);
  } catch (err) {
    markFromError(err);
    throw new Error(backendMessage(err) || genericErrorMessage);
  }

  return unwrapData(response).exitReason;
}

export async function stopPlayingOnDiscord() {
  try {
    const response = await axios.post(`${apiUrl}/bot/stop`);
    markHealth(true);
    return response;
  } catch (err) {
    markFromError(err);
    throw err;
  }
}

export async function getContent(url) {
  let response;

  try {
    response = await axios.get(`${apiUrl}/play?url=${url}`);
    markHealth(true);
  } catch (err) {
    markFromError(err);
    throw new Error(backendMessage(err) || genericErrorMessage);
  }

  return unwrapData(response);
}

export async function getMyInstants(page, search) {
  const params = [
    { value: page || 1, query: `page=${page}` },
    { value: search, query: `&search=${search}` }
  ].reduce((acc, cur) => (cur.value ? acc + cur.query : acc), "");

  return axios
    .get(`${apiUrl}/instant/list?${params}`)
    .catch(err => {
      markFromError(err);
      throw new Error(backendMessage(err) || genericErrorMessage);
    })
    .then(resp => {
      markHealth(true);
      return unwrapData(resp);
    });
}
