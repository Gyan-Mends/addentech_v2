import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { apiService } from '~/services/api';
import { Card, CardBody } from '@heroui/react';
import { 
  Users, 
  CheckSquare, 
  Calendar, 
  Building2,
  FileText,
  BookOpen,
  MessageSquare,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Tag
} from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/dashboard');
      
      if (response.success) {
        setDashboardData(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please check your connection and try again.');
      // Set default data based on actual system features
      setDashboardData({
        summary: { totalEmployees: 2, presentToday: 2 },
        tasks: { total: 25, pending: 8, completed: 17, inProgress: 8 },
        departments: { total: 5 },
        leaves: { totalPending: 3 },
        reports: { totalThisMonth: 2 }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Process real data for Activity Overview chart
  const getActivityChartData = () => {
    if (!dashboardData) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Get last 7 days of data
    const attendanceData = dashboardData.attendance?.daily || [];
    const workHoursData = dashboardData.workHours || [];
    const taskCompletionData = dashboardData.taskCompletions || [];
    
    // Create labels for last 7 days
    const labels = [];
    const attendanceCounts = [];
    const workHours = [];
    const taskActivity = [];
    
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Format label as day name
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      labels.push(dayName);
      
      // Find attendance data for this date
      const attendanceRecord = attendanceData.find((record: any) => 
        record.date === dateStr
      );
      attendanceCounts.push(attendanceRecord?.present || 0);
      
      // Find work hours data for this date
      const workHoursRecord = workHoursData.find((record: any) => 
        record.date === dateStr
      );
      workHours.push(workHoursRecord?.hours || 0);
      
      // Find task completion data for this date
      const taskRecord = taskCompletionData.find((record: any) => 
        record.date === dateStr
      );
      taskActivity.push(taskRecord?.activity || 0);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Daily Attendance',
          data: attendanceCounts,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Work Hours',
          data: workHours,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Task Activity',
          data: taskActivity,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: false,
          tension: 0.4,
        },
      ],
    };
  };

  const activityChartData = getActivityChartData();

  const isDarkMode = document.documentElement.classList.contains('dark');
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: isDarkMode ? '#9CA3AF' : '#6B7280',
          font: { size: 12 }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDarkMode ? '#fff' : '#1F2937',
        bodyColor: isDarkMode ? '#fff' : '#1F2937',
        borderColor: isDarkMode ? '#374151' : '#E5E7EB',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: { color: isDarkMode ? '#9CA3AF' : '#6B7280' }
      },
      y: {
        display: true,
        grid: { color: isDarkMode ? 'rgba(156, 163, 175, 0.1)' : 'rgba(107, 114, 128, 0.1)' },
        ticks: { color: isDarkMode ? '#9CA3AF' : '#6B7280' }
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500 text-red-600 dark:text-red-400 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  const formatTrend = (value: number) => {
    const isPositive = value >= 0;
    return (
      <div className={`flex items-center text-xs ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
        {Math.abs(value)}% from last month
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Employees */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-slate-400 text-sm font-medium">Total Employees</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardData?.summary?.totalEmployees || 0}</p>
                {formatTrend(12)}
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Total Tasks */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-slate-400 text-sm font-medium">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardData?.tasks?.total || 0}</p>
                {formatTrend(8)}
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckSquare className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Attendance Today */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-slate-400 text-sm font-medium">Attendance Today</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardData?.summary?.presentToday || 0}</p>
                {formatTrend(15)}
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Calendar className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Departments */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-slate-400 text-sm font-medium">Departments</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardData?.departments?.total || 0}</p>
                {formatTrend(-3)}
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Building2 className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Pending Tasks */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-slate-400 text-sm font-medium">Pending Tasks</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardData?.tasks?.pending || 0}</p>
                {formatTrend(5)}
              </div>
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Clock className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Completed Tasks */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-slate-400 text-sm font-medium">Completed Tasks</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardData?.tasks?.completed || 0}</p>
                {formatTrend(22)}
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Target className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Blog Posts */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-slate-400 text-sm font-medium">Blog Posts</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
                {formatTrend(7)}
              </div>
              <div className="p-3 bg-pink-500/20 rounded-lg">
                <BookOpen className="w-8 h-8 text-pink-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Memos */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-slate-400 text-sm font-medium">Memos</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">4</p>
                {formatTrend(2)}
              </div>
              <div className="p-3 bg-indigo-500/20 rounded-lg">
                <FileText className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Activity Overview and Quick Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Overview */}
        <Card className="lg:col-span-2 bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardBody className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Activity Overview</h3>
              <p className="text-gray-600 dark:text-slate-400 text-sm">Weekly Activity Overview</p>
            </div>
            <div className="h-80">
              <Line data={activityChartData} options={chartOptions} />
            </div>
          </CardBody>
        </Card>

        {/* Quick Statistics */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardBody className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Quick Statistics</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center">
                  <UserCheck className="w-5 h-5 text-blue-400 mr-3" />
                  <span className="text-gray-700 dark:text-slate-300">Active Employees</span>
                </div>
                <span className="text-gray-900 dark:text-white font-semibold">{dashboardData?.summary?.totalEmployees || 0}</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center">
                  <CheckSquare className="w-5 h-5 text-green-400 mr-3" />
                  <span className="text-gray-700 dark:text-slate-300">Tasks In Progress</span>
                </div>
                <span className="text-gray-900 dark:text-white font-semibold">{dashboardData?.tasks?.inProgress || 0}</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-yellow-400 mr-3" />
                  <span className="text-gray-700 dark:text-slate-300">Pending Leaves</span>
                </div>
                <span className="text-gray-900 dark:text-white font-semibold">{dashboardData?.leaves?.totalPending || 0}</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-purple-400 mr-3" />
                  <span className="text-gray-700 dark:text-slate-300">Monthly Reports</span>
                </div>
                <span className="text-gray-900 dark:text-white font-semibold">{dashboardData?.reports?.totalThisMonth || 0}</span>
              </div>
              
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center">
                  <Tag className="w-5 h-5 text-indigo-400 mr-3" />
                  <span className="text-gray-700 dark:text-slate-300">Categories</span>
                </div>
                <span className="text-gray-900 dark:text-white font-semibold">6</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard; 