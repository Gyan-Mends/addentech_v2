import type { ActionFunction, LoaderFunction } from "react-router";
import { getSession } from "~/session";
import Registration from "~/model/registration";
import Departments from "~/model/department";
import { Leave, LeaveBalance, LeavePolicy } from "~/model/leave";
import type { LeaveInterface } from "~/interface/interface";
import { createObjectIdString } from "~/utils/objectid";

// Loader function - handles GET requests
export const loader: LoaderFunction = async ({ request }) => {
    try {
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
        const currentUser = await Registration.findOne({ email }).populate('department');
        if (!currentUser) {
            return Response.json({
                message: "User not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        const url = new URL(request.url);
        const operation = url.searchParams.get("operation");
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const status = url.searchParams.get("status") || "all";
        const leaveType = url.searchParams.get("leaveType") || "all";
        const department = url.searchParams.get("department") || "all";
        const employeeName = url.searchParams.get("employeeName") || "";
        const startDate = url.searchParams.get("startDate");
        const endDate = url.searchParams.get("endDate");
        const leaveId = url.searchParams.get("id");
        const year = parseInt(url.searchParams.get("year") || new Date().getFullYear().toString());

        // Handle specific operations
        switch (operation) {
            case "getById":
                if (!leaveId) {
                    return Response.json({ message: "Leave ID is required", success: false, status: 400 }, { status: 400 });
                }
                
                const leave = await Leave.findById(leaveId)
                    .populate('employee', 'firstName lastName email image position')
                    .populate('department', 'name')
                    .populate('approvalWorkflow.approver', 'firstName lastName');

                if (!leave) {
                    return Response.json({ message: "Leave not found", success: false, status: 404 }, { status: 404 });
                }

                return Response.json({
                    message: "Leave fetched successfully",
                    success: true,
                    data: leave,
                    status: 200
                });

            case "getBalances":
                const employeeId = url.searchParams.get("employeeId");
                
                // Role-based access control for balances
                if (currentUser.role === 'staff' && employeeId && employeeId !== currentUser._id.toString()) {
                    return Response.json({ message: "Access denied", success: false, status: 403 }, { status: 403 });
                }

                let balances;
                
                if (employeeId) {
                    // Get balances for specific employee
                    balances = await LeaveBalance.find({
                        employee: employeeId,
                        year,
                        // Exclude "Annual Leave Quota" from UI display - it's only for backend calculations
                        leaveType: { $ne: 'Annual Leave Quota' }
                    }).populate('employee', 'firstName lastName email');
                } else {
                    // Get balances for all employees (admin/manager) or current user (staff/department_head)
                    let query: any = {
                        year,
                        leaveType: { $ne: 'Annual Leave Quota' }
                    };

                    // Apply role-based filtering
                    if (currentUser.role === 'staff') {
                        query.employee = currentUser._id;
                    } else if (currentUser.role === 'department_head') {
                        // Get employees from the same department
                        const departmentEmployees = await Registration.find({ 
                            department: currentUser.department 
                        }).select('_id');
                        query.employee = { $in: departmentEmployees.map(emp => emp._id) };
                    }
                    // admin and manager can see all balances (no additional filter)

                    balances = await LeaveBalance.find(query)
                        .populate('employee', 'firstName lastName email position department')
                        .populate({
                            path: 'employee',
                            populate: {
                                path: 'department',
                                select: 'name'
                            }
                        })
                        .sort({ 'employee.firstName': 1, leaveType: 1 });
                }

                return Response.json({
                    message: "Leave balances fetched successfully",
                    success: true,
                    data: balances,
                    status: 200
                });

            case "getPolicies":
                const policies = await LeavePolicy.find({ isActive: true }).sort({ leaveType: 1 });
                
                return Response.json({
                    message: "Leave policies fetched successfully",
                    success: true,
                    data: policies,
                    status: 200
                });

            case "getStats":
                const stats = await calculateLeaveStats(currentUser);
                
                return Response.json({
                    message: "Leave statistics fetched successfully",
                    success: true,
                    data: stats,
                    status: 200
                });

            default:
                // Get leaves with filters and role-based access
                const query: any = { isActive: true };

                // Apply role-based filtering
                if (currentUser.role === 'staff') {
                    query.employee = currentUser._id;
                } else if (currentUser.role === 'department_head') {
                    query.department = currentUser.department;
                }

                // Apply filters
                if (status && status !== 'all') {
                    query.status = status;
                }

                if (leaveType && leaveType !== 'all') {
                    query.leaveType = leaveType;
                }

                if (department && department !== 'all') {
                    query.department = department;
                }

                if (startDate || endDate) {
                    query.startDate = {};
                    if (startDate) query.startDate.$gte = new Date(startDate);
                    if (endDate) query.startDate.$lte = new Date(endDate);
                }

                // Get total count
                const total = await Leave.countDocuments(query);

                // Get leaves with pagination
                let leaves;
                if (employeeName && employeeName.trim()) {
                    // Use aggregation for employee name filtering
                    leaves = await Leave.aggregate([
                        { $match: query },
                        {
                            $lookup: {
                                from: 'registrations',
                                localField: 'employee',
                                foreignField: '_id',
                                as: 'employee'
                            }
                        },
                        {
                            $lookup: {
                                from: 'departments',
                                localField: 'department',
                                foreignField: '_id',
                                as: 'department'
                            }
                        },
                        { $unwind: '$employee' },
                        { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
                        {
                            $match: {
                                $or: [
                                    { 'employee.firstName': { $regex: employeeName.trim(), $options: 'i' } },
                                    { 'employee.lastName': { $regex: employeeName.trim(), $options: 'i' } },
                                    { 
                                        $expr: {
                                            $regexMatch: {
                                                input: { $concat: ['$employee.firstName', ' ', '$employee.lastName'] },
                                                regex: employeeName.trim(),
                                                options: 'i'
                                            }
                                        }
                                    }
                                ]
                            }
                        },
                        { $sort: { submissionDate: -1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit }
                    ]);
                } else {
                    leaves = await Leave.find(query)
                        .populate('employee', 'firstName lastName email image position department')
                        .populate('department', 'name')
                        .sort({ submissionDate: -1 })
                        .limit(limit)
                        .skip((page - 1) * limit)
                        .lean();
                }

                // Calculate stats
                const leaveStats = await calculateLeaveStats(currentUser);

                return Response.json({
                    message: "Leaves fetched successfully",
                    success: true,
                    data: leaves,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(total / limit),
                        totalLeaves: total,
                        hasNextPage: page < Math.ceil(total / limit),
                        hasPrevPage: page > 1
                    },
                    stats: leaveStats,
                    status: 200
                });
        }

    } catch (error: any) {
        console.error("Error in leaves loader:", error);
        return Response.json({
            message: error.message || "Internal server error",
            success: false,
            status: 500
        }, { status: 500 });
    }
};

// Action function - handles POST, PUT, DELETE requests
export const action: ActionFunction = async ({ request }) => {
    try {
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
        const currentUser = await Registration.findOne({ email }).populate('department');
        if (!currentUser) {
            return Response.json({
                message: "User not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        const formData = await request.formData();
        const operation = formData.get("operation") as string;

        switch (operation) {
            case "create":
                return await createLeave(formData, currentUser);
            
            case "update":
                return await updateLeave(formData, currentUser);
            
            case "updateStatus":
                return await updateLeaveStatus(formData, currentUser);
            
            case "delete":
                return await deleteLeave(formData, currentUser);

            case "createPolicy":
                return await createLeavePolicy(formData, currentUser);

            case "updatePolicy":
                return await updateLeavePolicy(formData, currentUser);

            case "deletePolicy":
                return await deleteLeavePolicy(formData, currentUser);

            case "adjustBalance":
                return await adjustLeaveBalance(formData, currentUser);
            
            default:
                return Response.json({
                    message: "Invalid operation",
                    success: false,
                    status: 400
                }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Error in leaves action:", error);
        return Response.json({
            message: error.message || "Internal server error",
            success: false,
            status: 500
        }, { status: 500 });
    }
};

// Helper functions
async function createLeave(formData: FormData, currentUser: any) {
    try {
        const leaveType = formData.get("leaveType") as string;
        const startDate = new Date(formData.get("startDate") as string);
        const endDate = new Date(formData.get("endDate") as string);
        const reason = formData.get("reason") as string;
        const priority = formData.get("priority") as string || "normal";
        const employeeId = formData.get("employeeId") as string || currentUser._id.toString();

        // Validate required fields
        if (!leaveType || !startDate || !endDate || !reason) {
            return Response.json({
                message: "Missing required fields",
                success: false,
                status: 400
            }, { status: 400 });
        }

        // Calculate total days
        const timeDiff = endDate.getTime() - startDate.getTime();
        const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

        // Check leave balance
        const balanceCheck = await checkLeaveBalance(employeeId, leaveType, totalDays);
        if (!balanceCheck.hasBalance) {
            return Response.json({
                message: balanceCheck.message,
                success: false,
                status: 400
            }, { status: 400 });
        }

        // Create leave application
        const leave = new Leave({
            employee: employeeId,
            leaveType,
            startDate,
            endDate,
            totalDays,
            reason,
            priority,
            status: 'pending',
            department: currentUser.department,
            submissionDate: new Date(),
            lastModified: new Date(),
            approvalWorkflow: [{
                approver: null,
                approverRole: 'manager',
                status: 'pending',
                order: 1
            }]
        });

        const savedLeave = await leave.save();

        // DO NOT reserve balance when submitting - only when approved
        // await reserveLeaveBalance(employeeId, leaveType, totalDays, savedLeave._id.toString());

        return Response.json({
            message: "Leave application submitted successfully",
            success: true,
            data: savedLeave,
            status: 201
        });

    } catch (error: any) {
        return Response.json({
            message: error.message,
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function updateLeave(formData: FormData, currentUser: any) {
    try {
        const id = formData.get("id") as string;
        
        if (!id) {
            return Response.json({
                message: "Leave ID is required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const existingLeave = await Leave.findById(id);
        if (!existingLeave) {
            return Response.json({
                message: "Leave not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        // Check permissions
        const canUpdate = currentUser.role === "admin" || 
                         currentUser.role === "manager" || 
                         existingLeave.employee.toString() === currentUser._id.toString();

        if (!canUpdate) {
            return Response.json({
                message: "You don't have permission to update this leave",
                success: false,
                status: 403
            }, { status: 403 });
        }

        const updateData: any = {};
        
        // Update fields if provided
        const fields = ["leaveType", "startDate", "endDate", "reason", "priority"];
        
        fields.forEach(field => {
            const value = formData.get(field);
            if (value !== null && value !== undefined && value !== "") {
                if (field === "startDate" || field === "endDate") {
                    updateData[field] = new Date(value as string);
                } else {
                    updateData[field] = value;
                }
            }
        });

        // Recalculate total days if dates changed
        if (updateData.startDate || updateData.endDate) {
            const start = updateData.startDate || existingLeave.startDate;
            const end = updateData.endDate || existingLeave.endDate;
            const timeDiff = end.getTime() - start.getTime();
            updateData.totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        }

        updateData.lastModified = new Date();
        updateData.modifiedBy = currentUser._id;

        const updatedLeave = await Leave.findByIdAndUpdate(id, updateData, { new: true })
            .populate('employee', 'firstName lastName email image position')
            .populate('department', 'name')
            .populate('approvalWorkflow.approver', 'firstName lastName');

        return Response.json({
            message: "Leave updated successfully",
            success: true,
            data: updatedLeave,
            status: 200
        });

    } catch (error: any) {
        return Response.json({
            message: error.message,
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function updateLeaveStatus(formData: FormData, currentUser: any) {
    try {
        const leaveId = formData.get("leaveId") as string;
        const status = formData.get("status") as string;
        const comments = formData.get("comments") as string;

        if (!leaveId || !status) {
            return Response.json({
                message: "Leave ID and status are required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const leave = await Leave.findById(leaveId);
        if (!leave) {
            return Response.json({
                message: "Leave not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        // Check permissions
        const canApprove = currentUser.role === 'admin' || 
                          currentUser.role === 'manager' ||
                          (currentUser.role === 'department_head' && 
                           leave.department.toString() === currentUser.department.toString());

        if (!canApprove) {
            return Response.json({
                message: "You don't have permission to approve/reject this leave",
                success: false,
                status: 403
            }, { status: 403 });
        }

        // Update leave status
        leave.status = status as any;
        leave.lastModified = new Date();
        leave.modifiedBy = currentUser._id;

        // Update approval workflow
        const currentApproval = leave.approvalWorkflow.find(
            (approval: any) => approval.status === 'pending'
        );
        
        if (currentApproval) {
            currentApproval.status = status === 'approved' ? 'approved' : 'rejected';
            currentApproval.comments = comments || '';
            currentApproval.actionDate = new Date();
            currentApproval.approver = currentUser._id;
            currentApproval.approverRole = currentUser.role;
        }

        await leave.save();

        // Handle balance updates - ONLY record usage when approved
        if (status === 'approved') {
            // Record balance usage only when approved
            const balanceRecorded = await recordLeaveBalanceUsage(leave.employee.toString(), leave.leaveType, leave.totalDays, leaveId);
            if (!balanceRecorded) {
                console.error('Failed to record balance usage for approved leave');
            }
        }
        // For rejected leaves: No balance operations needed since nothing was reserved during submission

        return Response.json({
            message: `Leave ${status} successfully`,
            success: true,
            data: leave,
            status: 200
        });

    } catch (error: any) {
        return Response.json({
            message: error.message,
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function deleteLeave(formData: FormData, currentUser: any) {
    try {
        const id = formData.get("id") as string;
        
        if (!id) {
            return Response.json({
                message: "Leave ID is required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const existingLeave = await Leave.findById(id);
        if (!existingLeave) {
            return Response.json({
                message: "Leave not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        // Check permissions
        const canDelete = currentUser.role === "admin" || 
                         currentUser.role === "manager" || 
                         existingLeave.employee.toString() === currentUser._id.toString();

        if (!canDelete) {
            return Response.json({
                message: "You don't have permission to delete this leave",
                success: false,
                status: 403
            }, { status: 403 });
        }

        // Soft delete
        existingLeave.isActive = false;
        existingLeave.lastModified = new Date();
        existingLeave.modifiedBy = currentUser._id;
        await existingLeave.save();

        // No need to release balance since nothing is reserved for pending leaves
        // Balance is only recorded when leave is approved

        return Response.json({
            message: "Leave deleted successfully",
            success: true,
            status: 200
        });

    } catch (error: any) {
        return Response.json({
            message: error.message,
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function createLeavePolicy(formData: FormData, currentUser: any) {
    try {
        // Check admin permissions
        if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
            return Response.json({
                message: "You don't have permission to create leave policies",
                success: false,
                status: 403
            }, { status: 403 });
        }

        const leaveType = formData.get("leaveType") as string;
        const description = formData.get("description") as string;
        const defaultAllocation = parseInt(formData.get("defaultAllocation") as string);
        const maxConsecutiveDays = parseInt(formData.get("maxConsecutiveDays") as string) || 365;
        const minAdvanceNotice = parseInt(formData.get("minAdvanceNotice") as string) || 0;
        const maxAdvanceBooking = parseInt(formData.get("maxAdvanceBooking") as string) || 365;
        const allowCarryForward = formData.get("allowCarryForward") === "true";
        const carryForwardLimit = parseInt(formData.get("carryForwardLimit") as string) || 0;
        const documentsRequired = formData.get("documentsRequired") === "true";
        const managerMaxDays = parseInt(formData.get("managerMaxDays") as string) || 30;
        const deptHeadMaxDays = parseInt(formData.get("deptHeadMaxDays") as string) || 60;

        if (!leaveType || !defaultAllocation) {
            return Response.json({
                message: "Leave type and default allocation are required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const policy = new LeavePolicy({
            leaveType,
            description,
            defaultAllocation,
            maxConsecutiveDays,
            minAdvanceNotice,
            maxAdvanceBooking,
            allowCarryForward,
            carryForwardLimit,
            documentsRequired,
            approvalWorkflowLimits: {
                managerMaxDays,
                deptHeadMaxDays
            }
        });

        const savedPolicy = await policy.save();

        return Response.json({
            message: "Leave policy created successfully",
            success: true,
            data: savedPolicy,
            status: 201
        });

    } catch (error: any) {
        return Response.json({
            message: error.message,
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function updateLeavePolicy(formData: FormData, currentUser: any) {
    try {
        // Check admin permissions
        if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
            return Response.json({
                message: "You don't have permission to update leave policies",
                success: false,
                status: 403
            }, { status: 403 });
        }

        const id = formData.get("id") as string;
        
        if (!id) {
            return Response.json({
                message: "Policy ID is required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const updateData: any = {};
        const fields = [
            "leaveType", "description", "defaultAllocation", "maxConsecutiveDays",
            "minAdvanceNotice", "maxAdvanceBooking", "allowCarryForward", 
            "carryForwardLimit", "documentsRequired", "managerMaxDays", "deptHeadMaxDays"
        ];
        
        fields.forEach(field => {
            const value = formData.get(field);
            if (value !== null && value !== undefined && value !== "") {
                if (field === "allowCarryForward" || field === "documentsRequired") {
                    updateData[field] = value === "true";
                } else if (field === "managerMaxDays" || field === "deptHeadMaxDays") {
                    if (!updateData.approvalWorkflowLimits) updateData.approvalWorkflowLimits = {};
                    updateData.approvalWorkflowLimits[field] = parseInt(value as string);
                } else if (["defaultAllocation", "maxConsecutiveDays", "minAdvanceNotice", "maxAdvanceBooking", "carryForwardLimit"].includes(field)) {
                    updateData[field] = parseInt(value as string);
                } else {
                    updateData[field] = value;
                }
            }
        });

        const updatedPolicy = await LeavePolicy.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedPolicy) {
            return Response.json({
                message: "Policy not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        return Response.json({
            message: "Leave policy updated successfully",
            success: true,
            data: updatedPolicy,
            status: 200
        });

    } catch (error: any) {
        return Response.json({
            message: error.message,
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function deleteLeavePolicy(formData: FormData, currentUser: any) {
    try {
        // Check admin permissions
        if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
            return Response.json({
                message: "You don't have permission to delete leave policies",
                success: false,
                status: 403
            }, { status: 403 });
        }

        const id = formData.get("id") as string;
        
        if (!id) {
            return Response.json({
                message: "Policy ID is required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const policy = await LeavePolicy.findByIdAndUpdate(
            id, 
            { isActive: false }, 
            { new: true }
        );

        if (!policy) {
            return Response.json({
                message: "Policy not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        return Response.json({
            message: "Leave policy deleted successfully",
            success: true,
            status: 200
        });

    } catch (error: any) {
        return Response.json({
            message: error.message,
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function adjustLeaveBalance(formData: FormData, currentUser: any) {
    try {
        // Check admin permissions
        if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
            return Response.json({
                message: "You don't have permission to adjust leave balances",
                success: false,
                status: 403
            }, { status: 403 });
        }

        const employeeId = formData.get("employeeId") as string;
        const leaveType = formData.get("leaveType") as string;
        const adjustment = parseInt(formData.get("adjustment") as string);
        const reason = formData.get("reason") as string;
        const year = parseInt(formData.get("year") as string) || new Date().getFullYear();

        if (!employeeId || !leaveType || !adjustment || !reason) {
            return Response.json({
                message: "All fields are required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        let balance = await LeaveBalance.findOne({
            employee: employeeId,
            leaveType,
            year
        });

        if (!balance) {
            // Initialize balance if it doesn't exist
            await initializeEmployeeBalances(employeeId, year);
            balance = await LeaveBalance.findOne({
                employee: employeeId,
                leaveType,
                year
            });
        }

        if (!balance) {
            return Response.json({
                message: "Unable to create or find balance record",
                success: false,
                status: 500
            }, { status: 500 });
        }

        balance.totalAllocated += adjustment;
        balance.remaining = balance.totalAllocated + balance.carriedForward - balance.used - balance.pending;
        balance.lastUpdated = new Date();

        balance.transactions.push({
            type: 'adjustment',
            amount: adjustment,
            date: new Date(),
            description: reason
        });

        await balance.save();

        return Response.json({
            message: "Leave balance adjusted successfully",
            success: true,
            data: balance,
            status: 200
        });

    } catch (error: any) {
        return Response.json({
            message: error.message,
            success: false,
            status: 500
        }, { status: 500 });
    }
}

// Helper functions for leave balance management
async function checkLeaveBalance(employeeId: string, leaveType: string, days: number, year: number = new Date().getFullYear()) {
    try {
        // Ghana Labor Law: Sick Leave and Maternity Leave don't count against annual quota
        const exemptLeaveTypes = ['Sick Leave', 'Maternity Leave'];
        const isExemptLeave = exemptLeaveTypes.includes(leaveType);

        // Check specific leave type balance
        let balance = await LeaveBalance.findOne({
            employee: employeeId,
            leaveType,
            year
        });

        if (!balance) {
            await initializeEmployeeBalances(employeeId, year);
            balance = await LeaveBalance.findOne({
                employee: employeeId,
                leaveType,
                year
            });
        }

        if (!balance) {
            return {
                hasBalance: false,
                available: 0,
                required: days,
                message: 'Leave balance not found for this leave type'
            };
        }

        const specificAvailable = balance.totalAllocated + balance.carriedForward - balance.used;
        
        // For exempt leave types, only check their specific balance
        if (isExemptLeave) {
            const hasBalance = specificAvailable >= days;
            return {
                hasBalance,
                available: specificAvailable,
                required: days,
                message: hasBalance 
                    ? 'Sufficient balance available'
                    : `Insufficient ${leaveType} balance. Available: ${specificAvailable} days, Required: ${days} days`
            };
        }

        // For non-exempt leaves, check both specific balance AND annual quota
        let annualQuota = await LeaveBalance.findOne({
            employee: employeeId,
            leaveType: 'Annual Leave Quota',
            year
        });

        if (!annualQuota) {
            // Create annual quota if it doesn't exist
            annualQuota = new LeaveBalance({
                employee: employeeId,
                leaveType: 'Annual Leave Quota',
                year,
                totalAllocated: 15, // Ghana law: 15 days annual leave
                used: 0,
                pending: 0,
                carriedForward: 0,
                remaining: 15,
                transactions: [{
                    type: 'allocated',
                    amount: 15,
                    date: new Date(),
                    description: 'Annual leave quota as per Ghana Labor Law'
                }]
            });
            await annualQuota.save();
        }

        const quotaAvailable = annualQuota.totalAllocated + annualQuota.carriedForward - annualQuota.used;
        const hasSpecificBalance = specificAvailable >= days;
        const hasQuotaBalance = quotaAvailable >= days;
        const hasBalance = hasSpecificBalance && hasQuotaBalance;

        let message = '';
        if (!hasSpecificBalance) {
            message = `Insufficient ${leaveType} balance. Available: ${specificAvailable} days, Required: ${days} days`;
        } else if (!hasQuotaBalance) {
            message = `Insufficient annual leave quota. Available: ${quotaAvailable} days, Required: ${days} days. (Ghana Labor Law: 15 days annual limit)`;
        } else {
            message = 'Sufficient balance available';
        }

        return {
            hasBalance,
            available: Math.min(specificAvailable, quotaAvailable),
            required: days,
            message,
            quotaAvailable,
            specificAvailable
        };
    } catch (error) {
        console.error('Error checking balance:', error);
        return {
            hasBalance: false,
            available: 0,
            required: days,
            message: 'Error checking leave balance'
        };
    }
}

async function reserveLeaveBalance(employeeId: string, leaveType: string, days: number, leaveId: string, year: number = new Date().getFullYear()) {
    try {
        // Ghana Labor Law: Sick Leave and Maternity Leave don't count against annual quota
        const exemptLeaveTypes = ['Sick Leave', 'Maternity Leave'];
        const isExemptLeave = exemptLeaveTypes.includes(leaveType);

        // Reserve from specific leave type balance
        const balance = await LeaveBalance.findOne({
            employee: employeeId,
            leaveType,
            year
        });

        if (!balance) {
            throw new Error('Leave balance not found');
        }

        balance.pending += days;
        balance.remaining = balance.totalAllocated + balance.carriedForward - balance.used - balance.pending;
        balance.lastUpdated = new Date();

        balance.transactions.push({
            type: 'used',
            amount: days,
            date: new Date(),
            description: `Reserved for pending leave request`,
            leaveId: new mongoose.Types.ObjectId(leaveId)
        });

        await balance.save();

        // For non-exempt leaves, also reserve from annual quota
        if (!isExemptLeave) {
            const annualQuota = await LeaveBalance.findOne({
                employee: employeeId,
                leaveType: 'Annual Leave Quota',
                year
            });

            if (annualQuota) {
                annualQuota.pending += days;
                annualQuota.remaining = annualQuota.totalAllocated + annualQuota.carriedForward - annualQuota.used - annualQuota.pending;
                annualQuota.lastUpdated = new Date();

                annualQuota.transactions.push({
                    type: 'used',
                    amount: days,
                    date: new Date(),
                    description: `Reserved from annual quota for ${leaveType} request`,
                    leaveId: new mongoose.Types.ObjectId(leaveId)
                });

                await annualQuota.save();
            }
        }

        return true;
    } catch (error) {
        console.error('Error reserving balance:', error);
        return false;
    }
}

async function recordLeaveBalanceUsage(employeeId: string, leaveType: string, days: number, leaveId: string, year: number = new Date().getFullYear()) {
    try {
        // Ghana Labor Law: Sick Leave and Maternity Leave don't count against annual quota
        const exemptLeaveTypes = ['Sick Leave', 'Maternity Leave'];
        const isExemptLeave = exemptLeaveTypes.includes(leaveType);

        // Record usage in specific leave type balance
        const balance = await LeaveBalance.findOne({
            employee: employeeId,
            leaveType,
            year
        });

        if (!balance) {
            throw new Error('Leave balance not found');
        }

        balance.used += days;
        balance.remaining = balance.totalAllocated + balance.carriedForward - balance.used - balance.pending;
        balance.lastUpdated = new Date();

        balance.transactions.push({
            type: 'used',
            amount: days,
            date: new Date(),
            description: `Leave approved and balance used`,
            leaveId: new mongoose.Types.ObjectId(leaveId)
        });

        await balance.save();

        // For non-exempt leaves, also record usage from annual quota
        if (!isExemptLeave) {
            const annualQuota = await LeaveBalance.findOne({
                employee: employeeId,
                leaveType: 'Annual Leave Quota',
                year
            });

            if (annualQuota) {
                annualQuota.used += days;
                annualQuota.remaining = annualQuota.totalAllocated + annualQuota.carriedForward - annualQuota.used - annualQuota.pending;
                annualQuota.lastUpdated = new Date();

                annualQuota.transactions.push({
                    type: 'used',
                    amount: days,
                    date: new Date(),
                    description: `Annual quota used for approved ${leaveType}`,
                    leaveId: new mongoose.Types.ObjectId(leaveId)
                });

                await annualQuota.save();
            }
        }

        return true;
    } catch (error) {
        console.error('Error recording balance usage:', error);
        return false;
    }
}

async function releaseReservedBalance(employeeId: string, leaveType: string, days: number, leaveId: string, year: number = new Date().getFullYear()) {
    try {
        // Ghana Labor Law: Sick Leave and Maternity Leave don't count against annual quota
        const exemptLeaveTypes = ['Sick Leave', 'Maternity Leave'];
        const isExemptLeave = exemptLeaveTypes.includes(leaveType);

        // Release from specific leave type balance
        const balance = await LeaveBalance.findOne({
            employee: employeeId,
            leaveType,
            year
        });

        if (!balance) {
            throw new Error('Leave balance not found');
        }

        balance.pending -= days;
        balance.remaining = balance.totalAllocated + balance.carriedForward - balance.used - balance.pending;
        balance.lastUpdated = new Date();

        balance.transactions.push({
            type: 'adjustment',
            amount: days,
            date: new Date(),
            description: `Balance released - leave request rejected/cancelled`,
            leaveId: new mongoose.Types.ObjectId(leaveId)
        });

        await balance.save();

        // For non-exempt leaves, also release from annual quota
        if (!isExemptLeave) {
            const annualQuota = await LeaveBalance.findOne({
                employee: employeeId,
                leaveType: 'Annual Leave Quota',
                year
            });

            if (annualQuota) {
                annualQuota.pending -= days;
                annualQuota.remaining = annualQuota.totalAllocated + annualQuota.carriedForward - annualQuota.used - annualQuota.pending;
                annualQuota.lastUpdated = new Date();

                annualQuota.transactions.push({
                    type: 'adjustment',
                    amount: days,
                    date: new Date(),
                    description: `Annual quota released - ${leaveType} request rejected/cancelled`,
                    leaveId: new mongoose.Types.ObjectId(leaveId)
                });

                await annualQuota.save();
            }
        }

        return true;
    } catch (error) {
        console.error('Error releasing reserved balance:', error);
        return false;
    }
}

async function initializeEmployeeBalances(employeeId: string, year: number) {
    try {
        const policies = await LeavePolicy.find({ isActive: true });
        
        for (const policy of policies) {
            const existingBalance = await LeaveBalance.findOne({
                employee: employeeId,
                leaveType: policy.leaveType,
                year
            });

            if (!existingBalance) {
                const balance = new LeaveBalance({
                    employee: employeeId,
                    leaveType: policy.leaveType,
                    year,
                    totalAllocated: policy.defaultAllocation,
                    used: 0,
                    pending: 0,
                    carriedForward: 0,
                    remaining: policy.defaultAllocation,
                    transactions: [{
                        type: 'allocated',
                        amount: policy.defaultAllocation,
                        date: new Date(),
                        description: 'Initial allocation for the year'
                    }]
                });

                await balance.save();
            }
        }

        // Ghana Labor Law: Create Annual Leave Quota (15 days per year)
        const existingQuota = await LeaveBalance.findOne({
            employee: employeeId,
            leaveType: 'Annual Leave Quota',
            year
        });

        if (!existingQuota) {
            const annualQuota = new LeaveBalance({
                employee: employeeId,
                leaveType: 'Annual Leave Quota',
                year,
                totalAllocated: 15, // Ghana law: 15 days annual leave
                used: 0,
                pending: 0,
                carriedForward: 0,
                remaining: 15,
                transactions: [{
                    type: 'allocated',
                    amount: 15,
                    date: new Date(),
                    description: 'Annual leave quota as per Ghana Labor Law (15 days)'
                }]
            });

            await annualQuota.save();
        }
    } catch (error) {
        console.error('Error initializing employee balances:', error);
    }
}

async function calculateLeaveStats(currentUser: any) {
    try {
        const currentDate = new Date();
        const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

        let baseQuery: any = { isActive: true };

        // Apply role-based filtering for stats
        if (currentUser.role === 'staff') {
            baseQuery.employee = currentUser._id;
        } else if (currentUser.role === 'department_head') {
            baseQuery.department = currentUser.department;
        }

        const [
            totalApplications,
            pendingApprovals,
            approvedThisMonth,
            rejectedThisMonth,
            upcomingLeaves,
            onLeaveToday
        ] = await Promise.all([
            Leave.countDocuments(baseQuery),
            Leave.countDocuments({ ...baseQuery, status: 'pending' }),
            Leave.countDocuments({ 
                ...baseQuery,
                status: 'approved', 
                submissionDate: { $gte: currentMonth, $lt: nextMonth }
            }),
            Leave.countDocuments({ 
                ...baseQuery,
                status: 'rejected', 
                submissionDate: { $gte: currentMonth, $lt: nextMonth }
            }),
            Leave.countDocuments({ 
                ...baseQuery,
                status: 'approved', 
                startDate: { $gt: currentDate }
            }),
            Leave.countDocuments({ 
                ...baseQuery,
                status: 'approved', 
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate }
            })
        ]);

        return {
            totalApplications,
            pendingApprovals,
            approvedThisMonth,
            rejectedThisMonth,
            upcomingLeaves,
            onLeaveToday
        };
    } catch (error) {
        console.error('Error calculating stats:', error);
        return {
            totalApplications: 0,
            pendingApprovals: 0,
            approvedThisMonth: 0,
            rejectedThisMonth: 0,
            upcomingLeaves: 0,
            onLeaveToday: 0
        };
    }
}