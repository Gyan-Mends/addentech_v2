import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router";
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
  Shield,
  Briefcase,
  ClipboardList,
  MessageSquare,
  UserCheck,
  Target,
  Home
} from "lucide-react";

// Mock user data - In real app, this would come from session/context
const mockUser = {
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  role: "admin",
  image: "/api/placeholder/40/40",
  permissions: new Map([
    ["view_dashboard", true],
    ["manage_users", true],
    ["manage_department", true],
    ["create_task", true],
    ["view_task", true],
    ["manage_attendance", true],
    ["view_report", true],
    ["create_report", true],
    ["manage_leaves", true],
    ["view_leaves", true]
  ])
};

const AdminLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Navigation items with role-based visibility
  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      permission: "view_dashboard",
      roles: ["admin", "manager", "department_head", "staff"]
    },
    {
      name: "Users",
      href: "/dashboard/users",
      icon: Users,
      permission: "manage_users",
      roles: ["admin", "manager", "department_head"]
    },
    {
      name: "Departments",
      href: "/dashboard/departments",
      icon: Building2,
      permission: "manage_department",
      roles: ["admin", "manager"]
    },
    {
      name: "Tasks",
      href: "/dashboard/tasks",
      icon: CheckSquare,
      permission: "view_task",
      roles: ["admin", "manager", "department_head", "staff"]
    },
    {
      name: "Task Activities",
      href: "/dashboard/task-activities",
      icon: Target,
      permission: "view_task",
      roles: ["admin", "manager", "department_head", "staff"]
    },
    {
      name: "Attendance",
      href: "/dashboard/attendance",
      icon: Clock,
      permission: "view_attendance",
      roles: ["admin", "manager", "department_head", "staff"]
    },
    {
      name: "Leave Management",
      href: "/dashboard/leaves",
      icon: Calendar,
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
      name: "Memos",
      href: "/dashboard/memos",
      icon: MessageSquare,
      permission: "view_task", // Using view_task as general permission
      roles: ["admin", "manager", "department_head", "staff"]
    },
    {
      name: "Monthly Reports",
      href: "/dashboard/reports",
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
      name: "Contacts",
      href: "/dashboard/contacts",
      icon: UserCheck,
      permission: "view_task", // Using view_task as general permission
      roles: ["admin", "manager", "department_head", "staff"]
    },
    {
      name: "Blog",
      href: "/dashboard/blog",
      icon: FileText,
      permission: "view_task", // Using view_task as general permission
      roles: ["admin", "manager", "department_head"]
    }
  ];

  // Filter navigation items based on user role and permissions
  const filteredNavItems = navigationItems.filter(item => {
    const hasRole = item.roles.includes(mockUser.role);
    const hasPermission = mockUser.permissions.get(item.permission) || false;
    return hasRole && hasPermission;
  });

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed ? 'w-16' : 'w-64'} transform transition-all duration-300 ease-in-out`}>
        <div className="flex h-full flex-col bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700">
          {/* Logo/Brand */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">Addenech</span>
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
          </nav>

          {/* User Profile Section (Bottom) */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
              {!sidebarCollapsed ? (
                <>
                  <img
                    src={mockUser.image}
                    alt="Profile"
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {mockUser.firstName} {mockUser.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {mockUser.role.replace('_', ' ')}
                    </p>
                  </div>
                </>
              ) : (
                <img
                  src={mockUser.image}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                  title={`${mockUser.firstName} ${mockUser.lastName}`}
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
                      src={mockUser.image}
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
                          {mockUser.firstName} {mockUser.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{mockUser.email}</p>
                      </div>
                      <div className="py-2">
                        <a
                          href="#"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Users className="w-4 h-4 mr-3" />
                          Profile
                        </a>
                        <a
                          href="#"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Settings className="w-4 h-4 mr-3" />
                          Settings
                        </a>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                        <a
                          href="#"
                          className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Sign Out
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
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