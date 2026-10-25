import axios from "axios";


const BASE = import.meta.env.VITE_BACKEND_URL?.trim();
const api = axios.create({
  baseURL: `${BASE || ""}/api`,
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  if (!["get", "head", "options", "trace"].includes(method)) {
    const { data } = await api.get("/auth/csrf");
    const csrfToken = data?.token;
    if (csrfToken) config.headers["X-XSRF-TOKEN"] = csrfToken;
  }

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

export async function getProfile() {
  const { data } = await api.get("/profile");
  return data;
}

export async function updateProfile(payload) {
  const { data } = await api.put("/profile", payload);
  return data;
}

export default api;
