import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Users, Filter } from "lucide-react";
import { Button } from "@heroui/react";
import { errorToast } from "~/components/toast";

interface Leave {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    image?: string;
    position: string;
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  department: {
    _id: string;
    name: string;
  };
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  leaves: Leave[];
}

const TeamCalendar = () => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('approved');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  // Load leaves on component mount and when filters change
  useEffect(() => {
    loadLeaves();
  }, [filterStatus, filterDepartment, currentDate]);

  // Generate calendar days when leaves or current date changes
  useEffect(() => {
    generateCalendarDays();
  }, [leaves, currentDate]);

  // Load leaves from API
  const loadLeaves = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterDepartment !== 'all') params.append('department', filterDepartment);
      
      // Get leaves for current month and adjacent months
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
      params.append('startDate', startOfMonth.toISOString().split('T')[0]);
      params.append('endDate', endOfMonth.toISOString().split('T')[0]);

      const response = await fetch(`/api/leaves?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setLeaves(data.data || []);
      } else {
        errorToast('Failed to load leaves: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading leaves:', error);
      errorToast('Failed to load leaves. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const days: CalendarDay[] = [];
    const today = new Date();
    
    // Add days from previous month
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonth.getDate() - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        leaves: getLeavesForDate(date)
      });
    }
    
    // Add days from current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
        leaves: getLeavesForDate(date)
      });
    }
    
    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        leaves: getLeavesForDate(date)
      });
    }
    
    setCalendarDays(days);
  };

  // Get leaves for a specific date
  const getLeavesForDate = (date: Date): Leave[] => {
    return leaves.filter(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      return date >= startDate && date <= endDate;
    });
  };

  // Check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle day click
  const handleDayClick = (day: CalendarDay) => {
    setSelectedDate(day.date);
  };

  // Get leave type color
  const getLeaveTypeColor = (leaveType: string): string => {
    const colors: Record<string, string> = {
      'Annual Leave': 'bg-blue-500',
      'Sick Leave': 'bg-red-500',
      'Maternity Leave': 'bg-purple-500',
      'Paternity Leave': 'bg-green-500',
      'Emergency Leave': 'bg-orange-500',
      'Bereavement Leave': 'bg-gray-500',
    };
    return colors[leaveType] || 'bg-blue-500';
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'pending': 'border-yellow-400',
      'approved': 'border-green-400',
      'rejected': 'border-red-400',
      'cancelled': 'border-gray-400'
    };
    return colors[status] || 'border-blue-400';
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Calendar className="w-8 h-8 mr-3 text-indigo-600" />
            Team Calendar
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View team leave schedules and availability
          </p>
        </div>
        
        {/* Calendar Navigation */}
        <div className="flex items-center space-x-4">
          <Button variant="flat" onPress={goToToday}>
            Today
          </Button>
          <div className="flex items-center space-x-2">
            <Button
              variant="flat"
              isIconOnly
              onPress={goToPreviousMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button
              variant="flat"
              isIconOnly
              onPress={goToNextMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Departments</option>
            {/* Add department options dynamically */}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {dayNames.map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-[100px] p-2 border border-gray-100 dark:border-gray-700 cursor-pointer
                    hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                    ${!day.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900' : ''}
                    ${day.isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''}
                    ${selectedDate && isSameDay(day.date, selectedDate) ? 'ring-2 ring-blue-500' : ''}
                  `}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    !day.isCurrentMonth ? 'text-gray-400' : 
                    day.isToday ? 'text-blue-600 dark:text-blue-400' : 
                    'text-gray-900 dark:text-white'
                  }`}>
                    {day.date.getDate()}
                  </div>
                  
                  {/* Leave indicators */}
                  <div className="space-y-1">
                    {day.leaves.slice(0, 3).map((leave, leaveIndex) => (
                      <div
                        key={leaveIndex}
                        className={`
                          text-xs px-1 py-0.5 rounded text-white truncate
                          ${getLeaveTypeColor(leave.leaveType)}
                          border-l-2 ${getStatusColor(leave.status)}
                        `}
                        title={`${leave.employee.firstName} ${leave.employee.lastName} - ${leave.leaveType} (${leave.status})`}
                      >
                        {leave.employee.firstName.charAt(0)}{leave.employee.lastName.charAt(0)} - {leave.leaveType.split(' ')[0]}
                      </div>
                    ))}
                    {day.leaves.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +{day.leaves.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Legend */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Leave Types
            </h3>
            <div className="space-y-2">
              {[
                { type: 'Annual Leave', color: 'bg-blue-500' },
                { type: 'Sick Leave', color: 'bg-red-500' },
                { type: 'Maternity Leave', color: 'bg-purple-500' },
                { type: 'Paternity Leave', color: 'bg-green-500' },
                { type: 'Emergency Leave', color: 'bg-orange-500' },
                { type: 'Bereavement Leave', color: 'bg-gray-500' }
              ].map((item) => (
                <div key={item.type} className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded ${item.color}`}></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.type}</span>
                </div>
              ))}
            </div>

            <h4 className="text-md font-semibold text-gray-900 dark:text-white mt-6 mb-3">
              Status
            </h4>
            <div className="space-y-2">
              {[
                { status: 'Approved', color: 'border-green-400' },
                { status: 'Pending', color: 'border-yellow-400' },
                { status: 'Rejected', color: 'border-red-400' }
              ].map((item) => (
                <div key={item.status} className="flex items-center space-x-2">
                  <div className={`w-3 h-3 border-l-2 ${item.color} bg-gray-200 dark:bg-gray-600`}></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Date Details */}
          {selectedDate && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              
              {(() => {
                const dayLeaves = getLeavesForDate(selectedDate);
                return dayLeaves.length > 0 ? (
                  <div className="space-y-3">
                    {dayLeaves.map((leave) => (
                      <div key={leave._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                            {leave.employee.image ? (
                              <img 
                                src={leave.employee.image} 
                                alt={`${leave.employee.firstName} ${leave.employee.lastName}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {leave.employee.firstName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {leave.employee.firstName} {leave.employee.lastName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {leave.employee.position}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p><strong>Leave Type:</strong> {leave.leaveType}</p>
                          <p><strong>Duration:</strong> {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</p>
                          <p><strong>Total Days:</strong> {leave.totalDays}</p>
                          <p><strong>Status:</strong> 
                            <span className={`ml-1 px-2 py-1 text-xs font-medium rounded-full ${
                              leave.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              leave.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {leave.status.toUpperCase()}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No leaves scheduled for this date
                  </p>
                );
              })()}
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              This Month
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Leaves:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {leaves.filter(leave => {
                    const leaveDate = new Date(leave.startDate);
                    return leaveDate.getMonth() === currentDate.getMonth() && 
                           leaveDate.getFullYear() === currentDate.getFullYear();
                  }).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Approved:</span>
                <span className="text-sm font-medium text-green-600">
                  {leaves.filter(leave => {
                    const leaveDate = new Date(leave.startDate);
                    return leave.status === 'approved' &&
                           leaveDate.getMonth() === currentDate.getMonth() && 
                           leaveDate.getFullYear() === currentDate.getFullYear();
                  }).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Pending:</span>
                <span className="text-sm font-medium text-yellow-600">
                  {leaves.filter(leave => {
                    const leaveDate = new Date(leave.startDate);
                    return leave.status === 'pending' &&
                           leaveDate.getMonth() === currentDate.getMonth() && 
                           leaveDate.getFullYear() === currentDate.getFullYear();
                  }).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamCalendar; 
