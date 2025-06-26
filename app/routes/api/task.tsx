import { type LoaderFunction, type ActionFunction } from "react-router";
import mongoose from '~/mongoose.server';
import Task, { type TaskInterface } from '~/model/task';
import Registration from '~/model/registration';
import TaskActivity from '~/model/taskActivity';
import Departments from '~/model/department';
import { getSession } from "~/session";

// Loader function - handles GET requests
export const loader: LoaderFunction = async ({ request }) => {
    try {
        // Ensure database connection
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/addentech_v2");
        }
        
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
        const taskId = url.searchParams.get("taskId");
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const status = url.searchParams.get("status");
        const priority = url.searchParams.get("priority");
        const category = url.searchParams.get("category");
        const department = url.searchParams.get("department");
        const assignedTo = url.searchParams.get("assignedTo");
        const createdBy = url.searchParams.get("createdBy");
        const search = url.searchParams.get("search");
        const sortBy = url.searchParams.get("sortBy") || "dueDate";
        const sortOrder = url.searchParams.get("sortOrder") || "asc";
        const dueDateStart = url.searchParams.get("dueDateStart");
        const dueDateEnd = url.searchParams.get("dueDateEnd");

        switch (operation) {
            case "getTask":
                if (!taskId) {
                    return Response.json({
                        message: "Task ID is required",
                        success: false,
                        status: 400
                    }, { status: 400 });
                }

                const task = await getTaskById(taskId, currentUser);
                if (!task) {
                    return Response.json({
                        message: "Task not found or access denied",
                        success: false,
                        status: 404
                    }, { status: 404 });
                }

                return Response.json({
                    message: "Task fetched successfully",
                    success: true,
                    data: task,
                    status: 200
                });

            case "getStats":
                const stats = await calculateTaskStats(currentUser);
                
                return Response.json({
                    message: "Task statistics fetched successfully",
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

            case "getActivities":
                if (!taskId) {
                    return Response.json({
                        message: "Task ID is required",
                        success: false,
                        status: 400
                    }, { status: 400 });
                }

                const activities = await TaskActivity.find({ taskId })
                    .populate('userId', 'firstName lastName email')
                    .sort({ timestamp: -1 })
                    .limit(50);

                return Response.json({
                    message: "Task activities fetched successfully",
                    success: true,
                    data: activities,
                    status: 200
                });

            default:
                // Get tasks with filters and role-based access
                const query: any = { isActive: true };

                // Apply role-based filtering
                if (currentUser.role === 'staff') {
                    // Staff can only see tasks assigned to them
                    query.assignedTo = { $in: [currentUser._id] };
                } else if (currentUser.role === 'department_head') {
                    // Department heads can see all tasks in their department
                    query.department = currentUser.department._id || currentUser.department;
                }
                // admin and manager can see all tasks (no additional filter)

                // Apply filters
                if (status && status !== 'all') {
                    query.status = status;
                }

                if (priority && priority !== 'all') {
                    query.priority = priority;
                }

                if (category && category !== 'all') {
                    query.category = category;
                }

                if (department && department !== 'all') {
                    query.department = department;
                }

                if (assignedTo && assignedTo !== 'all') {
                    query.assignedTo = { $in: [assignedTo] };
                }

                if (createdBy && createdBy !== 'all') {
                    query.createdBy = createdBy;
                }

                // Date range filtering
                if (dueDateStart || dueDateEnd) {
                    query.dueDate = {};
                    if (dueDateStart) query.dueDate.$gte = new Date(dueDateStart);
                    if (dueDateEnd) query.dueDate.$lte = new Date(dueDateEnd);
                }

                // Search functionality
                if (search && search.trim()) {
                    const searchRegex = { $regex: search.trim(), $options: 'i' };
                    query.$and = query.$and || [];
                    query.$and.push({
                        $or: [
                            { title: searchRegex },
                            { description: searchRegex },
                            { category: searchRegex },
                            { tags: searchRegex }
                        ]
                    });
                }

                // Get total count
                const total = await Task.countDocuments(query);

                // Build sort object
                const sortObj: any = {};
                sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

                // Get tasks with pagination
                const tasks = await Task.find(query)
                    .populate('createdBy', 'firstName lastName email')
                    .populate('assignedTo', 'firstName lastName email role')
                    .populate('department', 'name')
                    .populate('parentTask', 'title')
                    .populate('comments.user', 'firstName lastName email')
                    .populate('comments.replies.user', 'firstName lastName email')
                    .sort(sortObj)
                    .limit(limit)
                    .skip((page - 1) * limit)
                    .lean();

                // Calculate stats
                const taskStats = await calculateTaskStats(currentUser);

                return Response.json({
                    message: "Tasks fetched successfully",
                    success: true,
                    data: tasks,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(total / limit),
                        totalTasks: total,
                        hasNextPage: page < Math.ceil(total / limit),
                        hasPrevPage: page > 1
                    },
                    stats: taskStats,
                    status: 200
                });
        }

    } catch (error: any) {
        console.error("Error in tasks loader:", error);
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
        // Ensure database connection
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/addentech_v2");
        }
        
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
            case "createTask":
                return await createTask(formData, currentUser);
            
            case "update":
            case "updateTask":
                return await updateTask(formData, currentUser);
            
            case "updateStatus":
            case "updateTaskStatus":
                return await updateTaskStatus(formData, currentUser);
            
            case "delete":
                return await deleteTask(formData, currentUser);

            case "assign":
                return await assignTask(formData, currentUser);

            case "addComment":
                return await addComment(formData, currentUser);

            case "addTimeEntry":
                return await addTimeEntry(formData, currentUser);

            case "createRecurring":
                return await createRecurringTask(formData, currentUser);

            default:
                return Response.json({
                    message: "Invalid operation",
                    success: false,
                    status: 400
                }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Error in tasks action:", error);
        return Response.json({
            message: error.message || "Internal server error",
            success: false,
            status: 500
        }, { status: 500 });
    }
};

// Helper Functions

async function createTask(formData: FormData, currentUser: any) {
    try {
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const category = formData.get("category") as string;
        const priority = formData.get("priority") as string;
        const dueDate = formData.get("dueDate") as string;
        const estimatedHours = parseInt(formData.get("estimatedHours") as string) || 0;
        const tags = formData.get("tags") as string;
        const departmentId = formData.get("department") as string;
        const assignedToIds = formData.get("assignedTo") as string;
        const approvalRequired = formData.get("approvalRequired") === "true";

        // Validate required fields
        if (!title || !description || !dueDate) {
            return Response.json({
                message: "Title, description, and due date are required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        // Parse assigned users
        const assignedTo = assignedToIds ? assignedToIds.split(',').filter(id => id.trim()) : [];

        // Parse tags
        const taskTags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        const status = formData.get("status") as string;

        const taskData = {
            title,
            description,
            category: category || 'General',
            priority: priority || 'medium',
            dueDate: new Date(dueDate),
            estimatedHours,
            tags: taskTags,
            department: departmentId || currentUser.department,
            assignedTo,
            approvalRequired: approvalRequired || false,
            createdBy: currentUser._id,
            lastModifiedBy: currentUser._id,
            status: status || 'not_started',
            isActive: true
        };

        const newTask = new Task(taskData);
        await newTask.save();
        
        // Populate the task for return
        await newTask.populate([
            { path: 'createdBy', select: 'firstName lastName email' },
            { path: 'assignedTo', select: 'firstName lastName email' },
            { path: 'department', select: 'name' }
        ]);

        // Log task creation activity
        await logActivity(
            newTask._id.toString(),
            currentUser.email,
            'created',
            `Task "${title}" created`,
            undefined,
            JSON.stringify({
                title,
                priority,
                dueDate,
                category
            }),
            {
                priority,
                estimatedHours
            }
        );

        return Response.json({
            message: "Task created successfully",
            success: true,
            data: newTask,
            status: 201
        });

    } catch (error: any) {
        console.error('Error creating task:', error);
        return Response.json({
            message: "Failed to create task",
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function updateTask(formData: FormData, currentUser: any) {
    try {
        const taskId = formData.get("taskId") as string;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const category = formData.get("category") as string;
        const priority = formData.get("priority") as string;
        const dueDate = formData.get("dueDate") as string;
        const estimatedHours = parseInt(formData.get("estimatedHours") as string) || 0;
        const tags = formData.get("tags") as string;

        if (!taskId) {
            return Response.json({
                message: "Task ID is required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return Response.json({
                message: "Task not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        // Check permissions
        if (!canUserUpdateTask(task, currentUser)) {
            return Response.json({
                message: "You don't have permission to update this task",
                success: false,
                status: 403
            }, { status: 403 });
        }

        // Parse tags
        const taskTags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : task.tags;

        const updateData: any = {
            lastModifiedBy: currentUser._id,
            updatedAt: new Date()
        };

        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (category) updateData.category = category;
        if (priority) updateData.priority = priority;
        if (dueDate) updateData.dueDate = new Date(dueDate);
        if (estimatedHours >= 0) updateData.estimatedHours = estimatedHours;
        if (taskTags) updateData.tags = taskTags;

        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            updateData,
            { new: true }
        ).populate([
            { path: 'createdBy', select: 'firstName lastName email' },
            { path: 'assignedTo', select: 'firstName lastName email' },
            { path: 'department', select: 'name' }
        ]);

        // Log task update activity
        const changeDescriptions = [];
        if (title && title !== task.title) changeDescriptions.push(`title updated`);
        if (description && description !== task.description) changeDescriptions.push(`description updated`);
        if (priority && priority !== task.priority) changeDescriptions.push(`priority changed to ${priority}`);
        if (dueDate && new Date(dueDate).getTime() !== task.dueDate.getTime()) changeDescriptions.push(`due date updated`);

        if (changeDescriptions.length > 0) {
            await logActivity(
                taskId,
                currentUser.email,
                'updated',
                `Task updated: ${changeDescriptions.join(', ')}`,
                undefined,
                JSON.stringify(updateData),
                {
                    priority: updateData.priority,
                    estimatedHours: updateData.estimatedHours
                }
            );
        }

        return Response.json({
            message: "Task updated successfully",
            success: true,
            data: updatedTask,
            status: 200
        });

    } catch (error: any) {
        console.error('Error updating task:', error);
        return Response.json({
            message: "Failed to update task",
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function updateTaskStatus(formData: FormData, currentUser: any) {
    try {
        const taskId = formData.get("taskId") as string;
        const status = formData.get("status") as string;
        const comments = formData.get("comments") as string;

        if (!taskId || !status) {
            return Response.json({
                message: "Task ID and status are required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return Response.json({
                message: "Task not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        // Check permissions
        if (!canUserChangeStatus(task, currentUser)) {
            return Response.json({
                message: "You don't have permission to change this task status",
                success: false,
                status: 403
            }, { status: 403 });
        }

        const oldStatus = task.status;
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            {
                status,
                lastModifiedBy: currentUser._id,
                updatedAt: new Date(),
                ...(status === 'completed' && { completedAt: new Date() })
            },
            { new: true }
        ).populate([
            { path: 'createdBy', select: 'firstName lastName email' },
            { path: 'assignedTo', select: 'firstName lastName email' },
            { path: 'department', select: 'name' }
        ]);

        // Log status change activity
        await logActivity(
            taskId,
            currentUser.email,
            'status_changed',
            `Task status changed from ${oldStatus} to ${status}${comments ? ` - ${comments}` : ''}`,
            oldStatus,
            status,
            {
                comments
            }
        );

        return Response.json({
            message: "Task status updated successfully",
            success: true,
            data: updatedTask,
            status: 200
        });

    } catch (error: any) {
        console.error('Error updating task status:', error);
        return Response.json({
            message: "Failed to update task status",
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function deleteTask(formData: FormData, currentUser: any) {
    try {
        const taskId = formData.get("taskId") as string;

        if (!taskId) {
            return Response.json({
                message: "Task ID is required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return Response.json({
                message: "Task not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        // Check permissions
        if (!canUserUpdateTask(task, currentUser)) {
            return Response.json({
                message: "You don't have permission to delete this task",
                success: false,
                status: 403
            }, { status: 403 });
        }

        // Soft delete
        await Task.findByIdAndUpdate(taskId, {
            isActive: false,
            lastModifiedBy: currentUser._id,
            updatedAt: new Date()
        });

        // Log deletion activity
        await logActivity(
            taskId,
            currentUser.email,
            'deleted',
            `Task "${task.title}" deleted`,
            undefined,
            'deleted'
        );

        return Response.json({
            message: "Task deleted successfully",
            success: true,
            status: 200
        });

    } catch (error: any) {
        console.error('Error deleting task:', error);
        return Response.json({
            message: "Failed to delete task",
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function assignTask(formData: FormData, currentUser: any) {
    try {
        const taskId = formData.get("taskId") as string;
        const assignedToIds = formData.get("assignedTo") as string;
        const instructions = formData.get("instructions") as string;

        if (!taskId || !assignedToIds) {
            return Response.json({
                message: "Task ID and assignee are required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return Response.json({
                message: "Task not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        // Check permissions
        if (!canUserAssignTasks(task, currentUser)) {
            return Response.json({
                message: "You don't have permission to assign this task",
                success: false,
                status: 403
            }, { status: 403 });
        }

        // Parse assigned users
        const assignedTo = assignedToIds.split(',').filter(id => id.trim());

        // Validate assignees exist
        const assignees = await Registration.find({ _id: { $in: assignedTo } });
        if (assignees.length !== assignedTo.length) {
            return Response.json({
                message: "One or more assignees not found",
                success: false,
                status: 400
            }, { status: 400 });
        }

        // Update assignment
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            {
                assignedTo,
                lastModifiedBy: currentUser._id,
                updatedAt: new Date(),
                $push: {
                    assignmentHistory: {
                        assignedBy: currentUser._id,
                        assignedTo: assignedTo[0], // Primary assignee
                        assignedAt: new Date(),
                        assignmentLevel: (currentUser.role === 'admin' || currentUser.role === 'manager') ? 'initial' : 'delegation',
                        instructions
                    }
                }
            },
            { new: true }
        ).populate([
            { path: 'createdBy', select: 'firstName lastName email' },
            { path: 'assignedTo', select: 'firstName lastName email' },
            { path: 'department', select: 'name' }
        ]);

        // Log assignment activity
        const assigneeNames = assignees.map(a => `${a.firstName} ${a.lastName}`).join(', ');
        await logActivity(
            taskId,
            currentUser.email,
            'assigned',
            `Task assigned to ${assigneeNames}${instructions ? ` - ${instructions}` : ''}`,
            undefined,
            assigneeNames,
            {
                assignedTo,
                instructions
            }
        );

        return Response.json({
            message: "Task assigned successfully",
            success: true,
            data: updatedTask,
            status: 200
        });

    } catch (error: any) {
        console.error('Error assigning task:', error);
        return Response.json({
            message: "Failed to assign task",
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function addComment(formData: FormData, currentUser: any) {
    try {
        const taskId = formData.get("taskId") as string;
        const message = formData.get("message") as string;
        const parentCommentId = formData.get("parentCommentId") as string;

        if (!taskId || !message) {
            return Response.json({
                message: "Task ID and message are required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return Response.json({
                message: "Task not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        // Check if user can comment
        if (!canUserComment(task, currentUser)) {
            return Response.json({
                message: "You don't have permission to comment on this task",
                success: false,
                status: 403
            }, { status: 403 });
        }

        const comment = {
            user: currentUser._id,
            message,
            timestamp: new Date(),
            parentComment: parentCommentId || null,
            replies: []
        };

        // If it's a reply, add to parent comment's replies
        if (parentCommentId) {
            const parentComment = task.comments.id(parentCommentId);
            if (parentComment) {
                parentComment.replies = parentComment.replies || [];
                parentComment.replies.push(comment as any);
            } else {
                return Response.json({
                    message: "Parent comment not found",
                    success: false,
                    status: 404
                }, { status: 404 });
            }
        } else {
            // Add as top-level comment
            task.comments.push(comment as any);
        }

        await task.save();

        // Log comment activity
        await logActivity(
            taskId,
            currentUser.email,
            'commented',
            `${parentCommentId ? 'Replied to comment' : 'Added comment'}: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
            undefined,
            message
        );

        return Response.json({
            message: "Comment added successfully",
            success: true,
            status: 200
        });

    } catch (error: any) {
        console.error('Error adding comment:', error);
        return Response.json({
            message: "Failed to add comment",
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function addTimeEntry(formData: FormData, currentUser: any) {
    try {
        const taskId = formData.get("taskId") as string;
        const hours = parseFloat(formData.get("hours") as string);
        const description = formData.get("description") as string;
        const date = formData.get("date") as string;

        if (!taskId || !hours || hours <= 0) {
            return Response.json({
                message: "Task ID and valid hours are required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return Response.json({
                message: "Task not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        const timeEntry = {
            user: currentUser._id,
            hours,
            date: date ? new Date(date) : new Date(),
            description: description || ''
        };

        task.timeEntries.push(timeEntry as any);
        task.actualHours = (task.actualHours || 0) + hours;
        await task.save();

        // Log time entry activity
        await logActivity(
            taskId,
            currentUser.email,
            'time_logged',
            `Logged ${hours} hours${description ? ` - ${description}` : ''}`,
            undefined,
            hours.toString(),
            {
                timeLogged: hours
            }
        );

        return Response.json({
            message: "Time entry added successfully",
            success: true,
            status: 200
        });

    } catch (error: any) {
        console.error('Error adding time entry:', error);
        return Response.json({
            message: "Failed to add time entry",
            success: false,
            status: 500
        }, { status: 500 });
    }
}

async function createRecurringTask(formData: FormData, currentUser: any) {
    try {
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const frequency = formData.get("frequency") as string;
        const interval = parseInt(formData.get("interval") as string) || 1;
        const endDate = formData.get("endDate") as string;

        if (!title || !description || !frequency) {
            return Response.json({
                message: "Title, description, and frequency are required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const recurringTaskData = {
            title,
            description,
            category: formData.get("category") || 'General',
            priority: formData.get("priority") || 'medium',
            department: formData.get("department") || currentUser.department,
            createdBy: currentUser._id,
            lastModifiedBy: currentUser._id,
            isRecurring: true,
            recurringPattern: {
                frequency,
                interval,
                endDate: endDate ? new Date(endDate) : null
            },
            status: 'pending',
            isActive: true
        };

        const newTask = new Task(recurringTaskData);
        await newTask.save();

        return Response.json({
            message: "Recurring task created successfully",
            success: true,
            data: newTask,
            status: 201
        });

    } catch (error: any) {
        console.error('Error creating recurring task:', error);
        return Response.json({
            message: "Failed to create recurring task",
            success: false,
            status: 500
        }, { status: 500 });
    }
}

// Utility Functions

async function getTaskById(id: string, currentUser: any): Promise<TaskInterface | null> {
    try {
        const task = await Task.findById(id)
            .populate('createdBy', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email')
            .populate('department', 'name')
            .populate('parentTask', 'title')
            .populate('dependencies', 'title status')
            .populate('comments.user', 'firstName lastName email')
            .populate('comments.replies.user', 'firstName lastName email')
            .populate('timeEntries.user', 'firstName lastName email')
            .populate('assignmentHistory.assignedBy', 'firstName lastName email role')
            .populate('assignmentHistory.assignedTo', 'firstName lastName email role')
            .lean();

        if (!task) return null;

        // Role-based access check
        if (currentUser.role === 'staff') {
            // Staff can only see tasks assigned to them
            const isAssigned = (task as any).assignedTo?.some((assignee: any) => 
                assignee._id.toString() === currentUser._id.toString());
            
            if (!isAssigned) return null;
        } else if (currentUser.role === 'department_head') {
            // Department heads can see all tasks in their department
            const taskDepartmentId = (task as any).department?._id?.toString();
            const userDepartmentId = (currentUser.department._id || currentUser.department).toString();
            if (taskDepartmentId !== userDepartmentId) return null;
        }

        return task as any;
    } catch (error) {
        console.error('Error fetching task:', error);
        return null;
    }
}

async function calculateTaskStats(currentUser: any): Promise<any> {
    try {
        let matchQuery: any = { isActive: true };

        // Apply role-based filtering to stats
        if (currentUser.role === 'staff') {
            // Staff can only see stats for tasks assigned to them
            matchQuery.assignedTo = { $in: [currentUser._id] };
        } else if (currentUser.role === 'department_head') {
            // Department heads can see stats for all tasks in their department
            matchQuery.department = currentUser.department._id || currentUser.department;
        }

        const currentDate = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const weekStart = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
        const weekEnd = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 6));

        // Get detailed status counts
        const [
            totalTasks,
            notStarted,
            inProgress,
            underReview,
            completed,
            onHold,
            overdue,
            dueToday,
            dueThisWeek,
            highPriority,
            totalHoursLogged
        ] = await Promise.all([
            Task.countDocuments(matchQuery),
            Task.countDocuments({ ...matchQuery, status: 'not_started' }),
            Task.countDocuments({ ...matchQuery, status: 'in_progress' }),
            Task.countDocuments({ ...matchQuery, status: 'under_review' }),
            Task.countDocuments({ ...matchQuery, status: 'completed' }),
            Task.countDocuments({ ...matchQuery, status: 'on_hold' }),
            Task.countDocuments({ 
                ...matchQuery, 
                status: { $ne: 'completed' },
                dueDate: { $lt: new Date() } 
            }),
            Task.countDocuments({ 
                ...matchQuery,
                status: { $ne: 'completed' },
                dueDate: { $gte: today, $lt: tomorrow }
            }),
            Task.countDocuments({ 
                ...matchQuery,
                status: { $ne: 'completed' },
                dueDate: { $gte: weekStart, $lte: weekEnd }
            }),
            Task.countDocuments({ 
                ...matchQuery, 
                $or: [
                    { priority: 'high' },
                    { priority: 'critical' }
                ]
            }),
            Task.aggregate([
                { $match: matchQuery },
                { $group: { _id: null, total: { $sum: '$actualHours' } } }
            ]).then(result => result[0]?.total || 0)
        ]);

        // Calculate average completion percentage
        const tasksWithProgress = await Task.find(matchQuery, 'progress').lean();
        const averageCompletion = tasksWithProgress.length > 0 
            ? Math.round(tasksWithProgress.reduce((sum, task) => sum + (task.progress || 0), 0) / tasksWithProgress.length)
            : 0;

        // Generate chart data for the last 7 days
        const chartData = await generateTaskChartData(matchQuery);

        return {
            totalTasks,
            notStarted,
            inProgress,
            underReview,
            completed,
            onHold,
            overdue,
            dueToday,
            dueThisWeek,
            highPriority,
            averageCompletion,
            totalHoursLogged,
            chartData
        };
    } catch (error) {
        console.error('Error calculating task stats:', error);
        return {
            totalTasks: 0,
            notStarted: 0,
            inProgress: 0,
            underReview: 0,
            completed: 0,
            onHold: 0,
            overdue: 0,
            dueToday: 0,
            dueThisWeek: 0,
            highPriority: 0,
            averageCompletion: 0,
            totalHoursLogged: 0,
            chartData: null
        };
    }
}

async function generateTaskChartData(matchQuery: any) {
    try {
        const labels = [];
        const completedData = [];
        const createdData = [];
        
        // Generate data for the last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
            
            // Count tasks completed on this day
            const completedCount = await Task.countDocuments({
                ...matchQuery,
                status: 'completed',
                updatedAt: { $gte: startOfDay, $lte: endOfDay }
            });
            
            // Count tasks created on this day
            const createdCount = await Task.countDocuments({
                ...matchQuery,
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            });
            
            completedData.push(completedCount);
            createdData.push(createdCount);
        }

        return {
            labels,
            datasets: [
                {
                    label: 'Tasks Completed',
                    data: completedData,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                },
                {
                    label: 'Tasks Created',
                    data: createdData,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                }
            ]
        };
    } catch (error) {
        console.error('Error generating chart data:', error);
        return null;
    }
}

async function getDashboardData(currentUser: any): Promise<any> {
    try {
        const stats = await calculateTaskStats(currentUser);
        
        // Get recent tasks based on role
        let recentTasksQuery: any = { isActive: true };
        
        if (currentUser.role === 'staff') {
            // Staff can only see tasks assigned to them
            recentTasksQuery.assignedTo = { $in: [currentUser._id] };
        } else if (currentUser.role === 'department_head') {
            // Department heads can see all tasks in their department
            recentTasksQuery.department = currentUser.department._id || currentUser.department;
        }

        const recentTasks = await Task.find(recentTasksQuery)
            .populate('assignedTo', 'firstName lastName')
            .populate('createdBy', 'firstName lastName')
            .sort({ updatedAt: -1 })
            .limit(5)
            .lean();

        // Get upcoming deadlines
        const upcomingDeadlines = await Task.find({
            ...recentTasksQuery,
            status: { $ne: 'completed' },
            dueDate: { 
                $gte: new Date(), 
                $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
            }
        })
            .populate('assignedTo', 'firstName lastName')
            .sort({ dueDate: 1 })
            .limit(5)
            .lean();

        return {
            stats,
            recentTasks,
            upcomingDeadlines,
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

// Permission helper functions
function canUserUpdateTask(task: any, user: any): boolean {
    // Only admin, manager, and department heads can edit tasks
    if (user.role === 'admin' || user.role === 'manager') {
        return true;
    }
    
    if (user.role === 'department_head' && 
        task.department.toString() === (user.department._id || user.department).toString()) {
        return true;
    }
    
    // Staff members cannot edit tasks, only change status
    return false;
}

function canUserChangeStatus(task: any, user: any): boolean {
    if (user.role === 'admin' || user.role === 'manager') {
        return true;
    }
    
    if (user.role === 'department_head' && 
        task.department.toString() === (user.department._id || user.department).toString()) {
        return true;
    }
    
    // Staff can change status only if assigned to the task
    if (user.role === 'staff') {
        return task.assignedTo.some((assignee: any) => 
            assignee.toString() === user._id.toString());
    }
    
    return false;
}

function canUserAssignTasks(task: any, user: any): boolean {
    // Only admin, manager, and department heads can assign tasks
    if (user.role === 'admin' || user.role === 'manager') {
        return true;
    }
    
    if (user.role === 'department_head' && 
        task.department.toString() === (user.department._id || user.department).toString()) {
        return true;
    }
    
    // Staff cannot assign tasks
    return false;
}

function canUserComment(task: any, user: any): boolean {
    if (user.role === 'admin' || user.role === 'manager') {
        return true;
    }
    
    if (user.role === 'department_head' && 
        task.department.toString() === (user.department._id || user.department).toString()) {
        return true;
    }
    
    // Staff can comment only if assigned to the task
    if (user.role === 'staff') {
        return task.assignedTo.some((assignee: any) => 
            assignee.toString() === user._id.toString());
    }
    
    return false;
}

// Activity logging helper
async function logActivity(
    taskId: string,
    userEmail: string,
    activityType: string,
    description: string,
    previousValue?: string,
    newValue?: string,
    metadata?: any
): Promise<void> {
    try {
        const [user, task] = await Promise.all([
            Registration.findOne({ email: userEmail }),
            Task.findById(taskId)
        ]);

        if (!user || !task) return;

        await TaskActivity.create({
            taskId,
            userId: user._id,
            department: task.department,
            activityType,
            activityDescription: description,
            previousValue,
            newValue,
            metadata,
            timestamp: new Date()
        });

        console.log(`📊 Activity logged: ${description} by ${user.firstName} ${user.lastName}`);
    } catch (error) {
        console.error('Error logging activity:', error);
    }
} 