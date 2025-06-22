import { useState, useEffect } from "react";
import { TrendingUp, Calendar, Clock } from "lucide-react";

interface LeaveBalance {
  _id: string;
  employee: {
    firstName: string;
    lastName: string;
    email: string;
  };
  leaveType: string;
  year: number;
  totalAllocated: number;
  used: number;
  pending: number;
  carriedForward: number;
  remaining: number;
  lastUpdated: string;
  transactions: Array<{
    type: 'allocated' | 'used' | 'adjustment' | 'carried_forward';
    amount: number;
    date: string;
    description: string;
    leaveId?: string;
  }>;
}

interface LeaveStats {
  totalEmployees: number;
  totalLeavesTaken: number;
  pendingApprovals: number;
  averageLeaveUsage: number;
  leaveTypeBreakdown: Array<{
    leaveType: string;
    totalUsed: number;
    totalAllocated: number;
  }>;
}

const LeaveBalance = () => {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [stats, setStats] = useState<LeaveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Load data on component mount
  useEffect(() => {
    loadBalances();
    loadStats();
  }, [selectedYear]);

  // Load leave balances
  const loadBalances = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('operation', 'getBalances');
      params.append('year', selectedYear.toString());

      const response = await fetch(`/api/leaves?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setBalances(data.data || []);
      }
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load leave statistics
  const loadStats = async () => {
    try {
      const response = await fetch('/api/leaves?operation=getStats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Generate year options
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <TrendingUp className="w-8 h-8 mr-3 text-green-600" />
            Leave Balance
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage leave balances - Ghana Labor Law Compliant
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center space-x-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {getYearOptions().map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ghana Labor Law Compliance Section */}
      {(() => {
        const annualQuota = balances.find(b => b.leaveType === 'Annual Leave Quota');
        if (annualQuota) {
          return (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    🇬🇭 Ghana Labor Law - Annual Leave Quota
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    15 days annual leave entitlement as per Ghana Labor Act
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${annualQuota.remaining > 10 ? 'text-green-600' : annualQuota.remaining > 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {annualQuota.remaining}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    of {annualQuota.totalAllocated} days remaining
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Annual Quota Usage</span>
                  <span>{((annualQuota.used / annualQuota.totalAllocated) * 100).toFixed(1)}% used</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-500" 
                      style={{ width: `${(annualQuota.used / annualQuota.totalAllocated) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-yellow-500" 
                      style={{ width: `${(annualQuota.pending / annualQuota.totalAllocated) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Used: {annualQuota.used} days</span>
                  <span>Pending: {annualQuota.pending} days</span>
                  <span>Remaining: {annualQuota.remaining} days</span>
                </div>
              </div>

              {/* Status Messages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">📋 Leave Types (Count Against Quota):</h4>
                  <div className="text-gray-600 dark:text-gray-400 space-y-1">
                    <p>• Annual Leave</p>
                    <p>• Study Leave</p>
                    <p>• Compassionate Leave</p>
                    <p>• Other general leave types</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">✅ Exempt Leave Types (No Quota Limit):</h4>
                  <div className="text-gray-600 dark:text-gray-400 space-y-1">
                    <p>• Sick Leave (with medical certificate)</p>
                    <p>• Maternity Leave (12-14 weeks)</p>
                  </div>
                </div>
              </div>

              {annualQuota.remaining === 0 && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                    ⚠️ Annual quota exhausted! You can only apply for Sick Leave or Maternity Leave.
                  </p>
                </div>
              )}
            </div>
          );
        }
        return null;
      })()}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalEmployees || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Leaves Taken</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalLeavesTaken || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Approvals</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingApprovals || 0}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Usage</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(stats.averageLeaveUsage || 0).toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {balances.map((balance) => {
          // Ghana Labor Law: Categorize leave types
          const exemptLeaveTypes = ['Sick Leave', 'Maternity Leave'];
          const isExemptLeave = exemptLeaveTypes.includes(balance.leaveType);
          const isAnnualQuota = balance.leaveType === 'Annual Leave Quota';
          
          return (
            <div 
              key={balance._id} 
              className={`rounded-lg shadow-sm border p-4 ${
                isAnnualQuota 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 ring-2 ring-blue-200 dark:ring-blue-700' 
                  : isExemptLeave
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {balance.leaveType}
                    </h3>
                    {isAnnualQuota && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                        🇬🇭 QUOTA
                      </span>
                    )}
                    {isExemptLeave && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                        ✅ EXEMPT
                      </span>
                    )}
                    {!isExemptLeave && !isAnnualQuota && (
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full">
                        📋 COUNTS
                      </span>
                    )}
                  </div>
                  {balance.employee && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {balance.employee.firstName} {balance.employee.lastName}
                    </p>
                  )}
                  {isAnnualQuota && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Ghana Labor Act - 15 days annual entitlement
                    </p>
                  )}
                  {isExemptLeave && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Does not count against annual quota
                    </p>
                  )}
                  {!isExemptLeave && !isAnnualQuota && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Deducts from 15-day annual quota
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${
                    isAnnualQuota 
                      ? (balance.remaining > 10 ? 'text-green-600' : balance.remaining > 5 ? 'text-yellow-600' : 'text-red-600')
                      : 'text-blue-600'
                  }`}>
                    {balance.remaining || 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">days remaining</p>
                </div>
              </div>

              {/* Balance Breakdown */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Allocated</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{balance.totalAllocated || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Used</p>
                  <p className="text-lg font-semibold text-red-600">{balance.used || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-lg font-semibold text-yellow-600">{balance.pending || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Carried Forward</p>
                  <p className="text-lg font-semibold text-green-600">{balance.carriedForward || 0}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>Usage Progress</span>
                  <span>{balance.totalAllocated > 0 ? (((balance.used + balance.pending) / balance.totalAllocated) * 100).toFixed(1) : '0.0'}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div className="flex h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-500" 
                      style={{ width: `${balance.totalAllocated > 0 ? (balance.used / balance.totalAllocated) * 100 : 0}%` }}
                    ></div>
                    <div 
                      className="bg-yellow-500" 
                      style={{ width: `${balance.totalAllocated > 0 ? (balance.pending / balance.totalAllocated) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Used: {balance.used || 0}</span>
                  <span>Pending: {balance.pending || 0}</span>
                  <span>Remaining: {balance.remaining || 0}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated: {new Date(balance.lastUpdated).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {balances.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Leave Balances Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No leave balance records found for the selected year.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalance;  
