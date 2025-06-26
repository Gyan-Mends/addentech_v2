import type { ActionFunctionArgs } from "react-router";
import mongoose from "~/mongoose.server";
import Attendance from "~/model/attendance";
import Registration from "~/model/registration";
import { getSession } from "~/session";

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Helper to check if time is within check-in hours (7am to 5pm)
function isWithinCheckInHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 7 && hour < 17; // 7am to 5pm
}

// Helper to check if today is a weekend
function isWeekend(): boolean {
  const now = new Date();
  const day = now.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

// Auto-checkout functionality
async function performAutoCheckout() {
  try {
    console.log('🕕 Starting automatic checkout process at 6:00 PM...');
    const now = new Date();
    console.log('Current time:', now.toISOString());
    
    // Create date range for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    console.log('Date range for today:', {
      start: today.toISOString(),
      end: tomorrow.toISOString()
    });
    
    // Find all attendance records from today that don't have checkout times
    const todayRecords = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
      checkOutTime: { $exists: false }
    }).populate('user', 'firstName lastName email');
    
    console.log(`Found ${todayRecords.length} attendance records from today without checkout`);
    
    if (todayRecords.length > 0) {
      // Auto checkout each record at 6:00 PM
      const checkOutTime = new Date();
      checkOutTime.setHours(18, 0, 0, 0); // Set to exactly 6:00 PM
      
      let successCount = 0;
      
      for (const record of todayRecords) {
        try {
          console.log(`Processing record for user: ${(record.user as any)?.firstName} ${(record.user as any)?.lastName}`);
          
          const checkInTime = new Date(record.checkInTime);
          const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
          
          // Ensure work hours is not negative and reasonable (max 11 hours)
          const validWorkHours = Math.max(0, Math.min(workHours, 11));
          
          record.checkOutTime = checkOutTime;
          record.workHours = parseFloat(validWorkHours.toFixed(2));
          record.autoCheckout = true; // Flag to indicate this was an automatic checkout
          
          await record.save();
          console.log(`✅ Successfully auto-checked out: ${(record.user as any)?.firstName} ${(record.user as any)?.lastName} - Work hours: ${validWorkHours.toFixed(2)}`);
          
          successCount++;
        } catch (error: any) {
          console.error(`❌ Error auto-checking out record ${record._id}:`, error);
        }
      }
      
      console.log(`🎉 Auto-checked out ${successCount} out of ${todayRecords.length} users`);
      
      return {
        success: true,
        message: `Automatically checked out ${successCount} users at 6:00 PM`,
        count: successCount,
        total: todayRecords.length
      };
    }
    
    console.log('No records to auto-checkout');
    return {
      success: true,
      message: 'No users need automatic checkout',
      count: 0
    };
  } catch (error: any) {
    console.error('❌ Error in auto-checkout process:', error);
    return {
      success: false,
      message: `Error in auto-checkout: ${error.message}`,
      count: 0
    };
  }
}

// Function to check if it's 6 PM and trigger auto-checkout
async function checkAndPerformAutoCheckout() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Check if it's exactly 6:00 PM (18:00)
  if (currentHour === 18 && currentMinute === 0) {
    console.log('🕕 It\'s 6:00 PM - triggering auto-checkout...');
    return await performAutoCheckout();
  }
  
  return null;
}

export async function loader({ request }: { request: Request }) {
  try {
    // Check authentication
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (!email) {
      return Response.json({
        success: false,
        error: "Not authenticated"
      }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const userId = url.searchParams.get('userId');
    const departmentId = url.searchParams.get('departmentId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    console.log("📊 Attendance API loader called:", { action, userId, departmentId });

    // Check for auto-checkout trigger (called periodically by frontend)
    const autoCheckoutResult = await checkAndPerformAutoCheckout();
    if (autoCheckoutResult) {
      console.log('Auto-checkout triggered:', autoCheckoutResult);
    }

    // Get current user info for role-based access control
    const currentUser = await Registration.findOne({ 
      email: email.toLowerCase().trim(),
      status: "active"
    });

    if (!currentUser) {
      return Response.json({
        success: false,
        error: "User not found or inactive"
      }, { status: 401 });
    }

    console.log("Current user role:", currentUser.role, "Department:", currentUser.department);

    switch (action) {
      case 'getUserAttendance':
        if (!userId) {
          return Response.json({
            success: false,
            error: "User ID is required"
          }, { status: 400 });
        }

        // Role-based access control for viewing attendance
        if (currentUser.role === 'staff') {
          // Staff can only view their own attendance
          if (userId !== currentUser._id.toString()) {
            return Response.json({
              success: false,
              error: "Staff members can only view their own attendance records"
            }, { status: 403 });
          }
        } else if (currentUser.role === 'department_head') {
          // Department heads can view attendance from their department
          const targetUser = await Registration.findById(userId);
          if (!targetUser || targetUser.department !== currentUser.department) {
            return Response.json({
              success: false,
              error: "Department heads can only view attendance from their own department"
            }, { status: 403 });
          }
        }
        // Admin and managers can view any user's attendance (no additional checks needed)

        // Build the query
        let query: any = { user: userId };
        
        // Add date range if provided
        if (startDate && endDate) {
          const startDateObj = new Date(startDate);
          startDateObj.setHours(0, 0, 0, 0);
          
          const endDateObj = new Date(endDate);
          endDateObj.setHours(23, 59, 59, 999);
          
          query.date = {
            $gte: startDateObj,
            $lte: endDateObj
          };
        }
        
        // Find attendance records
        const attendanceRecords = await Attendance.find(query)
          .populate('user', 'firstName lastName email')
          .populate('department', 'name')
          .sort({ date: -1 });
        
        console.log(`Found ${attendanceRecords.length} attendance records for user ${userId}`);
        
        return Response.json({
          success: true,
          message: attendanceRecords.length > 0 
            ? "Attendance records retrieved successfully" 
            : "No attendance records found",
          attendance: attendanceRecords,
          count: attendanceRecords.length
        });

      case 'getDepartmentAttendance':
        if (!departmentId) {
          return Response.json({
            success: false,
            error: "Department ID is required"
          }, { status: 400 });
        }

        console.log('Getting attendance for department:', departmentId);
        const departmentAttendance = await Attendance.find({ department: departmentId })
          .populate("user", "firstName lastName email")
          .populate("department", "name")
          .sort({ date: -1 }); // Most recent first

        console.log(`Found ${departmentAttendance.length} records for department ${departmentId}`);
        
        return Response.json({
          success: true,
          message: departmentAttendance.length > 0 ? "Department attendance records found" : "No attendance records found for this department",
          attendance: departmentAttendance,
          count: departmentAttendance.length
        });

      case 'getAttendanceReport':
        if (!startDate || !endDate) {
          return Response.json({
            success: false,
            error: "Start date and end date are required"
          }, { status: 400 });
        }

        console.log('Generating attendance report:', { startDate, endDate, departmentId });
        
        // Build query for report
        let reportQuery: any = {};
        
        // Add date range
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        reportQuery.date = {
          $gte: start,
          $lte: end
        };
        
        // Add department filter if provided
        if (departmentId) {
          reportQuery.department = departmentId;
        }
        
        const reportAttendance = await Attendance.find(reportQuery)
          .populate("user", "firstName lastName email")
          .populate("department", "name")
          .sort({ date: -1 }); // Most recent first
        
        console.log(`Found ${reportAttendance.length} records for the report`);

        return Response.json({
          success: true,
          message: reportAttendance.length > 0 ? "Attendance report generated" : "No attendance records found for this period",
          attendance: reportAttendance,
          count: reportAttendance.length
        });

      default:
        // Default: Get attendance records with role-based filtering
        console.log(`📊 Fetching attendance records for role: ${currentUser.role}...`);
        
        let attendanceQuery: any = {};
        
        // Role-based filtering
        if (currentUser.role === 'staff') {
          // Staff can only see their own attendance
          attendanceQuery.user = currentUser._id;
          console.log("Staff user - filtering to own records only");
        } else if (currentUser.role === 'department_head') {
          // Department heads can see attendance from their department only
          attendanceQuery.department = currentUser.department;
          console.log("Department head - filtering to department:", currentUser.department);
        }
        // Admin and managers can see all attendance records (no additional filter)
        
        const allAttendance = await Attendance.find(attendanceQuery)
          .populate('user', 'firstName lastName email workMode')
          .populate('department', 'name')
          .sort({ date: -1 });

        console.log(`✅ Found ${allAttendance.length} attendance records for role: ${currentUser.role}`);
        
        // Transform the data to include user and department names
        const transformedAttendance = allAttendance.map(record => ({
          ...record.toObject(),
          userName: record.user ? `${(record.user as any).firstName} ${(record.user as any).lastName}` : 'Unknown User',
          departmentName: record.department ? (record.department as any).name : 'Unknown Department',
          userWorkMode: record.user ? (record.user as any).workMode : 'unknown'
        }));
        
        return Response.json({
          success: true,
          attendance: transformedAttendance,
          count: transformedAttendance.length,
          userRole: currentUser.role
        });
    }
  } catch (error) {
    console.error("❌ Error in attendance loader:", error);
    return Response.json({
      success: false,
      error: "Failed to fetch attendance data"
    }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const method = request.method;
  
  try {
    console.log("🚀 Attendance action started, method:", method);
    
    // Check authentication for all operations
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    console.log("📧 Email from session:", email);

    if (!email) {
      console.log("❌ No email in session");
      return Response.json({
        success: false,
        error: "Not authenticated"
      }, { status: 401 });
    }

    // Find current user
    console.log("🔍 Looking for user with email:", email.toLowerCase().trim());
    const currentUser = await Registration.findOne({ 
      email: email.toLowerCase().trim(),
      status: "active"
    });

    console.log("👤 Current user found:", currentUser ? `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})` : "null");

    if (!currentUser) {
      console.log("❌ User not found or inactive");
      return Response.json({
        success: false,
        error: "User not found or inactive"
      }, { status: 401 });
    }

    if (method === "POST") {
      const data = await request.json();
      const { action } = data;

      console.log("📝 Attendance action:", action, data);

      switch (action) {
        case 'checkIn':
          console.log("🔥 Starting check-in process...");
          
          const {
            userId,
            departmentId,
            notes,
            workMode,
            latitude,
            longitude,
            locationName,
          } = data;

          console.log('📝 Check-in data received:', { 
            userId, 
            departmentId, 
            workMode, 
            hasLocation: !!(latitude && longitude),
            notes: notes ? 'provided' : 'empty'
          });
          
          // Check if today is a weekend (Saturday or Sunday) - COMMENTED OUT FOR TESTING
          // if (isWeekend()) {
          //   console.log('❌ Check-in failed: Attendance not allowed on weekends');
          //   return Response.json({
          //     message: "Attendance cannot be taken on weekends (Saturday/Sunday). Please check in on weekdays only.",
          //     success: false,
          //     error: "Weekend check-in not allowed"
          //   }, { status: 400 });
          // }
          
          // Check if current time is within check-in hours (7am to 5pm)
          if (!isWithinCheckInHours()) {
            const now = new Date();
            const currentTime = now.toLocaleTimeString();
            console.log('❌ Check-in failed: Outside check-in hours');
            return Response.json({
              message: `Check-in is only allowed between 7:00 AM and 5:00 PM. Current time: ${currentTime}`,
              success: false,
              error: "Outside check-in hours"
            }, { status: 400 });
          }
          
          // Check if user exists and get their work mode
          console.log("🔍 Looking up user by ID:", userId, "Type:", typeof userId);
          console.log("🔍 Current user ID:", currentUser._id, "Type:", typeof currentUser._id);
          console.log("🔍 IDs match:", userId === currentUser._id.toString());
          
          // Validate ObjectId format
          if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log('❌ Check-in failed: Invalid user ID format');
            return Response.json({
              message: "Invalid user ID format",
              success: false,
              error: "Invalid ObjectId"
            }, { status: 400 });
          }
          
          // Department can be either ObjectId or string name, let's handle both
          console.log("🏢 Department ID received:", departmentId, "Type:", typeof departmentId);
          
          const user = await Registration.findById(userId);
          console.log("👤 Target user found:", user ? `${user.firstName} ${user.lastName} (workMode: ${user.workMode})` : "null");
          
          if (!user) {
            console.log('❌ Check-in failed: User not found');
            return Response.json({
              message: "User not found",
              success: false
            }, { status: 404 });
          }

          // Use the user's actual department ObjectId from their profile
          const actualDepartmentId = user.department;
          console.log("🏢 Using user's actual department ID:", actualDepartmentId);

          // Use user's work mode from profile (read-only)
          const userWorkMode = user.workMode || 'in-house';
          const finalWorkMode = userWorkMode; // Always use profile work mode
          
          console.log(`User work mode from profile: ${userWorkMode}, Using: ${finalWorkMode}`);
          
          if (workMode !== userWorkMode) {
            return Response.json({
              message: `Your work mode is set to '${userWorkMode}' in your profile. Work mode cannot be changed during attendance. Contact your admin if you need to change your work mode permanently.`,
              success: false,
              error: "Work mode mismatch"
            }, { status: 400 });
          }

          // Check if user already checked in today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const existingAttendance = await Attendance.findOne({
            user: userId,
            date: {
              $gte: today,
              $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
          });

          if (existingAttendance) {
            const checkInTime = new Date(existingAttendance.checkInTime).toLocaleTimeString();
            console.log('❌ Check-in failed: User already checked in today');
            return Response.json({
              message: `You have already checked in today at ${checkInTime}. You can only check in once per day.`,
              success: false,
              error: "Already checked in today"
            }, { status: 409 });
          }

          // Validate location for in-house attendance
          if (finalWorkMode === "in-house") {
            // Location is mandatory for in-house workers
            if (!latitude || !longitude) {
              console.log('Check-in failed: Location required for in-house attendance');
              return Response.json({
                message: "Location access is required for in-house attendance. Please enable location services and allow location access before taking attendance.",
                success: false,
                error: "Location required"
              }, { status: 400 });
            }

            // Office location coordinates (as specified in requirements)
            const officeLatitude = 5.661204271486543;
            const officeLongitude = -0.1566814758038094;
            
            // Calculate distance between user and office
            const distance = calculateDistance(
              latitude,
              longitude,
              officeLatitude,
              officeLongitude
            );
            
            console.log('Location check:', { 
              userCoords: {latitude, longitude}, 
              officeCoords: {officeLatitude, officeLongitude}, 
              distance: `${distance.toFixed(3)} km` 
            });
            
            // If user is not within 100 meters of the office
            if (distance > 0.1) { // 0.1 km = 100 meters
              return Response.json({
                message: `You are ${(distance * 1000).toFixed(0)}m away from the office. In-house check-in requires you to be within 100m of the office location. Please move closer to the office or select 'Remote' work mode.`,
                success: false,
                error: "Location too far from office"
              }, { status: 400 });
            }
          }
          
          // Create new attendance record
          const attendanceData: any = {
            user: userId,
            department: actualDepartmentId, // Use the actual department ObjectId
            checkInTime: new Date(),
            date: new Date(),
            notes: notes || '',
            workMode: finalWorkMode,
            status: 'present'
          };
          
          // Add location data if provided
          if (latitude && longitude) {
            attendanceData.location = { 
              latitude, 
              longitude,
              locationName: locationName || (finalWorkMode === 'in-house' ? 'Office Location' : 'Remote Location')
            };
          }
          
          console.log('📊 Creating attendance record with data:', {
            ...attendanceData,
            location: attendanceData.location ? 'Location included' : 'No location'
          });
          
          let savedAttendance;
          try {
            const attendance = new Attendance(attendanceData);
            console.log("💾 Attempting to save attendance record...");
            savedAttendance = await attendance.save();
            console.log('✅ Attendance saved successfully:', savedAttendance._id);
          } catch (saveError: any) {
            console.error('❌ Error saving attendance:', saveError);
            return Response.json({
              message: "Failed to save attendance record",
              success: false,
              error: saveError.message
            }, { status: 500 });
          }

          if (savedAttendance) {
            const checkInTime = new Date(savedAttendance.checkInTime).toLocaleTimeString();
            const successMessage = finalWorkMode === 'in-house' 
              ? `✅ Check-in successful at ${checkInTime}! Location verified - Welcome to the office!`
              : `✅ Check-in successful at ${checkInTime}! Welcome remote worker!`;
            
            return Response.json({
              message: successMessage,
              success: true,
              attendance: savedAttendance,
            });
          } else {
            return Response.json({
              message: "❌ Failed to record check-in. Please try again.",
              success: false,
              error: "Database save failed"
            }, { status: 500 });
          }

        case 'checkOut':
          const { attendanceId } = data;
          
          const attendanceRecord = await Attendance.findById(attendanceId);
          
          if (!attendanceRecord) {
            return Response.json({
              message: "Attendance record not found",
              success: false
            }, { status: 404 });
          }

          if (attendanceRecord.checkOutTime) {
            const checkOutTime = new Date(attendanceRecord.checkOutTime).toLocaleTimeString();
            return Response.json({
              message: `You have already checked out today at ${checkOutTime}.`,
              success: false,
              error: "Already checked out"
            }, { status: 409 });
          }

          const checkOutTime = new Date();
          const checkInTime = new Date(attendanceRecord.checkInTime);
          
          // Calculate work hours (difference in milliseconds, converted to hours)
          const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

          attendanceRecord.checkOutTime = checkOutTime;
          attendanceRecord.workHours = parseFloat(workHours.toFixed(2));
          
          const updatedAttendance = await attendanceRecord.save();

          if (updatedAttendance) {
            const checkOutTime = new Date(updatedAttendance.checkOutTime!).toLocaleTimeString();
            const workHoursFormatted = updatedAttendance.workHours?.toFixed(2) || '0.00';
            
            return Response.json({
              message: `✅ Check-out successful at ${checkOutTime}! You worked ${workHoursFormatted} hours today. Have a great day!`,
              success: true,
              attendance: updatedAttendance,
            });
          } else {
            return Response.json({
              message: "❌ Failed to record check-out. Please try again.",
              success: false,
              error: "Database update failed"
            }, { status: 500 });
          }

        case 'autoCheckout':
          // Manual trigger for auto-checkout
          const autoCheckoutResult = await performAutoCheckout();
          return Response.json(autoCheckoutResult);

        case 'updateWorkMode':
          // Allow admin/manager to update user work mode
          const { targetUserId, newWorkMode } = data;
          
          if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
            return Response.json({
              message: "Only administrators and managers can change user work modes",
              success: false,
              error: "Insufficient permissions"
            }, { status: 403 });
          }
          
          if (!targetUserId || !newWorkMode) {
            return Response.json({
              message: "Target user ID and new work mode are required",
              success: false,
              error: "Missing required fields"
            }, { status: 400 });
          }
          
          if (!['in-house', 'remote'].includes(newWorkMode)) {
            return Response.json({
              message: "Work mode must be 'in-house' or 'remote'",
              success: false,
              error: "Invalid work mode"
            }, { status: 400 });
          }
          
          const targetUser = await Registration.findByIdAndUpdate(
            targetUserId,
            { workMode: newWorkMode },
            { new: true }
          );
          
          if (!targetUser) {
            return Response.json({
              message: "User not found",
              success: false,
              error: "User not found"
            }, { status: 404 });
          }
          
          return Response.json({
            message: `Successfully updated work mode to '${newWorkMode}' for ${targetUser.firstName} ${targetUser.lastName}`,
            success: true,
            user: {
              _id: targetUser._id,
              firstName: targetUser.firstName,
              lastName: targetUser.lastName,
              workMode: targetUser.workMode
            }
          });

        default:
          return Response.json({
            success: false,
            error: `Unknown action: ${action}`
          }, { status: 400 });
      }

    } else if (method === "DELETE") {
      // Delete attendance record (admin/manager only)
      const data = await request.json();
      const { attendanceId } = data;

      console.log(`Attempting to delete attendance record: ${attendanceId} by role: ${currentUser.role}`);
      
      // Check if user has permission to delete
      if (!['admin', 'manager'].includes(currentUser.role)) {
        return Response.json({
          message: "You don't have permission to delete attendance records",
          success: false
        }, { status: 403 });
      }
      
      // Find and delete the attendance record
      const attendanceToDelete = await Attendance.findById(attendanceId);
      
      if (!attendanceToDelete) {
        return Response.json({
          message: "Attendance record not found",
          success: false
        }, { status: 404 });
      }
      
      await Attendance.deleteOne({ _id: attendanceId });
      
      return Response.json({
        message: "Attendance record deleted successfully",
        success: true
      });

    } else {
      return Response.json({
        success: false,
        error: `Method ${method} not allowed`
      }, { status: 405 });
    }

  } catch (error: any) {
    console.error(`❌ Error in ${method} /api/attendance:`, error);
    return Response.json({
      success: false,
      error: "Internal server error",
      message: error.message
    }, { status: 500 });
  }
} 