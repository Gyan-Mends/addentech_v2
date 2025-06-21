import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Optimized API Configuration for performance
const API_CONFIG = {
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://your-production-domain.com/api' 
    : 'http://localhost:5173/api',
  timeout: 8000, // Reduced timeout for faster failures
  withCredentials: true,
  // Performance optimizations
  maxRedirects: 3,
  maxContentLength: 50000000, // 50MB limit
  validateStatus: function (status: number) {
    return status >= 200 && status < 300; // default
  },
};

// Create axios instance
const apiClient: AxiosInstance = axios.create(API_CONFIG);

// Request interceptor to add common headers
apiClient.interceptors.request.use(
  (config) => {
    // Add content type if not already set
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    // Add timestamp to prevent caching
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error or request timeout');
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        type: 'NETWORK_ERROR'
      });
    }
    
    // Handle specific HTTP status codes
    switch (error.response.status) {
      case 401:
        console.error('Unauthorized - redirecting to login');
        // You can add redirect logic here if needed
        // window.location.href = '/login';
        break;
      case 403:
        console.error('Forbidden - insufficient permissions');
        break;
      case 500:
        console.error('Internal server error');
        break;
      default:
        console.error(`HTTP Error ${error.response.status}:`, error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// API Service Interface
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role: 'admin' | 'staff' | 'department_head' | 'manager';
  position: string;
  department: string;
  workMode?: 'in-house' | 'remote';
  image?: string;
  bio?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  user?: T;
  data?: T;
  errors?: string[];
}

// Authentication API calls
export const authAPI = {
  // Login user
  login: async (data: LoginRequest): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  // Register user
  register: async (data: RegisterRequest): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  // Verify authentication
  verify: async (): Promise<ApiResponse> => {
    const response = await apiClient.get('/auth/verify');
    return response.data;
  },

  // Logout user
  logout: async (): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  }
};

// Generic API service for other endpoints
export const apiService = {
  // Generic GET request
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.get(url, config);
    return response.data;
  },

  // Generic POST request
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.post(url, data, config);
    return response.data;
  },

  // Generic PUT request
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.put(url, data, config);
    return response.data;
  },

  // Generic PATCH request
  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.patch(url, data, config);
    return response.data;
  },

  // Generic DELETE request
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.delete(url, config);
    return response.data;
  }
};

// Export the configured axios instance for direct use if needed
export { apiClient };

// Default export
export default {
  auth: authAPI,
  service: apiService,
  client: apiClient
}; 