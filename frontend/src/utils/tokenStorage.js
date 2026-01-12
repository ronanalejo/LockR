const TOKEN_KEY = 'auth_token';

const tokenStorage = {
  // stores token in local storage only
  setToken: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      return true;
    } catch (error) {
      console.error('Error saving token:', error);
      return false;
    }
  },

  // retrieves token from local storage
  getToken: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  // removes token from local storage
  removeToken: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      return true;
    } catch (error) {
      console.error('Error removing token:', error);
      return false;
    }
  }
};

export default tokenStorage;