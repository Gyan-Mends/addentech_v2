import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Filter } from "lucide-react";
import DataTable, { type Column } from "~/components/DataTable";
import Drawer from "~/components/Drawer";
import CustomInput from "~/components/CustomInput";
import ConfirmModal from "~/components/confirmModal";
import { Button, useDisclosure } from "@heroui/react";
import { successToast, errorToast } from "~/components/toast";

interface Leave {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    image?: string;
    position: string;
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  department: {
    _id: string;
    name: string;
  };
  submissionDate: string;
  approvalWorkflow: Array<{
    approver: {
      firstName: string;
      lastName: string;
    };
    approverRole: string;
    status: 'pending' | 'approved' | 'rejected';
    comments?: string;
    actionDate?: string;
    order: number;
  }>;
}

interface LeaveFormData {
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface LeaveBalance {
  _id: string;
  leaveType: string;
  totalAllocated: number;
  used: number;
  pending: number;
  remaining: number;
  employee?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    position?: string;
    department?: {
      _id: string;
      name: string;
    };
  };
}

interface LeavePolicy {
  _id: string;
  leaveType: string;
  description: string;
  defaultAllocation: number;
  maxConsecutiveDays: number;
  minAdvanceNotice: number;
  allowCarryForward: boolean;
}

const Leaves = () => {
  // State management
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [employeeBalances, setEmployeeBalances] = useState<LeaveBalance[]>([]);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view' | 'approve'>('create');
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [formData, setFormData] = useState<LeaveFormData>({
    leaveType: '',
    startDate: '',
    endDate: '',
    totalDays: 0,
    reason: '',
    priority: 'normal'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approved' | 'rejected' | null>(null);
  const [approvalComments, setApprovalComments] = useState('');

  // Confirm modal state
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onOpenChange: onConfirmOpenChange } = useDisclosure();
  const [leaveToDelete, setLeaveToDelete] = useState<Leave | null>(null);

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        // Try to get user from localStorage first
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };

    loadCurrentUser();
  }, []);

  // Load data on component mount
  useEffect(() => {
    if (currentUser) {
      loadLeaves();
      loadBalances();
      loadPolicies();
    }
  }, [filterStatus, filterType, currentUser]);

  // Calculate total days when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setFormData(prev => ({ ...prev, totalDays: diffDays }));
    }
  }, [formData.startDate, formData.endDate]);

  // Load leaves from API
  const loadLeaves = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType !== 'all') params.append('leaveType', filterType);

      const response = await fetch(`/api/leaves?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setLeaves(data.data || []);
      } else {
        errorToast('Failed to load leaves: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading leaves:', error);
      errorToast('Failed to load leaves. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load leave balances
  const loadBalances = async () => {
    try {
      const response = await fetch('/api/leaves?operation=getBalances');
      const data = await response.json();
      
      if (data.success) {
        setBalances(data.data || []);
      }
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  // Load balances for a specific employee
  const loadEmployeeBalance = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/leaves?operation=getBalances&employeeId=${employeeId}`);
      const data = await response.json();
      
      if (data.success) {
        // Store employee-specific balances separately
        setEmployeeBalances(data.data || []);
      }
    } catch (error) {
      console.error('Error loading employee balance:', error);
    }
  };

  // Load leave policies
  const loadPolicies = async () => {
    try {
      const response = await fetch('/api/leaves?operation=getPolicies');
      const data = await response.json();
      
      if (data.success) {
        setPolicies(data.data || []);
      }
    } catch (error) {
      console.error('Error loading policies:', error);
    }
  };

  // Table columns configuration
  const columns: Column<Leave>[] = [
    {
      key: 'employee',
      title: 'Employee',
      sortable: true,
      searchable: true,
      render: (value: any, record: Leave) => {
        // Handle null or undefined employee data
        if (!value || !value.firstName) {
          return (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">?</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Unknown Employee</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">-</div>
              </div>
            </div>
          );
        }

        return (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {value.image ? (
                <img 
                  src={value.image} 
                  alt={`${value.firstName} ${value.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {value.firstName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {value.firstName} {value.lastName}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {value.position || '-'}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'leaveType',
      title: 'Type',
      sortable: true,
      searchable: true,
      render: (value: string) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {value}
        </span>
      )
    },
    {
      key: 'startDate',
      title: 'Start Date',
      sortable: true,
      searchable: false,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'endDate',
      title: 'End Date',
      sortable: true,
      searchable: false,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'totalDays',
      title: 'Days',
      sortable: true,
      searchable: false,
      align: 'center',
      render: (value: number) => (
        <span className="font-medium">{value}</span>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      searchable: false,
      render: (value: string) => {
        const statusConfig = {
          pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Clock },
          approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
          rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle },
          cancelled: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: XCircle }
        };
        
        const config = statusConfig[value as keyof typeof statusConfig];
        const Icon = config.icon;
        
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${config.color}`}>
            <Icon className="w-3 h-3" />
            <span>{value.toUpperCase()}</span>
          </span>
        );
      }
    },
    {
      key: 'priority',
      title: 'Priority',
      sortable: true,
      searchable: false,
      render: (value: string) => {
        const priorityConfig = {
          low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
          urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        };
        
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityConfig[value as keyof typeof priorityConfig]}`}>
            {value.toUpperCase()}
          </span>
        );
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      searchable: false,
      width: '120px',
      align: 'center',
      render: (_, record: Leave) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            isIconOnly
            onPress={() => handleView(record)}
          >
            <Eye size={16} />
          </Button>
          {record.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="flat"
                color="warning"
                isIconOnly
                onPress={() => handleEdit(record)}
              >
                <Edit size={16} />
              </Button>
              <Button
                size="sm"
                variant="flat"
                color="success"
                isIconOnly
                onPress={() => handleApprove(record)}
              >
                <CheckCircle size={16} />
              </Button>
              <Button
                size="sm"
                variant="flat"
                color="danger"
                isIconOnly
                onPress={() => handleDelete(record)}
              >
                <Trash2 size={16} />
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.leaveType.trim()) errors.leaveType = 'Leave type is required';
    if (!formData.startDate) errors.startDate = 'Start date is required';
    if (!formData.endDate) errors.endDate = 'End date is required';
    if (!formData.reason.trim()) errors.reason = 'Reason is required';
    if (formData.totalDays <= 0) errors.totalDays = 'Total days must be greater than 0';

    // Validate dates
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (startDate > endDate) {
        errors.endDate = 'End date must be after start date';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field: keyof LeaveFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle create new leave
  const handleCreate = () => {
    setDrawerMode('create');
    setSelectedLeave(null);
    setFormData({
      leaveType: '',
      startDate: '',
      endDate: '',
      totalDays: 0,
      reason: '',
      priority: 'normal'
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  // Handle view leave
  const handleView = (leave: Leave) => {
    setDrawerMode('view');
    setSelectedLeave(leave);
    setFormData({
      leaveType: leave.leaveType,
      startDate: leave.startDate.split('T')[0],
      endDate: leave.endDate.split('T')[0],
      totalDays: leave.totalDays,
      reason: leave.reason,
      priority: leave.priority
    });
    // Load balance for the specific employee
    loadEmployeeBalance(leave.employee._id);
    setDrawerOpen(true);
  };

  // Handle edit leave
  const handleEdit = (leave: Leave) => {
    setDrawerMode('edit');
    setSelectedLeave(leave);
    setFormData({
      leaveType: leave.leaveType,
      startDate: leave.startDate.split('T')[0],
      endDate: leave.endDate.split('T')[0],
      totalDays: leave.totalDays,
      reason: leave.reason,
      priority: leave.priority
    });
    setFormErrors({});
    // Load balance for the specific employee
    loadEmployeeBalance(leave.employee._id);
    setDrawerOpen(true);
  };

  // Handle approve leave
  const handleApprove = (leave: Leave) => {
    setDrawerMode('approve');
    setSelectedLeave(leave);
    setFormData({
      leaveType: leave.leaveType,
      startDate: leave.startDate.split('T')[0],
      endDate: leave.endDate.split('T')[0],
      totalDays: leave.totalDays,
      reason: leave.reason,
      priority: leave.priority
    });
    // Load balance for the specific employee
    loadEmployeeBalance(leave.employee._id);
    setDrawerOpen(true);
  };

  // Handle delete leave
  const handleDelete = (leave: Leave) => {
    setLeaveToDelete(leave);
    onConfirmOpen();
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!leaveToDelete) return;

    try {
      const formData = new FormData();
      formData.append('operation', 'delete');
      formData.append('id', leaveToDelete._id);

      const response = await fetch('/api/leaves', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        successToast('Leave deleted successfully');
        loadLeaves();
      } else {
        errorToast('Failed to delete leave: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting leave:', error);
      errorToast('Failed to delete leave. Please try again.');
    } finally {
      setLeaveToDelete(null);
      onConfirmOpenChange();
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const submitData = new FormData();
      
      if (drawerMode === 'create') {
        submitData.append('operation', 'create');
      } else if (drawerMode === 'edit') {
        submitData.append('operation', 'update');
        submitData.append('id', selectedLeave!._id);
      } else if (drawerMode === 'approve') {
        if (!approvalAction) {
          errorToast('Please select an approval action');
          return;
        }
        submitData.append('operation', 'updateStatus');
        submitData.append('leaveId', selectedLeave!._id);
        submitData.append('status', approvalAction);
        submitData.append('comments', approvalComments || `${approvalAction === 'approved' ? 'Approved' : 'Rejected'} via dashboard`);
      }

      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value.toString());
      });

      const response = await fetch('/api/leaves', {
        method: 'POST',
        body: submitData
      });

      const data = await response.json();

      if (data.success) {
        const action = drawerMode === 'create' ? 'created' : 
                      drawerMode === 'edit' ? 'updated' : 'approved';
        successToast(`Leave ${action} successfully`);
        loadLeaves();
        handleCloseDrawer();
      } else {
        errorToast(`Failed to ${drawerMode} leave: ` + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error(`Error ${drawerMode} leave:`, error);
      errorToast(`Failed to ${drawerMode} leave. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle close drawer
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedLeave(null);
    setFormData({
      leaveType: '',
      startDate: '',
      endDate: '',
      totalDays: 0,
      reason: '',
      priority: 'normal'
    });
    setFormErrors({});
    setApprovalAction(null);
    setApprovalComments('');
    setEmployeeBalances([]); // Clear employee-specific balances
  };

  // Get available balance for selected leave type (current user)
  const getAvailableBalance = (leaveType: string) => {
    const balance = balances.find(b => b.leaveType === leaveType);
    return balance ? balance.remaining : 0;
  };

  // Get available balance for the employee whose leave is being viewed
  const getEmployeeAvailableBalance = (leaveType: string) => {
    const balance = employeeBalances.find(b => b.leaveType === leaveType);
    return balance ? balance.remaining : 0;
  };

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
        <Button 
          color="primary" 
          onPress={handleCreate}
          startContent={<Plus className="w-4 h-4" />}
        >
          Apply for Leave
        </Button>
      </div>

      {/* Leave Balances Summary */}
      {balances.length > 0 && (
        <div className="space-y-4">
          {/* Show title based on user role */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager') 
                ? 'All Employee Leave Balances' 
                : 'Your Leave Balances'
              }
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {balances.map((balance) => (
              <div key={balance._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                {/* Employee info for admin/manager */}
                {balance.employee && currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
                  <div className="flex items-center space-x-2 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {balance.employee.firstName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {balance.employee.firstName} {balance.employee.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {balance.employee.department?.name || 'No Department'}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{balance.leaveType}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{balance.remaining}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">of {balance.totalAllocated} days</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Used: {balance.used}</span>
                    <span>Pending: {balance.pending}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ width: `${balance.totalAllocated > 0 ? ((balance.used + balance.pending) / balance.totalAllocated) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            {policies.map((policy) => (
              <option key={policy._id} value={policy.leaveType}>
                {policy.leaveType}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <DataTable
          data={leaves}
          columns={columns}
          loading={loading}
          searchable
          pagination
        />
      </div>

      {/* Drawer for Create/Edit/View */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        title={
          drawerMode === 'create' ? 'Apply for Leave' :
          drawerMode === 'edit' ? 'Edit Leave Application' :
          drawerMode === 'approve' ? 'Approve Leave Application' :
          'Leave Application Details'
        }
        size="lg"
      >
        <div className="space-y-4">
          {/* Employee Info (for view/approve modes) */}
          {selectedLeave && (drawerMode === 'view' || drawerMode === 'approve') && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Employee Information</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                    {selectedLeave.employee?.image ? (
                      <img 
                        src={selectedLeave.employee.image} 
                        alt={`${selectedLeave.employee?.firstName || 'Unknown'} ${selectedLeave.employee?.lastName || 'Employee'}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {selectedLeave.employee?.firstName?.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedLeave.employee?.firstName || 'Unknown'} {selectedLeave.employee?.lastName || 'Employee'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedLeave.employee?.position || '-'} • {selectedLeave.department?.name || 'Unknown Department'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedLeave.leaveType} Balance
                  </p>
                  <p className="text-lg font-bold text-purple-600">
                    {getEmployeeAvailableBalance(selectedLeave.leaveType)} days
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Available
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Leave Type */}
          <CustomInput
            label="Leave Type"
            type="select"
            value={formData.leaveType}
            onChange={(value) => handleInputChange('leaveType', value)}
            error={formErrors.leaveType}
            readOnly={drawerMode === 'view'}
            required
          >
            <option value="">Select leave type</option>
            {policies.map((policy) => (
              <option key={policy._id} value={policy.leaveType}>
                {policy.leaveType} (Available: {getAvailableBalance(policy.leaveType)} days)
              </option>
            ))}
          </CustomInput>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomInput
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(value) => handleInputChange('startDate', value)}
              error={formErrors.startDate}
              readOnly={drawerMode === 'view'}
              required
            />
            <CustomInput
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(value) => handleInputChange('endDate', value)}
              error={formErrors.endDate}
              readOnly={drawerMode === 'view'}
              required
            />
          </div>

          {/* Total Days */}
          <CustomInput
            label="Total Days"
            type="number"
            value={formData.totalDays.toString()}
            onChange={(value) => handleInputChange('totalDays', parseInt(value) || 0)}
            error={formErrors.totalDays}
            readOnly={true}
            required
          />

          {/* Priority */}
          <CustomInput
            label="Priority"
            type="select"
            value={formData.priority}
            onChange={(value) => handleInputChange('priority', value)}
            readOnly={drawerMode === 'view'}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </CustomInput>

          {/* Reason */}
          <CustomInput
            label="Reason"
            type="textarea"
            value={formData.reason}
            onChange={(value) => handleInputChange('reason', value)}
            error={formErrors.reason}
            readOnly={drawerMode === 'view'}
            required
            rows={4}
          />

          {/* Approval Workflow (for view/approve modes) */}
          {selectedLeave && selectedLeave.approvalWorkflow.length > 0 && (drawerMode === 'view' || drawerMode === 'approve') && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Approval Workflow</h4>
              <div className="space-y-2">
                {selectedLeave.approvalWorkflow.map((workflow, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-600 rounded">
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        workflow.status === 'approved' ? 'bg-green-100 text-green-600' :
                        workflow.status === 'rejected' ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>
                        {workflow.status === 'approved' ? <CheckCircle className="w-4 h-4" /> :
                         workflow.status === 'rejected' ? <XCircle className="w-4 h-4" /> :
                         <Clock className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {workflow.approver?.firstName || 'Unknown'} {workflow.approver?.lastName || 'Approver'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {workflow.approverRole || 'Unknown Role'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
                      </p>
                      {workflow.actionDate && (
                        <p className="text-xs text-gray-400">
                          {new Date(workflow.actionDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Comments (for approve mode) */}
          {drawerMode === 'approve' && (
            <CustomInput
              label="Approval Comments"
              type="textarea"
              value={approvalComments}
              onChange={(value) => setApprovalComments(value)}
              placeholder="Add comments for this approval/rejection..."
              rows={3}
            />
          )}

          {/* Actions */}
          {drawerMode !== 'view' && (
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
              <Button variant="flat" onPress={handleCloseDrawer}>
                Cancel
              </Button>
              {drawerMode === 'approve' ? (
                <>
                  <Button 
                    color="danger"
                    onPress={() => {
                      setApprovalAction('rejected');
                      handleSubmit();
                    }}
                    isLoading={submitting && approvalAction === 'rejected'}
                  >
                    Reject Leave
                  </Button>
                  <Button 
                    color="success"
                    onPress={() => {
                      setApprovalAction('approved');
                      handleSubmit();
                    }}
                    isLoading={submitting && approvalAction === 'approved'}
                  >
                    Approve Leave
                  </Button>
                </>
              ) : (
                <Button 
                  color="primary"
                  onPress={handleSubmit}
                  isLoading={submitting}
                >
                  {drawerMode === 'create' ? 'Apply for Leave' : 'Update Application'}
                </Button>
              )}
            </div>
          )}
        </div>
      </Drawer>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onOpenChange={onConfirmOpenChange}
        title="Delete Leave Application"
        message={`Are you sure you want to delete this leave application? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Leaves;