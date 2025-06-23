import type { LoaderFunctionArgs } from "react-router";
import Attendance from '~/model/attendance';
import Task from '~/model/task';
import Registration from '~/model/registration';
import Department from '~/model/department';
import MonthlyReport from '~/model/monthlyReport';
import LeaveBalance from '~/model/leaveBalance';
import { getSession } from "~/session";

// Helper function to create JSON responses
const json = (data: any, init?: ResponseInit) => {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
};

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Check authentication
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (!email) {
      return json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get current user with role information
    const currentUser = await Registration.findOne({ 
      email: email.toLowerCase().trim(),
      status: "active"
    }).populate('department', 'name');

    if (!currentUser) {
      return json(
        { success: false, error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || '7d'; // 7d, 30d, 12m

    // Calculate date ranges
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate: Date;
    switch (timeframe) {
      case '30d':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
      case '12m':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default: // 7d
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    }

    // Build role-based filters
    const userRole = currentUser.role;
    const userDepartmentId = currentUser.department._id;

    // Try to fetch data from database, but handle errors gracefully
    let totalEmployees = 0;
    let todayAttendance: any[] = [];
    let attendanceData: any[] = [];
    let taskData: any[] = [];
    let departmentData: any[] = [];
    let monthlyReportData: any[] = [];
    let leaveData: any[] = [];

    try {
      // Build queries based on user role
      let employeeQuery: any = { status: 'active' };
      let attendanceQuery: any = {};
      let taskQuery: any = { createdAt: { $gte: startDate, $lte: now } };
      let departmentQuery: any = {};
      let reportQuery: any = { createdAt: { $gte: startDate, $lte: now } };
      let leaveQuery: any = { year: now.getFullYear() };

      // Role-based data filtering
      if (userRole === 'staff') {
        // Staff: Only their own data
        const userId = currentUser._id;
        employeeQuery = { _id: userId, status: 'active' };
        attendanceQuery = { user: userId };
        taskQuery = { 
          $and: [
            { createdAt: { $gte: startDate, $lte: now } },
            { $or: [{ assignedTo: userId }, { createdBy: userId }] }
          ]
        };
        departmentQuery = { _id: userDepartmentId };
        reportQuery = { 
          $and: [
            { createdAt: { $gte: startDate, $lte: now } },
            { createdBy: userId }
          ]
        };
        leaveQuery = { year: now.getFullYear(), employee: userId };
      } else if (userRole === 'department_head') {
        // HOD: Department-wide data
        employeeQuery = { department: userDepartmentId, status: 'active' };
        attendanceQuery = { department: userDepartmentId };
        taskQuery = { 
          createdAt: { $gte: startDate, $lte: now },
          department: userDepartmentId 
        };
        departmentQuery = { _id: userDepartmentId };
        reportQuery = { 
          createdAt: { $gte: startDate, $lte: now },
          department: userDepartmentId 
        };
        leaveQuery = { 
          year: now.getFullYear(),
          employee: { $in: await Registration.find({ department: userDepartmentId }).select('_id') }
        };
      }
      // Admin and Manager: No filtering (all data)

      // Fetch all data in parallel for performance
      const [
        empCount,
        todayAtt,
        attData,
        tData,
        deptData,
        reportData,
        lData
      ] = await Promise.all([
        // Total employees count
        Registration.countDocuments(employeeQuery).catch(() => 0),
        
        // Today's attendance
        Attendance.find({
          ...attendanceQuery,
          date: {
            $gte: startOfToday,
            $lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
          }
        }).populate('user', 'firstName lastName').populate('department', 'name').catch(() => []),
        
        // Attendance data for the timeframe
        Attendance.find({
          ...attendanceQuery,
          date: { $gte: startDate, $lte: now }
        }).populate('user', 'firstName lastName').populate('department', 'name').catch(() => []),
        
        // Task data
        Task.find(taskQuery)
          .populate('createdBy', 'firstName lastName')
          .populate('assignedTo', 'firstName lastName')
          .populate('department', 'name').catch(() => []),
        
        // Department data
        Department.find(departmentQuery).populate('admin', 'firstName lastName').catch(() => []),
        
        // Monthly report data
        MonthlyReport.find(reportQuery)
          .populate('department', 'name').populate('createdBy', 'firstName lastName').catch(() => []),
        
        // Leave balance data
        LeaveBalance.find(leaveQuery).populate('employee', 'firstName lastName').catch(() => [])
      ]);

      totalEmployees = empCount;
      todayAttendance = todayAtt;
      attendanceData = attData;
      taskData = tData;
      departmentData = deptData;
      monthlyReportData = reportData;
      leaveData = lData;

         } catch (dbError) {
       console.error('Database queries failed:', dbError);
       // Continue with empty data arrays if database fails
     }

    // Process attendance data
    const attendanceByDate = processAttendanceData(attendanceData, startDate, now);
    const todayStats = {
      present: todayAttendance.filter(a => a.status === 'present' || a.status === 'late').length,
      absent: todayAttendance.filter(a => a.status === 'absent').length,
      late: todayAttendance.filter(a => a.status === 'late').length,
      onLeave: todayAttendance.filter(a => a.status === 'on-leave').length
    };

    // Process task data
    const taskStats = processTaskData(taskData);
    const tasksByDepartment = processTasksByDepartment(taskData, departmentData);

    // Process work hours data
    const workHoursData = processWorkHoursData(attendanceData, startDate, now);

    // Process daily task completions
    const taskCompletionData = processTaskCompletionData(taskData, startDate, now);

    // Process monthly reports data
    const reportsData = processMonthlyReports(monthlyReportData);

    // Process leave data
    const leaveStats = processLeaveData(leaveData);

    // Calculate department performance
    const departmentPerformance = calculateDepartmentPerformance(taskData, departmentData);

    const dashboardData = {
      currentUser: {
        _id: currentUser._id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        role: currentUser.role,
        department: currentUser.department
      },
      summary: {
        totalEmployees,
        presentToday: todayStats.present,
        absentToday: todayStats.absent,
        lateToday: todayStats.late,
        onLeaveToday: todayStats.onLeave,
        attendanceRate: totalEmployees > 0 ? Math.round((todayStats.present / totalEmployees) * 100) : 0
      },
      tasks: {
        total: taskData.length,
        completed: taskStats.completed,
        inProgress: taskStats.inProgress,
        pending: taskStats.pending,
        onHold: taskStats.onHold,
        completionRate: taskData.length > 0 ? Math.round((taskStats.completed / taskData.length) * 100) : 0
      },
      attendance: {
        daily: attendanceByDate,
        todayBreakdown: todayStats
      },
      workHours: workHoursData,
      taskCompletions: taskCompletionData,
      departments: {
        total: departmentData.length,
        performance: departmentPerformance,
        taskDistribution: tasksByDepartment
      },
      reports: {
        monthly: reportsData,
        totalThisMonth: reportsData[reportsData.length - 1]?.reports || 0
      },
      leaves: {
        stats: leaveStats,
        totalPending: leaveStats.pending
      },
      trends: {
        attendanceTrend: calculateTrend(attendanceByDate, 'present'),
        taskCompletionTrend: calculateTaskTrend(taskData),
        workHoursTrend: calculateTrend(workHoursData, 'hours')
      }
    };

    return json({ success: true, data: dashboardData });

  } catch (error) {
    console.error('Dashboard API Error:', error);
    return json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

// Helper functions
function processAttendanceData(attendanceData: any[], startDate: Date, endDate: Date) {
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const dailyData = [];

  for (let i = 0; i < daysDiff; i++) {
    const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
    const dateStr = currentDate.toISOString().split('T')[0];
    
    const dayAttendance = attendanceData.filter(record => {
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      return recordDate === dateStr;
    });

    dailyData.push({
      date: dateStr,
      present: dayAttendance.filter(a => a.status === 'present' || a.status === 'late').length,
      absent: dayAttendance.filter(a => a.status === 'absent').length,
      late: dayAttendance.filter(a => a.status === 'late').length,
      onLeave: dayAttendance.filter(a => a.status === 'on-leave').length
    });
  }

  return dailyData;
}

function processTaskData(taskData: any[]) {
  return {
    completed: taskData.filter(t => t.status === 'completed').length,
    inProgress: taskData.filter(t => t.status === 'in_progress').length,
    pending: taskData.filter(t => t.status === 'not_started').length,
    onHold: taskData.filter(t => t.status === 'on_hold').length,
    underReview: taskData.filter(t => t.status === 'under_review').length
  };
}

function processTasksByDepartment(taskData: any[], departmentData: any[]) {
  return departmentData.map(dept => {
    const deptTasks = taskData.filter(task => 
      task.department && task.department._id.toString() === dept._id.toString()
    );
    
    return {
      department: dept.name,
      total: deptTasks.length,
      completed: deptTasks.filter(t => t.status === 'completed').length,
      inProgress: deptTasks.filter(t => t.status === 'in_progress').length,
      pending: deptTasks.filter(t => t.status === 'not_started').length
    };
  });
}

function processWorkHoursData(attendanceData: any[], startDate: Date, endDate: Date) {
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const dailyHours = [];

  for (let i = 0; i < daysDiff; i++) {
    const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
    const dateStr = currentDate.toISOString().split('T')[0];
    
    const dayAttendance = attendanceData.filter(record => {
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      return recordDate === dateStr && record.workHours > 0;
    });

    const avgHours = dayAttendance.length > 0 
      ? dayAttendance.reduce((sum, record) => sum + record.workHours, 0) / dayAttendance.length
      : 0;

    dailyHours.push({
      date: dateStr,
      hours: Math.round(avgHours * 100) / 100
    });
  }

  return dailyHours;
}

function processTaskCompletionData(taskData: any[], startDate: Date, endDate: Date) {
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const dailyCompletions = [];

  for (let i = 0; i < daysDiff; i++) {
    const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
    const dateStr = currentDate.toISOString().split('T')[0];
    
    const dayCompletions = taskData.filter(task => {
      if (task.status !== 'completed' || !task.completedDate) return false;
      const completedDate = new Date(task.completedDate).toISOString().split('T')[0];
      return completedDate === dateStr;
    });

    const dayCreations = taskData.filter(task => {
      const createdDate = new Date(task.createdAt).toISOString().split('T')[0];
      return createdDate === dateStr;
    });

    dailyCompletions.push({
      date: dateStr,
      completed: dayCompletions.length,
      created: dayCreations.length,
      activity: dayCompletions.length + dayCreations.length
    });
  }

  return dailyCompletions;
}

function processMonthlyReports(reportsData: any[]) {
  const monthlyStats: Record<string, { reports: number; revenue: number }> = {};
  
  reportsData.forEach(report => {
    const month = new Date(report.createdAt).toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
    
    if (!monthlyStats[month]) {
      monthlyStats[month] = { reports: 0, revenue: 0 };
    }
    
    monthlyStats[month].reports += 1;
    monthlyStats[month].revenue += report.amount || 0;
  });

  return Object.entries(monthlyStats).map(([month, stats]) => ({
    month,
    reports: stats.reports,
    revenue: stats.revenue
  }));
}

function processLeaveData(leaveData: any[]) {
  const totalAllocated = leaveData.reduce((sum, leave) => sum + leave.totalAllocated, 0);
  const totalUsed = leaveData.reduce((sum, leave) => sum + leave.used, 0);
  const totalPending = leaveData.reduce((sum, leave) => sum + leave.pending, 0);

  return {
    allocated: totalAllocated,
    used: totalUsed,
    pending: totalPending,
    remaining: totalAllocated - totalUsed - totalPending,
    utilizationRate: totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0
  };
}

function calculateDepartmentPerformance(taskData: any[], departmentData: any[]) {
  return departmentData.map(dept => {
    const deptTasks = taskData.filter(task => 
      task.department && task.department._id.toString() === dept._id.toString()
    );
    
    const completed = deptTasks.filter(t => t.status === 'completed').length;
    const total = deptTasks.length;
    
    return {
      department: dept.name,
      tasks: total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      efficiency: calculateEfficiencyScore(deptTasks)
    };
  });
}

function calculateEfficiencyScore(tasks: any[]) {
  if (tasks.length === 0) return 0;
  
  const completedOnTime = tasks.filter(task => {
    if (task.status !== 'completed' || !task.completedDate || !task.dueDate) return false;
    return new Date(task.completedDate) <= new Date(task.dueDate);
  }).length;
  
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  
  return completedTasks > 0 ? Math.round((completedOnTime / completedTasks) * 100) : 0;
}

function calculateTrend(data: any[], key: string) {
  if (data.length < 2) return 0;
  
  const recent = data.slice(-3).reduce((sum, item) => sum + (item[key] || 0), 0) / 3;
  const previous = data.slice(-6, -3).reduce((sum, item) => sum + (item[key] || 0), 0) / 3;
  
  if (previous === 0) return 0;
  return Math.round(((recent - previous) / previous) * 100);
}

function calculateTaskTrend(taskData: any[]) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
  
  const recentCompleted = taskData.filter(task => 
    task.status === 'completed' && 
    task.completedDate && 
    new Date(task.completedDate) >= oneWeekAgo
  ).length;
  
  const previousCompleted = taskData.filter(task => 
    task.status === 'completed' && 
    task.completedDate && 
    new Date(task.completedDate) >= twoWeeksAgo && 
    new Date(task.completedDate) < oneWeekAgo
  ).length;
  
  if (previousCompleted === 0) return recentCompleted > 0 ? 100 : 0;
  return Math.round(((recentCompleted - previousCompleted) / previousCompleted) * 100);
}

 