import { BarChart3, Download, Filter, Calendar } from "lucide-react";

export default function Reports() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-indigo-600" />
            Monthly Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Generate and view monthly performance reports
          </p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
          <Download className="w-4 h-4" />
          <span>Generate Report</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Monthly Reports & Analytics
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This feature is coming soon. You'll be able to generate comprehensive monthly reports and view analytics here.
          </p>
        </div>
      </div>
    </div>
  );
} 