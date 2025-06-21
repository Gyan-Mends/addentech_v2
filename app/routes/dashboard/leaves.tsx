import { Calendar, Plus, Filter, Search } from "lucide-react";

export default function Leaves() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Calendar className="w-8 h-8 mr-3 text-purple-600" />
            Leave Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage employee leave requests and approvals
          </p>
        </div>
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Leave Request</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Leave Management System
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This feature is coming soon. You'll be able to request leaves, approve requests, and manage leave policies here.
          </p>
        </div>
      </div>
    </div>
  );
} 