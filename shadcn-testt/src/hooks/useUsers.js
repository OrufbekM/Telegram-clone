import { useState } from "react";
import apiClient from "../../services/api-Client";
export const useUsers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const handleError = (err, fallbackMessage) => {
    const message =
      typeof err === "string"
        ? err
        : err?.response?.data?.message || err?.message || fallbackMessage;
    setError(message);
    throw new Error(message);
  };
  const getAuthHeaders = (token) => ({
    headers: { Authorization: `Bearer ${token}` },
  });
  const searchUsers = async (token, query) => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get("/users/search", {
        params: { query },
        ...getAuthHeaders(token),
      });
      return data;
    } catch (err) {
      return handleError(err, "Foydalanuvchilarni qidirishda xatolik");
    } finally {
      setIsLoading(false);
    }
  };
  const getUserProfile = async (token, userId) => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get(
        `/users/${userId}/profile`,
        getAuthHeaders(token)
      );
      return data;
    } catch (err) {
      return handleError(err, "Profil ma'lumotlarini olishda xatolik");
    } finally {
      setIsLoading(false);
    }
  };
  const getPrivateChats = async (token) => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get(
        "/users/private-chats",
        getAuthHeaders(token)
      );
      return { privateChats: data.chats ?? data.privateChats ?? [] };
    } catch (err) {
      return handleError(err, "Private chatlarni olishda xatolik");
    } finally {
      setIsLoading(false);
    }
  };
  const clearError = () => setError(null);
  return {
    searchUsers,
    getUserProfile,
    getPrivateChats,
    isLoading,
    error,
    clearError,
  };
};

