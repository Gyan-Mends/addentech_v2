import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  Settings as SettingsIcon,
  Shield,
  Bell,
  Palette,
  Key,
  Globe,
  Save,
  Eye,
  EyeOff,
  Smartphone,
  Mail,
  Lock,
  Sun,
  Moon,
  Monitor,
  Check,
  X,
  Activity,
  Clock,
  User,
  Calendar,
  Filter,
  Download,
  Search,
  Users,
  Edit,
  UserCheck,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { Button, Card, CardBody, CardHeader, Switch, Select, SelectItem, Chip, Input, Pagination } from "@heroui/react";
import CustomInput from "~/components/CustomInput";
import { successToast, errorToast } from "~/components/toast";
import { authAPI } from "~/services/api";
import api from "~/services/api";
import DataTable, { type Column } from "~/components/DataTable";
import { PERMISSION_CATEGORIES } from "~/utils/permissions";

interface UserSettings {
  // Account settings
  email: string;
  phone: string;
  
  // Security settings
  twoFactorEnabled: boolean;
  lastPasswordChange: string;
  loginSessions: {
    device: string;
    location: string;
    lastActive: string;
  }[];
  
  // Notification preferences
  emailNotifications: {
    taskAssignments: boolean;
    leaveApprovals: boolean;
    systemUpdates: boolean;
    weeklyReports: boolean;
  };
  pushNotifications: {
    taskDeadlines: boolean;
    mentions: boolean;
    directMessages: boolean;
  };
  
  // Display preferences
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  
  // Privacy settings
  profileVisibility: 'public' | 'department' | 'private';
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
}

interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface LogActivity {
  _id: string;
  action: string;
  description: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
}

interface UserForPermissions {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'manager' | 'department_head' | 'staff';
  department: {
    _id: string;
    name: string;
  };
  permissions: Record<string, boolean>;
  status: 'active' | 'inactive' | 'suspended';
}

interface PermissionCategory {
  name: string;
  description: string;
  permissions: {
    key: string;
    name: string;
    description: string;
  }[];
}

// Define columns for activity logs table
const getLogsColumns = (): Column<LogActivity>[] => [
  {
    key: 'timestamp',
    title: 'Date & Time',
    sortable: true,
    width: '180px',
    render: (value: string) => (
      <div className="text-xs">
        <div className="font-medium text-gray-900 dark:text-white">
          {new Date(value).toLocaleDateString()}
        </div>
        <div className="text-gray-500 dark:text-gray-400">
          {new Date(value).toLocaleTimeString()}
        </div>
      </div>
    )
  },
  {
    key: 'user',
    title: 'User',
    sortable: true,
    searchable: true,
    width: '200px',
    render: (value: LogActivity['user']) => (
      <div className="text-xs">
        <div className="font-medium text-gray-900 dark:text-white">
          {value.firstName} {value.lastName}
        </div>
        <div className="text-gray-500 dark:text-gray-400">
          {value.email}
        </div>
      </div>
    )
  },
  {
    key: 'action',
    title: 'Action',
    sortable: true,
    searchable: true,
    width: '120px',
    render: (value: string) => {
      const getActionColor = (action: string) => {
        switch (action) {
          case 'login':
            return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900';
          case 'logout':
            return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
          case 'create':
            return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900';
          case 'update':
            return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900';
          case 'delete':
            return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
          case 'view':
            return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900';
          default:
            return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900';
        }
      };

      const getActionIcon = (action: string) => {
        switch (action) {
          case 'login':
          case 'logout':
            return <User className="w-3 h-3" />;
          case 'create':
          case 'update':
          case 'delete':
            return <Activity className="w-3 h-3" />;
          case 'view':
            return <Eye className="w-3 h-3" />;
          default:
            return <Clock className="w-3 h-3" />;
        }
      };

      return (
        <Chip 
          size="sm" 
          className={getActionColor(value)}
          startContent={getActionIcon(value)}
        >
          {value}
        </Chip>
      );
    }
  },
  {
    key: 'description',
    title: 'Description',
    sortable: true,
    searchable: true,
    render: (value: string) => (
      <div className="text-xs text-gray-900 dark:text-white max-w-xs">
        <div className="truncate" title={value}>
          {value}
        </div>
      </div>
    )
  },
  {
    key: 'ipAddress',
    title: 'IP Address',
    sortable: true,
    width: '120px',
    render: (value: string) => (
      <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
        {value || 'N/A'}
      </div>
    )
  }
];

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('account');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Logs state
  const [logs, setLogs] = useState<LogActivity[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFilter, setLogsFilter] = useState('all');
  
  // Permission management state
  const [users, setUsers] = useState<UserForPermissions[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserForPermissions | null>(null);
  const [permissionUpdating, setPermissionUpdating] = useState(false);
  const [userFilter, setUserFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState<any[]>([]);
  
  // Password change form
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
      loadLogs();
    }
    if (activeTab === 'permissions' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
      loadUsers();
      loadDepartments();
    }
  }, [activeTab, logsFilter, currentUser, userFilter, departmentFilter]);

  const loadCurrentUser = async () => {
    try {
      const response = await authAPI.verify();
      if (response.success) {
        setCurrentUser(response.user);
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users?action=getSettings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings || getDefaultSettings());
      } else {
        if (data.status === 401) {
          navigate('/login');
          return;
        }
        // Use default settings if API fails
        setSettings(getDefaultSettings());
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use default settings on error
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const params = new URLSearchParams({
        page: '1',
        limit: '1000', // Load more records for client-side filtering
        search: '',
        filter: logsFilter
      });

      const response = await fetch(`/api/users?action=getLogs&${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs || []);
      } else {
        console.error('Failed to load logs:', data.error);
        setLogs([]);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();

      if (data.success) {
        let filteredUsers = data.users || [];
        
        // Filter by role
        if (userFilter !== 'all') {
          filteredUsers = filteredUsers.filter((user: UserForPermissions) => user.role === userFilter);
        }
        
        // Filter by department
        if (departmentFilter !== 'all') {
          filteredUsers = filteredUsers.filter((user: UserForPermissions) => 
            user.department._id === departmentFilter
          );
        }
        
        setUsers(filteredUsers);
      } else {
        console.error('Failed to load users:', data.error);
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();

      if (data.success) {
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };



  const getDefaultSettings = (): UserSettings => ({
    email: '',
    phone: '',
    twoFactorEnabled: false,
    lastPasswordChange: new Date().toISOString(),
    loginSessions: [
      {
        device: 'Current Device - Chrome on Windows',
        location: 'Your Location',
        lastActive: 'Now'
      }
    ],
    emailNotifications: {
      taskAssignments: true,
      leaveApprovals: true,
      systemUpdates: false,
      weeklyReports: true
    },
    pushNotifications: {
      taskDeadlines: true,
      mentions: true,
      directMessages: true
    },
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    profileVisibility: 'department',
    showOnlineStatus: true,
    allowDirectMessages: true
  });

  const updateSetting = async (section: string, key: string, value: any) => {
    if (!settings) return;

    try {
      const updatedSettings = { ...settings };
      if (section === 'root') {
        (updatedSettings as any)[key] = value;
      } else {
        (updatedSettings as any)[section][key] = value;
      }
      
      setSettings(updatedSettings);

      // Save to server (optional - will silently fail if API not implemented)
      try {
        const formData = new FormData();
        formData.append('section', section);
        formData.append('key', key);
        formData.append('value', JSON.stringify(value));

        const response = await fetch('/api/users?action=updateSettings', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        if (data.success) {
          successToast('Setting updated successfully');
        }
      } catch (apiError) {
        // API not implemented yet - settings will only persist in session
        successToast('Setting updated (session only)');
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
      errorToast('Failed to update setting');
      await loadSettings();
    }
  };

  const validatePasswordForm = () => {
    const errors: Record<string, string> = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordForm() || !currentUser) return;

    try {
      setSaving(true);
      
      // Use the dedicated updatePassword API function
      const response = await api.user.updatePassword(currentUser._id, passwordForm.newPassword, passwordForm.currentPassword);

      if (response.success) {
        successToast('Password changed successfully');
        setShowPasswordForm(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({});
      } else {
        errorToast(response.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      errorToast('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!confirm('This will log you out from all devices. Continue?')) return;

    try {
      const response = await fetch('/api/auth/logout-all', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        successToast('Logged out from all devices successfully');
        navigate('/');
      } else {
        errorToast(data.error || 'Failed to logout from all devices');
      }
    } catch (error) {
      errorToast('Failed to logout from all devices');
    }
  };



  const updateUserPermission = async (userId: string, permissionKey: string, value: boolean) => {
    try {
      setPermissionUpdating(true);
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('permissionKey', permissionKey);
      formData.append('value', value.toString());

      const response = await fetch('/api/users?action=updatePermission', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setUsers(users.map(user => 
          user._id === userId 
            ? { ...user, permissions: { ...user.permissions, [permissionKey]: value } }
            : user
        ));
        
        if (selectedUser && selectedUser._id === userId) {
          setSelectedUser({
            ...selectedUser,
            permissions: { ...selectedUser.permissions, [permissionKey]: value }
          });
        }
        
        successToast('Permission updated successfully');
      } else {
        errorToast(data.error || 'Failed to update permission');
      }
    } catch (error) {
      console.error('Failed to update permission:', error);
      errorToast('Failed to update permission');
    } finally {
      setPermissionUpdating(false);
    }
  };

  const applyRolePreset = async (userId: string, role: string) => {
    try {
      setPermissionUpdating(true);
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('role', role);

      const response = await fetch('/api/users?action=applyRolePreset', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Reload users to get updated permissions
        await loadUsers();
        successToast(`${role} role permissions applied successfully`);
      } else {
        errorToast(data.error || 'Failed to apply role preset');
      }
    } catch (error) {
      console.error('Failed to apply role preset:', error);
      errorToast('Failed to apply role preset');
    } finally {
      setPermissionUpdating(false);
    }
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams({
        search: '',
        filter: logsFilter,
        export: 'true'
      });

      const response = await fetch(`/api/users?action=getLogs&${params.toString()}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      successToast('Logs exported successfully');
    } catch (error) {
      console.error('Failed to export logs:', error);
      errorToast('Failed to export logs');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Settings Not Available</h2>
        <Button color="primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const getTabsForRole = () => {
    const baseTabs = [
      { key: 'account', label: 'Account Information', icon: SettingsIcon },
      { key: 'security', label: 'Password & Authentication', icon: Shield },
      { key: 'notifications', label: 'Email Notifications', icon: Bell },
      { key: 'preferences', label: 'Display & Language', icon: Palette }
    ];

    if (currentUser?.role === 'intern') {
      // Interns only get the basic tabs
      return baseTabs;
    }

    // All other roles get additional tabs
    const extendedTabs = [
      { key: 'account', label: 'Account', icon: SettingsIcon },
      { key: 'security', label: 'Security', icon: Shield },
      { key: 'notifications', label: 'Notifications', icon: Bell },
      { key: 'preferences', label: 'Preferences', icon: Palette }
    ];

    // Admin and Manager get permission and log management
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
      extendedTabs.push(
        { key: 'permissions', label: 'User Permissions', icon: Key },
        { key: 'logs', label: 'Activity Logs', icon: Activity }
      );
    }

    return extendedTabs;
  };

  const tabs = getTabsForRole();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardBody className="p-0">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium text-left transition-colors ${
                        activeTab === tab.key
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </CardBody>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Account Settings */}
          {activeTab === 'account' && (
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <SettingsIcon className="w-5 h-5 mr-2" />
                  Account Information
                </h3>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomInput
                    label="Email Address"
                    value={settings.email}
                    onChange={(value) => updateSetting('root', 'email', value)}
                    type="email"
                    placeholder="your.email@company.com"
                  />
                  <CustomInput
                    label="Phone Number"
                    value={settings.phone}
                    onChange={(value) => updateSetting('root', 'phone', value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Profile Visibility
                  </label>
                  <Select
                    selectedKeys={[settings.profileVisibility]}
                    onSelectionChange={(keys) => {
                      const value = Array.from(keys)[0] as string;
                      updateSetting('root', 'profileVisibility', value);
                    }}
                  >
                    <SelectItem key="public">Public - Visible to everyone</SelectItem>
                    <SelectItem key="department">Department - Visible to department members</SelectItem>
                    <SelectItem key="private">Private - Only visible to you</SelectItem>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Show Online Status</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Let others see when you're active</p>
                  </div>
                  <Switch
                    isSelected={settings.showOnlineStatus}
                    onValueChange={(value) => updateSetting('root', 'showOnlineStatus', value)}
                    color="primary"
                    classNames={{
                      wrapper: "group-data-[selected=true]:bg-blue-600",
                      thumb: "group-data-[selected=true]:ml-6 group-data-[selected=false]:ml-0"
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Allow Direct Messages</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Allow other users to send you direct messages</p>
                  </div>
                  <Switch
                    isSelected={settings.allowDirectMessages}
                    onValueChange={(value) => updateSetting('root', 'allowDirectMessages', value)}
                    color="primary"
                    classNames={{
                      wrapper: "group-data-[selected=true]:bg-blue-600",
                      thumb: "group-data-[selected=true]:ml-6 group-data-[selected=false]:ml-0"
                    }}
                  />
                </div>
              </CardBody>
            </Card>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Password */}
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Key className="w-5 h-5 mr-2" />
                    Password & Authentication
                  </h3>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Password</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Last changed: {new Date(settings.lastPasswordChange).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      color="primary"
                      variant="light"
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                    >
                      Change Password
                    </Button>
                  </div>

                  {showPasswordForm && (
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-4 space-y-4">
                      <CustomInput
                        label="Current Password"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(value) => setPasswordForm(prev => ({ ...prev, currentPassword: value }))}
                        error={passwordErrors.currentPassword}
                        endContent={
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                            className="focus:outline-none"
                          >
                            {showPasswords.current ? (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        }
                      />
                      <CustomInput
                        label="New Password"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(value) => setPasswordForm(prev => ({ ...prev, newPassword: value }))}
                        error={passwordErrors.newPassword}
                        endContent={
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                            className="focus:outline-none"
                          >
                            {showPasswords.new ? (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        }
                      />
                      <CustomInput
                        label="Confirm New Password"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(value) => setPasswordForm(prev => ({ ...prev, confirmPassword: value }))}
                        error={passwordErrors.confirmPassword}
                        endContent={
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                            className="focus:outline-none"
                          >
                            {showPasswords.confirm ? (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        }
                      />
                      <div className="flex space-x-3">
                        <Button
                          color="primary"
                          onClick={handlePasswordChange}
                          isLoading={saving}
                          startContent={!saving ? <Save className="w-4 h-4" /> : undefined}
                        >
                          {saving ? 'Saving...' : 'Change Password'}
                        </Button>
                        <Button
                          variant="light"
                          onClick={() => {
                            setShowPasswordForm(false);
                            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            setPasswordErrors({});
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {settings.twoFactorEnabled ? (
                          <Chip color="success" size="sm" startContent={<Check className="w-3 h-3" />}>
                            Enabled
                          </Chip>
                        ) : (
                          <Chip color="danger" size="sm" startContent={<X className="w-3 h-3" />}>
                            Disabled
                          </Chip>
                        )}
                        <Button
                          color={settings.twoFactorEnabled ? "danger" : "primary"}
                          variant="light"
                          size="sm"
                          onClick={() => updateSetting('root', 'twoFactorEnabled', !settings.twoFactorEnabled)}
                        >
                          {settings.twoFactorEnabled ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Active Sessions - Hidden for interns */}
              {currentUser?.role !== 'intern' && (
                <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <Lock className="w-5 h-5 mr-2" />
                        Active Sessions
                      </h3>
                      <Button
                        color="danger"
                        variant="light"
                        size="sm"
                        onClick={handleLogoutAllDevices}
                      >
                        Logout All Devices
                      </Button>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-3">
                      {settings.loginSessions.map((session, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{session.device}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{session.location}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Last active</p>
                            <p className="text-xs text-gray-900 dark:text-white">{session.lastActive}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Email Notifications */}
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Mail className="w-5 h-5 mr-2" />
                    Email Notifications
                  </h3>
                </CardHeader>
                <CardBody className="space-y-4">
                  {Object.entries(settings.emailNotifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {key === 'taskAssignments' && 'Get notified when tasks are assigned to you'}
                          {key === 'leaveApprovals' && 'Get notified about leave request status changes'}
                          {key === 'systemUpdates' && 'Get notified about system maintenance and updates'}
                          {key === 'weeklyReports' && 'Receive weekly activity summaries'}
                        </p>
                      </div>
                      <Switch
                        isSelected={value}
                        onValueChange={(newValue) => updateSetting('emailNotifications', key, newValue)}
                        color="primary"
                        classNames={{
                          wrapper: "group-data-[selected=true]:bg-blue-600",
                          thumb: "group-data-[selected=true]:ml-6 group-data-[selected=false]:ml-0"
                        }}
                      />
                    </div>
                  ))}
                </CardBody>
              </Card>

              {/* Push Notifications - Hidden for interns */}
              {currentUser?.role !== 'intern' && (
                <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <Bell className="w-5 h-5 mr-2" />
                      Push Notifications
                    </h3>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    {Object.entries(settings.pushNotifications).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {key === 'taskDeadlines' && 'Get notified about upcoming task deadlines'}
                            {key === 'mentions' && 'Get notified when someone mentions you'}
                            {key === 'directMessages' && 'Get notified about new direct messages'}
                          </p>
                        </div>
                        <Switch
                          isSelected={value}
                          onValueChange={(newValue) => updateSetting('pushNotifications', key, newValue)}
                          color="primary"
                          classNames={{
                            wrapper: "group-data-[selected=true]:bg-blue-600",
                            thumb: "group-data-[selected=true]:ml-6 group-data-[selected=false]:ml-0"
                          }}
                        />
                      </div>
                    ))}
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {/* Preferences */}
          {activeTab === 'preferences' && (
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Palette className="w-5 h-5 mr-2" />
                  Display & Language Preferences
                </h3>
              </CardHeader>
              <CardBody className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'light', label: 'Light', icon: Sun },
                      { key: 'dark', label: 'Dark', icon: Moon },
                      { key: 'system', label: 'System', icon: Monitor }
                    ].map((theme) => {
                      const Icon = theme.icon;
                      return (
                        <button
                          key={theme.key}
                          onClick={() => updateSetting('root', 'theme', theme.key)}
                          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                            settings.theme === theme.key
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md ring-2 ring-blue-200 dark:ring-blue-800'
                              : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-400 hover:shadow-sm'
                          }`}
                        >
                          <Icon className={`w-6 h-6 mx-auto mb-2 transition-colors ${
                            settings.theme === theme.key
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`} />
                          <p className={`text-sm font-medium transition-colors ${
                            settings.theme === theme.key
                              ? 'text-blue-700 dark:text-blue-300'
                              : 'text-gray-900 dark:text-white'
                          }`}>{theme.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Language
                    </label>
                    <Select
                      selectedKeys={[settings.language]}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string;
                        updateSetting('root', 'language', value);
                      }}
                      startContent={<Globe className="w-4 h-4 text-gray-400" />}
                    >
                      <SelectItem key="en">English</SelectItem>
                      <SelectItem key="es">Spanish</SelectItem>
                      <SelectItem key="fr">French</SelectItem>
                      <SelectItem key="de">German</SelectItem>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Timezone
                    </label>
                    <Select
                      selectedKeys={[settings.timezone]}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string;
                        updateSetting('root', 'timezone', value);
                      }}
                    >
                      <SelectItem key="UTC">UTC</SelectItem>
                      <SelectItem key="America/New_York">Eastern Time</SelectItem>
                      <SelectItem key="America/Chicago">Central Time</SelectItem>
                      <SelectItem key="America/Denver">Mountain Time</SelectItem>
                      <SelectItem key="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem key="Europe/London">London</SelectItem>
                      <SelectItem key="Europe/Paris">Paris</SelectItem>
                      <SelectItem key="Asia/Tokyo">Tokyo</SelectItem>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date Format
                  </label>
                  <Select
                    selectedKeys={[settings.dateFormat]}
                    onSelectionChange={(keys) => {
                      const value = Array.from(keys)[0] as string;
                      updateSetting('root', 'dateFormat', value);
                    }}
                    className="max-w-xs"
                  >
                    <SelectItem key="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem key="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem key="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem key="DD MMM YYYY">DD MMM YYYY</SelectItem>
                  </Select>
                </div>
              </CardBody>
            </Card>
          )}

          {/* User Permissions - Only for Admin/Manager */}
          {activeTab === 'permissions' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <div className="space-y-6">
              {/* Permissions Header with Filters */}
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <Key className="w-5 h-5 mr-2" />
                      User Permissions Management
                    </h3>
                    <div className="flex items-center space-x-3">
                      <div className="w-40">
                        <Select
                          placeholder="Filter by role"
                          selectedKeys={[userFilter]}
                          onSelectionChange={(keys) => setUserFilter(Array.from(keys)[0] as string)}
                          size="sm"
                        >
                          <SelectItem key="all">All Roles</SelectItem>
                          <SelectItem key="admin">Admin</SelectItem>
                          <SelectItem key="manager">Manager</SelectItem>
                          <SelectItem key="department_head">Department Head</SelectItem>
                          <SelectItem key="staff">Staff</SelectItem>
                        </Select>
                      </div>
                      <div className="w-48">
                        <Select
                          placeholder="Filter by department"
                          selectedKeys={[departmentFilter]}
                          onSelectionChange={(keys) => setDepartmentFilter(Array.from(keys)[0] as string)}
                          size="sm"
                        >
                          <SelectItem key="all">All Departments</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept._id} value={dept._id}>{dept.name}</SelectItem>
                          ))}
                        </Select>
                      </div>
                      <Button
                        color="primary"
                        variant="light"
                        size="sm"
                        startContent={<RefreshCw className="w-4 h-4" />}
                        onClick={loadUsers}
                        isLoading={usersLoading}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Users List */}
                <div className="lg:col-span-1">
                  <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <CardHeader>
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        Users ({users.length})
                      </h4>
                    </CardHeader>
                    <CardBody className="p-0">
                      {usersLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <div className="max-h-96 overflow-y-auto">
                          {users.map((user) => (
                            <button
                              key={user._id}
                              onClick={() => setSelectedUser(user)}
                              className={`w-full p-4 text-left border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                selectedUser?._id === user._id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {user.firstName} {user.lastName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {user.email}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {user.department.name}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end space-y-1">
                                  <Chip 
                                    size="sm" 
                                    color={
                                      user.role === 'admin' ? 'danger' :
                                      user.role === 'manager' ? 'warning' :
                                      user.role === 'department_head' ? 'primary' : 'default'
                                    }
                                  >
                                    {user.role.replace('_', ' ')}
                                  </Chip>
                                  <Chip 
                                    size="sm" 
                                    color={user.status === 'active' ? 'success' : 'danger'}
                                  >
                                    {user.status}
                                  </Chip>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </div>

                {/* Permission Management */}
                <div className="lg:col-span-2">
                  {selectedUser ? (
                    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-md font-semibold text-gray-900 dark:text-white flex items-center">
                              <UserCheck className="w-4 h-4 mr-2" />
                              Permissions for {selectedUser.firstName} {selectedUser.lastName}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {selectedUser.email} • {selectedUser.role.replace('_', ' ')} • {selectedUser.department.name}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Select
                              placeholder="Apply role preset"
                              onSelectionChange={(keys) => {
                                const role = Array.from(keys)[0] as string;
                                if (role && role !== selectedUser.role) {
                                  applyRolePreset(selectedUser._id, role);
                                }
                              }}
                              size="sm"
                              className="w-40"
                            >
                              <SelectItem key="staff">Staff Preset</SelectItem>
                              <SelectItem key="intern">Intern Preset</SelectItem>
                              <SelectItem key="department_head">Department Head Preset</SelectItem>
                              <SelectItem key="manager">Manager Preset</SelectItem>
                              {currentUser.role === 'admin' ? (
                                <SelectItem key="admin">Admin Preset</SelectItem>
                              ) : null}
                            </Select>
                          </div>
                        </div>
                      </CardHeader>
                      <CardBody>
                        <div className="space-y-6">
                          {PERMISSION_CATEGORIES.map((category) => (
                            <div key={category.name} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {category.name}
                                </h5>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {category.description}
                                </p>
                              </div>
                              <div className="space-y-3">
                                {category.permissions.map((permission) => (
                                  <div key={permission.key} className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {permission.name}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {permission.description}
                                      </div>
                                    </div>
                                    <Switch
                                      isSelected={selectedUser.permissions[permission.key] || false}
                                      onValueChange={(value) => updateUserPermission(selectedUser._id, permission.key, value)}
                                      isDisabled={permissionUpdating}
                                      size="sm"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardBody>
                    </Card>
                  ) : (
                    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <CardBody className="text-center py-12">
                        <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          Select a User
                        </h4>
                        <p className="text-gray-500 dark:text-gray-400">
                          Choose a user from the list to manage their permissions
                        </p>
                      </CardBody>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Activity Logs - Only for Admin/Manager */}
          {activeTab === 'logs' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <div className="space-y-6">
              {/* Logs Header with Export */}
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <Activity className="w-5 h-5 mr-2" />
                      Activity Logs
                    </h3>
                    <div className="flex items-center space-x-3">
                      <div className="w-48">
                        <Select
                          placeholder="Filter by action"
                          selectedKeys={[logsFilter]}
                          onSelectionChange={(keys) => setLogsFilter(Array.from(keys)[0] as string)}
                          startContent={<Filter className="w-4 h-4 text-gray-400" />}
                          size="sm"
                        >
                          <SelectItem key="all">All Actions</SelectItem>
                          <SelectItem key="login">Login</SelectItem>
                          <SelectItem key="logout">Logout</SelectItem>
                          <SelectItem key="create">Create</SelectItem>
                          <SelectItem key="update">Update</SelectItem>
                          <SelectItem key="delete">Delete</SelectItem>
                          <SelectItem key="view">View</SelectItem>
                        </Select>
                      </div>
                      <Button
                        color="primary"
                        variant="light"
                        size="sm"
                        startContent={<Download className="w-4 h-4" />}
                        onClick={exportLogs}
                      >
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Logs Table */}
              <DataTable
                data={logs}
                columns={getLogsColumns()}
                loading={logsLoading}
                pageSize={20}
                searchPlaceholder="Search logs by user, action, or description..."
                emptyText="No activity logs found"
                showSearch={true}
                showPagination={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 