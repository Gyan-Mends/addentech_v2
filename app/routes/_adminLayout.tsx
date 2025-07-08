import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
// Optimized icon imports - only import what we use
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CheckSquare, 
  Clock, 
  Calendar, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  Menu, 
  X, 
  Sun, 
  Moon,
  ChevronDown,
  ChevronRight,
  Briefcase,
  ClipboardList,
  MessageSquare,
  UserCheck,
  Target,
  Home,
  Phone,
  CalendarDays,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  TrendingUp,
  Plus
} from "lucide-react";
import { authAPI } from "~/services/api";
import { canAccessNavItem } from "~/utils/permissions";

const AdminLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    leaveManagement: false,
    taskManagement: false
  });
  
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  // Check authentication and load user data
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const checkAuth = async () => {
      try {
        // Try to get user from localStorage first for quick loading
        const storedUser = localStorage.getItem('user');
        if (storedUser && mounted) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setLoading(false);
          } catch (parseError) {
            console.error('Failed to parse stored user:', parseError);
            localStorage.removeItem('user');
          }
        }

        // Verify with server
        const response = await authAPI.verify();
        if (!mounted) return;

        if (response.success) {
          setUser(response.user);
          localStorage.setItem('user', JSON.stringify(response.user));
          setLoading(false);
        } else {
          handleAuthFailure();
        }
      } catch (error: any) {
        if (!mounted) return;
        
        console.error('Auth check failed:', error);
        
        // If it's a network error and we haven't exceeded retries, try again
        if (error.code === 'NETWORK_ERROR' && retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkAuth, 2000 * retryCount); // Exponential backoff
          return;
        }
        
        // For 401 errors, clear stored data and redirect
        if (error.response?.status === 401) {
          handleAuthFailure();
          return;
        }
        
        // For other errors, only redirect if we don't have stored user data
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          handleAuthFailure();
        } else {
          // Keep the stored user and just set loading to false
          setLoading(false);
        }
      }
    };

    const handleAuthFailure = () => {
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
      if (location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [navigate, location.pathname]);

  // Auto-expand sections based on current page
  useEffect(() => {
    if (location.pathname.includes('/dashboard/leaves') || 
        location.pathname.includes('/dashboard/leave-') ||
        location.pathname.includes('/dashboard/team-calendar')) {
      setExpandedSections(prev => ({ ...prev, leaveManagement: true }));
    }
    
    if (location.pathname.includes('/dashboard/tasks') ||
        location.pathname.includes('/dashboard/create-task')) {
      setExpandedSections(prev => ({ ...prev, taskManagement: true }));
    }
  }, [location.pathname]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('user');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  // Optimized loading state - minimal render
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-label="Loading"></div>
      </div>
    );
  }

  // If no user after loading, this shouldn't happen due to redirect, but just in case
  if (!user) {
    return null;
  }

  // Navigation items with role-based visibility
  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      permission: "view_task", // Using view_task since all users have this permission
      roles: ["admin", "manager", "department_head", "staff", "intern"]
    },
    {
      name: "Users",
      href: "/dashboard/user",
      icon: Users,
      permission: "manage_users",
      roles: ["admin", "manager", "department_head"]
    },
    {
      name: "Departments",
      href: "/dashboard/department",
      icon: Building2,
      permission: "manage_department",
      roles: ["admin", "manager"]
    },

    {
      name: "Attendance",
      href: "/dashboard/attendance",
      icon: Clock,
      permission: "view_attendance",
      roles: ["admin", "manager", "department_head", "staff", "intern"]
    }
  ];

  // Task Management submenu items
  const taskManagementItems = [
    {
      name: "Task Dashboard",
      href: "/dashboard/tasks",
      icon: LayoutDashboard,
      permission: "view_task",
      roles: ["admin", "manager", "department_head", "staff", "intern"]
    },
    {
      name: "Create Task",
      href: "/dashboard/create-task",
      icon: Plus,
      permission: "create_task",
      roles: ["admin", "manager", "department_head", "staff", "intern"]
    }
  ];

  // Leave Management submenu items
  const leaveManagementItems = [
    {
      name: "Leave Dashboard",
      href: "/dashboard/leaves",
      icon: LayoutDashboard,
      permission: "view_leaves",
      roles: ["admin", "manager", "department_head", "staff"]
    },
    {
      name: "Apply for Leave",
      href: "/dashboard/apply-leave",
      icon: CalendarDays,
      permission: "view_leaves",
      roles: ["admin", "manager", "department_head", "staff"]
    },
    {
      name: "Team Calendar",
      href: "/dashboard/team-calendar",
      icon: CalendarCheck,
      permission: "view_leaves",
      roles: ["admin", "manager", "department_head", "staff"]
    },
    {
      name: "Leave Policies",
      href: "/dashboard/leave-policies",
      icon: ClipboardList,
      permission: "manage_leaves",
      roles: ["admin", "manager", "department_head"]
    },
    {
      name: "Leave Balance",
      href: "/dashboard/leave-balance",
      icon: TrendingUp,
      permission: "view_leaves",
      roles: ["admin", "manager", "department_head", "staff"]
    }
  ];

  const additionalItems = [
    {
      name: "Memos",
      href: "/dashboard/memo",
      icon: MessageSquare,
      permission: "view_task", // Using view_task as general permission
      roles: ["admin", "manager", "department_head", "staff"]
    },
    {
      name: "Monthly Reports",
      href: "/dashboard/monthly-reports",
      icon: BarChart3,
      permission: "view_report",
      roles: ["admin", "manager", "department_head"]
    },
    {
      name: "Categories",
      href: "/dashboard/categories",
      icon: Briefcase,
      permission: "manage_department", // Using manage_department as general admin permission
      roles: ["admin", "manager"]
    },
    {
      name: "Contact Messages",
      href: "/dashboard/contacts",
      icon: Phone,
      permission: "manage_department", // Admin-only permission for sensitive contact data
      roles: ["admin", "manager"]
    },
    {
      name: "Blogs",
      href: "/dashboard/blogs",
      icon: FileText,
      permission: "manage_department", // Admin-only permission for content management
      roles: ["admin", "manager"]
    }
  ];

  // Filter navigation items based on user role and permissions
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

  const filteredTaskItems = taskManagementItems.filter(item => {
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

  const filteredLeaveItems = leaveManagementItems.filter(item => {
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

  const filteredAdditionalItems = additionalItems.filter(item => {
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

  const isActive = (href: string) => {
    // Exact match for dashboard to prevent it from being always active
    if (href === '/dashboard') {
      return location.pathname === href;
    }
    // For other routes, check if current path starts with the href
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const isLeaveManagementActive = () => {
    return location.pathname.includes('/dashboard/leaves') || 
           location.pathname.includes('/dashboard/apply-leave') ||
           location.pathname.includes('/dashboard/team-calendar') ||
           location.pathname.includes('/dashboard/leave-policies') ||
           location.pathname.includes('/dashboard/leave-balance');
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div   className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed ? 'w-16' : 'w-64'} transform transition-all duration-300 ease-in-out`}>
        <div className="flex h-full flex-col bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700">
          {/* Logo/Brand */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">Addentech</span>
              </div>
            )}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {/* Regular Navigation Items */}
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className={`w-5 h-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}

            {/* Task Management Accordion */}
            {filteredTaskItems.length > 0 && (
              <div className="space-y-1">
                <button
                  onClick={() => !sidebarCollapsed && toggleSection('taskManagement')}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  title={sidebarCollapsed ? "Task Management" : undefined}
                >
                  <CheckSquare className={`w-5 h-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">Task Management</span>
                      {expandedSections.taskManagement ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </>
                  )}
                </button>

                {/* Task Management Submenu */}
                {!sidebarCollapsed && expandedSections.taskManagement && (
                  <div className="ml-6 space-y-1">
                    {filteredTaskItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            active
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Icon className="w-4 h-4 mr-3" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Leave Management Accordion */}
            {filteredLeaveItems.length > 0 && (
              <div className="space-y-1">
                <button
                  onClick={() => !sidebarCollapsed && toggleSection('leaveManagement')}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  title={sidebarCollapsed ? "Leave Management" : undefined}
                >
                  <Calendar className={`w-5 h-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">Leave Management</span>
                      {expandedSections.leaveManagement ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </>
                  )}
                </button>

                {/* Leave Management Submenu */}
                {!sidebarCollapsed && expandedSections.leaveManagement && (
                  <div className="ml-6 space-y-1">
                    {filteredLeaveItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            active
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Icon className="w-4 h-4 mr-3" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Additional Navigation Items */}
            {filteredAdditionalItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className={`w-5 h-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Section (Bottom) */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
              {!sidebarCollapsed ? (
                <>
                  <img
                    src={user?.image || "/api/placeholder/40/40"}
                    alt="Profile"
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {user?.role?.replace('_', ' ')}
                    </p>
                  </div>
                </>
              ) : (
                <img
                  src={user?.image || "/api/placeholder/40/40"}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                  title={`${user?.firstName} ${user?.lastName}`}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${sidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300 ease-in-out`}>
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Search Bar */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center space-x-4">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-600" />
                  )}
                </button>

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                      3
                    </span>
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Notifications</h3>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600">
                          <p className="text-sm text-gray-900 dark:text-white font-medium">New task assigned</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">5 minutes ago</p>
                        </div>
                        <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600">
                          <p className="text-sm text-gray-900 dark:text-white font-medium">Leave request approved</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1 hour ago</p>
                        </div>
                        <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <p className="text-sm text-gray-900 dark:text-white font-medium">Monthly report due</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2 hours ago</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <img
                      src={user?.image || "/api/placeholder/40/40"}
                      alt="Profile"
                      className="w-8 h-8 rounded-full"
                    />
                    <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>

                  {/* User Dropdown */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user?.firstName} {user?.lastName}
                        </p>
                      </div>
                      <div className="py-2">
                        <Link
                          to="/dashboard/profile"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Users className="w-4 h-4 mr-3" />
                          Profile
                        </Link>
                        <Link
                          to="/dashboard/settings"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Settings className="w-4 h-4 mr-3" />
                          Settings
                        </Link>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 dashboard-layout">
          <Outlet />
        </main>
      </div>

      {/* Click away listeners */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        ></div>
      )}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        ></div>
      )}
    </div>
  );
};

export default AdminLayout;