import { useState, useEffect } from "react";
import { TrendingUp, Calendar, Clock, Plus, Minus, RotateCcw } from "lucide-react";

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

  // Get transaction type icon and color
  const getTransactionConfig = (type: string) => {
    const configs = {
      allocated: { icon: Plus, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900' },
      used: { icon: Minus, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900' },
      adjustment: { icon: RotateCcw, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900' },
      carried_forward: { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900' }
    };
    return configs[type as keyof typeof configs] || configs.adjustment;
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
            View and manage leave balances and transaction history
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {balances.map((balance) => (
          <div key={balance._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {balance.leaveType}
                </h3>
                {balance.employee && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {balance.employee.firstName} {balance.employee.lastName}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{balance.remaining || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">days remaining</p>
              </div>
            </div>

            {/* Balance Breakdown */}
            <div className="grid grid-cols-2 gap-4 mb-4">
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
            <div className="mb-4">
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

            {/* Recent Transactions */}
            {balance.transactions && balance.transactions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Recent Transactions
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {balance.transactions.slice(0, 5).map((transaction, index) => {
                    const config = getTransactionConfig(transaction.type);
                    const Icon = config.icon;
                    
                    return (
                      <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${config.bg}`}>
                          <Icon className={`w-3 h-3 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {transaction.type.replace('_', ' ').toUpperCase()}: {transaction.amount} days
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {transaction.description}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {new Date(balance.lastUpdated).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
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
