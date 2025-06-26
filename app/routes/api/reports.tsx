import type { LoaderFunction, ActionFunction } from "react-router";
import Registration from "~/model/registration";
import MonthlyReport from "~/model/monthlyReport";
import Departments from "~/model/department";

// Loader function - handles GET requests
export const loader: LoaderFunction = async ({ request }) => {
    try {
        const { getSession } = await import("~/session");
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
        const reportId = url.searchParams.get("id");
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const status = url.searchParams.get("status") || "all";
        const department = url.searchParams.get("department") || "all";
        const month = url.searchParams.get("month");
        const year = url.searchParams.get("year");
        const search = url.searchParams.get("search") || "";

        // Handle specific operations
        switch (operation) {
            case "getById":
                if (!reportId) {
                    return Response.json({ 
                        message: "Report ID is required", 
                        success: false, 
                        status: 400 
                    }, { status: 400 });
                }
                
                const report = await getReportById(reportId, currentUser);
                if (!report) {
                    return Response.json({ 
                        message: "Report not found or access denied", 
                        success: false, 
                        status: 404 
                    }, { status: 404 });
                }

                return Response.json({
                    message: "Report fetched successfully",
                    success: true,
                    data: report,
                    status: 200
                });

            case "getStats":
                const stats = await getReportStats(currentUser);
                
                return Response.json({
                    message: "Report statistics fetched successfully",
                    success: true,
                    data: stats,
                    status: 200
                });

            case "getDashboard":
                const dashboardData = await getDashboardData(currentUser);
                
                return Response.json({
                    message: "Dashboard data fetched successfully",
                    success: true,
                    data: dashboardData,
                    status: 200
                });

            case "getTemplates":
                const templates = await getDepartmentTemplates(currentUser);
                
                return Response.json({
                    message: "Department templates fetched successfully",
                    success: true,
                    data: templates,
                    status: 200
                });

            default:
                // Get reports with filters and role-based access
                const reports = await getReportsWithFilters(currentUser, {
                    page,
                    limit,
                    status,
                    department,
                    month,
                    year,
                    search
                });

                return Response.json({
                    message: "Reports fetched successfully",
                    success: true,
                    ...reports,
                    status: 200
                });
        }

    } catch (error: any) {
        console.error("Error in reports loader:", error);
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
        const { getSession } = await import("~/session");
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
                return await createReport(formData, currentUser);
            
            case "update":
                return await updateReport(formData, currentUser);
            
            case "delete":
                return await deleteReport(formData, currentUser);

            case "submit":
                return await submitReport(formData, currentUser);

            case "approve":
                return await approveReport(formData, currentUser);

            case "reject":
                return await rejectReport(formData, currentUser);

            default:
                return Response.json({
                    message: "Invalid operation",
                    success: false,
                    status: 400
                }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Error in reports action:", error);
        return Response.json({
            message: error.message || "Internal server error",
            success: false,
            status: 500
        }, { status: 500 });
    }
};

// Helper functions for CRUD operations
async function createReport(formData: FormData, currentUser: any) {
    try {
        const department = formData.get("department") as string;
        const month = parseInt(formData.get("month") as string);
        const year = parseInt(formData.get("year") as string);
        const type = formData.get("type") as string;
        const amount = parseFloat(formData.get("amount") as string);
        const notes = formData.get("notes") as string || "";
        const departmentType = formData.get("departmentType") as string;

        // Validate required fields
        if (!department || !month || !year || !type || amount === undefined || !departmentType) {
            return Response.json({
                message: "Missing required fields",
                success: false,
                status: 400
            }, { status: 400 });
        }

        // Check permissions
        if (!canUserCreateReport(currentUser, department)) {
            return Response.json({
                message: "You don't have permission to create reports for this department",
                success: false,
                status: 403
            }, { status: 403 });
        }

        // Check for duplicate report
        const existingReport = await MonthlyReport.findOne({
            department,
            month,
            year,
            type
        });

        if (existingReport) {
            return Response.json({
                message: "A report for this department, month, year, and type already exists",
                success: false,
                status: 409
            }, { status: 409 });
        }

        // Handle file attachments
        const attachmentCount = parseInt(formData.get("attachmentCount") as string || "0");
        const attachments = [];
        
        console.log(`Processing ${attachmentCount} attachments`);
        
        for (let i = 0; i < attachmentCount; i++) {
            const file = formData.get(`attachment_${i}`) as File;
            console.log(`Attachment ${i}:`, file ? { name: file.name, size: file.size, type: file.type } : 'null');
            
            if (file && file.size > 0) {
                // In a real application, you would save files to a storage service
                // For now, we'll just store file metadata
                const attachment = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    uploadedAt: new Date()
                };
                attachments.push(attachment);
                console.log(`Added attachment:`, attachment);
            }
        }
        
        console.log(`Total attachments processed: ${attachments.length}`);

        // Build report data
        const reportData: any = {
            department,
            month,
            year,
            type,
            amount,
            notes,
            departmentType,
            createdBy: currentUser._id,
            status: "draft",
            attachments
        };

        // Add department-specific fields
        addDepartmentSpecificFields(reportData, formData, departmentType);

        // Validate department-specific fields
        const validation = validateDepartmentFields(reportData, departmentType);
        if (!validation.isValid) {
            return Response.json({
                message: validation.message,
                success: false,
                status: 400
            }, { status: 400 });
        }

        const newReport = new MonthlyReport(reportData);
        const savedReport = await newReport.save();
        
        await savedReport.populate([
            { path: 'department', select: 'name' },
            { path: 'createdBy', select: 'firstName lastName email' }
        ]);

        return Response.json({
            message: "Report created successfully",
            success: true,
            data: savedReport,
            status: 201
        }, { status: 201 });

    } catch (error: any) {
        console.error("Error creating report:", error);
        return Response.json({
            message: error.message || "Failed to create report",
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function updateReport(formData: FormData, currentUser: any) {
    try {
        const reportId = formData.get("reportId") as string;
        
        if (!reportId) {
            return Response.json({
                message: "Report ID is required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const report = await MonthlyReport.findById(reportId);
        if (!report) {
            return Response.json({
                message: "Report not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        // Check permissions
        if (!canUserEditReport(currentUser, report)) {
            return Response.json({
                message: "You don't have permission to edit this report",
                success: false,
                status: 403
            }, { status: 403 });
        }

        // Update basic fields
        const fieldsToUpdate = ['type', 'amount', 'notes', 'status'];
        fieldsToUpdate.forEach(field => {
            const value = formData.get(field);
            if (value !== null) {
                if (field === 'amount') {
                    report.amount = parseFloat(value as string);
                } else {
                    (report as any)[field] = value;
                }
            }
        });

        // Update department-specific fields
        addDepartmentSpecificFields(report, formData, report.departmentType);

        // Validate department-specific fields
        const validation = validateDepartmentFields(report, report.departmentType);
        if (!validation.isValid) {
            return Response.json({
                message: validation.message,
                success: false,
                status: 400
            }, { status: 400 });
        }

        const updatedReport = await report.save();
        await updatedReport.populate([
            { path: 'department', select: 'name' },
            { path: 'createdBy', select: 'firstName lastName email' }
        ]);

        return Response.json({
            message: "Report updated successfully",
            success: true,
            data: updatedReport,
            status: 200
        });

    } catch (error: any) {
        console.error("Error updating report:", error);
        return Response.json({
            message: error.message || "Failed to update report",
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function deleteReport(formData: FormData, currentUser: any) {
    try {
        const reportId = formData.get("reportId") as string;
        
        if (!reportId) {
            return Response.json({
                message: "Report ID is required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const report = await MonthlyReport.findById(reportId);
        if (!report) {
            return Response.json({
                message: "Report not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        // Check permissions
        if (!canUserDeleteReport(currentUser, report)) {
            return Response.json({
                message: "You don't have permission to delete this report",
                success: false,
                status: 403
            }, { status: 403 });
        }

        await MonthlyReport.findByIdAndDelete(reportId);

        return Response.json({
            message: "Report deleted successfully",
            success: true,
            status: 200
        });

    } catch (error: any) {
        console.error("Error deleting report:", error);
        return Response.json({
            message: error.message || "Failed to delete report",
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function submitReport(formData: FormData, currentUser: any) {
    try {
        const reportId = formData.get("reportId") as string;
        
        const report = await MonthlyReport.findById(reportId);
        if (!report) {
            return Response.json({
                message: "Report not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        if (!canUserSubmitReport(currentUser, report)) {
            return Response.json({
                message: "You don't have permission to submit this report",
                success: false,
                status: 403
            }, { status: 403 });
        }

        if (report.status !== "draft") {
            return Response.json({
                message: "Only draft reports can be submitted",
                success: false,
                status: 400
            }, { status: 400 });
        }

        report.status = "submitted";
        await report.save();

        return Response.json({
            message: "Report submitted successfully",
            success: true,
            data: report,
            status: 200
        });

    } catch (error: any) {
        console.error("Error submitting report:", error);
        return Response.json({
            message: error.message || "Failed to submit report",
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function approveReport(formData: FormData, currentUser: any) {
    try {
        const reportId = formData.get("reportId") as string;
        const approvalNotes = formData.get("approvalNotes") as string || "";
        
        const report = await MonthlyReport.findById(reportId);
        if (!report) {
            return Response.json({
                message: "Report not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        if (!canUserApproveReport(currentUser, report)) {
            return Response.json({
                message: "You don't have permission to approve this report",
                success: false,
                status: 403
            }, { status: 403 });
        }

        if (report.status !== "submitted") {
            return Response.json({
                message: "Only submitted reports can be approved",
                success: false,
                status: 400
            }, { status: 400 });
        }

        report.status = "approved";
        if (approvalNotes) {
            report.notes = report.notes ? `${report.notes}\n\nApproval Notes: ${approvalNotes}` : `Approval Notes: ${approvalNotes}`;
        }
        await report.save();

        return Response.json({
            message: "Report approved successfully",
            success: true,
            data: report,
            status: 200
        });

    } catch (error: any) {
        console.error("Error approving report:", error);
        return Response.json({
            message: error.message || "Failed to approve report",
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function rejectReport(formData: FormData, currentUser: any) {
    try {
        const reportId = formData.get("reportId") as string;
        const rejectionReason = formData.get("rejectionReason") as string;
        
        if (!rejectionReason) {
            return Response.json({
                message: "Rejection reason is required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const report = await MonthlyReport.findById(reportId);
        if (!report) {
            return Response.json({
                message: "Report not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        if (!canUserApproveReport(currentUser, report)) {
            return Response.json({
                message: "You don't have permission to reject this report",
                success: false,
                status: 403
            }, { status: 403 });
        }

        if (report.status !== "submitted") {
            return Response.json({
                message: "Only submitted reports can be rejected",
                success: false,
                status: 400
            }, { status: 400 });
        }

        report.status = "rejected";
        report.notes = report.notes ? `${report.notes}\n\nRejection Reason: ${rejectionReason}` : `Rejection Reason: ${rejectionReason}`;
        await report.save();

        return Response.json({
            message: "Report rejected successfully",
            success: true,
            data: report,
            status: 200
        });

    } catch (error: any) {
        console.error("Error rejecting report:", error);
        return Response.json({
            message: error.message || "Failed to reject report",
            success: false,
            status: 500
        }, { status: 500 });
    }
}

// Utility functions
function addDepartmentSpecificFields(reportData: any, formData: FormData, departmentType: string) {
    switch (departmentType) {
        case "data":
            reportData.subscriptionPackage = formData.get("subscriptionPackage") as string;
            reportData.numberOfFirms = parseInt(formData.get("numberOfFirms") as string) || 0;
            reportData.numberOfUsers = parseInt(formData.get("numberOfUsers") as string) || 0;
            break;
        
        case "software":
            reportData.projectName = formData.get("projectName") as string;
            reportData.developmentHours = parseInt(formData.get("developmentHours") as string) || 0;
            reportData.projectStatus = formData.get("projectStatus") as string;
            break;
        
        case "customer_service":
            reportData.totalTickets = parseInt(formData.get("totalTickets") as string) || 0;
            reportData.resolvedTickets = parseInt(formData.get("resolvedTickets") as string) || 0;
            reportData.averageResponseTime = parseFloat(formData.get("averageResponseTime") as string) || 0;
            reportData.customerSatisfaction = parseFloat(formData.get("customerSatisfaction") as string) || 0;
            break;
        
        case "news":
            reportData.articlesPublished = parseInt(formData.get("articlesPublished") as string) || 0;
            reportData.totalViews = parseInt(formData.get("totalViews") as string) || 0;
            reportData.newSubscribers = parseInt(formData.get("newSubscribers") as string) || 0;
            reportData.revenue = parseFloat(formData.get("revenue") as string) || 0;
            break;
        
        case "general":
            reportData.metric1 = formData.get("metric1") as string;
            reportData.value1 = parseFloat(formData.get("value1") as string) || 0;
            reportData.metric2 = formData.get("metric2") as string;
            reportData.value2 = parseFloat(formData.get("value2") as string) || 0;
            break;
    }
}

function validateDepartmentFields(reportData: any, departmentType: string) {
    switch (departmentType) {
        case "data":
            if (!reportData.subscriptionPackage) {
                return { isValid: false, message: "Subscription package is required for data department" };
            }
            break;
        
        case "software":
            if (!reportData.projectName || !reportData.projectStatus) {
                return { isValid: false, message: "Project name and status are required for software department" };
            }
            break;
        
        case "customer_service":
            if (reportData.customerSatisfaction < 0 || reportData.customerSatisfaction > 100) {
                return { isValid: false, message: "Customer satisfaction must be between 0 and 100" };
            }
            break;
        
        case "general":
            if (!reportData.metric1 || !reportData.metric2) {
                return { isValid: false, message: "Both metric names are required for general department" };
            }
            break;
    }
    
    return { isValid: true, message: "" };
}

// Permission functions
function canUserCreateReport(user: any, departmentId: string): boolean {
    if (user.role === 'admin' || user.role === 'manager') {
        return true;
    }
    
    if (user.role === 'department_head' || user.role === 'staff') {
        return user.department._id.toString() === departmentId;
    }
    
    return false;
}

function canUserEditReport(user: any, report: any): boolean {
    if (user.role === 'admin') {
        return true;
    }
    
    if (user.role === 'manager') {
        return report.status !== 'approved';
    }
    
    if (user.role === 'department_head') {
        return report.department.toString() === user.department._id.toString() && report.status !== 'approved';
    }
    
    if (user.role === 'staff') {
        return report.createdBy.toString() === user._id.toString() && report.status === 'draft';
    }
    
    return false;
}

function canUserDeleteReport(user: any, report: any): boolean {
    if (user.role === 'admin') {
        return true;
    }
    
    if (user.role === 'department_head') {
        return report.department.toString() === user.department._id.toString() && report.status === 'draft';
    }
    
    if (user.role === 'staff') {
        return report.createdBy.toString() === user._id.toString() && report.status === 'draft';
    }
    
    return false;
}

function canUserSubmitReport(user: any, report: any): boolean {
    if (user.role === 'admin') {
        return true;
    }
    
    if (user.role === 'department_head') {
        return report.department.toString() === user.department._id.toString();
    }
    
    if (user.role === 'staff') {
        return report.createdBy.toString() === user._id.toString();
    }
    
    return false;
}

function canUserApproveReport(user: any, report: any): boolean {
    if (user.role === 'admin' || user.role === 'manager') {
        return true;
    }
    
    if (user.role === 'department_head') {
        return report.department.toString() === user.department._id.toString();
    }
    
    return false;
}

function canUserViewReport(user: any, report: any): boolean {
    if (user.role === 'admin' || user.role === 'manager') {
        return true;
    }
    
    if (user.role === 'department_head') {
        return report.department._id.toString() === user.department._id.toString();
    }
    
    if (user.role === 'staff') {
        return report.department._id.toString() === user.department._id.toString();
    }
    
    return false;
}

// Data fetching functions
async function getReportById(reportId: string, currentUser: any) {
    try {
        const report = await MonthlyReport.findById(reportId)
            .populate('department', 'name')
            .populate('createdBy', 'firstName lastName email')
            .lean();

        if (!report) return null;

        if (!canUserViewReport(currentUser, report)) {
            return null;
        }

        return report;
    } catch (error) {
        console.error('Error fetching report:', error);
        return null;
    }
}

async function getReportsWithFilters(currentUser: any, filters: any) {
    try {
        let query: any = {};

        // Apply role-based filtering
        if (currentUser.role === 'staff' || currentUser.role === 'department_head') {
            query.department = currentUser.department._id;
        }

        // Apply filters
        if (filters.status && filters.status !== 'all') {
            query.status = filters.status;
        }

        if (filters.department && filters.department !== 'all' && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
            query.department = filters.department;
        }

        if (filters.month) {
            query.month = parseInt(filters.month);
        }

        if (filters.year) {
            query.year = parseInt(filters.year);
        }

        if (filters.search && filters.search.trim()) {
            const searchRegex = { $regex: filters.search.trim(), $options: 'i' };
            query.$or = [
                { type: searchRegex },
                { notes: searchRegex }
            ];
        }

        const total = await MonthlyReport.countDocuments(query);

        const reports = await MonthlyReport.find(query)
            .populate('department', 'name')
            .populate('createdBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(filters.limit)
            .skip((filters.page - 1) * filters.limit)
            .lean();

        return {
            data: reports,
            pagination: {
                currentPage: filters.page,
                totalPages: Math.ceil(total / filters.limit),
                totalReports: total,
                hasNextPage: filters.page < Math.ceil(total / filters.limit),
                hasPrevPage: filters.page > 1
            }
        };
    } catch (error) {
        console.error('Error fetching reports:', error);
        return { data: [], pagination: {} };
    }
}

async function getReportStats(currentUser: any) {
    try {
        let matchQuery: any = {};

        if (currentUser.role === 'staff' || currentUser.role === 'department_head') {
            matchQuery.department = currentUser.department._id;
        }

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        const [
            totalReports,
            draftReports,
            submittedReports,
            approvedReports,
            rejectedReports,
            currentMonthReports
        ] = await Promise.all([
            MonthlyReport.countDocuments(matchQuery),
            MonthlyReport.countDocuments({ ...matchQuery, status: 'draft' }),
            MonthlyReport.countDocuments({ ...matchQuery, status: 'submitted' }),
            MonthlyReport.countDocuments({ ...matchQuery, status: 'approved' }),
            MonthlyReport.countDocuments({ ...matchQuery, status: 'rejected' }),
            MonthlyReport.countDocuments({ 
                ...matchQuery, 
                month: currentMonth, 
                year: currentYear 
            })
        ]);

        return {
            totalReports,
            draftReports,
            submittedReports,
            approvedReports,
            rejectedReports,
            currentMonthReports
        };
    } catch (error) {
        console.error('Error calculating report stats:', error);
        return {
            totalReports: 0,
            draftReports: 0,
            submittedReports: 0,
            approvedReports: 0,
            rejectedReports: 0,
            currentMonthReports: 0
        };
    }
}

async function getDashboardData(currentUser: any) {
    try {
        const stats = await getReportStats(currentUser);
        
        let recentReportsQuery: any = {};
        if (currentUser.role === 'staff' || currentUser.role === 'department_head') {
            recentReportsQuery.department = currentUser.department._id;
        }

        const recentReports = await MonthlyReport.find(recentReportsQuery)
            .populate('department', 'name')
            .populate('createdBy', 'firstName lastName')
            .sort({ updatedAt: -1 })
            .limit(5)
            .lean();

        let pendingApprovals: any[] = [];
        if (currentUser.role === 'admin' || currentUser.role === 'manager') {
            pendingApprovals = await MonthlyReport.find({ status: 'submitted' })
                .populate('department', 'name')
                .populate('createdBy', 'firstName lastName')
                .sort({ updatedAt: 1 })
                .limit(10)
                .lean();
        } else if (currentUser.role === 'department_head') {
            pendingApprovals = await MonthlyReport.find({ 
                status: 'submitted',
                department: currentUser.department._id
            })
                .populate('department', 'name')
                .populate('createdBy', 'firstName lastName')
                .sort({ updatedAt: 1 })
                .limit(10)
                .lean();
        }

        return {
            stats,
            recentReports,
            pendingApprovals,
            user: {
                name: `${currentUser.firstName} ${currentUser.lastName}`,
                role: currentUser.role,
                department: currentUser.department
            }
        };
    } catch (error) {
        console.error('Error getting dashboard data:', error);
        return { error: "Failed to load dashboard data" };
    }
}

async function getDepartmentTemplates(currentUser: any) {
    try {
        const departments = await Departments.find({}).select('name').lean();
        
        const templates = {
            data: {
                name: "Data Department",
                fields: [
                    { name: "subscriptionPackage", label: "Subscription Package", type: "text", required: true },
                    { name: "numberOfFirms", label: "Number of Firms", type: "number", required: true },
                    { name: "numberOfUsers", label: "Number of Users", type: "number", required: true }
                ]
            },
            software: {
                name: "Software Department",
                fields: [
                    { name: "projectName", label: "Project Name", type: "text", required: true },
                    { name: "developmentHours", label: "Development Hours", type: "number", required: true },
                    { name: "projectStatus", label: "Project Status", type: "select", required: true, 
                      options: ["planning", "in-progress", "testing", "completed"] }
                ]
            },
            customer_service: {
                name: "Customer Service Department",
                fields: [
                    { name: "totalTickets", label: "Total Tickets", type: "number", required: true },
                    { name: "resolvedTickets", label: "Resolved Tickets", type: "number", required: true },
                    { name: "averageResponseTime", label: "Average Response Time (hours)", type: "number", required: true },
                    { name: "customerSatisfaction", label: "Customer Satisfaction (%)", type: "number", required: true, min: 0, max: 100 }
                ]
            },
            news: {
                name: "News Department",
                fields: [
                    { name: "articlesPublished", label: "Articles Published", type: "number", required: true },
                    { name: "totalViews", label: "Total Views", type: "number", required: true },
                    { name: "newSubscribers", label: "New Subscribers", type: "number", required: true },
                    { name: "revenue", label: "Revenue", type: "number", required: true }
                ]
            },
            general: {
                name: "General Department",
                fields: [
                    { name: "metric1", label: "Metric 1 Name", type: "text", required: true },
                    { name: "value1", label: "Metric 1 Value", type: "number", required: true },
                    { name: "metric2", label: "Metric 2 Name", type: "text", required: true },
                    { name: "value2", label: "Metric 2 Value", type: "number", required: true }
                ]
            }
        };

        return {
            templates,
            departments
        };
    } catch (error) {
        console.error('Error getting department templates:', error);
        return { templates: {}, departments: [] };
    }
} 