import { Schema } from "mongoose";
import mongoose from "~/mongoose.server";

// Base interface for all monthly reports
interface BaseMonthlyReportInterface {
  _id: string;
  department: string;
  month: number;
  year: number;
  type: string;
  amount: number;
  createdBy: string;
  status: string;
  notes: string;
  departmentType: string; // Identifies which department-specific fields to use
}

// Data Department specific fields
interface DataDepartmentFields {
  subscriptionPackage?: string;
  numberOfFirms?: number;
  numberOfUsers?: number;
}

// Software Department specific fields
interface SoftwareDepartmentFields {
  projectName?: string;
  developmentHours?: number;
  projectStatus?: string;
}

// Customer Service Department specific fields
interface CustomerServiceDepartmentFields {
  totalTickets?: number;
  resolvedTickets?: number;
  averageResponseTime?: number;
  customerSatisfaction?: number;
}

// News Department specific fields
interface NewsDepartmentFields {
  articlesPublished?: number;
  totalViews?: number;
  newSubscribers?: number;
  revenue?: number;
}

// General department fields for any other department
interface GeneralDepartmentFields {
  metric1?: string;
  value1?: number;
  metric2?: string;
  value2?: number;
}

// Combined interface for all department types
interface MonthlyReportInterface extends BaseMonthlyReportInterface,
  DataDepartmentFields,
  SoftwareDepartmentFields,
  CustomerServiceDepartmentFields,
  NewsDepartmentFields,
  GeneralDepartmentFields {}

// Schema for the monthly report
const MonthlyReportSchema = new mongoose.Schema(
  {
    department: {
      type: Schema.Types.ObjectId,
      ref: "departments",
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "registration",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected"],
      default: "draft",
    },
    notes: {
      type: String,
      required: false,
    },
    departmentType: {
      type: String,
      required: true,
      enum: ["data", "software", "customer_service", "news", "general"],
    },
    
    // Data Department Fields
    subscriptionPackage: {
      type: String,
      required: function(this: any): boolean { return this.departmentType === 'data'; }
    },
    numberOfFirms: {
      type: Number,
      required: function(this: any): boolean { return this.departmentType === 'data'; },
      default: 0
    },
    numberOfUsers: {
      type: Number,
      required: function(this: any): boolean { return this.departmentType === 'data'; },
      default: 0
    },
    
    // Software Department Fields
    projectName: {
      type: String,
      required: function(this: any): boolean { return this.departmentType === 'software'; }
    },
    developmentHours: {
      type: Number,
      required: function(this: any): boolean { return this.departmentType === 'software'; },
      default: 0
    },
    projectStatus: {
      type: String,
      required: function(this: any): boolean { return this.departmentType === 'software'; },
      enum: ["planning", "in-progress", "testing", "completed"]
    },
    
    // Customer Service Department Fields
    totalTickets: {
      type: Number,
      required: function(this: any): boolean { return this.departmentType === 'customer_service'; },
      default: 0
    },
    resolvedTickets: {
      type: Number,
      required: function(this: any): boolean { return this.departmentType === 'customer_service'; },
      default: 0
    },
    averageResponseTime: {
      type: Number,
      required: function(this: any): boolean { return this.departmentType === 'customer_service'; },
      default: 0
    },
    customerSatisfaction: {
      type: Number,
      required: function(this: any): boolean { return this.departmentType === 'customer_service'; },
      min: 0,
      max: 100,
      default: 0
    },
    
    // News Department Fields
    articlesPublished: {
      type: Number,
      required: function(this: any): boolean { return this.departmentType === 'news'; },
      default: 0
    },
    totalViews: {
      type: Number,
      required: function(this: any): boolean { return this.departmentType === 'news'; },
      default: 0
    },
    newSubscribers: {
      type: Number,
      required: function(this: any): boolean { return this.departmentType === 'news'; },
      default: 0
    },
    revenue: {
      type: Number,
      required: function(this: any): boolean { return this.departmentType === 'news'; },
      default: 0
    },
    
    // General Department Fields
    metric1: {
      type: String,
      required: function(this: any): boolean { return this.departmentType === 'general'; }
    },
    value1: {
      type: Number,
      required: function(this: any): boolean { return this.departmentType === 'general'; },
      default: 0
    },
    metric2: {
      type: String,
      required: function(this: any): boolean { return this.departmentType === 'general'; }
    },
    value2: {
      type: Number,
      required: function(this: any): boolean { return this.departmentType === 'general'; },
      default: 0
    }
  },
  {
    timestamps: true,
  }
);

// Add a compound index to prevent duplicate reports for the same department/month/year
MonthlyReportSchema.index(
  { department: 1, month: 1, year: 1, type: 1 },
  { unique: true }
);

let MonthlyReport: mongoose.Model<MonthlyReportInterface>;

try {
  MonthlyReport = mongoose.model<MonthlyReportInterface>("monthlyReport");
} catch (error) {
  MonthlyReport = mongoose.model<MonthlyReportInterface>("monthlyReport", MonthlyReportSchema);
}

export default MonthlyReport;
