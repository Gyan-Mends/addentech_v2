import mongoose from 'mongoose';

export interface LeavePolicyInterface {
    _id?: string;
    leaveType: string;
    description: string;
    defaultAllocation: number; // Annual days allocated
    maxConsecutiveDays: number;
    minAdvanceNotice: number; // Days notice required
    maxAdvanceBooking: number; // How far ahead can be booked
    carryForwardAllowed: boolean;
    carryForwardLimit?: number;
    documentRequired: boolean;
    approvalLevels: {
        level: number;
        role: string;
        maxDays: number;
    }[];
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const leavePolicySchema = new mongoose.Schema({
    leaveType: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    defaultAllocation: { type: Number, required: true, min: 0 },
    maxConsecutiveDays: { type: Number, required: true, min: 1 },
    minAdvanceNotice: { type: Number, required: true, min: 0 },
    maxAdvanceBooking: { type: Number, required: true, min: 30 },
    carryForwardAllowed: { type: Boolean, default: false },
    carryForwardLimit: { type: Number, min: 0 },
    documentRequired: { type: Boolean, default: false },
    approvalLevels: [{
        level: { type: Number, required: true },
        role: { type: String, required: true, enum: ['manager', 'department_head', 'admin'] },
        maxDays: { type: Number, required: true }
    }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const LeavePolicy = mongoose.models.LeavePolicy || mongoose.model<LeavePolicyInterface>('LeavePolicy', leavePolicySchema, 'leavePolicies');

export default LeavePolicy; 