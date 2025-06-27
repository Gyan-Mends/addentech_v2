# User Permissions System Guide

## Overview

The user permissions system allows administrators and managers to control what features and pages users can access based on their role and specific permissions. This system provides fine-grained control over user access while maintaining role-based defaults.

## How It Works

### 1. Permission Storage
- Permissions are stored in the MongoDB `Registration` collection as a `Map<string, boolean>`
- Each user has a `permissions` field that contains key-value pairs of permission names and their boolean values
- Users also have a `role` field that determines their base access level

### 2. Role Hierarchy
- **Admin**: Has access to all permissions by default
- **Manager**: Has elevated permissions for management tasks
- **Department Head**: Has permissions for department-level management
- **Staff**: Has basic permissions for daily tasks

### 3. Permission Categories

The system includes these permission categories:

#### Profile Management
- `view_profile`: Can view user profiles
- `edit_profile`: Can edit user profiles

#### Task Management
- `view_task`: Can view tasks and projects
- `create_task`: Can create new tasks
- `edit_task`: Can edit existing tasks
- `assign_task`: Can assign tasks to other users

#### Department Management
- `view_department`: Can view department information
- `manage_department`: Can manage department settings and users

#### Reports & Analytics
- `view_report`: Can view reports and analytics
- `create_report`: Can create new reports
- `edit_report`: Can edit existing reports
- `approve_report`: Can approve or reject reports

#### Attendance Management
- `view_attendance`: Can view attendance records
- `manage_attendance`: Can manage attendance records
- `view_attendance_report`: Can view attendance reports

#### Leave Management
- `view_leaves`: Can view leave requests
- `create_leave`: Can create leave requests
- `edit_leave`: Can edit leave requests
- `approve_leave`: Can approve or reject leave requests
- `manage_leaves`: Can manage all leave-related settings

## Using the Permission System

### 1. In Settings Page (Admin/Manager Only)

Administrators and managers can access the "User Permissions" tab in Settings to:

- **View all users** with filtering by role and department
- **Select a user** to manage their specific permissions
- **Toggle individual permissions** on/off for granular control
- **Apply role presets** to quickly set permissions based on common role patterns
- **Real-time updates** with immediate permission changes

### 2. Permission Utility Functions

Use the functions from `~/utils/permissions.ts`:

```typescript
import { hasPermission, canAccessNavItem } from "~/utils/permissions";

// Check if user has a specific permission
if (hasPermission(user, 'create_task')) {
  // Show create task button
}

// Check navigation access
if (canAccessNavItem(user, 'manage_department', ['admin', 'manager'])) {
  // Show navigation item
}
```

### 3. In Navigation (Admin Layout)

The admin layout already implements permission checking:

```typescript
const filteredNavItems = navigationItems.filter(item => {
  if (!user) return false;
  
  // Admin and manager roles have access to all nav links they're included in
  if (user.role === 'admin' || user.role === 'manager') {
    return item.roles.includes(user.role);
  }
  
  // For other roles, check both role and permission
  const hasRole = item.roles.includes(user.role);
  const hasPermission = user.permissions?.[item.permission] || false;
  return hasRole && hasPermission;
});
```

### 4. In Route Components

Protect routes and features by checking permissions:

```typescript
// At the top of a component
const { user } = useAuth(); // Your auth context
import { hasPermission } from "~/utils/permissions";

// In the component
if (!hasPermission(user, 'create_task')) {
  return <div>Access Denied</div>;
}

// Or conditionally render features
{hasPermission(user, 'edit_task') && (
  <Button onClick={handleEdit}>Edit Task</Button>
)}
```

### 5. API Endpoint Protection

Protect API endpoints by checking permissions:

```typescript
// In your API route
import Registration from "~/model/registration";

const currentUser = await Registration.findOne({ 
  email: email.toLowerCase().trim(),
  status: "active"
});

if (!currentUser || (currentUser.role !== 'admin' && !currentUser.permissions?.get('manage_department'))) {
  return json({
    success: false,
    error: 'Unauthorized'
  }, { status: 403 });
}
```

## Permission Management Features

### 1. User List with Filters
- Filter users by role (admin, manager, department_head, staff)
- Filter users by department
- Real-time user count display
- Status indicators (active/inactive)

### 2. Individual Permission Management
- Visual permission categories with descriptions
- Toggle switches for each permission
- Real-time updates without page refresh
- Loading states during updates

### 3. Role Presets
- Quick application of role-based permission sets
- Maintains consistency across users with the same role
- One-click permission setup for new users

### 4. Visual Feedback
- Color-coded role chips (admin=red, manager=yellow, etc.)
- Status indicators for user accounts
- Success/error toast notifications
- Loading states for all operations

## Default Role Permissions

### Staff (Default)
- view_profile, edit_profile
- view_task, view_department, view_attendance
- view_leaves, create_leave

### Department Head
- All staff permissions plus:
- create_task, edit_task, assign_task
- create_report, view_report, edit_report
- manage_attendance, view_attendance_report
- edit_leave, approve_leave, manage_leaves

### Manager
- All staff permissions plus:
- create_task, edit_task, assign_task
- view_report, view_attendance_report
- edit_leave, approve_leave, manage_leaves

### Admin
- All permissions enabled by default
- Cannot have permissions disabled (always returns true)

## API Endpoints

### Update Single Permission
```
POST /api/users?action=updatePermission
FormData: userId, permissionKey, value
```

### Apply Role Preset
```
POST /api/users?action=applyRolePreset
FormData: userId, role
```

### Get Users with Permissions
```
GET /api/users
Returns: users array with permissions object
```

## Security Considerations

1. **Role-based Access**: Admins and managers can manage permissions
2. **Session Validation**: All permission changes require valid authentication
3. **Database Validation**: MongoDB schema enforces permission structure
4. **Client-side Protection**: UI elements hidden based on permissions
5. **Server-side Protection**: API endpoints validate permissions

## Best Practices

1. **Always check permissions on both client and server side**
2. **Use role presets for consistency**
3. **Regularly audit user permissions**
4. **Test permission changes in development first**
5. **Document any custom permissions you add**

## Extending the System

To add new permissions:

1. **Add to the database schema** in `~/model/registration.tsx`
2. **Update permission categories** in `~/utils/permissions.ts`
3. **Add to role presets** in the API and utility functions
4. **Update UI** in the settings page if needed
5. **Implement checks** in relevant components and API routes

## Troubleshooting

### Common Issues

1. **Permissions not updating**: Check browser console for API errors
2. **Access denied**: Verify user has required role and permission
3. **UI not updating**: Ensure state management is working correctly
4. **Database errors**: Check MongoDB connection and schema

### Debug Tips

1. Use browser dev tools to inspect API calls
2. Check user object in React dev tools
3. Verify database permissions using MongoDB tools
4. Test with different user roles and permissions

This permission system provides a robust foundation for controlling user access while remaining flexible enough for future expansion. 