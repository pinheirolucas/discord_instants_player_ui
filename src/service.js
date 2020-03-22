import axios from "axios";

const apiUrl = "http://localhost:9001";

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
