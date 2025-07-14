import { useState, useEffect, useMemo, useCallback } from "react";
import { Clock, Calendar, Users, TrendingUp, CheckCircle, UserCheck, MapPin, FileText, Download, Trash2 } from "lucide-react";
import { Button, useDisclosure } from "@heroui/react";
import { successToast, errorToast } from "~/components/toast";
import { attendanceAPI, userAPI, departmentAPI, type AttendanceRecord, type CheckInData } from "~/services/api";
import DataTable, { type Column } from "~/components/DataTable";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AttendanceStats {
  totalRecords: number;
  presentToday: number;
  remoteWorkers: number;
  inHouseWorkers: number;
  avgWorkHours: number;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string | { _id: string; name: string };
  workMode: 'in-house' | 'remote';
  role: 'admin' | 'manager' | 'staff' | 'department_head' | 'intern';
}

export default function Attendance() {
  // State management
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'myAttendance' | 'departmentAttendance' | 'attendanceReport'>('myAttendance');
  
  // Statistics
  const [stats, setStats] = useState<AttendanceStats>({
    totalRecords: 0,
    presentToday: 0,
    remoteWorkers: 0,
    inHouseWorkers: 0,
    avgWorkHours: 0
  });

  // Check-in form state
  const [checkInForm, setCheckInForm] = useState({
    notes: '',
    workMode: 'remote' as 'in-house' | 'remote',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    locationName: ''
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [userCheckedInToday, setUserCheckedInToday] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);

  // Report generation state
  const [reportForm, setReportForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    departmentId: ''
  });
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState<AttendanceRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Admin Controls state
  const [workModeForm, setWorkModeForm] = useState({
    selectedUserId: '',
    newWorkMode: 'in-house' as 'in-house' | 'remote'
  });
  const [updatingWorkMode, setUpdatingWorkMode] = useState(false);

  // Chart data state
  const [chartData, setChartData] = useState<any>(null);

  // Memoized chart options for better performance
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750, // Reduced animation time for faster loading
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          color: 'rgb(156, 163, 175)' // gray-400
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgb(156, 163, 175)' // gray-400
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgb(156, 163, 175)', // gray-400
          stepSize: 1
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6
      }
    }
  }), []);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Reset active tab for interns if they somehow get to departmentAttendance
  useEffect(() => {
    if (currentUser && currentUser.role === 'intern' && activeTab === 'departmentAttendance') {
      setActiveTab('myAttendance');
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (currentUser) {
      checkTodayAttendance();
      // Set work mode from user profile
      setCheckInForm(prev => ({
        ...prev,
        workMode: currentUser.workMode || 'remote'
      }));
      
      // If user is in-house worker, automatically get location
      if (currentUser.workMode === 'in-house') {
        getLocationForInHouseWorker();
      }
    }
  }, [currentUser]);

  const getLocationForInHouseWorker = async () => {
    if (!currentUser || currentUser.workMode !== 'in-house') return;
    
    setLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      setCheckInForm(prev => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: 'Office Location'
      }));
      console.log('Location obtained for in-house worker:', location);
    } catch (error: any) {
      console.error('Failed to get location:', error);
      errorToast('Location access required for in-house workers. Please enable location services.');
    } finally {
      setLocationLoading(false);
    }
  };

  // Auto-checkout check - runs every minute to check if it's 6 PM
  useEffect(() => {
    const checkAutoCheckout = async () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Check if it's 6:00 PM
      if (currentHour === 18 && currentMinute === 0) {
        try {
          // Trigger the API to check for auto-checkout
          await attendanceAPI.getAll(); // This will trigger the auto-checkout check in the loader
          // Refresh data after potential auto-checkout
          loadInitialData();
          checkTodayAttendance();
        } catch (error) {
          console.error('Auto-checkout check failed:', error);
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkAutoCheckout, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Update current time every second
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Starting to load initial data...');
      
      // Load current user first (critical path)
      const currentUserResponse = await userAPI.getCurrentUser();

      if (currentUserResponse.success && currentUserResponse.user) {
        setCurrentUser(currentUserResponse.user);
        console.log('✅ Current user loaded');
      } else {
        console.error('❌ Failed to get current user:', currentUserResponse);
      }

      // Load other data in parallel for better performance
      const [attendanceResponse, usersResponse, departmentsResponse] = await Promise.all([
        attendanceAPI.getAll(),
        userAPI.getAll(),
        departmentAPI.getAll()
      ]);

      // Process responses efficiently
      if (attendanceResponse.success && attendanceResponse.attendance) {
        setAttendanceRecords(attendanceResponse.attendance);
        calculateStats(attendanceResponse.attendance);
        console.log('📊 Attendance data loaded:', attendanceResponse.attendance.length, 'records');
      }

      if (usersResponse.success && usersResponse.users) {
        setUsers(usersResponse.users);
        console.log('👥 Users loaded:', usersResponse.users.length, 'users');
      }

      if (departmentsResponse.success && departmentsResponse.departments) {
        setDepartments(departmentsResponse.departments);
        console.log('🏢 Departments loaded:', departmentsResponse.departments.length, 'departments');
      }
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      errorToast('Failed to load attendance data');
    } finally {
      setLoading(false);
      console.log('✅ Initial data loading completed');
    }
  };

  const calculateStats = (records: AttendanceRecord[]) => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter(record => 
      new Date(record.date).toISOString().split('T')[0] === today
    );

    const remoteToday = todayRecords.filter(record => record.workMode === 'remote').length;
    const inHouseToday = todayRecords.filter(record => record.workMode === 'in-house').length;
    
    const totalWorkHours = records
      .filter(record => record.workHours && record.workHours > 0)
      .reduce((sum, record) => sum + (record.workHours || 0), 0);
    
    const recordsWithHours = records.filter(record => record.workHours && record.workHours > 0).length;
    const avgWorkHours = recordsWithHours > 0 ? totalWorkHours / recordsWithHours : 0;

    setStats({
      totalRecords: records.length,
      presentToday: todayRecords.length,
      remoteWorkers: remoteToday,
      inHouseWorkers: inHouseToday,
      avgWorkHours: parseFloat(avgWorkHours.toFixed(2))
    });

    // Prepare chart data
    prepareChartData(records);
  };

  // Memoized chart data preparation for better performance
  const prepareChartData = useCallback((records: AttendanceRecord[]) => {
    // Get last 7 days
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push(date);
    }

    // Group records by date with optimized filtering
    const recordsByDate = new Map<string, AttendanceRecord[]>();
    records.forEach(record => {
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      if (!recordsByDate.has(recordDate)) {
        recordsByDate.set(recordDate, []);
      }
      recordsByDate.get(recordDate)!.push(record);
    });

    const dailyStats = last7Days.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayRecords = recordsByDate.get(dateStr) || [];

      const remoteCount = dayRecords.filter(r => r.workMode === 'remote').length;
      const inHouseCount = dayRecords.filter(r => r.workMode === 'in-house').length;
      const totalHours = dayRecords.reduce((sum, r) => sum + (r.workHours || 0), 0);
      const avgHours = dayRecords.length > 0 ? totalHours / dayRecords.length : 0;

      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: dayRecords.length,
        remote: remoteCount,
        inHouse: inHouseCount,
        avgHours: Math.round(avgHours * 10) / 10
      };
    });

    const chartData = {
      labels: dailyStats.map(day => day.date),
      datasets: [
        {
          label: 'Total Attendance',
          data: dailyStats.map(day => day.total),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Remote Workers',
          data: dailyStats.map(day => day.remote),
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          fill: false,
          tension: 0.4,
        },
        {
          label: 'In-House Workers',
          data: dailyStats.map(day => day.inHouse),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: false,
          tension: 0.4,
        }
      ]
    };

    setChartData(chartData);
  }, []);

  const checkTodayAttendance = async () => {
    if (!currentUser) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await attendanceAPI.getUserAttendance(currentUser._id, today, today);
      
      if (response.success && response.attendance && response.attendance.length > 0) {
        setUserCheckedInToday(true);
        setTodayAttendance(response.attendance[0]);
      } else {
        setUserCheckedInToday(false);
        setTodayAttendance(null);
      }
    } catch (error) {
      console.error('Error checking today attendance:', error);
    }
  };

  const getCurrentLocation = (): Promise<{latitude: number, longitude: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(new Error(`Location error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  const handleCheckIn = async () => {
    if (!currentUser) {
      errorToast('User not found');
      return;
    }

    setCheckingIn(true);
    try {
      // For in-house workers, ensure location is available
      if (checkInForm.workMode === 'in-house' && (!checkInForm.latitude || !checkInForm.longitude)) {
        errorToast('Location is required for in-house workers. Please enable location services and try again.');
        setCheckingIn(false);
        return;
      }

      let locationData = {
        latitude: checkInForm.latitude,
        longitude: checkInForm.longitude,
        locationName: checkInForm.locationName
      };

      const checkInData: CheckInData = {
        userId: currentUser._id,
        departmentId: typeof currentUser.department === 'object' ? currentUser.department._id : currentUser.department,
        notes: checkInForm.notes,
        workMode: checkInForm.workMode,
        ...locationData
      };

      const response = await attendanceAPI.checkIn(checkInData);
      
      if (response.success) {
        successToast(response.message || 'Check-in successful');
        setUserCheckedInToday(true);
        setCheckInForm({ ...checkInForm, notes: '' });
        loadInitialData(); // Refresh data
        checkTodayAttendance();
      } else {
        errorToast(response.message || response.error || 'Check-in failed');
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      errorToast('Check-in failed. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayAttendance) {
      errorToast('No check-in record found for today');
      return;
    }

    try {
      const response = await attendanceAPI.checkOut({ attendanceId: todayAttendance._id });
      
      if (response.success) {
        successToast(response.message || 'Check-out successful');
        loadInitialData(); // Refresh data
        checkTodayAttendance();
      } else {
        errorToast(response.message || response.error || 'Check-out failed');
      }
    } catch (error: any) {
      console.error('Check-out error:', error);
      errorToast('Check-out failed. Please try again.');
    }
  };

  const handleTableCheckOut = async (attendanceId: string) => {
    try {
      const response = await attendanceAPI.checkOut({ attendanceId });
      
      if (response.success) {
        successToast(response.message || 'Check-out successful');
        loadInitialData(); // Refresh data
        checkTodayAttendance();
      } else {
        errorToast(response.message || response.error || 'Check-out failed');
      }
    } catch (error: any) {
      console.error('Check-out error:', error);
      errorToast('Check-out failed. Please try again.');
    }
  };

  const handleDeleteAttendance = async (attendanceId: string) => {
    if (!confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await attendanceAPI.delete(attendanceId);
      
      if (response.success) {
        successToast('Attendance record deleted successfully');
        loadInitialData(); // Refresh data
        checkTodayAttendance();
      } else {
        errorToast(response.message || response.error || 'Failed to delete attendance record');
      }
    } catch (error: any) {
      console.error('Delete attendance error:', error);
      errorToast('Failed to delete attendance record. Please try again.');
    }
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      console.log('🔍 Generating report with params:', {
        startDate: reportForm.startDate,
        endDate: reportForm.endDate,
        departmentId: reportForm.departmentId || 'All departments',
        userRole: currentUser?.role
      });
      
      const response = await attendanceAPI.getAttendanceReport(
        reportForm.startDate,
        reportForm.endDate,
        reportForm.departmentId || undefined
      );
      
      console.log('📊 Report API response:', response);
      
      if (response.success && response.attendance) {
        let filteredData = response.attendance;
        
        // Filter for interns to only show their own data
        if (currentUser && currentUser.role === 'intern') {
          filteredData = response.attendance.filter(record => {
            const recordUserId = typeof record.user === 'string' 
              ? record.user 
              : (record.user as any)?._id || record.user;
            return recordUserId.toString() === currentUser._id.toString();
          });
          console.log('🔒 Filtered data for intern:', filteredData.length, 'records');
        }
        
        setReportData(filteredData);
        successToast(`📊 Report generated successfully with ${filteredData.length} records`);
        console.log('✅ Report data:', filteredData);
      } else {
        setReportData([]);
        console.log('❌ Report failed:', response);
        errorToast(response.message || response.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('❌ Report generation error:', error);
      setReportData([]);
      errorToast('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleUpdateWorkMode = async () => {
    if (!workModeForm.selectedUserId) {
      errorToast('Please select a user');
      return;
    }

    setUpdatingWorkMode(true);
    try {
      console.log('🔄 Updating work mode...');
      console.log('👤 User ID:', workModeForm.selectedUserId);
      console.log('🏢 New work mode:', workModeForm.newWorkMode);
      
      const response = await attendanceAPI.updateWorkMode(
        workModeForm.selectedUserId,
        workModeForm.newWorkMode
      );

      console.log('📊 Update response:', response);

      if (response.success) {
        // Update the users list to reflect the change
        setUsers(prev => prev.map(user => 
          user._id === workModeForm.selectedUserId 
            ? { ...user, workMode: workModeForm.newWorkMode }
            : user
        ));
        
        // Also update current user if they updated their own work mode
        if (currentUser && currentUser._id === workModeForm.selectedUserId) {
          setCurrentUser(prev => prev ? { ...prev, workMode: workModeForm.newWorkMode } : prev);
        }
        
        // Reset form
        setWorkModeForm({
          selectedUserId: '',
          newWorkMode: 'in-house'
        });
        
        successToast(response.message || 'Work mode updated successfully');
        console.log('✅ Work mode updated successfully');
      } else {
        console.log('❌ Work mode update failed:', response.error);
        errorToast(response.error || 'Failed to update work mode');
      }
    } catch (error) {
      console.error('❌ Error updating work mode:', error);
      errorToast('Failed to update work mode');
    } finally {
      setUpdatingWorkMode(false);
    }
  };

  // Table columns for attendance records
  const attendanceColumns: Column<AttendanceRecord>[] = [
    {
      key: 'userName',
      title: 'Employee',
      sortable: true,
      searchable: true,
      render: (value: string, record: AttendanceRecord) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            {value || 'Unknown User'}
          </span>
        </div>
      )
    },
    {
      key: 'date',
      title: 'Date',
      sortable: true,
      searchable: false,
      render: (value: string) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {new Date(value).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'checkInTime',
      title: 'Check In',
      sortable: true,
      searchable: false,
      render: (value: string) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {new Date(value).toLocaleTimeString()}
        </span>
      )
    },
    {
      key: 'checkOutTime',
      title: 'Check Out',
      sortable: true,
      searchable: false,
      render: (value: string) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {value ? new Date(value).toLocaleTimeString() : 'Not checked out'}
        </span>
      )
    },
    {
      key: 'workHours',
      title: 'Work Hours',
      sortable: true,
      searchable: false,
      render: (value: number) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {value ? `${value}h` : '-'}
        </span>
      )
    },
    {
      key: 'workMode',
      title: 'Work Mode',
      sortable: true,
      searchable: true,
      render: (value: string) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          value === 'in-house' 
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
        }`}>
          {value === 'in-house' ? 'In-House' : 'Remote'}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      searchable: false,
      render: (value: any, record: AttendanceRecord) => {
        // Handle both string ID and populated user object
        const recordUserId = typeof record.user === 'string' 
          ? record.user 
          : (record.user as any)?._id || record.user;
        
        // Show checkout button only for the current user's records that haven't been checked out
        const isCurrentUserRecord = currentUser && currentUser._id && record.user && recordUserId.toString() === currentUser._id.toString();
        const hasNotCheckedOut = !record.checkOutTime;
        const canDelete = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');
  const canViewAttendance = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'department_head' || currentUser.role === 'staff' || currentUser.role === 'intern');
        
        // Debug logging
        if (currentUser && record.user) {
          console.log('Actions debug for record', record._id, ':', {
            recordUser: recordUserId.toString(),
            currentUserId: currentUser._id.toString(),
            isCurrentUserRecord,
            hasNotCheckedOut,
            canDelete
          });
        }
        
        return (
          <div className="flex items-center gap-2">
            {isCurrentUserRecord && hasNotCheckedOut && (
              <Button
                size="sm"
                color="secondary"
                variant="flat"
                onPress={() => handleTableCheckOut(record._id)}
                startContent={<Clock size={14} />}
              >
                Check Out
              </Button>
            )}
            
            {canDelete && (
              <Button
                size="sm"
                color="danger"
                variant="flat"
                onPress={() => handleDeleteAttendance(record._id)}
                startContent={<Trash2 size={14} />}
              >
                Delete
              </Button>
            )}
            
            {!isCurrentUserRecord && !canDelete && (
              <span className="text-xs text-gray-400">
                {record.checkOutTime ? 'Completed' : 'N/A'}
              </span>
            )}
          </div>
        );
      }
    }
  ];

  // Memoized current user attendance filtering for better performance
  const currentUserAttendance = useMemo(() => {
    if (!currentUser || !currentUser._id) return [];
    
    return attendanceRecords.filter(record => {
      if (!record.user) return false;
      
      // Handle both string ID and populated user object
      const recordUserId = typeof record.user === 'string' 
        ? record.user 
        : (record.user as any)._id || record.user;
      
      return recordUserId.toString() === currentUser._id.toString();
    });
  }, [attendanceRecords, currentUser]);

  // Helper function to check if check-in is currently allowed
  const isCheckInAllowed = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentHour = now.getHours();
    
    // Weekend check - no attendance on weekends
    if (currentDay === 0 || currentDay === 6) {
      return { allowed: false, reason: "Attendance not allowed on weekends" };
    }
    
    // Not allowed outside 7 AM - 5 PM
    if (currentHour < 7 || currentHour >= 17) {
      return { allowed: false, reason: "Outside check-in hours (7 AM - 5 PM)" };
    }
    
    return { allowed: true, reason: "Check-in available" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Clock className="w-8 h-8 mr-3 text-green-600" />
            Attendance Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and manage attendance records
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Records</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalRecords}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Present Today</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.presentToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Remote Workers</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.remoteWorkers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In-House Workers</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.inHouseWorkers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Controls - Only show for admin and manager */}
      {currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Admin Controls
          </h3>
          
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">
              Manage Work Modes
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select User
                </label>
                <select
                  value={workModeForm.selectedUserId}
                  onChange={(e) => setWorkModeForm({...workModeForm, selectedUserId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a user</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.firstName} {user.lastName} ({user.workMode})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Work Mode
                </label>
                <select
                  value={workModeForm.newWorkMode}
                  onChange={(e) => setWorkModeForm({...workModeForm, newWorkMode: e.target.value as 'in-house' | 'remote'})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="in-house">In-House</option>
                  <option value="remote">Remote</option>
                </select>
              </div>
              
              <div>
                <Button
                  color="primary"
                  onPress={handleUpdateWorkMode}
                  isLoading={updatingWorkMode}
                  isDisabled={!workModeForm.selectedUserId}
                  className="w-full"
                >
                  Update Work Mode
                </Button>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Update user work modes to change their attendance requirements. In-house workers need location access, remote workers can check in from anywhere.
            </p>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attendance Statistics Overview Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Attendance Trends (Last 7 Days)
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Avg work hours: {stats.avgWorkHours}h
              </div>
            </div>
            
            <div className="h-80">
              {chartData ? (
                <Line
                  data={chartData}
                  options={chartOptions}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  {/* Loading skeleton for better UX */}
                  <div className="w-full h-full animate-pulse">
                    <div className="flex items-end justify-between h-full space-x-2 px-4 pb-4">
                      {[...Array(7)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center space-y-2 flex-1">
                          <div 
                            className="w-full bg-gray-300 dark:bg-gray-600 rounded-t"
                            style={{ height: `${Math.random() * 60 + 40}%` }}
                          ></div>
                          <div className="w-8 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Chart Legend/Summary */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-gray-600 dark:text-gray-400">Total</span>
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {stats.presentToday} today
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                    <span className="text-gray-600 dark:text-gray-400">Remote</span>
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {stats.remoteWorkers} today
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-gray-600 dark:text-gray-400">In-House</span>
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {stats.inHouseWorkers} today
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('myAttendance')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'myAttendance'
                      ? 'border-green-500 text-green-600 dark:text-green-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Clock className="w-4 h-4 inline mr-2" />
                  My Attendance
                </button>
                
                {/* Hide department attendance for interns */}
                {currentUser && currentUser.role !== 'intern' && (
                  <button
                    onClick={() => setActiveTab('departmentAttendance')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'departmentAttendance'
                        ? 'border-green-500 text-green-600 dark:text-green-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Users className="w-4 h-4 inline mr-2" />
                    {currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager') 
                      ? 'All Attendance' 
                      : 'Department Attendance'}
                  </button>
                )}
                
                <button
                  onClick={() => setActiveTab('attendanceReport')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'attendanceReport'
                      ? 'border-green-500 text-green-600 dark:text-green-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  {currentUser && currentUser.role === 'intern' ? 'My Report' : 'Attendance Report'}
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'myAttendance' && (
                <div>
                  <p className="text-blue-600 dark:text-blue-400 mb-4 text-sm">
                    Note: You are viewing your personal attendance records.
                  </p>
                  <DataTable
                    data={currentUserAttendance}
                    columns={attendanceColumns}
                    loading={loading}
                    pageSize={10}
                    searchPlaceholder="Search your attendance..."
                    emptyText="No attendance records found"
                  />
                </div>
              )}

              {activeTab === 'departmentAttendance' && (
                <div>
                  {currentUser && currentUser.role === 'intern' ? (
                    <div className="text-center py-8">
                      <p className="text-red-600 dark:text-red-400 mb-4 text-sm">
                        Access Denied: Interns can only view their own attendance records.
                      </p>
                      <button
                        onClick={() => setActiveTab('myAttendance')}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Go to My Attendance
                      </button>
                    </div>
                  ) : (
                    <>
                      {currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
                        <p className="text-blue-600 dark:text-blue-400 mb-4 text-sm">
                          Note: As an {currentUser.role}, you can view all attendance records across all departments.
                        </p>
                      )}
                      {currentUser && currentUser.role === 'department_head' && (
                        <p className="text-blue-600 dark:text-blue-400 mb-4 text-sm">
                          Note: As a department head, you can view attendance records from your department.
                        </p>
                      )}
                      {currentUser && currentUser.role === 'staff' && (
                        <p className="text-orange-600 dark:text-orange-400 mb-4 text-sm">
                          Note: Staff members can only view their own attendance records. Switch to "My Attendance" tab.
                        </p>
                      )}
                      <DataTable
                        data={attendanceRecords}
                        columns={attendanceColumns}
                        loading={loading}
                        pageSize={10}
                        searchPlaceholder="Search attendance records..."
                        emptyText="No attendance records found"
                      />
                    </>
                  )}
                </div>
              )}

              {activeTab === 'attendanceReport' && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                    {currentUser && currentUser.role === 'intern' ? 'Generate My Personal Report' : 'Generate Report'}
                  </h4>
                  
                  {currentUser && currentUser.role === 'intern' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                      <p className="text-blue-800 dark:text-blue-200 text-sm">
                        <strong>Note:</strong> As an intern, you can only generate reports for your own attendance records.
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={reportForm.startDate}
                        onChange={(e) => setReportForm({...reportForm, startDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={reportForm.endDate}
                        onChange={(e) => setReportForm({...reportForm, endDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Hide department filter for interns */}
                  {currentUser && currentUser.role !== 'intern' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Department (Optional)
                      </label>
                      <select
                        value={reportForm.departmentId}
                        onChange={(e) => setReportForm({...reportForm, departmentId: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                          <option key={dept._id} value={dept._id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      color="primary"
                      onPress={generateReport}
                      isLoading={generatingReport}
                      startContent={<Download size={16} />}
                    >
                      Generate Report
                    </Button>
                    <Button
                      variant="flat"
                      onPress={() => setReportForm({
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: new Date().toISOString().split('T')[0],
                        departmentId: ''
                      })}
                    >
                      Clear
                    </Button>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    {currentUser && currentUser.role === 'intern' 
                      ? 'Select date range to generate your personal attendance report.'
                      : 'Select date range and department to generate a report.'}
                  </p>

                  {/* Report Results Table */}
                  {reportData.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-md font-medium text-gray-900 dark:text-white">
                          Report Results ({reportData.length} records)
                        </h5>
                        <Button
                          size="sm"
                          variant="flat"
                          startContent={<Download size={14} />}
                          onPress={() => {
                            // In a real implementation, you would export to CSV/Excel
                            const dataStr = JSON.stringify(reportData, null, 2);
                            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                            const exportFileDefaultName = `attendance-report-${reportForm.startDate}-to-${reportForm.endDate}.json`;
                            const linkElement = document.createElement('a');
                            linkElement.setAttribute('href', dataUri);
                            linkElement.setAttribute('download', exportFileDefaultName);
                            linkElement.click();
                          }}
                        >
                          Export Data
                        </Button>
                      </div>
                      <DataTable
                        data={reportData}
                        columns={attendanceColumns}
                        loading={false}
                        pageSize={15}
                        searchPlaceholder="Search report data..."
                        emptyText="No data in report"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - 1/3 width */}
        <div className="space-y-6">
          {/* Check In Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {/* Current Time and Status */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Current Time
                  </p>
                  <p className="text-lg font-mono text-blue-600 dark:text-blue-400">
                    {currentTime.toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Status
                  </p>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isCheckInAllowed().allowed
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {isCheckInAllowed().allowed ? '✅ Available' : '❌ Unavailable'}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {isCheckInAllowed().reason}
                  </p>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {userCheckedInToday ? 'Check Out' : 'Check In'}
            </h3>

            {!userCheckedInToday ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={checkInForm.notes}
                    onChange={(e) => setCheckInForm({...checkInForm, notes: e.target.value})}
                    placeholder="Any notes for today?"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Work Mode
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white">
                    {checkInForm.workMode === 'in-house' ? 'In-House' : 'Remote'}
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (Set in your profile - read only)
                    </span>
                  </div>
                  
                  {checkInForm.workMode === 'in-house' && (
                    <div className="mt-2 flex items-center text-xs">
                      {locationLoading ? (
                        <span className="text-blue-500">📍 Getting location...</span>
                      ) : checkInForm.latitude && checkInForm.longitude ? (
                        <span className="text-green-500">📍 Location ready</span>
                      ) : (
                        <button
                          type="button"
                          onClick={getLocationForInHouseWorker}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          📍 Get location
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-blue-500" />
                    Attendance Rules & Guidelines
                  </h4>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">📅</span>
                      <span>Attendance cannot be taken on weekends (Saturday/Sunday)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">⏰</span>
                      <span>Check-in is only allowed between 7:00 AM and 5:00 PM</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✅</span>
                      <span>You can check out anytime after check-in</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2">🕕</span>
                      <span>System will automatically check you out at 6:00 PM if not done</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">📍</span>
                      <span>In-house workers must be within 100m of office location</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">🏠</span>
                      <span>Remote workers can check in from anywhere</span>
                    </li>
                  </ul>
                </div>

                <Button
                  color="primary"
                  onPress={handleCheckIn}
                  isLoading={checkingIn}
                  className="w-full"
                  startContent={<CheckCircle size={16} />}
                  isDisabled={!isCheckInAllowed().allowed}
                >
                  {isCheckInAllowed().allowed ? 'Check In' : 'Check In Unavailable'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      You're checked in for today!
                    </span>
                  </div>
                  {todayAttendance && (
                    <div className="mt-2 text-xs text-green-700 dark:text-green-300">
                      <p>Check-in: {new Date(todayAttendance.checkInTime).toLocaleTimeString()}</p>
                      <p>Mode: {todayAttendance.workMode === 'in-house' ? 'In-House' : 'Remote'}</p>
                      {todayAttendance.checkOutTime && (
                        <p>Check-out: {new Date(todayAttendance.checkOutTime).toLocaleTimeString()}</p>
                      )}
                    </div>
                  )}
                </div>

                {todayAttendance && !todayAttendance.checkOutTime && (
                  <Button
                    color="secondary"
                    onPress={handleCheckOut}
                    className="w-full"
                    startContent={<Clock size={16} />}
                  >
                    Check Out
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}