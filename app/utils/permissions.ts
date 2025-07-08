// Permission utility functions
// Helps check user permissions throughout the application

export interface UserPermissions {
  [key: string]: boolean;
}

export interface User {
  _id: string;
  role: 'admin' | 'manager' | 'department_head' | 'staff';
  permissions: UserPermissions;
  status: 'active' | 'inactive' | 'suspended';
}

// Check if user has a specific permission
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user || user.status !== 'active') {
    return false;
  }

  // Admins have all permissions
  if (user.role === 'admin') {
    return true;
  }

  // Check specific permission
  return user.permissions[permission] === true;
}

// Check if user has any of the specified permissions
export function hasAnyPermission(user: User | null, permissions: string[]): boolean {
  if (!user || user.status !== 'active') {
    return false;
  }

  // Admins have all permissions
  if (user.role === 'admin') {
    return true;
  }

  // Check if user has any of the permissions
  return permissions.some(permission => user.permissions[permission] === true);
}

// Check if user has all of the specified permissions
export function hasAllPermissions(user: User | null, permissions: string[]): boolean {
  if (!user || user.status !== 'active') {
    return false;
  }

  // Admins have all permissions
  if (user.role === 'admin') {
    return true;
  }

  // Check if user has all permissions
  return permissions.every(permission => user.permissions[permission] === true);
}

// Check if user has a specific role
export function hasRole(user: User | null, role: string): boolean {
  if (!user || user.status !== 'active') {
    return false;
  }

  return user.role === role;
}

// Check if user has any of the specified roles
export function hasAnyRole(user: User | null, roles: string[]): boolean {
  if (!user || user.status !== 'active') {
    return false;
  }

  return roles.includes(user.role);
}

// Check if user can access a specific navigation item
export function canAccessNavItem(user: User | null, requiredPermission: string, allowedRoles: string[]): boolean {
  if (!user || user.status !== 'active') {
    return false;
  }

  // Check if user has the required role
  const hasRequiredRole = allowedRoles.includes(user.role);
  
  // Admins and managers can access anything they have role access to
  if ((user.role === 'admin' || user.role === 'manager') && hasRequiredRole) {
    return true;
  }

  // For other roles, check both role and permission
  return hasRequiredRole && hasPermission(user, requiredPermission);
}

// Get default permissions for a role
export function getDefaultPermissionsForRole(role: string): UserPermissions {
  const permissions: UserPermissions = {
    // Base permissions for all users
    view_profile: true,
    edit_profile: true,
    view_task: true,
    view_department: true,
    view_attendance: true,
    view_leaves: true,
    create_leave: true,
  };

  switch (role) {
    case 'admin':
      // Admin gets all permissions
      return {
        ...permissions,
        create_task: true,
        edit_task: true,
        assign_task: true,
        manage_department: true,
        create_report: true,
        view_report: true,
        edit_report: true,
        approve_report: true,
        manage_attendance: true,
        view_attendance_report: true,
        edit_leave: true,
        approve_leave: true,
        manage_leaves: true,
      };

    case 'manager':
      return {
        ...permissions,
        create_task: true,
        edit_task: true,
        assign_task: true,
        view_report: true,
        view_attendance_report: true,
        edit_leave: true,
        approve_leave: true,
        manage_leaves: true,
      };

    case 'department_head':
      return {
        ...permissions,
        create_task: true,
        edit_task: true,
        assign_task: true,
        create_report: true,
        view_report: true,
        edit_report: true,
        manage_attendance: true,
        view_attendance_report: true,
        edit_leave: true,
        approve_leave: true,
        manage_leaves: true,
      };

    case 'staff':
      return {
        ...permissions,
        create_task: true, // Allow staff to create tasks
      };
    default:
      return permissions;
  }
}

// Permission categories for UI display
export const PERMISSION_CATEGORIES = [
  {
    name: 'Profile Management',
    description: 'Permissions related to user profile management',
    permissions: [
      { key: 'view_profile', name: 'View Profile', description: 'Can view user profiles' },
      { key: 'edit_profile', name: 'Edit Profile', description: 'Can edit user profiles' }
    ]
  },
  {
    name: 'Task Management',
    description: 'Permissions related to task and project management',
    permissions: [
      { key: 'view_task', name: 'View Tasks', description: 'Can view tasks and projects' },
      { key: 'create_task', name: 'Create Tasks', description: 'Can create new tasks' },
      { key: 'edit_task', name: 'Edit Tasks', description: 'Can edit existing tasks' },
      { key: 'assign_task', name: 'Assign Tasks', description: 'Can assign tasks to other users' }
    ]
  },
  {
    name: 'Department Management',
    description: 'Permissions related to department administration',
    permissions: [
      { key: 'view_department', name: 'View Department', description: 'Can view department information' },
      { key: 'manage_department', name: 'Manage Department', description: 'Can manage department settings and users' }
    ]
  },
  {
    name: 'Reports & Analytics',
    description: 'Permissions related to reports and analytics',
    permissions: [
      { key: 'view_report', name: 'View Reports', description: 'Can view reports and analytics' },
      { key: 'create_report', name: 'Create Reports', description: 'Can create new reports' },
      { key: 'edit_report', name: 'Edit Reports', description: 'Can edit existing reports' },
      { key: 'approve_report', name: 'Approve Reports', description: 'Can approve or reject reports' }
    ]
  },
  {
    name: 'Attendance Management',
    description: 'Permissions related to attendance tracking',
    permissions: [
      { key: 'view_attendance', name: 'View Attendance', description: 'Can view attendance records' },
      { key: 'manage_attendance', name: 'Manage Attendance', description: 'Can manage attendance records' },
      { key: 'view_attendance_report', name: 'View Attendance Reports', description: 'Can view attendance reports' }
    ]
  },
  {
    name: 'Leave Management',
    description: 'Permissions related to leave and time-off management',
    permissions: [
      { key: 'view_leaves', name: 'View Leaves', description: 'Can view leave requests' },
      { key: 'create_leave', name: 'Create Leave', description: 'Can create leave requests' },
      { key: 'edit_leave', name: 'Edit Leave', description: 'Can edit leave requests' },
      { key: 'approve_leave', name: 'Approve Leave', description: 'Can approve or reject leave requests' },
      { key: 'manage_leaves', name: 'Manage Leaves', description: 'Can manage all leave-related settings' }
    ]
  }
];

// Common permission groups for easy checking
export const ADMIN_PERMISSIONS = ['manage_department', 'approve_report', 'manage_attendance'];
export const MANAGER_PERMISSIONS = ['edit_leave', 'approve_leave', 'view_attendance_report'];
export const TASK_PERMISSIONS = ['create_task', 'edit_task', 'assign_task'];
export const REPORT_PERMISSIONS = ['create_report', 'view_report', 'edit_report']; 