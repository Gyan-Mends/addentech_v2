import { type LoaderFunction } from "react-router";
import Registration from "~/model/registration";
import Department from "~/model/department";
import Task from "~/model/task";
import Attendance from "~/model/attendance";
import LeaveApplication from "~/model/leave";
import mongoose from "~/mongoose.server";
import { getSession } from "~/session";
import { corsHeaders } from "./cors.config";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return Response.json({
        success: false,
        message: "Service temporarily unavailable"
      }, {
        status: 503,
        headers: {
          ...corsHeaders,
          "Retry-After": "5"
        }
      });
    }

    // Get session for authentication
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");
    
    if (!email) {
      return Response.json({
        message: "Unauthorized - Please login",
        success: false,
        status: 401
      }, { status: 401 });
    }

    // Get current user
    const currentUser = await Registration.findOne({ email }).lean();
    if (!currentUser) {
      return Response.json({
        message: "User not found",
        success: false,
        status: 404
      }, { status: 404 });
    }

    const url = new URL(request.url);
    const operation = url.searchParams.get("operation");

    switch (operation) {
      case "stats":
        return await getStats();
      default:
        return Response.json({
          message: "Invalid operation",
          success: false,
          status: 400
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Dashboard API error:", error);
    
    return Response.json({
      success: false,
      message: "Failed to process request"
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
};

async function getStats() {
  try {
    // Get current date info
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Parallel aggregation queries for better performance
    const [
      userStats,
      departmentCount,
      taskStats,
      attendanceStats,
      leaveStats
    ] = await Promise.all([
      // User statistics
      Registration.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
            newThisMonth: { 
              $sum: { 
                $cond: [
                  { $gte: ["$createdAt", thisMonth] }, 
                  1, 
                  0
                ] 
              } 
            }
          }
        }
      ]),
      
      // Department count
      Department.countDocuments(),
      
      // Task statistics
      Task.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
            overdue: { 
              $sum: { 
                $cond: [
                  { 
                    $and: [
                      { $ne: ["$status", "completed"] },
                      { $lt: ["$dueDate", now] }
                    ]
                  }, 
                  1, 
                  0
                ] 
              } 
            }
          }
        }
      ]),
      
      // Attendance statistics
      Attendance.aggregate([
        {
          $match: {
            date: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            todayPresent: { $sum: { $cond: [{ $ne: ["$checkInTime", null] }, 1, 0] } },
            todayTotal: { $sum: 1 },
            lateCheckIns: { 
              $sum: { 
                $cond: [
                  { 
                    $and: [
                      { $ne: ["$checkInTime", null] },
                      { $eq: ["$isLate", true] }
                    ]
                  }, 
                  1, 
                  0
                ] 
              } 
            }
          }
        }
      ]),
      
      // Leave statistics
      LeaveApplication.aggregate([
        {
          $group: {
            _id: null,
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
            approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
            onLeaveToday: { 
              $sum: { 
                $cond: [
                  { 
                    $and: [
                      { $eq: ["$status", "approved"] },
                      { $lte: ["$startDate", today] },
                      { $gte: ["$endDate", today] }
                    ]
                  }, 
                  1, 
                  0
                ] 
              } 
            },
            upcoming: { 
              $sum: { 
                $cond: [
                  { 
                    $and: [
                      { $eq: ["$status", "approved"] },
                      { $gt: ["$startDate", today] },
                      { $lt: ["$startDate", new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)] }
                    ]
                  }, 
                  1, 
                  0
                ] 
              } 
            }
          }
        }
      ])
    ]);

    // Calculate weekly attendance average
    const weeklyAttendance = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: lastWeek }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          present: { $sum: { $cond: [{ $ne: ["$checkInTime", null] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          avgAttendance: { $avg: { $divide: ["$present", "$total"] } }
        }
      }
    ]);

    // Format response
    const stats = {
      users: {
        total: userStats[0]?.total || 0,
        active: userStats[0]?.active || 0,
        departments: departmentCount,
        newThisMonth: userStats[0]?.newThisMonth || 0
      },
      tasks: {
        total: taskStats[0]?.total || 0,
        completed: taskStats[0]?.completed || 0,
        inProgress: taskStats[0]?.inProgress || 0,
        overdue: taskStats[0]?.overdue || 0
      },
      attendance: {
        todayPresent: attendanceStats[0]?.todayPresent || 0,
        todayTotal: attendanceStats[0]?.todayTotal || 0,
        weeklyAverage: Math.round((weeklyAttendance[0]?.avgAttendance || 0) * 100),
        lateCheckIns: attendanceStats[0]?.lateCheckIns || 0
      },
      leaves: {
        pending: leaveStats[0]?.pending || 0,
        approved: leaveStats[0]?.approved || 0,
        onLeaveToday: leaveStats[0]?.onLeaveToday || 0,
        upcoming: leaveStats[0]?.upcoming || 0
      }
    };

    return Response.json({
      success: true,
      data: stats,
      message: "Dashboard statistics fetched successfully"
    }, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=60" // Cache for 1 minute
      }
    });

  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    
    return Response.json({
      success: false,
      message: "Failed to load dashboard statistics"
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle preflight requests for CORS
export async function options() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
} 