import mongoose from 'mongoose';

export interface TaskInterface {
    _id?: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'not_started' | 'in_progress' | 'under_review' | 'completed' | 'on_hold';
    category: string;
    tags: string[];
    
    // Assignment and ownership
    createdBy: mongoose.Types.ObjectId;
    assignedTo: mongoose.Types.ObjectId[];
    department: mongoose.Types.ObjectId;
    
    // Assignment history tracking
    assignmentHistory: {
        assignedBy: mongoose.Types.ObjectId;
        assignedTo: mongoose.Types.ObjectId;
        assignedAt: Date;
        assignmentLevel: 'initial' | 'delegation'; // initial = admin/manager to HOD, delegation = HOD to member
        instructions?: string;
    }[];
    
    // Dates and deadlines
    startDate?: Date;
    dueDate: Date;
    completedDate?: Date;
    
    // Task relationships
    parentTask?: mongoose.Types.ObjectId;
    dependencies: mongoose.Types.ObjectId[];
    
    // Recurring task settings
    isRecurring: boolean;
    recurringPattern?: {
        frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
        interval: number;
        endDate?: Date;
    };
    
    // Progress and time tracking
    progress: number; // 0-100
    estimatedHours?: number;
    actualHours?: number;
    timeEntries: {
        user: mongoose.Types.ObjectId;
        hours: number;
        date: Date;
        description?: string;
    }[];
    
    // Communication
    comments: {
        user: mongoose.Types.ObjectId;
        message: string;
        timestamp: Date;
        mentions: mongoose.Types.ObjectId[];
        parentComment?: mongoose.Types.ObjectId;
        replies: {
            user: mongoose.Types.ObjectId;
            message: string;
            timestamp: Date;
            mentions: mongoose.Types.ObjectId[];
        }[];
    }[];
    
    // File attachments
    attachments: {
        filename: string;
        originalName: string;
        mimetype: string;
        size: number;
        uploadDate: Date;
        uploadedBy: mongoose.Types.ObjectId;
    }[];
    
    // Workflow and approval
    approvalRequired: boolean;
    approvers: mongoose.Types.ObjectId[];
    approvalStatus: 'pending' | 'approved' | 'rejected';
    approvalHistory: {
        approver: mongoose.Types.ObjectId;
        status: 'approved' | 'rejected';
        comments?: string;
        timestamp: Date;
    }[];
    
    // Metadata
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    lastModifiedBy?: mongoose.Types.ObjectId;
}

const timeEntrySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'registration', required: true },
    hours: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    description: { type: String }
});

const replySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'registration', required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'registration' }]
});

const commentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'registration', required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'registration' }],
    parentComment: { type: mongoose.Schema.Types.ObjectId },
    replies: [replySchema]
});

const attachmentSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    uploadDate: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'registration', required: true }
});

const approvalHistorySchema = new mongoose.Schema({
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'registration', required: true },
    status: { type: String, enum: ['approved', 'rejected'], required: true },
    comments: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const recurringPatternSchema = new mongoose.Schema({
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true },
    interval: { type: Number, required: true, min: 1 },
    endDate: { type: Date }
});

const assignmentHistorySchema = new mongoose.Schema({
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'registration', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'registration', required: true },
    assignedAt: { type: Date, default: Date.now },
    assignmentLevel: { type: String, enum: ['initial', 'delegation'], required: true },
    instructions: { type: String }
});

const taskSchema = new mongoose.Schema<TaskInterface>({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    priority: { 
        type: String, 
        enum: ['low', 'medium', 'high', 'critical'], 
        default: 'medium',
        required: true 
    },
    status: { 
        type: String, 
        enum: ['not_started', 'in_progress', 'under_review', 'completed', 'on_hold'], 
        default: 'not_started',
        required: true 
    },
    category: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true }],
    
    // Assignment and ownership
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'registration', required: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'registration' }],
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'departments', required: true },
    
    // Assignment history tracking
    assignmentHistory: [assignmentHistorySchema],
    
    // Dates and deadlines
    startDate: { type: Date },
    dueDate: { type: Date, required: true },
    completedDate: { type: Date },
    
    // Task relationships
    parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    
    // Recurring task settings
    isRecurring: { type: Boolean, default: false },
    recurringPattern: recurringPatternSchema,
    
    // Progress and time tracking
    progress: { type: Number, default: 0, min: 0, max: 100 },
    estimatedHours: { type: Number, min: 0 },
    actualHours: { type: Number, default: 0, min: 0 },
    timeEntries: [timeEntrySchema],
    
    // Communication
    comments: [commentSchema],
    
    // File attachments
    attachments: [attachmentSchema],
    
    // Workflow and approval
    approvalRequired: { type: Boolean, default: false },
    approvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'registration' }],
    approvalStatus: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    approvalHistory: [approvalHistorySchema],
    
    // Metadata
    isActive: { type: Boolean, default: true },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'registration' }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ department: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ priority: 1, status: 1 });
taskSchema.index({ tags: 1 });

// Virtual for calculated actual hours from time entries
taskSchema.virtual('calculatedActualHours').get(function() {
    return this.timeEntries.reduce((total, entry) => total + entry.hours, 0);
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
    if (this.status === 'completed') return false;
    return new Date() > this.dueDate;
});

// Virtual for task completion percentage based on subtasks
taskSchema.virtual('completionPercentage').get(function() {
    // This would need to be calculated based on subtasks
    return this.progress;
});

const Task = mongoose.models.Task || mongoose.model<TaskInterface>('Task', taskSchema, 'tasks');

export default Task;
