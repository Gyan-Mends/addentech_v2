import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, Upload, X } from "lucide-react";
import DataTable, { type Column } from "~/components/DataTable";
import Drawer from "~/components/Drawer";
import CustomInput from "~/components/CustomInput";
import ConfirmModal from "~/components/confirmModal";
import { Button, useDisclosure } from "@heroui/react";
import { successToast, errorToast } from "~/components/toast";
import { userAPI, departmentAPI, type User, type CreateUserData, type UpdateUserData, type Department } from "~/services/api";

interface UserFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password?: string;
  role: 'admin' | 'manager' | 'staff' | 'department_head';
  department: string;
  phone: string;
  position: string;
  workMode: 'in-house' | 'remote';
  image: string;
  bio: string;
  status: 'active' | 'inactive' | 'suspended';
}

const User = () => {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'staff',
    department: '',
    phone: '',
    position: '',
    workMode: 'in-house',
    image: '',
    bio: '',
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Confirm modal state
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onOpenChange: onConfirmOpenChange } = useDisclosure();
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Load users and departments on component mount
  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, []);

  // Load users from database
  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userAPI.getAll();
      if (response.success && response.users) {
        setUsers(response.users);
      } else {
        errorToast('Failed to load users: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading users:', error);
      errorToast('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load departments for dropdown
  const loadDepartments = async () => {
    try {
      const response = await departmentAPI.getAll();
      if (response.success && response.departments) {
        setDepartments(response.departments);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  // Table columns configuration
  const columns: Column<User>[] = [
    {
      key: 'image',
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
      render: (value: any) => {
        // Handle both string and object formats for backward compatibility
        if (typeof value === 'string') {
          return value;
        }
        if (value && typeof value === 'object' && value.name) {
          return value.name;
        }
        return 'N/A';
      }
    },
    {
      key: 'position',
      title: 'Position',
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
      key: 'status',
      title: 'Status',
      sortable: true,
      searchable: false,
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          value === 'active'
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : value === 'suspended'
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {value.toUpperCase()}
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

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
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

    if (!formData.position.trim()) {
      errors.position = 'Position is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle image upload and convert to base64
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, file.type, file.size);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      errorToast('Please select an image file');
      event.target.value = ''; // Reset input
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      errorToast('Image size should be less than 2MB');
      event.target.value = ''; // Reset input
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      console.log('Base64 generated, length:', base64?.length);
      setFormData(prev => ({ ...prev, image: base64 }));
      successToast('Avatar uploaded successfully');
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      errorToast('Failed to read image file');
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
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'staff',
      department: '',
      phone: '',
      position: '',
      workMode: 'in-house',
      image: '',
      bio: '',
      status: 'active'
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleView = (user: User) => {
    setDrawerMode('view');
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName,
      middleName: user.middleName || '',
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      department: user.departmentId,
      phone: user.phone,
      position: user.position,
      workMode: user.workMode,
      image: user.image,
      bio: user.bio || '',
      status: user.status
    });
    setDrawerOpen(true);
  };

  const handleEdit = (user: User) => {
    setDrawerMode('edit');
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName,
      middleName: user.middleName || '',
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      department: user.departmentId,
      phone: user.phone,
      position: user.position,
      workMode: user.workMode,
      image: user.image,
      bio: user.bio || '',
      status: user.status
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
    onConfirmOpen();
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const response = await userAPI.delete(userToDelete._id);
      if (response.success) {
        setUsers(prev => prev.filter(u => u._id !== userToDelete._id));
        successToast('User deleted successfully');
        onConfirmOpenChange();
        setUserToDelete(null);
      } else {
        errorToast('Failed to delete user: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      errorToast('Failed to delete user');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (drawerMode === 'create') {
        const createData: CreateUserData = {
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password!,
          phone: formData.phone,
          role: formData.role,
          department: formData.department,
          position: formData.position,
          workMode: formData.workMode,
          image: formData.image,
          bio: formData.bio,
          status: formData.status
        };

        console.log('Creating user with data:', createData);
        const response = await userAPI.create(createData);
        console.log('Create response:', response);
        
        if (response.success && response.user) {
          setUsers(prev => [response.user!, ...prev]);
          successToast('User created successfully');
          setDrawerOpen(false);
        } else {
          console.error('Create failed:', response.error);
          errorToast('Failed to create user: ' + (response.error || 'Unknown error'));
        }
      } else if (drawerMode === 'edit' && selectedUser) {
        const updateData: UpdateUserData = {
          userId: selectedUser._id,
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role: formData.role,
          department: formData.department,
          position: formData.position,
          workMode: formData.workMode,
          image: formData.image,
          bio: formData.bio,
          status: formData.status
        };

        const response = await userAPI.update(updateData);
        if (response.success && response.user) {
          setUsers(prev => prev.map(u => 
            u._id === selectedUser._id ? response.user! : u
          ));
          successToast('User updated successfully');
          setDrawerOpen(false);
        } else {
          errorToast('Failed to update user: ' + (response.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      errorToast('Failed to save user');
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
              {formData.image ? (
                <img 
                  src={formData.image} 
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-medium text-gray-600 dark:text-gray-300">
                  {formData.firstName ? formData.firstName.charAt(0).toUpperCase() : '?'}
                </span>
              )}
            </div>
            
            {drawerMode !== 'view' && (
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="avatar-upload"
                />
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button
                    variant="flat"
                    color="primary"
                    size="sm"
                    startContent={<Upload size={16} />}
                    as="span"
                  >
                    Upload Avatar
                  </Button>
                </label>
                
                {formData.image && (
                  <Button
                    variant="flat"
                    color="danger"
                    size="sm"
                    isIconOnly
                    onPress={() => {
                      setFormData(prev => ({ ...prev, image: '' }));
                      // Reset the file input
                      const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
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
              label="First Name"
              isRequired
              value={formData.firstName}
              onChange={drawerMode === 'view' ? undefined : (value: string) => handleInputChange('firstName', value)}
              placeholder="Enter first name"
              error={formErrors.firstName}
            />
            
            <CustomInput
              label="Middle Name"
              value={formData.middleName}
              onChange={drawerMode === 'view' ? undefined : (value: string) => handleInputChange('middleName', value)}
              placeholder="Enter middle name"
            />
            
            <CustomInput
              label="Last Name"
              isRequired
              value={formData.lastName}
              onChange={drawerMode === 'view' ? undefined : (value: string) => handleInputChange('lastName', value)}
              placeholder="Enter last name"
              error={formErrors.lastName}
            />
            
            <CustomInput
              label="Email"
              type="email"
              isRequired
              value={formData.email}
              onChange={drawerMode === 'view' ? undefined : (value: string) => handleInputChange('email', value)}
              placeholder="Enter email address"
              error={formErrors.email}
            />
            
            {drawerMode !== 'view' && (
              <CustomInput
                label={drawerMode === 'create' ? 'Password' : 'New Password (optional)'}
                type="password"
                isRequired={drawerMode === 'create'}
                value={formData.password}
                onChange={(value: string) => handleInputChange('password', value)}
                placeholder={drawerMode === 'create' ? 'Enter password' : 'Leave empty to keep current'}
                error={formErrors.password}
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                disabled={drawerMode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {formErrors.department && (
                <p className="mt-1 text-sm text-red-600">{formErrors.department}</p>
              )}
            </div>
            
            <CustomInput
              label="Position"
              isRequired
              value={formData.position}
              onChange={drawerMode === 'view' ? undefined : (value: string) => handleInputChange('position', value)}
              placeholder="Enter position"
              error={formErrors.position}
            />
            
            <CustomInput
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={drawerMode === 'view' ? undefined : (value: string) => handleInputChange('phone', value)}
              placeholder="Enter phone number"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Work Mode
              </label>
              <select
                value={formData.workMode}
                onChange={(e) => handleInputChange('workMode', e.target.value)}
                disabled={drawerMode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="in-house">In-House</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                disabled={drawerMode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Bio Field */}
          <CustomInput
            label="Bio"
            type="textarea"
            value={formData.bio}
            onChange={drawerMode === 'view' ? undefined : (value: string) => handleInputChange('bio', value)}
            placeholder="Enter bio"
            rows={3}
          />

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

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onOpenChange={onConfirmOpenChange}
        header="Delete User"
        content={
          userToDelete 
            ? `Are you sure you want to delete "${userToDelete.name}"? This action cannot be undone and will remove all user data and access permissions.`
            : "Are you sure you want to delete this user?"
        }
      >
        <div className="flex gap-3">
          <Button
            color="danger"
            onPress={confirmDelete}
            className="flex-1"
          >
            Delete User
          </Button>
          <Button
            variant="flat"
            onPress={() => {
              onConfirmOpenChange();
              setUserToDelete(null);
            }}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </ConfirmModal>
    </div>
  );
};

export default User;