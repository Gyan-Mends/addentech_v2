import { useState } from "react";
import { Clock, Calendar, Users, TrendingUp } from "lucide-react";

export default function Attendance() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Clock className="w-8 h-8 mr-3 text-green-600" />
            Attendance
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track employee attendance and working hours
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Present Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <Users className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Absent Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Late Arrivals</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Hours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Attendance Tracking
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This feature is coming soon. You'll be able to track employee attendance, working hours, and generate reports here.
          </p>
        </div>
      </div>
    </div>
  );
} 