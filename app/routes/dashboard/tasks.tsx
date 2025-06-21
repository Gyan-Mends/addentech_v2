import { useState } from "react";
import { CheckSquare, Plus, Search, Filter } from "lucide-react";

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <CheckSquare className="w-8 h-8 mr-3 text-blue-600" />
            Tasks
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track all tasks and assignments
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <CheckSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Tasks Management
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This feature is coming soon. You'll be able to create, assign, and track tasks here.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
} 