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

// Department API interfaces
export interface Department {
  _id: string;
  name: string;
  description: string;
  admin?: string | null;
  isActive?: boolean;
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentResponse {
  success: boolean;
  departments?: Department[];
  department?: Department;
  error?: string;
  message?: string;
}

export interface CreateDepartmentData {
  name: string;
  description: string;
}

export interface UpdateDepartmentData {
  _id: string;
  name: string;
  description: string;
}

// Department API methods
export const departmentAPI = {
  // Get all departments
  getAll: async (): Promise<DepartmentResponse> => {
    const response = await apiClient.get('/departments');
    return response.data;
  },
  
  // Create new department
  create: async (departmentData: CreateDepartmentData): Promise<DepartmentResponse> => {
    const response = await apiClient.post('/departments', departmentData);
    return response.data;
  },
  
  // Update department
  update: async (departmentData: UpdateDepartmentData): Promise<DepartmentResponse> => {
    const response = await apiClient.put('/departments', departmentData);
    return response.data;
  },
  
  // Delete department
  delete: async (departmentId: string): Promise<DepartmentResponse> => {
    const response = await apiClient.delete('/departments', { data: { _id: departmentId } });
    return response.data;
  },
};

// Export the configured axios instance for direct use if needed
export { apiClient };

// User API types and functions
export interface User {
  _id: string;
  name: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'staff' | 'department_head';
  department: string;
  departmentId: string;
  position: string;
  workMode: 'in-house' | 'remote';
  image: string; // base64
  status: 'active' | 'inactive' | 'suspended';
  bio?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  department: string;
  position: string;
  workMode?: string;
  image: string;
  bio?: string;
  status?: string;
}

export interface UpdateUserData {
  userId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password?: string;
  phone: string;
  role: string;
  department: string;
  position: string;
  workMode: string;
  image: string;
  bio?: string;
  status: string;
}

export interface UserResponse {
  success: boolean;
  users?: User[];
  user?: User;
  error?: string;
  message?: string;
}

export const userAPI = {
  // Get all users
  getAll: async (): Promise<UserResponse> => {
    try {
      const response = await apiClient.get('/users');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch users'
      };
    }
  },

  // Create user
  create: async (userData: CreateUserData): Promise<UserResponse> => {
    try {
      const formData = new FormData();
      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      const response = await apiClient.post('/users', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create user'
      };
    }
  },

  // Update user
  update: async (userData: UpdateUserData): Promise<UserResponse> => {
    try {
      const formData = new FormData();
      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      const response = await apiClient.put('/users', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update user'
      };
    }
  },

  // Delete user
  delete: async (userId: string): Promise<UserResponse> => {
    try {
      const formData = new FormData();
      formData.append('userId', userId);

      const response = await apiClient.delete('/users', {
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete user'
      };
    }
  },

  // Get current user profile
  getCurrentUser: async (): Promise<UserResponse> => {
    try {
      const response = await apiClient.get('/users?action=getCurrentUser');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get current user'
      };
    }
  }
};

// Blog API types and functions
export interface Blog {
  _id: string;
  name: string;
  description: string;
  image: string; // base64
  category: string;
  categoryName?: string;
  admin: string;
  adminName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlogData {
  name: string;
  description: string;
  image: string;
  category: string;
  admin: string;
}

export interface UpdateBlogData {
  blogId: string;
  name: string;
  description: string;
  image: string;
  category: string;
  admin: string;
}

export interface BlogResponse {
  success: boolean;
  blogs?: Blog[];
  blog?: Blog;
  error?: string;
  message?: string;
}

export const blogAPI = {
  // Get all blogs
  getAll: async (): Promise<BlogResponse> => {
    try {
      const response = await apiClient.get('/blogs');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch blogs'
      };
    }
  },

  // Create blog
  create: async (blogData: CreateBlogData): Promise<BlogResponse> => {
    try {
      const response = await apiClient.post('/blogs', blogData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create blog'
      };
    }
  },

  // Update blog
  update: async (blogData: UpdateBlogData): Promise<BlogResponse> => {
    try {
      const response = await apiClient.put('/blogs', blogData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update blog'
      };
    }
  },

  // Delete blog
  delete: async (blogId: string): Promise<BlogResponse> => {
    try {
      const response = await apiClient.delete('/blogs', { data: { blogId } });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete blog'
      };
    }
  }
};

// Contact API types and functions (for monitoring)
export interface Contact {
  _id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  number: string;
  company: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactResponse {
  success: boolean;
  contacts?: Contact[];
  contact?: Contact;
  error?: string;
  message?: string;
}

export const contactAPI = {
  // Get all contact messages (for monitoring)
  getAll: async (): Promise<ContactResponse> => {
    try {
      const response = await apiClient.get('/contacts');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch contact messages'
      };
    }
  },

  // Delete contact message (for spam/inappropriate content)
  delete: async (contactId: string): Promise<ContactResponse> => {
    try {
      const response = await apiClient.delete('/contacts', { data: { contactId } });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete contact message'
      };
    }
  }
};

// Category API types and functions
export interface Category {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryData {
  name: string;
  description: string;
}

export interface UpdateCategoryData {
  categoryId: string;
  name: string;
  description: string;
}

export interface CategoryResponse {
  success: boolean;
  categories?: Category[];
  category?: Category;
  error?: string;
  message?: string;
}

export const categoryAPI = {
  // Get all categories
  getAll: async (): Promise<CategoryResponse> => {
    try {
      const response = await apiClient.get('/categories');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch categories'
      };
    }
  },

  // Create category
  create: async (categoryData: CreateCategoryData): Promise<CategoryResponse> => {
    try {
      const response = await apiClient.post('/categories', categoryData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create category'
      };
    }
  },

  // Update category
  update: async (categoryData: UpdateCategoryData): Promise<CategoryResponse> => {
    try {
      const response = await apiClient.put('/categories', categoryData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update category'
      };
    }
  },

  // Delete category
  delete: async (categoryId: string): Promise<CategoryResponse> => {
    try {
      const response = await apiClient.delete('/categories', { data: { categoryId } });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete category'
      };
    }
  }
};

// Attendance API types and functions
export interface AttendanceRecord {
  _id: string;
  user: string;
  userName?: string;
  department: string;
  departmentName?: string;
  checkInTime: string;
  checkOutTime?: string;
  date: string;
  workHours?: number;
  notes?: string;
  workMode: 'in-house' | 'remote';
  status: string;
  autoCheckout?: boolean; // Flag for automatic checkout at 6 PM
  location?: {
    latitude: number;
    longitude: number;
    locationName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CheckInData {
  userId: string;
  departmentId: string;
  notes?: string;
  workMode: 'in-house' | 'remote';
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

export interface CheckOutData {
  attendanceId: string;
}

export interface AttendanceResponse {
  success: boolean;
  attendance?: AttendanceRecord[];
  message?: string;
  error?: string;
  count?: number;
  userRole?: string;
}

export const attendanceAPI = {
  // Get all attendance records
  getAll: async (): Promise<AttendanceResponse> => {
    try {
      const response = await apiClient.get('/attendance');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch attendance records'
      };
    }
  },

  // Get user attendance
  getUserAttendance: async (userId: string, startDate?: string, endDate?: string): Promise<AttendanceResponse> => {
    try {
      const params = new URLSearchParams({ action: 'getUserAttendance', userId });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await apiClient.get(`/attendance?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch user attendance'
      };
    }
  },

  // Get department attendance
  getDepartmentAttendance: async (departmentId: string): Promise<AttendanceResponse> => {
    try {
      const response = await apiClient.get(`/attendance?action=getDepartmentAttendance&departmentId=${departmentId}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch department attendance'
      };
    }
  },

  // Get attendance report
  getAttendanceReport: async (startDate: string, endDate: string, departmentId?: string): Promise<AttendanceResponse> => {
    try {
      const params = new URLSearchParams({ action: 'getAttendanceReport', startDate, endDate });
      if (departmentId) params.append('departmentId', departmentId);
      
      const response = await apiClient.get(`/attendance?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to generate attendance report'
      };
    }
  },

  // Check in
  checkIn: async (checkInData: CheckInData): Promise<AttendanceResponse> => {
    try {
      const response = await apiClient.post('/attendance', { action: 'checkIn', ...checkInData });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to check in'
      };
    }
  },

  // Check out
  checkOut: async (checkOutData: CheckOutData): Promise<AttendanceResponse> => {
    try {
      const response = await apiClient.post('/attendance', { action: 'checkOut', ...checkOutData });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to check out'
      };
    }
  },

  // Manual auto-checkout trigger
  autoCheckout: async (): Promise<AttendanceResponse> => {
    try {
      const response = await apiClient.post('/attendance', { action: 'autoCheckout' });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to perform auto-checkout'
      };
    }
  },

  // Delete attendance record (admin/manager only)
  delete: async (attendanceId: string): Promise<AttendanceResponse> => {
    try {
      const response = await apiClient.delete('/attendance', { data: { attendanceId } });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete attendance record'
      };
    }
  },

  // Update user work mode (admin/manager only)
  updateWorkMode: async (targetUserId: string, newWorkMode: 'in-house' | 'remote'): Promise<AttendanceResponse> => {
    try {
      const response = await apiClient.post('/attendance', {
        action: 'updateWorkMode',
        targetUserId,
        newWorkMode
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update work mode'
      };
    }
  }
};

// Memo API interfaces
export interface MemoRecord {
  _id: string;
  refNumber: string;
  fromDepartment: string | { _id: string; name: string };
  fromName: string | { _id: string; firstName: string; lastName: string; email: string };
  memoDate: string;
  toDepartment: string | { _id: string; name: string };
  toName: string | { _id: string; firstName: string; lastName: string; email: string };
  subject: string;
  memoType: string;
  dueDate?: string;
  frequency?: string;
  remark?: string;
  ccDepartment?: string | { _id: string; name: string };
  ccName?: string | { _id: string; firstName: string; lastName: string; email: string };
  image?: string;
  emailCheck: boolean;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoData {
  refNumber: string;
  fromDepartment: string;
  fromName: string;
  memoDate: string;
  toDepartment: string;
  toName: string;
  subject: string;
  memoType: string;
  dueDate?: string;
  frequency?: string;
  remark?: string;
  ccDepartment?: string;
  ccName?: string;
  base64Image?: string;
  emailCheck?: boolean;
  status?: 'draft' | 'published';
}

export interface UpdateMemoData {
  id: string;
  refNumber?: string;
  fromDepartment?: string;
  fromName?: string;
  memoDate?: string;
  toDepartment?: string;
  toName?: string;
  subject?: string;
  memoType?: string;
  dueDate?: string;
  frequency?: string;
  remark?: string;
  ccDepartment?: string;
  ccName?: string;
  base64Image?: string;
  emailCheck?: boolean;
  status?: 'draft' | 'published';
}

export interface MemoResponse {
  success: boolean;
  data?: MemoRecord[] | MemoRecord;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalMemos: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  message?: string;
  error?: string;
  status: number;
}

// Memo API functions
export const memoAPI = {
  // Get all memos with pagination and search
  getAll: async (page = 1, limit = 10, search_term = ""): Promise<MemoResponse> => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search_term) params.append('search_term', search_term);
      
      const response = await apiClient.get(`/memo?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch memos',
        status: error.response?.status || 500
      };
    }
  },

  // Get memo by ID
  getById: async (id: string): Promise<MemoResponse> => {
    try {
      const response = await apiClient.get(`/memo?operation=getById&id=${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch memo',
        status: error.response?.status || 500
      };
    }
  },

  // Create new memo
  create: async (data: CreateMemoData): Promise<MemoResponse> => {
    try {
      const formData = new FormData();
      formData.append('operation', 'create');
      
      // Add all memo data to formData
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      const response = await apiClient.post('/memo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create memo',
        status: error.response?.status || 500
      };
    }
  },

  // Update memo
  update: async (data: UpdateMemoData): Promise<MemoResponse> => {
    try {
      const formData = new FormData();
      formData.append('operation', 'update');
      
      // Add all memo data to formData
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      const response = await apiClient.post('/memo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update memo',
        status: error.response?.status || 500
      };
    }
  },

  // Delete memo
  delete: async (id: string): Promise<MemoResponse> => {
    try {
      const formData = new FormData();
      formData.append('operation', 'delete');
      formData.append('id', id);

      const response = await apiClient.post('/memo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete memo',
        status: error.response?.status || 500
      };
    }
  }
};

// Default export
export default {
  auth: authAPI,
  department: departmentAPI,
  user: userAPI,
  blog: blogAPI,
  contact: contactAPI,
  category: categoryAPI,
  attendance: attendanceAPI,
  memo: memoAPI,
  service: apiService,
  client: apiClient
}; 