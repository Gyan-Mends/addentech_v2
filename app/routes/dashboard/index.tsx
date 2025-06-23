// Optimized imports - only icons used in dashboard
import { 
  Users, 
  CheckSquare, 
  Clock, 
  Calendar, 
  BarChart3,
  CheckCircle,
  Target
} from "lucide-react";

const Dashboard = () => {
  // Mock data - In real app, this would come from API
  const stats = [
    {
      title: "Total Users",
      value: "156",
      change: "+12%",
      trend: "up",
      icon: Users,
      color: "blue"
    },
    {
      title: "Active Tasks",
      value: "43",
      change: "+5%",
      trend: "up",
      icon: CheckSquare,
      color: "green"
    },
    {
      title: "Pending Leave Requests",
      value: "8",
      change: "-2%",
      trend: "down",
      icon: Calendar,
      color: "yellow"
    },
    {
      title: "Attendance Rate",
      value: "94%",
      change: "+1%",
      trend: "up",
      icon: Clock,
      color: "purple"
    }
  ];

  const recentTasks = [
    { id: 1, title: "Complete project documentation", status: "in_progress", priority: "high", assignee: "John Doe", dueDate: "2024-01-15" },
    { id: 2, title: "Review marketing proposal", status: "pending", priority: "medium", assignee: "Jane Smith", dueDate: "2024-01-16" },
    { id: 3, title: "Update system requirements", status: "completed", priority: "low", assignee: "Mike Johnson", dueDate: "2024-01-14" },
    { id: 4, title: "Prepare monthly report", status: "in_progress", priority: "critical", assignee: "Sarah Wilson", dueDate: "2024-01-17" },
  ];

  const recentActivities = [
    { id: 1, type: "task_created", message: "New task 'Update database' created", time: "2 hours ago", user: "Admin" },
    { id: 2, type: "leave_approved", message: "Leave request approved for John Doe", time: "4 hours ago", user: "Manager" },
    { id: 3, type: "user_added", message: "New user 'Alice Cooper' added to system", time: "6 hours ago", user: "HR" },
    { id: 4, type: "task_completed", message: "Task 'Setup environment' completed", time: "8 hours ago", user: "Developer" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900';
      case 'in_progress': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
      case 'high': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900';
      case 'low': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900';
    }
  };

  const getStatColor = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'purple': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <span className={`text-sm font-medium ${
                      stat.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">from last month</span>
                  </div>
                </div>
                <div className={`w-12 h-12 ${getStatColor(stat.color)} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Tasks</h2>
              <a href="/dashboard/tasks" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                View All
              </a>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Assigned to {task.assignee} • Due: {task.dueDate}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activities</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      {activity.type === 'task_created' && <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                      {activity.type === 'leave_approved' && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />}
                      {activity.type === 'user_added' && <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                      {activity.type === 'task_completed' && <Target className="w-4 h-4 text-orange-600 dark:text-orange-400" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">by {activity.user}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/dashboard/tasks"
            className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
          >
            <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Create Task</span>
          </a>
          <a
            href="/dashboard/users"
            className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
          >
            <Users className="w-6 h-6 text-green-600 dark:text-green-400 mr-2" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Add User</span>
          </a>
          <a
            href="/dashboard/attendance"
            className="flex items-center justify-center p-4 bg-purple-50 dark:bg-purple-900 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800 transition-colors"
          >
            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2" />
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Check Attendance</span>
          </a>
          <a
            href="/dashboard/reports"
            className="flex items-center justify-center p-4 bg-orange-50 dark:bg-orange-900 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-800 transition-colors"
          >
            <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-2" />
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">View Reports</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;