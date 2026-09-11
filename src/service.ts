import axios from "axios";
import type { AxiosResponse } from "axios";
import type { Instant } from "./storage";

export const defaultApiUrl = "http://localhost:9001";

const genericErrorMessage = "Erro desconhecido, tente novamente mais tarde";

/**
 * Every backend reply is an envelope. Success carries `data`; most
 * application errors come back as HTTP 200 with `{ label, message }` and no
 * `data` at all — so axios does not reject, and an absent `data` is the
 * error signal.
 */
interface Envelope<T> {
  data?: T;
  label?: string;
  message?: string;
}

export interface Listing {
  instants?: Instant[];
  pages?: number;
}

/** `exists: false` means myinstants.com no longer has the clip, and the
 *  backend sends no content at all — so the union, not an optional field:
 *  checking `exists` is what makes `content` available. */
export type ContentInfo = { exists: true; content: string } | { exists: false };

interface PlayResult {
  exitReason: string;
}

type Listener<T extends unknown[]> = (...args: T) => void;

function backendMessage(err: unknown): string | null {
  const data = (err as { response?: { data?: Envelope<unknown> } } | null)?.response?.data;
  return (data && data.message) || null;
}

function unwrapData<T>(response: AxiosResponse<Envelope<T>> | undefined): T {
  const body: Envelope<T> = (response && response.data) || {};

  if (!body.data) {
    throw new Error(body.message || genericErrorMessage);
  }

  return body.data;
}

let apiUrl = defaultApiUrl;

let healthy = true;
const healthListeners = new Set<Listener<[boolean]>>();
const connectionErrorListeners = new Set<Listener<[]>>();

function markHealth(next: boolean): void {
  if (healthy === next) {
    return;
  }

  healthy = next;
  healthListeners.forEach((listener) => listener(healthy));
}

// A failed *request* — no response at all — is what makes the server
// unhealthy. An error body still means the server answered.
function markFromError(err: unknown): void {
  const error = err as { isAxiosError?: boolean; response?: unknown } | null;
  const requestFailed = Boolean(error && error.isAxiosError && !error.response);

  markHealth(!requestFailed);

  if (requestFailed) {
    connectionErrorListeners.forEach((listener) => listener());
  }
}

export function isHealthy(): boolean {
  return healthy;
}

export function onHealthChange(listener: Listener<[boolean]>): () => void {
  if (typeof listener !== "function") {
    return () => {};
  }

  healthListeners.add(listener);

  return () => {
    healthListeners.delete(listener);
  };
}

export function onConnectionError(listener: Listener<[]>): () => void {
  if (typeof listener !== "function") {
    return () => {};
  }

  connectionErrorListeners.add(listener);

  return () => {
    connectionErrorListeners.delete(listener);
  };
}

function normalizeApiUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
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

export function getApiUrl(): string {
  return apiUrl;
}

/** Adopts `value` only if it is an http(s) URL with a host, so a malformed
 *  address is ignored rather than displacing a working one. */
export function setApiUrl(value: unknown): boolean {
  const normalized = normalizeApiUrl(value);

  if (!normalized) {
    return false;
  }

  apiUrl = normalized;
  markHealth(true);
  return true;
}

export function resetApiUrl(): void {
  apiUrl = defaultApiUrl;
  markHealth(true);
}

export async function playOnDiscord(url: string): Promise<string> {
  let response: AxiosResponse<Envelope<PlayResult>>;

  try {
    response = await axios.post(`${apiUrl}/bot/play`, { url });
    markHealth(true);
  } catch (err) {
    markFromError(err);
    throw new Error(backendMessage(err) || genericErrorMessage);
  }

  // Outside the try: the envelope's own error must not be rewritten by the
  // handler meant for transport errors.
  return unwrapData(response).exitReason;
}

export async function stopPlayingOnDiscord(): Promise<AxiosResponse> {
  try {
    const response = await axios.post(`${apiUrl}/bot/stop`);
    markHealth(true);
    return response;
  } catch (err) {
    markFromError(err);
    throw err;
  }
}

export async function getContent(url: string): Promise<ContentInfo> {
  let response: AxiosResponse<Envelope<ContentInfo>>;

  try {
    response = await axios.get(`${apiUrl}/play?url=${url}`);
    markHealth(true);
  } catch (err) {
    markFromError(err);
    throw new Error(backendMessage(err) || genericErrorMessage);
  }

  return unwrapData(response);
}

export async function getMyInstants(page?: number, search?: string): Promise<Listing> {
  const params = [
    { value: page || 1, query: `page=${page}` },
    { value: search, query: `&search=${search}` }
  ].reduce((acc, cur) => (cur.value ? acc + cur.query : acc), "");

  return axios
    .get<Envelope<Listing>>(`${apiUrl}/instant/list?${params}`)
    .catch((err: unknown) => {
      markFromError(err);
      throw new Error(backendMessage(err) || genericErrorMessage);
    })
    .then((resp) => {
      // After the .catch, so the envelope's throw is not rewritten into the
      // generic fallback. The server answered, even with an error body.
      markHealth(true);
      return unwrapData(resp);
    });
}
