import { useState, useEffect } from "react";
import { Calendar, Clock, AlertCircle, CheckCircle } from "lucide-react";
import CustomInput from "~/components/CustomInput";
import { Button, Select, SelectItem } from "@heroui/react";
import { successToast, errorToast } from "~/components/toast";

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

const ApplyLeave = () => {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<LeaveFormData>({
    leaveType: '',
    startDate: '',
    endDate: '',
    totalDays: 0,
    reason: '',
    priority: 'normal'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load data on component mount
  useEffect(() => {
    loadBalances();
    loadPolicies();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

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
      const today = new Date();
      
      if (startDate > endDate) {
        errors.endDate = 'End date must be after start date';
      }
      
      if (startDate < today) {
        errors.startDate = 'Start date cannot be in the past';
      }
    }

    // Check available balance for specific leave type
    if (formData.leaveType && formData.totalDays > 0) {
      const balance = balances.find(b => b.leaveType === formData.leaveType);
      if (balance && formData.totalDays > balance.remaining) {
        errors.totalDays = `Insufficient ${formData.leaveType} balance. Available: ${balance.remaining} days`;
      }

      // Ghana Labor Law: Check annual quota for non-exempt leave types
      const exemptLeaveTypes = ['Sick Leave', 'Maternity Leave'];
      const isExemptLeave = exemptLeaveTypes.includes(formData.leaveType);
      
      if (!isExemptLeave) {
        const annualQuota = balances.find(b => b.leaveType === 'Annual Leave Quota');
        if (annualQuota && formData.totalDays > annualQuota.remaining) {
          errors.totalDays = `Insufficient annual leave quota. Available: ${annualQuota.remaining} days (Ghana Labor Law: 15 days annual limit)`;
        }
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

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('operation', 'create');
      
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value.toString());
      });

      const response = await fetch('/api/leaves', {
        method: 'POST',
        body: submitData
      });

      const data = await response.json();

      if (data.success) {
        successToast('Leave application submitted successfully');
        // Reset form
        setFormData({
          leaveType: '',
          startDate: '',
          endDate: '',
          totalDays: 0,
          reason: '',
          priority: 'normal'
        });
        setFormErrors({});
        // Reload balances to reflect pending leave
        loadBalances();
      } else {
        errorToast('Failed to submit leave application: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error submitting leave:', error);
      errorToast('Failed to submit leave application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Get available balance for selected leave type
  const getAvailableBalance = (leaveType: string) => {
    const balance = balances.find(b => b.leaveType === leaveType);
    return balance ? balance.remaining : 0;
  };

  // Get policy details for selected leave type
  const getSelectedPolicy = () => {
    return policies.find(p => p.leaveType === formData.leaveType);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedPolicy = getSelectedPolicy();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Calendar className="w-8 h-8 mr-3 text-blue-600" />
            Apply for Leave
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Submit a new leave application
          </p>
        </div>
      </div>

      {/* Ghana Labor Law Compliance Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              🇬🇭 Ghana Labor Law - Annual Leave Policy
            </h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p>• <strong>Annual Leave Quota:</strong> Each employee is entitled to 15 days of annual leave per year</p>
              <p>• <strong>Leave Deduction:</strong> Most leave types count against your 15-day annual quota</p>
              <p>• <strong>Exempt Leave Types:</strong> Sick Leave and Maternity Leave do NOT count against your annual quota</p>
              <p>• <strong>Quota Exhausted:</strong> Once you use all 15 days, you can only apply for Sick Leave or Maternity Leave</p>
            </div>
            {(() => {
              const annualQuota = balances.find(b => b.leaveType === 'Annual Leave Quota');
              if (annualQuota) {
                return (
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Annual Quota Status:
                      </span>
                      <span className={`text-lg font-bold ${annualQuota.remaining > 5 ? 'text-green-600' : annualQuota.remaining > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {annualQuota.remaining} / {annualQuota.totalAllocated} days remaining
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${annualQuota.remaining > 5 ? 'bg-green-500' : annualQuota.remaining > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${(annualQuota.remaining / annualQuota.totalAllocated) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    {annualQuota.remaining === 0 && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                        ⚠️ Annual quota exhausted. You can only apply for Sick Leave or Maternity Leave.
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Leave Application Details
                </h2>
                
                <div className="space-y-4">
                  {/* Leave Type */}
                  <div>
                    <Select
                      variant="bordered"
                      label="Leave Type"
                      placeholder="Select leave type"
                      labelPlacement="outside"
                      isRequired
                      selectedKeys={formData.leaveType ? [formData.leaveType] : []}
                      onSelectionChange={(keys) => {
                        const selectedValue = Array.from(keys)[0] as string;
                        handleInputChange('leaveType', selectedValue);
                      }}
                      isInvalid={!!formErrors.leaveType}
                      errorMessage={formErrors.leaveType}
                      classNames={{
                        label: "font-nunito text-sm !text-black dark:!text-white",
                        value: "text-gray-900 dark:text-white",
                        trigger: "border text-gray-900 dark:text-white border-black/20 dark:border-white/20 bg-white dark:bg-gray-800 outline-none shadow-sm hover:bg-dashboard-secondary hover:border-white/20 focus-within:border-white/20 focus-within:outline-none focus-within:shadow-none focus-within:ring-0 focus-within:ring-offset-0"
                      }}
                    >
                      {policies.map((policy) => (
                        <SelectItem key={policy.leaveType}>
                          {policy.leaveType} (Available: {getAvailableBalance(policy.leaveType)} days)
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomInput
                      label="Start Date"
                      type="date"
                      value={formData.startDate}
                      onChange={(value) => handleInputChange('startDate', value)}
                      error={formErrors.startDate}
                      required
                    />
                    <CustomInput
                      label="End Date"
                      type="date"
                      value={formData.endDate}
                      onChange={(value) => handleInputChange('endDate', value)}
                      error={formErrors.endDate}
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
                  <div>
                    <Select
                      variant="bordered"
                      label="Priority"
                      placeholder="Select priority"
                      labelPlacement="outside"
                      selectedKeys={formData.priority ? [formData.priority] : []}
                      onSelectionChange={(keys) => {
                        const selectedValue = Array.from(keys)[0] as string;
                        handleInputChange('priority', selectedValue);
                      }}
                      classNames={{
                        label: "font-nunito text-sm !text-black dark:!text-white",
                        value: "text-gray-900 dark:text-white",
                        trigger: "border text-gray-900 dark:text-white border-black/20 dark:border-white/20 bg-white dark:bg-gray-800 outline-none shadow-sm hover:bg-dashboard-secondary hover:border-white/20 focus-within:border-white/20 focus-within:outline-none focus-within:shadow-none focus-within:ring-0 focus-within:ring-offset-0"
                      }}
                    >
                      <SelectItem key="low">Low</SelectItem>
                      <SelectItem key="normal">Normal</SelectItem>
                      <SelectItem key="high">High</SelectItem>
                      <SelectItem key="urgent">Urgent</SelectItem>
                    </Select>
                  </div>

                  {/* Reason */}
                  <CustomInput
                    label="Reason for Leave"
                    type="textarea"
                    value={formData.reason}
                    onChange={(value) => handleInputChange('reason', value)}
                    error={formErrors.reason}
                    required
                    rows={4}
                    placeholder="Please provide a detailed reason for your leave request..."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-600">
                <Button 
                  color="primary"
                  onPress={handleSubmit}
                  isLoading={submitting}
                  size="lg"
                >
                  Submit Leave Application
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Leave Balances */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Your Leave Balance
            </h3>
            <div className="space-y-4">
              {balances.map((balance) => (
                <div key={balance._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {balance.leaveType}
                    </h4>
                    <span className="text-2xl font-bold text-blue-600">
                      {balance.remaining}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Total Allocated:</span>
                      <span>{balance.totalAllocated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Used:</span>
                      <span>{balance.used}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending:</span>
                      <span>{balance.pending}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${((balance.used + balance.pending) / balance.totalAllocated) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Policy Information */}
          {selectedPolicy && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Policy Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedPolicy.leaveType}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedPolicy.description}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Max Consecutive Days</p>
                    <p className="text-gray-600 dark:text-gray-400">{selectedPolicy.maxConsecutiveDays}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Min Advance Notice</p>
                    <p className="text-gray-600 dark:text-gray-400">{selectedPolicy.minAdvanceNotice} days</p>
                  </div>
                </div>

                {formData.totalDays > selectedPolicy.maxConsecutiveDays && (
                  <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Your request exceeds the maximum consecutive days allowed for this leave type.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
              Application Tips
            </h3>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Submit your application well in advance</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Provide detailed reasons for your leave</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Check your leave balance before applying</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Coordinate with your team for coverage</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyLeave;  
