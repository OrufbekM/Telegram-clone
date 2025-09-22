// Storage utilities for managing localStorage and sessionStorage
export const storage = {
  // Persistent storage (localStorage)
  setPersistent: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting localStorage:', error);
    }
  },

  getPersistent: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error getting localStorage:', error);
      return null;
    }
  },

  removePersistent: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing localStorage:', error);
    }
  },

  // Session storage (sessionStorage)
  setSession: (key, value) => {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting sessionStorage:', error);
    }
  },

  getSession: (key) => {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.error('Error getting sessionStorage:', error);
      return null;
    }
  },

  removeSession: (key) => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing sessionStorage:', error);
    }
  },

  // Clear all session data
  clearSessionData: () => {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error('Error clearing sessionStorage:', error);
    }
  },

  // Clear all persistent data
  clearPersistentData: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },

  // Cache management utilities
  clearMessageCache: (userId, chatType, chatId) => {
    try {
      const cacheKey = `messages_${userId}_${chatType}_${chatId}`;
      sessionStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Error clearing message cache:', error);
    }
  },

  // Clear all user-related caches
  clearUserCache: (userId) => {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.includes(`_${userId}_`)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  },

  // Validate and parse JSON safely
  safeParseJSON: (jsonString) => {
    try {
      if (!jsonString) return null;
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return null;
    }
  },

  // Safe JSON stringify
  safeStringifyJSON: (data) => {
    try {
      return JSON.stringify(data);
    } catch (error) {
      console.error('Error stringifying JSON:', error);
      return null;
    }
  }
};

export default storage;
