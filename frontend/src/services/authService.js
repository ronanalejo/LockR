import api from './api';
import tokenStorage from './tokenStorage';

const authService = {
  // login student
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      
      const { token, user } = response.data;
      
      // store token in local storage
      if (token) {
        tokenStorage.setToken(token);
      }
      
      return {
        success: true,
        user,
        token,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login error:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please try again.',
        error: error.response?.data || error.message
      };
    }
  },

  // logout
  logout: async () => {
    try {
      // remove token from local storage
      tokenStorage.removeToken();
      
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('Logout error:', error);
      
      // remove token even if backend call fails
      tokenStorage.removeToken();
      
      return {
        success: true,
        message: 'Logout successful'
      };
    }
  },

  // get current user
  getCurrentUser: async () => {
    try {
      const token = tokenStorage.getToken();
      
      // check if token exists
      if (!token) {
        return {
          success: false,
          message: 'No authentication token found',
          user: null
        };
      }
      
      // fetch current user from backend
      const response = await api.get('/auth/me');
      
      return {
        success: true,
        user: response.data.user,
        message: 'User retrieved successfully'
      };
    } catch (error) {
      console.error('Get current user error:', error);
      
      // if unauthorized, remove invalid token
      if (error.response?.status === 401) {
        tokenStorage.removeToken();
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get current user',
        user: null,
        error: error.response?.data || error.message
      };
    }
  },

  // check if user is authenticated
  isAuthenticated: () => {
    return !!tokenStorage.getToken();
  }
};

export default authService;