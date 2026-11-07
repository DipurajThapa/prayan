import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const api = axios.create({ baseURL: API, withCredentials: true });

let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const cfg = error.config || {};
    const skip = ["/auth/refresh", "/auth/login", "/auth/google/session", "/auth/logout"].some((p) => cfg.url?.includes(p));
    if (error.response?.status === 401 && !cfg._retry && !skip) {
      cfg._retry = true;
      try {
        refreshing = refreshing || api.post("/auth/refresh");
        await refreshing;
        refreshing = null;
        return api(cfg);
      } catch (e) {
        refreshing = null;
      }
    }
    return Promise.reject(error);
  }
);

export function formatApiError(err, fallback = "Something went wrong. Please try again.") {
  const detail = err?.response?.data?.detail;
  if (!err?.response) return "We could not reach the server. Please check your connection and try again.";
  if (detail == null) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (typeof e?.msg === "string" ? e.msg.replace(/^Value error, /, "") : JSON.stringify(e)))
      .join(" ");
  }
  if (typeof detail?.msg === "string") return detail.msg;
  return fallback;
}
