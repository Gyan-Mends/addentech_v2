import mongoose from "mongoose";
import type { LeaveInterface } from "~/interface/interface";

// Leave Schema
const leaveSchema = new mongoose.Schema<LeaveInterface>({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
    leaveType: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { 
        type: String, 
        required: true, 
        default: 'pending',
        enum: ['pending', 'approved', 'rejected', 'cancelled']
    },
    priority: { 
        type: String, 
        required: true, 
        default: 'normal',
        enum: ['low', 'normal', 'high', 'urgent']
    },
    approvalWorkflow: [{
        approver: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration' },
        approverRole: { type: String },
        status: { 
            type: String, 
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        comments: { type: String },
        actionDate: { type: Date },
        order: { type: Number, required: true }
    }],
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'departments', required: true },
    submissionDate: { type: Date, default: Date.now },
    lastModified: { type: Date, default: Date.now },
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Leave Balance Schema
const leaveBalanceSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
    leaveType: { type: String, required: true },
    year: { type: Number, required: true },
    totalAllocated: { type: Number, required: true, default: 0 },
    used: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    carriedForward: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    transactions: [{
        type: { type: String, enum: ['allocated', 'used', 'adjustment', 'carried_forward'] },
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        description: { type: String },
        leaveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Leave' }
    }]
}, { timestamps: true });

// Leave Policy Schema
const leavePolicySchema = new mongoose.Schema({
    leaveType: { type: String, required: true, unique: true },
    description: { type: String },
    defaultAllocation: { type: Number, required: true },
    maxConsecutiveDays: { type: Number, default: 365 },
    minAdvanceNotice: { type: Number, default: 0 },
    maxAdvanceBooking: { type: Number, default: 365 },
    allowCarryForward: { type: Boolean, default: false },
    carryForwardLimit: { type: Number, default: 0 },
    documentsRequired: { type: Boolean, default: false },
    approvalWorkflowLimits: {
        managerMaxDays: { type: Number, default: 30 },
        deptHeadMaxDays: { type: Number, default: 60 }
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Models
const Leave = mongoose.models.Leave || mongoose.model<LeaveInterface>('Leave', leaveSchema, 'leaves');
const LeaveBalance = mongoose.models.LeaveBalance || mongoose.model('LeaveBalance', leaveBalanceSchema, 'leavebalances');
const LeavePolicy = mongoose.models.LeavePolicy || mongoose.model('LeavePolicy', leavePolicySchema, 'leavepolicies');

export { Leave, LeaveBalance, LeavePolicy };
export default Leave; 