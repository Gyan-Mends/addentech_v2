import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, Upload, X } from "lucide-react";
import DataTable, { type Column } from "~/components/DataTable";
import Drawer from "~/components/Drawer";
import CustomInput from "~/components/CustomInput";
import { Button } from "@heroui/react";

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'department_head';
  department: string;
  phone?: string;
  avatar?: string; // base64 image
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'manager' | 'staff' | 'department_head';
  department: string;
  phone: string;
  avatar?: string;
  isActive: boolean;
}

const User = () => {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    department: '',
    phone: '',
    avatar: '',
    isActive: true
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Mock data - replace with actual API calls
  const loadUsers = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUsers: User[] = [
        {
          _id: '1',
          name: 'John Doe',
          email: 'john@addenech.com',
          role: 'admin',
          department: 'Administration',
          phone: '+1234567890',
          avatar: '',
          isActive: true,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z'
        },
        {
          _id: '2',
          name: 'Jane Smith',
          email: 'jane@addenech.com',
          role: 'manager',
          department: 'HR',
          phone: '+1234567891',
          avatar: '',
          isActive: true,
          createdAt: '2024-01-16T10:00:00Z',
          updatedAt: '2024-01-16T10:00:00Z'
        },
        {
          _id: '3',
          name: 'Bob Johnson',
          email: 'bob@addenech.com',
          role: 'staff',
          department: 'IT',
          phone: '+1234567892',
          avatar: '',
          isActive: false,
          createdAt: '2024-01-17T10:00:00Z',
          updatedAt: '2024-01-17T10:00:00Z'
        }
      ];
      
      setUsers(mockUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Table columns configuration
  const columns: Column<User>[] = [
    {
      key: 'avatar',
      title: 'Avatar',
      sortable: false,
      searchable: false,
      width: '80px',
      align: 'center',
      render: (value: string, record: User) => (
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
          {value ? (
            <img 
              src={value} 
              alt={record.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {record.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      searchable: true,
    },
    {
      key: 'email',
      title: 'Email',
      sortable: true,
      searchable: true,
    },
    {
      key: 'role',
      title: 'Role',
      sortable: true,
      searchable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          value === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
          value === 'manager' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
          value === 'department_head' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        }`}>
          {value.replace('_', ' ').toUpperCase()}
        </span>
      )
    },
    {
      key: 'department',
      title: 'Department',
      sortable: true,
      searchable: true,
    },
    {
      key: 'phone',
      title: 'Phone',
      sortable: false,
      searchable: true,
    },
    {
      key: 'isActive',
      title: 'Status',
      sortable: true,
      searchable: false,
      render: (value: boolean) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          value 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {value ? 'ACTIVE' : 'INACTIVE'}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      searchable: false,
      width: '120px',
      align: 'center',
      render: (_, record: User) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            isIconOnly
            onPress={() => handleView(record)}
          >
            <Eye size={16} />
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="warning"
            isIconOnly
            onPress={() => handleEdit(record)}
          >
            <Edit size={16} />
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="danger"
            isIconOnly
            onPress={() => handleDelete(record)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (drawerMode === 'create' && !formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.department.trim()) {
      errors.department = 'Department is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle image upload and convert to base64
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setFormData(prev => ({ ...prev, avatar: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Handle form input changes
  const handleInputChange = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // CRUD Operations
  const handleCreate = () => {
    setDrawerMode('create');
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'staff' as const,
      department: '',
      phone: '',
      avatar: '',
      isActive: true
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleView = (user: User) => {
    setDrawerMode('view');
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone || '',
      avatar: user.avatar || '',
      isActive: user.isActive
    });
    setDrawerOpen(true);
  };

  const handleEdit = (user: User) => {
    setDrawerMode('edit');
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone || '',
      avatar: user.avatar || '',
      isActive: user.isActive
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) {
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUsers(prev => prev.filter(u => u._id !== user._id));
      
      // Show success message (you can implement toast notification)
      alert('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (drawerMode === 'create') {
        const newUser: User = {
          _id: Date.now().toString(),
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setUsers(prev => [newUser, ...prev]);
        alert('User created successfully');
      } else if (drawerMode === 'edit' && selectedUser) {
        const updatedUser: User = {
          ...selectedUser,
          ...formData,
          updatedAt: new Date().toISOString()
        };
        setUsers(prev => prev.map(u => u._id === selectedUser._id ? updatedUser : u));
        alert('User updated successfully');
      }

      setDrawerOpen(false);
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setFormErrors({});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage system users and their permissions</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus size={20} />}
          onPress={handleCreate}
        >
          Add User
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        data={users}
        columns={columns}
        loading={loading}
        pageSize={10}
        searchPlaceholder="Search users..."
        emptyText="No users found"
      />

      {/* User Form Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        title={
          drawerMode === 'create' ? 'Add New User' :
          drawerMode === 'edit' ? 'Edit User' : 'User Details'
        }
        size="lg"
      >
        <div className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {formData.avatar ? (
                <img 
                  src={formData.avatar} 
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-medium text-gray-600 dark:text-gray-300">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                </span>
              )}
            </div>
            
            {drawerMode !== 'view' && (
              <div className="flex items-center space-x-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    variant="flat"
                    color="primary"
                    size="sm"
                    startContent={<Upload size={16} />}
                  >
                    Upload Avatar
                  </Button>
                </label>
                
                {formData.avatar && (
                  <Button
                    variant="flat"
                    color="danger"
                    size="sm"
                    isIconOnly
                    onPress={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomInput
              label="Full Name"
              isRequired
              value={formData.name}
              onChange={(e: any) => handleInputChange('name', e.target.value)}
              placeholder="Enter full name"
              className={formErrors.name ? 'border-red-500' : ''}
            />
            
            <CustomInput
              label="Email"
              type="email"
              isRequired
              value={formData.email}
              onChange={(e: any) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
              className={formErrors.email ? 'border-red-500' : ''}
            />
            
            {drawerMode !== 'view' && (
              <CustomInput
                label={drawerMode === 'create' ? 'Password' : 'New Password (optional)'}
                type="password"
                isRequired={drawerMode === 'create'}
                value={formData.password}
                onChange={(e: any) => handleInputChange('password', e.target.value)}
                placeholder={drawerMode === 'create' ? 'Enter password' : 'Leave empty to keep current'}
                className={formErrors.password ? 'border-red-500' : ''}
              />
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                disabled={drawerMode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="staff">Staff</option>
                <option value="department_head">Department Head</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            <CustomInput
              label="Department"
              isRequired
              value={formData.department}
              onChange={(e: any) => handleInputChange('department', e.target.value)}
              placeholder="Enter department"
              className={formErrors.department ? 'border-red-500' : ''}
            />
            
            <CustomInput
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e: any) => handleInputChange('phone', e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          {drawerMode !== 'view' && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active User
              </label>
            </div>
          )}

          {/* Error Messages */}
          {Object.keys(formErrors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Please fix the following errors:
              </h4>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {Object.entries(formErrors).map(([field, error]) => (
                  <li key={field}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          {drawerMode !== 'view' && (
            <div className="flex items-center space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                color="primary"
                onPress={handleSubmit}
                isLoading={submitting}
                className="flex-1"
              >
                {drawerMode === 'create' ? 'Create User' : 'Update User'}
              </Button>
              <Button
                variant="flat"
                onPress={handleCloseDrawer}
                isDisabled={submitting}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
};

export default User;