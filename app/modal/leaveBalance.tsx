import mongoose from 'mongoose';

export interface LeaveBalanceInterface {
    _id?: string;
    employee: string; // Reference to Registration
    leaveType: string;
    year: number;
    totalAllocated: number;
    used: number;
    pending: number;
    carriedForward: number;
    remaining: number;
    lastUpdated: Date;
    transactions: {
        type: 'allocation' | 'used' | 'adjustment' | 'carryforward';
        amount: number;
        date: Date;
        description: string;
        leaveId?: string;
    }[];
}

const leaveBalanceSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'registration', required: true },
    leaveType: { type: String, required: true },
    year: { type: Number, required: true },
    totalAllocated: { type: Number, required: true, default: 0 },
    used: { type: Number, required: true, default: 0 },
    pending: { type: Number, required: true, default: 0 },
    carriedForward: { type: Number, required: true, default: 0 },
    remaining: { type: Number, required: true, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    transactions: [{
        type: { 
            type: String, 
            required: true, 
            enum: ['allocation', 'used', 'adjustment', 'carryforward'] 
        },
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        description: { type: String, required: true },
        leaveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Leave' }
    }]
}, { timestamps: true });

// Compound index for unique employee-leaveType-year combination
leaveBalanceSchema.index({ employee: 1, leaveType: 1, year: 1 }, { unique: true });

// Virtual to calculate remaining balance
leaveBalanceSchema.virtual('availableBalance').get(function() {
    return this.totalAllocated + this.carriedForward - this.used - this.pending;
});

// Method to update remaining balance
leaveBalanceSchema.methods.updateRemaining = function() {
    this.remaining = this.totalAllocated + this.carriedForward - this.used - this.pending;
    return this.remaining;
};

const LeaveBalance = mongoose.models.LeaveBalance || mongoose.model<LeaveBalanceInterface>('LeaveBalance', leaveBalanceSchema, 'leaveBalances');

export default LeaveBalance; 