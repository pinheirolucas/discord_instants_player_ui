import axios from "axios";

export const defaultApiUrl = "http://localhost:9001";

let apiUrl = defaultApiUrl;

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
  return true;
}

export function resetApiUrl() {
  apiUrl = defaultApiUrl;
}

export async function playOnDiscord(url) {
  try {
    const response = await axios.post(`${apiUrl}/bot/play`, { url });
    return response.data.data.exitReason;
  } catch (err) {
    throw new Error(
      (err.response && err.response.data && err.response.data.message) ||
        "Erro desconhecido, tente novamente mais tarde"
    );
  }
}

export async function stopPlayingOnDiscord() {
  return axios.post(`${apiUrl}/bot/stop`);
}

export async function getContent(url) {
  return axios.get(`${apiUrl}/play?url=${url}`).then(resp => resp.data.data);
}

export async function getMyInstants(page, search) {
  const params = [
    { value: page || 1, query: `page=${page}` },
    { value: search, query: `&search=${search}` }
  ].reduce((acc, cur) => (cur.value ? acc + cur.query : acc), "");

  return axios
    .get(`${apiUrl}/instant/list?${params}`)
    .then(resp => resp.data.data)
    .catch(err => {
      throw new Error(
        (err.response && err.response.data && err.response.data.message) ||
          "Erro desconhecido, tente novamente mais tarde"
      );
    });
}
