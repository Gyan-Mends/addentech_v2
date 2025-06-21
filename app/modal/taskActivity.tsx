import mongoose from 'mongoose';

export interface TaskActivityInterface {
    _id?: string;
    taskId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    department: mongoose.Types.ObjectId;
    
    // Activity details
    activityType: 'created' | 'assigned' | 'status_changed' | 'updated' | 'commented' | 'time_logged' | 'completed' | 'delegated' | 'approved' | 'rejected';
    activityDescription: string;
    
    // Before and after values for tracking changes
    previousValue?: string;
    newValue?: string;
    
    // Additional context
    metadata?: {
        assignedTo?: mongoose.Types.ObjectId[];
        assignedBy?: mongoose.Types.ObjectId;
        assignmentLevel?: 'initial' | 'delegation';
        timeLogged?: number;
        statusReason?: string;
        instructions?: string;
        priority?: string;
        estimatedHours?: number;
        actualHours?: number;
    };
    
    // Timestamps
    timestamp: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const taskActivitySchema = new mongoose.Schema<TaskActivityInterface>({
    taskId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Task', 
        required: true,
        index: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'registration', 
        required: true,
        index: true 
    },
    department: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'departments', 
        required: true,
        index: true 
    },
    
    activityType: {
        type: String,
        enum: ['created', 'assigned', 'status_changed', 'updated', 'commented', 'time_logged', 'completed', 'delegated', 'approved', 'rejected'],
        required: true,
        index: true
    },
    activityDescription: {
        type: String,
        required: true
    },
    
    previousValue: { type: String },
    newValue: { type: String },
    
    metadata: {
        assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'registration' }],
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'registration' },
        assignmentLevel: { type: String, enum: ['initial', 'delegation'] },
        timeLogged: { type: Number },
        statusReason: { type: String },
        instructions: { type: String },
        priority: { type: String },
        estimatedHours: { type: Number },
        actualHours: { type: Number }
    },
    
    timestamp: { 
        type: Date, 
        default: Date.now,
        index: true 
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound indexes for efficient querying
taskActivitySchema.index({ taskId: 1, timestamp: -1 });
taskActivitySchema.index({ userId: 1, timestamp: -1 });
taskActivitySchema.index({ department: 1, timestamp: -1 });
taskActivitySchema.index({ activityType: 1, timestamp: -1 });
taskActivitySchema.index({ timestamp: -1 }); // For date range queries

// Index for reporting queries
taskActivitySchema.index({ 
    department: 1, 
    timestamp: -1, 
    activityType: 1 
});

taskActivitySchema.index({ 
    userId: 1, 
    timestamp: -1, 
    activityType: 1 
});

// Fix for hot reload model overwrite error
const TaskActivity = mongoose.models.TaskActivity || mongoose.model<TaskActivityInterface>('TaskActivity', taskActivitySchema);

export default TaskActivity; 