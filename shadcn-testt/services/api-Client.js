import axios from "axios";
const apiClient = axios.create({
  baseURL: "http://localhost:3000/api", // <-- endi hooklarda "/users/..." deb yozamiz
});
apiClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("chatToken") ||
    sessionStorage.getItem("chatToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers["x-access-token"] = token;
  }
  return config;
});
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('API Error:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message,
      url: err.config?.url,
      method: err.config?.method
    });
    const errorMessage = err.response?.data?.message || err.message || 'Network error';
    return Promise.reject(new Error(errorMessage));
  }
);
export default apiClient;

