import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, ClipboardList, AlertCircle, CheckCircle } from "lucide-react";
import DataTable, { type Column } from "~/components/DataTable";
import Drawer from "~/components/Drawer";
import CustomInput from "~/components/CustomInput";
import ConfirmModal from "~/components/confirmModal";
import { Button, useDisclosure } from "@heroui/react";
import { successToast, errorToast } from "~/components/toast";

interface LeavePolicy {
  _id: string;
  leaveType: string;
  description: string;
  defaultAllocation: number;
  maxConsecutiveDays: number;
  minAdvanceNotice: number;
  maxAdvanceBooking: number;
  allowCarryForward: boolean;
  carryForwardLimit: number;
  documentsRequired: boolean;
  approvalWorkflowLimits: {
    managerMaxDays: number;
    deptHeadMaxDays: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PolicyFormData {
  leaveType: string;
  description: string;
  defaultAllocation: number;
  maxConsecutiveDays: number;
  minAdvanceNotice: number;
  maxAdvanceBooking: number;
  allowCarryForward: boolean;
  carryForwardLimit: number;
  documentsRequired: boolean;
  managerMaxDays: number;
  deptHeadMaxDays: number;
  isActive: boolean;
}

const LeavePolicies = () => {
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedPolicy, setSelectedPolicy] = useState<LeavePolicy | null>(null);
  const [formData, setFormData] = useState<PolicyFormData>({
    leaveType: '',
    description: '',
    defaultAllocation: 0,
    maxConsecutiveDays: 365,
    minAdvanceNotice: 0,
    maxAdvanceBooking: 365,
    allowCarryForward: false,
    carryForwardLimit: 0,
    documentsRequired: false,
    managerMaxDays: 30,
    deptHeadMaxDays: 60,
    isActive: true
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Confirm modal state
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onOpenChange: onConfirmOpenChange } = useDisclosure();
  const [policyToDelete, setPolicyToDelete] = useState<LeavePolicy | null>(null);

  // Load policies on component mount
  useEffect(() => {
    loadPolicies();
  }, []);

  // Load policies from API
  const loadPolicies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leaves?operation=getPolicies');
      const data = await response.json();
      
      if (data.success) {
        setPolicies(data.data || []);
      } else {
        errorToast('Failed to load policies: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading policies:', error);
      errorToast('Failed to load policies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Table columns configuration
  const columns: Column<LeavePolicy>[] = [
    {
      key: 'leaveType',
      title: 'Leave Type',
      sortable: true,
      searchable: true,
      render: (value: string) => (
        <span className="font-medium text-gray-900 dark:text-white">{value}</span>
      )
    },
    {
      key: 'description',
      title: 'Description',
      sortable: false,
      searchable: true,
      render: (value: string) => (
        <span className="text-gray-600 dark:text-gray-400 truncate max-w-xs">{value}</span>
      )
    },
    {
      key: 'defaultAllocation',
      title: 'Default Days',
      sortable: true,
      searchable: false,
      align: 'center',
      render: (value: number) => (
        <span className="font-medium">{value}</span>
      )
    },
    {
      key: 'maxConsecutiveDays',
      title: 'Max Consecutive',
      sortable: true,
      searchable: false,
      align: 'center',
      render: (value: number) => (
        <span className="text-sm">{value}</span>
      )
    },
    {
      key: 'minAdvanceNotice',
      title: 'Min Notice',
      sortable: true,
      searchable: false,
      align: 'center',
      render: (value: number) => (
        <span className="text-sm">{value} days</span>
      )
    },
    {
      key: 'allowCarryForward',
      title: 'Carry Forward',
      sortable: true,
      searchable: false,
      align: 'center',
      render: (value: boolean) => (
        value ? (
          <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
        ) : (
          <span className="text-gray-400">-</span>
        )
      )
    },
    {
      key: 'isActive',
      title: 'Status',
      sortable: true,
      searchable: false,
      render: (value: boolean) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          value 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {value ? 'ACTIVE' : 'INACTIVE'}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      searchable: false,
      width: '120px',
      align: 'center',
      render: (_, record: LeavePolicy) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            isIconOnly
            onPress={() => handleView(record)}
          >
            <ClipboardList size={16} />
          </Button>
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
            color="danger"
            isIconOnly
            onPress={() => handleDelete(record)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.leaveType.trim()) errors.leaveType = 'Leave type is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (formData.defaultAllocation <= 0) errors.defaultAllocation = 'Default allocation must be greater than 0';
    if (formData.maxConsecutiveDays <= 0) errors.maxConsecutiveDays = 'Max consecutive days must be greater than 0';
    if (formData.minAdvanceNotice < 0) errors.minAdvanceNotice = 'Min advance notice cannot be negative';
    if (formData.maxAdvanceBooking <= 0) errors.maxAdvanceBooking = 'Max advance booking must be greater than 0';
    if (formData.allowCarryForward && formData.carryForwardLimit < 0) {
      errors.carryForwardLimit = 'Carry forward limit cannot be negative';
    }
    if (formData.managerMaxDays <= 0) errors.managerMaxDays = 'Manager max days must be greater than 0';
    if (formData.deptHeadMaxDays <= 0) errors.deptHeadMaxDays = 'Department head max days must be greater than 0';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field: keyof PolicyFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle create new policy
  const handleCreate = () => {
    setDrawerMode('create');
    setSelectedPolicy(null);
    setFormData({
      leaveType: '',
      description: '',
      defaultAllocation: 0,
      maxConsecutiveDays: 365,
      minAdvanceNotice: 0,
      maxAdvanceBooking: 365,
      allowCarryForward: false,
      carryForwardLimit: 0,
      documentsRequired: false,
      managerMaxDays: 30,
      deptHeadMaxDays: 60,
      isActive: true
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  // Handle view policy
  const handleView = (policy: LeavePolicy) => {
    setDrawerMode('view');
    setSelectedPolicy(policy);
    setFormData({
      leaveType: policy.leaveType,
      description: policy.description,
      defaultAllocation: policy.defaultAllocation,
      maxConsecutiveDays: policy.maxConsecutiveDays,
      minAdvanceNotice: policy.minAdvanceNotice,
      maxAdvanceBooking: policy.maxAdvanceBooking,
      allowCarryForward: policy.allowCarryForward,
      carryForwardLimit: policy.carryForwardLimit,
      documentsRequired: policy.documentsRequired,
      managerMaxDays: policy.approvalWorkflowLimits.managerMaxDays,
      deptHeadMaxDays: policy.approvalWorkflowLimits.deptHeadMaxDays,
      isActive: policy.isActive
    });
    setDrawerOpen(true);
  };

  // Handle edit policy
  const handleEdit = (policy: LeavePolicy) => {
    setDrawerMode('edit');
    setSelectedPolicy(policy);
    setFormData({
      leaveType: policy.leaveType,
      description: policy.description,
      defaultAllocation: policy.defaultAllocation,
      maxConsecutiveDays: policy.maxConsecutiveDays,
      minAdvanceNotice: policy.minAdvanceNotice,
      maxAdvanceBooking: policy.maxAdvanceBooking,
      allowCarryForward: policy.allowCarryForward,
      carryForwardLimit: policy.carryForwardLimit,
      documentsRequired: policy.documentsRequired,
      managerMaxDays: policy.approvalWorkflowLimits.managerMaxDays,
      deptHeadMaxDays: policy.approvalWorkflowLimits.deptHeadMaxDays,
      isActive: policy.isActive
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  // Handle delete policy
  const handleDelete = (policy: LeavePolicy) => {
    setPolicyToDelete(policy);
    onConfirmOpen();
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!policyToDelete) return;

    try {
      const formData = new FormData();
      formData.append('operation', 'deletePolicy');
      formData.append('id', policyToDelete._id);

      const response = await fetch('/api/leaves', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        successToast('Policy deleted successfully');
        loadPolicies();
      } else {
        errorToast('Failed to delete policy: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting policy:', error);
      errorToast('Failed to delete policy. Please try again.');
    } finally {
      setPolicyToDelete(null);
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
        submitData.append('operation', 'createPolicy');
      } else if (drawerMode === 'edit') {
        submitData.append('operation', 'updatePolicy');
        submitData.append('id', selectedPolicy!._id);
      }

      // Add form data
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'managerMaxDays' || key === 'deptHeadMaxDays') {
          // Handle approval workflow limits separately
          return;
        }
        submitData.append(key, value.toString());
      });

      // Add approval workflow limits
      submitData.append('approvalWorkflowLimits', JSON.stringify({
        managerMaxDays: formData.managerMaxDays,
        deptHeadMaxDays: formData.deptHeadMaxDays
      }));

      const response = await fetch('/api/leaves', {
        method: 'POST',
        body: submitData
      });

      const data = await response.json();

      if (data.success) {
        const action = drawerMode === 'create' ? 'created' : 'updated';
        successToast(`Policy ${action} successfully`);
        loadPolicies();
        handleCloseDrawer();
      } else {
        errorToast(`Failed to ${drawerMode} policy: ` + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error(`Error ${drawerMode} policy:`, error);
      errorToast(`Failed to ${drawerMode} policy. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle close drawer
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedPolicy(null);
    setFormData({
      leaveType: '',
      description: '',
      defaultAllocation: 0,
      maxConsecutiveDays: 365,
      minAdvanceNotice: 0,
      maxAdvanceBooking: 365,
      allowCarryForward: false,
      carryForwardLimit: 0,
      documentsRequired: false,
      managerMaxDays: 30,
      deptHeadMaxDays: 60,
      isActive: true
    });
    setFormErrors({});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <ClipboardList className="w-8 h-8 mr-3 text-orange-600" />
            Leave Policies
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage leave policies and rules
          </p>
        </div>
        <Button 
          color="primary" 
          onPress={handleCreate}
          startContent={<Plus className="w-4 h-4" />}
        >
          Create Policy
        </Button>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <DataTable
          data={policies}
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
          drawerMode === 'create' ? 'Create Leave Policy' :
          drawerMode === 'edit' ? 'Edit Leave Policy' :
          'Leave Policy Details'
        }
        size="lg"
      >
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Basic Information
            </h3>
            <div className="space-y-4">
              <CustomInput
                label="Leave Type"
                type="text"
                value={formData.leaveType}
                onChange={(value) => handleInputChange('leaveType', value)}
                error={formErrors.leaveType}
                readOnly={drawerMode === 'view'}
                required
                placeholder="e.g., Annual Leave, Sick Leave, Maternity Leave"
              />

              <CustomInput
                label="Description"
                type="textarea"
                value={formData.description}
                onChange={(value) => handleInputChange('description', value)}
                error={formErrors.description}
                readOnly={drawerMode === 'view'}
                required
                rows={3}
                placeholder="Describe the purpose and conditions of this leave type"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomInput
                  label="Default Allocation (Days)"
                  type="number"
                  value={formData.defaultAllocation.toString()}
                  onChange={(value) => handleInputChange('defaultAllocation', parseInt(value) || 0)}
                  error={formErrors.defaultAllocation}
                  readOnly={drawerMode === 'view'}
                  required
                />

                <CustomInput
                  label="Max Consecutive Days"
                  type="number"
                  value={formData.maxConsecutiveDays.toString()}
                  onChange={(value) => handleInputChange('maxConsecutiveDays', parseInt(value) || 0)}
                  error={formErrors.maxConsecutiveDays}
                  readOnly={drawerMode === 'view'}
                  required
                />
              </div>
            </div>
          </div>

          {/* Booking Rules */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Booking Rules
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomInput
                label="Min Advance Notice (Days)"
                type="number"
                value={formData.minAdvanceNotice.toString()}
                onChange={(value) => handleInputChange('minAdvanceNotice', parseInt(value) || 0)}
                error={formErrors.minAdvanceNotice}
                readOnly={drawerMode === 'view'}
              />

              <CustomInput
                label="Max Advance Booking (Days)"
                type="number"
                value={formData.maxAdvanceBooking.toString()}
                onChange={(value) => handleInputChange('maxAdvanceBooking', parseInt(value) || 0)}
                error={formErrors.maxAdvanceBooking}
                readOnly={drawerMode === 'view'}
              />
            </div>
          </div>

          {/* Carry Forward Rules */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Carry Forward Rules
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowCarryForward"
                  checked={formData.allowCarryForward}
                  onChange={(e) => handleInputChange('allowCarryForward', e.target.checked)}
                  disabled={drawerMode === 'view'}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="allowCarryForward" className="text-sm font-medium text-gray-900 dark:text-white">
                  Allow carry forward to next year
                </label>
              </div>

              {formData.allowCarryForward && (
                <CustomInput
                  label="Carry Forward Limit (Days)"
                  type="number"
                  value={formData.carryForwardLimit.toString()}
                  onChange={(value) => handleInputChange('carryForwardLimit', parseInt(value) || 0)}
                  error={formErrors.carryForwardLimit}
                  readOnly={drawerMode === 'view'}
                />
              )}
            </div>
          </div>

          {/* Approval Workflow */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Approval Workflow Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomInput
                label="Manager Max Days"
                type="number"
                value={formData.managerMaxDays.toString()}
                onChange={(value) => handleInputChange('managerMaxDays', parseInt(value) || 0)}
                error={formErrors.managerMaxDays}
                readOnly={drawerMode === 'view'}
                required
              />

              <CustomInput
                label="Department Head Max Days"
                type="number"
                value={formData.deptHeadMaxDays.toString()}
                onChange={(value) => handleInputChange('deptHeadMaxDays', parseInt(value) || 0)}
                error={formErrors.deptHeadMaxDays}
                readOnly={drawerMode === 'view'}
                required
              />
            </div>
          </div>

          {/* Additional Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Additional Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="documentsRequired"
                  checked={formData.documentsRequired}
                  onChange={(e) => handleInputChange('documentsRequired', e.target.checked)}
                  disabled={drawerMode === 'view'}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="documentsRequired" className="text-sm font-medium text-gray-900 dark:text-white">
                  Documents required for approval
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  disabled={drawerMode === 'view'}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-900 dark:text-white">
                  Policy is active
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          {drawerMode !== 'view' && (
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
              <Button variant="flat" onPress={handleCloseDrawer}>
                Cancel
              </Button>
              <Button 
                color="primary"
                onPress={handleSubmit}
                isLoading={submitting}
              >
                {drawerMode === 'create' ? 'Create Policy' : 'Update Policy'}
              </Button>
            </div>
          )}
        </div>
      </Drawer>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onOpenChange={onConfirmOpenChange}
        title="Delete Leave Policy"
        message={`Are you sure you want to delete the "${policyToDelete?.leaveType}" policy? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default LeavePolicies;  
