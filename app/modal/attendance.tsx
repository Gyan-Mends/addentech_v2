import { Schema } from "mongoose";
import mongoose from "~/mongoose.server";

interface AttendanceInterface {
  _id: string;
  user: string;
  department: string;
  checkInTime: Date;
  checkOutTime: Date;
  status: string;
  workHours: number;
  date: Date;
  notes: string;
  workMode: string; // 'remote' or 'in-house'
  location?: {
    latitude: number;
    longitude: number;
    locationName?: string; // Name of the location (address or place name)
  };
}

const AttendanceSchema = new mongoose.Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "registration",
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "departments",
      required: true,
    },
    checkInTime: {
      type: Date,
      required: true,
    },
    checkOutTime: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ["present", "absent", "late", "half-day", "on-leave"],
      default: "present",
      required: true,
    },
    workMode: {
      type: String,
      enum: ["remote", "in-house"],
      required: true,
      default: "in-house",
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      locationName: { type: String },
    },
    workHours: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

let Attendance: mongoose.Model<AttendanceInterface>;

try {
  Attendance = mongoose.model<AttendanceInterface>("attendance");
} catch (error) {
  Attendance = mongoose.model<AttendanceInterface>("attendance", AttendanceSchema);
}

export default Attendance;
