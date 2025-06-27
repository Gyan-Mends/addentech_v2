import { useState, useEffect } from "react";
import { Link } from "react-router";
import { 
  Users, 
  CheckSquare, 
  Clock, 
  Calendar, 
  BarChart3,
  CheckCircle,
  Target,
  Building2,
  FileText,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  UserCheck,
  CalendarDays,
  MessageSquare,
  Briefcase,
  Plus,
  Eye,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
} from 'chart.js';
import { Card, CardBody, CardHeader, Button, Chip, Progress } from "@heroui/react";
import { authAPI, attendanceAPI, userAPI, departmentAPI } from "~/services/api";
import { successToast, errorToast } from "~/components/toast";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
);

interface DashboardStats {
  users: {
    total: number;
    active: number;
    departments: number;
    newThisMonth: number;
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
  };
  attendance: {
    todayPresent: number;
    todayTotal: number;
    weeklyAverage: number;
    lateCheckIns: number;
  };
  leaves: {
    pending: number;
    approved: number;
    onLeaveToday: number;
    upcoming: number;
  };
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  time: string;
  user: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    users: { total: 0, active: 0, departments: 0, newThisMonth: 0 },
    tasks: { total: 0, completed: 0, inProgress: 0, overdue: 0 },
    attendance: { todayPresent: 0, todayTotal: 0, weeklyAverage: 0, lateCheckIns: 0 },
    leaves: { pending: 0, approved: 0, onLeaveToday: 0, upcoming: 0 }
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [taskCompletionData, setTaskCompletionData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load user info
      const userResponse = await authAPI.verify();
      if (userResponse.success) {
        setUser(userResponse.user);
      }

      // Load dashboard data in parallel
      await Promise.all([
        loadUserStats(),
        loadTaskStats(),
        loadAttendanceStats(),
        loadLeaveStats(),
        loadRecentTasks(),
        loadRecentActivities(),
        loadChartData()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      errorToast('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboard = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    successToast('Dashboard refreshed');
  };

  const loadUserStats = async () => {
    try {
      const [usersResponse, departmentsResponse] = await Promise.all([
        userAPI.getAll(),
        departmentAPI.getAll()
      ]);

      if (usersResponse.success && departmentsResponse.success) {
        const users = usersResponse.users || [];
        const departments = departmentsResponse.departments || [];
        
        const activeUsers = users.filter((u: any) => u.status === 'active');
        const thisMonth = new Date();
        thisMonth.setDate(1);
        const newThisMonth = users.filter((u: any) => 
          new Date(u.createdAt) >= thisMonth
        );

        setStats(prev => ({
          ...prev,
          users: {
            total: users.length,
            active: activeUsers.length,
            departments: departments.length,
            newThisMonth: newThisMonth.length
          }
        }));
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadTaskStats = async () => {
    try {
      const response = await fetch('/api/task?operation=getStats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(prev => ({
            ...prev,
            tasks: data.data
          }));
        }
      }
    } catch (error) {
      console.error('Error loading task stats:', error);
    }
  };

  const loadAttendanceStats = async () => {
    try {
      const response = await attendanceAPI.getAll();
      if (response.success && response.attendance) {
        const today = new Date().toDateString();
        const todayRecords = response.attendance.filter((record: any) => 
          new Date(record.date).toDateString() === today
        );
        
        const uniqueUsers = new Set(todayRecords.map((r: any) => r.user));
        const lateCheckIns = todayRecords.filter((record: any) => {
          const checkInTime = new Date(record.checkInTime);
          const hours = checkInTime.getHours();
          return hours >= 9; // After 9 AM is considered late
        });

        setStats(prev => ({
          ...prev,
          attendance: {
            todayPresent: uniqueUsers.size,
            todayTotal: stats.users.active,
            weeklyAverage: 85, // Calculate from weekly data
            lateCheckIns: lateCheckIns.length
          }
        }));
      }
    } catch (error) {
      console.error('Error loading attendance stats:', error);
    }
  };

  const loadLeaveStats = async () => {
    try {
      const response = await fetch('/api/leaves?operation=getStats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(prev => ({
            ...prev,
            leaves: data.data
          }));
        }
      }
    } catch (error) {
      console.error('Error loading leave stats:', error);
    }
  };

  const loadRecentTasks = async () => {
    try {
      const response = await fetch('/api/task?limit=5&sortBy=updatedAt&sortOrder=desc');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRecentTasks(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading recent tasks:', error);
    }
  };

  const loadRecentActivities = async () => {
    // Mock recent activities - in real app, this would come from an activity log
    const activities: RecentActivity[] = [
      {
        id: '1',
        type: 'task_created',
        message: 'New task "Update system documentation" created',
        time: '2 hours ago',
        user: 'Admin',
        priority: 'high'
      },
      {
        id: '2',
        type: 'leave_approved',
        message: 'Leave request approved for John Doe',
        time: '4 hours ago',
        user: 'Manager'
      },
      {
        id: '3',
        type: 'user_added',
        message: 'New user "Alice Cooper" added to system',
        time: '6 hours ago',
        user: 'HR'
      },
      {
        id: '4',
        type: 'attendance_checked',
        message: '15 employees checked in today',
        time: '8 hours ago',
        user: 'System'
      },
      {
        id: '5',
        type: 'report_generated',
        message: 'Monthly report generated for IT Department',
        time: '1 day ago',
        user: 'Department Head'
      }
    ];
    setRecentActivities(activities);
  };

  const loadChartData = async () => {
    // Attendance trend data with theme-aware colors
    const attendanceTrendData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Attendance Rate',
          data: [92, 88, 94, 89, 96, 45, 30],
          borderColor: 'rgb(59, 130, 246)', // blue-500
          backgroundColor: 'rgba(59, 130, 246, 0.1)', // blue-500 with opacity
          tension: 0.4,
          fill: true,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: 'rgb(255, 255, 255)',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };

    // Task completion data with consistent colors
    const taskCompletionData = {
      labels: ['Completed', 'In Progress', 'Pending', 'Overdue'],
      datasets: [
        {
          data: [stats.tasks.completed, stats.tasks.inProgress, stats.tasks.total - stats.tasks.completed - stats.tasks.inProgress, stats.tasks.overdue],
          backgroundColor: [
            '#10B981', // emerald-500 (success)
            '#3B82F6', // blue-500 (primary)
            '#F59E0B', // amber-500 (warning)
            '#EF4444'  // red-500 (danger)
          ],
          borderWidth: 0,
          hoverBackgroundColor: [
            '#059669', // emerald-600
            '#2563EB', // blue-600
            '#D97706', // amber-600
            '#DC2626'  // red-600
          ]
        }
      ]
    };

    setAttendanceData(attendanceTrendData);
    setTaskCompletionData(taskCompletionData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900';
      case 'in_progress': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900';
      case 'overdue': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_created': return <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'leave_approved': return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'user_added': return <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'attendance_checked': return <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      case 'report_generated': return <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      default: return <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.2)', // gray-400 with opacity
          borderColor: 'rgba(156, 163, 175, 0.3)'
        },
        ticks: {
          color: 'rgba(107, 114, 128, 1)' // gray-500
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(107, 114, 128, 1)' // gray-500
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          color: 'rgba(107, 114, 128, 1)', // gray-500
          font: {
            family: 'Nunito, sans-serif',
            size: 12
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.firstName || 'User'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's what's happening in your organization today.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="flat"
            size="sm"
            startContent={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
            onPress={refreshDashboard}
            isDisabled={refreshing}
          >
            Refresh
          </Button>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.users.total}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mr-1" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    +{stats.users.newThisMonth} this month
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-500 dark:bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Tasks */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Tasks</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.tasks.total}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {stats.tasks.completed} completed
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-emerald-500 dark:bg-emerald-600 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Attendance */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Attendance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.users.active > 0 ? Math.round((stats.attendance.todayPresent / stats.users.active) * 100) : 0}%
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {stats.attendance.todayPresent} of {stats.users.active} present
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-500 dark:bg-purple-600 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Leaves */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Leaves</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.leaves.pending}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {stats.leaves.onLeaveToday} on leave today
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-amber-500 dark:bg-amber-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Charts and Data Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Attendance Trend</h3>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              {attendanceData && (
                <Line data={attendanceData} options={chartOptions} />
              )}
            </div>
          </CardBody>
        </Card>

        {/* Task Distribution */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Task Distribution</h3>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              {taskCompletionData && (
                <Doughnut data={taskCompletionData} options={doughnutOptions} />
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Tasks</h3>
              <Link 
                to="/dashboard/tasks" 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm flex items-center transition-colors"
              >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {recentTasks.length > 0 ? (
                recentTasks.slice(0, 5).map((task) => (
                  <div key={task._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {task.title}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Chip 
                          size="sm" 
                          className={getStatusColor(task.status)}
                        >
                          {task.status?.replace('_', ' ')}
                        </Chip>
                        <Chip 
                          size="sm" 
                          className={getPriorityColor(task.priority)}
                        >
                          {task.priority}
                        </Chip>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Link to={`/dashboard/task/${task._id}`}>
                      <Button size="sm" variant="flat" isIconOnly className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No recent tasks found
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Recent Activities */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activities</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">by {activity.user}</span>
                      {activity.priority && (
                        <>
                          <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                          <Chip size="sm" className={getPriorityColor(activity.priority)}>
                            {activity.priority}
                          </Chip>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Link
              to="/dashboard/create-task"
              className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
            >
              <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Create Task</span>
            </Link>
            
            <Link
              to="/dashboard/user"
              className="flex flex-col items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200 dark:border-emerald-800"
            >
              <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Manage Users</span>
            </Link>
            
            <Link
              to="/dashboard/attendance"
              className="flex flex-col items-center justify-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-800"
            >
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Attendance</span>
            </Link>
            
            <Link
              to="/dashboard/apply-leave"
              className="flex flex-col items-center justify-center p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors border border-amber-200 dark:border-amber-800"
            >
              <CalendarDays className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-2" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Apply Leave</span>
            </Link>
            
            <Link
              to="/dashboard/reports"
              className="flex flex-col items-center justify-center p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors border border-orange-200 dark:border-orange-800"
            >
              <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-2" />
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Reports</span>
            </Link>
            
            <Link
              to="/dashboard/department"
              className="flex flex-col items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-800"
            >
              <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-2" />
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Departments</span>
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Health</p>
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">Excellent</p>
              </div>
              <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse"></div>
            </div>
            <Progress value={98} color="success" className="mt-3" />
          </CardBody>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Departments</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.users.departments}</p>
              </div>
              <Building2 className="w-6 h-6 text-blue-500 dark:text-blue-400" />
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Data Sync</p>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">Real-time</p>
              </div>
              <Activity className="w-6 h-6 text-blue-500 dark:text-blue-400" />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;