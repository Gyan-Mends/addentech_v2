import { useState, useEffect } from "react";
import { Clock, Calendar, Users, TrendingUp, CheckCircle, UserCheck, MapPin, FileText, Download } from "lucide-react";
import { Button, useDisclosure } from "@heroui/react";
import { successToast, errorToast } from "~/components/toast";
import { attendanceAPI, userAPI, departmentAPI, type AttendanceRecord, type CheckInData } from "~/services/api";
import DataTable, { type Column } from "~/components/DataTable";

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
  department: string;
  workMode: 'in-house' | 'remote';
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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      checkTodayAttendance();
    }
  }, [currentUser]);

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
      // Load attendance records, users, and departments in parallel
      const [attendanceResponse, usersResponse, departmentsResponse] = await Promise.all([
        attendanceAPI.getAll(),
        userAPI.getAll(),
        departmentAPI.getAll()
      ]);

      if (attendanceResponse.success && attendanceResponse.attendance) {
        setAttendanceRecords(attendanceResponse.attendance);
        calculateStats(attendanceResponse.attendance);
      }

      if (usersResponse.success && usersResponse.users) {
        setUsers(usersResponse.users);
        // Set current user (in a real app, this would come from auth context)
        setCurrentUser(usersResponse.users[0]); // For demo, using first user
      }

      if (departmentsResponse.success && departmentsResponse.departments) {
        setDepartments(departmentsResponse.departments);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      errorToast('Failed to load attendance data');
    } finally {
      setLoading(false);
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
  };

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
      let locationData = {
        latitude: checkInForm.latitude,
        longitude: checkInForm.longitude,
        locationName: checkInForm.locationName
      };

      // Get location for in-house workers
      if (checkInForm.workMode === 'in-house') {
        try {
          const location = await getCurrentLocation();
          locationData.latitude = location.latitude;
          locationData.longitude = location.longitude;
          locationData.locationName = 'Office Location';
        } catch (error: any) {
          errorToast(error.message || 'Failed to get location');
          setCheckingIn(false);
          return;
        }
      }

      const checkInData: CheckInData = {
        userId: currentUser._id,
        departmentId: currentUser.department,
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

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const response = await attendanceAPI.getAttendanceReport(
        reportForm.startDate,
        reportForm.endDate,
        reportForm.departmentId || undefined
      );
      
      if (response.success && response.attendance) {
        // In a real implementation, you would generate and download a file
        successToast(`📊 Report generated successfully with ${response.attendance.length} records`);
        console.log('Report data:', response.attendance);
      } else {
        errorToast(response.message || response.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Report generation error:', error);
      errorToast('Failed to generate report');
    } finally {
      setGeneratingReport(false);
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
    }
  ];

  const currentUserAttendance = attendanceRecords.filter(record => 
    currentUser && record.user === currentUser._id
  );

  // Helper function to check if check-in is currently allowed
  const isCheckInAllowed = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentHour = now.getHours();
    
    // Not allowed on weekends
    if (currentDay === 0 || currentDay === 6) {
      return { allowed: false, reason: "Weekends not allowed" };
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attendance Statistics Overview Chart Placeholder */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Attendance Statistics Overview
            </h3>
            <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">Chart visualization would go here</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Average work hours: {stats.avgWorkHours}h</p>
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
                <button
                  onClick={() => setActiveTab('departmentAttendance')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'departmentAttendance'
                      ? 'border-green-500 text-green-600 dark:text-green-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Department Attendance
                </button>
                <button
                  onClick={() => setActiveTab('attendanceReport')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'attendanceReport'
                      ? 'border-green-500 text-green-600 dark:text-green-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Attendance Report
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
                <DataTable
                  data={attendanceRecords}
                  columns={attendanceColumns}
                  loading={loading}
                  pageSize={10}
                  searchPlaceholder="Search attendance records..."
                  emptyText="No attendance records found"
                />
              )}

              {activeTab === 'attendanceReport' && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">Generate Report</h4>
                  
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
                    Select date range and department to generate a report.
                  </p>
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
                  <select
                    value={checkInForm.workMode}
                    onChange={(e) => setCheckInForm({...checkInForm, workMode: e.target.value as 'in-house' | 'remote'})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="remote">Remote</option>
                    <option value="in-house">In-House</option>
                  </select>
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