import { Schema } from "mongoose";
import { RegistrationInterface } from "~/interface/interface";
import mongoose from "~/mongoose.server";

const RegistrationSchema = new mongoose.Schema({
  firstName: {
    required: true,
    type: String,
  },
  middleName: {
    required: false,
    type: String,
  },
  lastName: {
    required: true,
    type: String,
  },
  email: {
    required: true,
    type: String,
  },
  password: {
    required: true,
    type: String,
  },
  phone: {
    required: true,
    type: String,
  },
  role: {
    required: true,
    type: String,
    enum: ["admin", "staff", "department_head", "manager"],
    default: "staff"
  },
  admin: {
    required: false,
    type: String,
  },
  position: {
    required: true,
    type: String,
  },
  intent: {
    required: false,
    type: String,
  },
  department: {
    ref: "departments",
    required: true,
    type: Schema.Types.ObjectId,
  },
  workMode: {
    type: String,
    enum: ["in-house", "remote"],
    default: "in-house",
  },
  image: {
    required: true,
    type: String,
  },
  // Role-based permissions
  permissions: {
    type: Map,
    of: Boolean,
    default: {
      // Common permissions for all users
      view_profile: true,
      edit_profile: true,
      
      // Task management permissions
      create_task: false,
      view_task: true,
      edit_task: false,
      assign_task: false,
      
      // Department access
      view_department: true,
      manage_department: false,
      
      // Monthly reports
      create_report: false,
      view_report: false,
      edit_report: false,
      approve_report: false,
      
      // Attendance
      view_attendance: true,
      manage_attendance: false,
      view_attendance_report: false,
      
      // Leave management
      view_leaves: true,
      create_leave: true,
      edit_leave: false,
      approve_leave: false,
      manage_leaves: false,
    }
  },
  // User status
  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "active"
  },
  lastLogin: {
    type: Date,
    default: null
  },
  // Bio field
  bio: {
    required: false,
    type: String,
  },
}, {
  timestamps: true
});

// Pre-save hook to set default permissions based on role
RegistrationSchema.pre("save", function(next) {
  const user = this;
  
  // Only run this when role changes or it's a new document
  if (!user.isModified("role") && !user.isNew) return next();
  
  // Get current permissions or use an empty object if not set
  const permissions: Record<string, boolean> = {};
  
  // Convert Map to regular object if it exists
  if (user.permissions && user.permissions instanceof Map) {
    for (const [key, value] of user.permissions.entries()) {
      permissions[key] = value;
    }
  }
  
  // Set permissions based on role
  if (user.role === "admin") {
    Object.keys(permissions).forEach(key => permissions[key] = true);
  } else if (user.role === "department_head") {
    permissions.create_task = true;
    permissions.edit_task = true;
    permissions.assign_task = true;
    permissions.create_report = true;
    permissions.view_report = true;
    permissions.edit_report = true;
    permissions.manage_attendance = true;
    permissions.view_attendance_report = true;
    permissions.edit_leave = true;
    permissions.approve_leave = true;
    permissions.manage_leaves = true;
  } else if (user.role === "manager") {
    permissions.create_task = true;
    permissions.edit_task = true;
    permissions.assign_task = true;
    permissions.view_report = true;
    permissions.view_attendance_report = true;
    permissions.edit_leave = true;
    permissions.approve_leave = true;
    permissions.manage_leaves = true;
  }
  
  // Convert the permissions object back to a Map
  const permissionsMap = new Map<string, boolean>();
  Object.entries(permissions).forEach(([key, value]) => {
    permissionsMap.set(key, value);
  });
  
  user.permissions = permissionsMap;
  next();
});

let Registration: mongoose.Model<RegistrationInterface>;

try {
  Registration = mongoose.model<RegistrationInterface>("registration");
} catch (error) {
  Registration = mongoose.model<RegistrationInterface>("registration", RegistrationSchema);
}

export default Registration;
