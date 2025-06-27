import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, Upload, X, Download, FileText, Calendar, Filter, Users, CheckCircle2 } from "lucide-react";
import DataTable, { type Column } from "~/components/DataTable";
import Drawer from "~/components/Drawer";
import ConfirmModal from "~/components/confirmModal";
import { Button, useDisclosure, Input, Textarea, Select, SelectItem, DateRangePicker, Checkbox, Card, CardBody, Chip } from "@heroui/react";
import { successToast, errorToast } from "~/components/toast";
import axios from "axios";

interface ReportFormData {
  department: string;
  departmentType: string;
  type: string;
  month: number;
  year: number;
  amount: string;
  notes: string;
  status: 'draft' | 'submitted';
  // Department-specific fields
  subscriptionPackage?: string;
  numberOfFirms?: string;
  numberOfUsers?: string;
  projectName?: string;
  developmentHours?: string;
  projectStatus?: string;
  totalTickets?: string;
  resolvedTickets?: string;
  averageResponseTime?: string;
  customerSatisfaction?: string;
  articlesPublished?: string;
  totalViews?: string;
  newSubscribers?: string;
  revenue?: string;
}

interface Report {
  _id: string;
  department: { _id: string; name: string };
  departmentType: string;
  type: string;
  month: number;
  year: number;
  amount: number;
  notes: string;
  status: 'draft' | 'submitted';
  createdBy: { _id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
  attachments?: Array<{ name: string; size: number; type: string; uploadedAt: string }>;
  // Department-specific fields
  subscriptionPackage?: string;
  numberOfFirms?: number;
  numberOfUsers?: number;
  projectName?: string;
  developmentHours?: number;
  projectStatus?: string;
  totalTickets?: number;
  resolvedTickets?: number;
  averageResponseTime?: number;
  customerSatisfaction?: number;
  articlesPublished?: number;
  totalViews?: number;
  newSubscribers?: number;
  revenue?: number;
}

interface Department {
  _id: string;
  name: string;
}

const MonthlyReportsList = () => {
  // State management
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [formData, setFormData] = useState<ReportFormData>({
    department: '',
    departmentType: 'data',
    type: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: '',
    notes: '',
    status: 'draft'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  // Filtering and Export state
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [createdByFilter, setCreatedByFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  // Confirm modal state
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onOpenChange: onConfirmOpenChange } = useDisclosure();
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);

  // Load reports and departments on component mount
  useEffect(() => {
    loadCurrentUser();
    loadReports();
    loadDepartments();
  }, []);

  // Apply filters whenever reports or filter criteria change
  useEffect(() => {
    applyFilters();
  }, [reports, dateRange, statusFilter, createdByFilter, departmentFilter, currentUser]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/reports');
      if (response.data.success) {
        setReports(response.data.data || []);
      } else {
        console.error('API response not successful:', response.data.error);
        setReports([]);
        errorToast('Failed to load reports from server');
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports([]);
      errorToast('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await axios.get('/api/departments');
      if (response.data.success) {
        setDepartments(response.data.departments || []);
      } else {
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
      setDepartments([]);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      if (response.data.success) {
        setCurrentUser(response.data.user);
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
      setCurrentUser(null);
    }
  };

  // Check if user can see a report based on role and status
  const canViewReport = (report: Report) => {
    if (!currentUser) {
      console.log('No currentUser in canViewReport');
      return false;
    }
    
    const userRole = currentUser.role?.toLowerCase();
    const reportStatus = report.status;
    const isCreator = report.createdBy && (
      report.createdBy._id === currentUser._id || 
      `${report.createdBy.firstName} ${report.createdBy.lastName}` === `${currentUser.firstName} ${currentUser.lastName}`
    );
    const isSameDepartment = report.department._id === currentUser.department?._id;

    console.log(`Checking report ${report._id}:`, {
      userRole,
      reportStatus,
      isCreator,
      isSameDepartment,
      reportDept: report.department.name,
      userDept: currentUser.department?.name
    });

    // Admin and manager can only see submitted/approved/rejected reports (not drafts)
    if (userRole === 'admin' || userRole === 'manager') {
      const canView = reportStatus !== 'draft';
      console.log(`${userRole} check: ${canView} (status: ${reportStatus})`);
      return canView;
    }
    
    // Department head can see:
    // - Their own reports (any status)
    // - Submitted/approved/rejected reports from their department
    if (userRole === 'department_head') {
      if (isCreator) {
        console.log('Department head - own report: true');
        return true; // Own reports (any status)
      }
      if (isSameDepartment && reportStatus !== 'draft') {
        console.log('Department head - department non-draft: true');
        return true; // Department non-draft reports
      }
      console.log('Department head - no access: false');
      return false;
    }
    
    // Staff can only see:
    // - Their own reports (any status)
    // - Submitted/approved/rejected reports from their department
    if (userRole === 'staff') {
      if (isCreator) {
        console.log('Staff - own report: true');
        return true; // Own reports (any status)
      }
      if (isSameDepartment && reportStatus !== 'draft') {
        console.log('Staff - department non-draft: true');
        return true; // Department non-draft reports
      }
      console.log('Staff - no access: false');
      return false;
    }
    
    return false;
  };

  // Apply filters to reports
  const applyFilters = () => {
    console.log('Applying filters...', { 
      reportsCount: reports.length, 
      currentUser: currentUser?.role,
      currentUserDept: currentUser?.department?.name 
    });
    
    let filtered = [...reports];

    // First apply role-based visibility (only if currentUser is loaded)
    if (currentUser) {
      const beforeRoleFilter = filtered.length;
      filtered = filtered.filter(report => canViewReport(report));
      console.log(`Role filter: ${beforeRoleFilter} -> ${filtered.length} reports`);
      
      // Log which reports are being filtered out for debugging
      const filteredOut = reports.filter(report => !canViewReport(report));
      if (filteredOut.length > 0) {
        console.log('Reports filtered out by role:', filteredOut.map(r => ({
          id: r._id,
          status: r.status,
          createdBy: r.createdBy,
          department: r.department.name
        })));
      }
    } else {
      console.log('No currentUser, skipping role filter');
    }

    // Date range filter
    if (dateRange && dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      const beforeDateFilter = filtered.length;
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.createdAt);
        return reportDate >= startDate && reportDate <= endDate;
      });
      console.log(`Date filter: ${beforeDateFilter} -> ${filtered.length} reports`);
    }

    // Status filter
    if (statusFilter) {
      const beforeStatusFilter = filtered.length;
      filtered = filtered.filter(report => report.status === statusFilter);
      console.log(`Status filter: ${beforeStatusFilter} -> ${filtered.length} reports`);
    }

    // Created by filter
    if (createdByFilter) {
      const beforeCreatedByFilter = filtered.length;
      filtered = filtered.filter(report => 
        `${report.createdBy.firstName} ${report.createdBy.lastName}`.toLowerCase().includes(createdByFilter.toLowerCase())
      );
      console.log(`Created by filter: ${beforeCreatedByFilter} -> ${filtered.length} reports`);
    }

    // Department filter
    if (departmentFilter) {
      const beforeDeptFilter = filtered.length;
      filtered = filtered.filter(report => report.department._id === departmentFilter);
      console.log(`Department filter: ${beforeDeptFilter} -> ${filtered.length} reports`);
    }

    console.log(`Final filtered reports: ${filtered.length}`);
    setFilteredReports(filtered);
  };

  // Clear all filters
  const clearFilters = () => {
    setDateRange(null);
    setStatusFilter('');
    setCreatedByFilter('');
    setDepartmentFilter('');
  };

  // Handle report selection for export
  const handleReportSelection = (reportId: string, selected: boolean) => {
    const newSelection = new Set(selectedReports);
    if (selected) {
      newSelection.add(reportId);
    } else {
      newSelection.delete(reportId);
    }
    setSelectedReports(newSelection);
  };

  // Select all reports
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedReports(new Set(filteredReports.map(r => r._id)));
    } else {
      setSelectedReports(new Set());
    }
  };

  // Export functionality
  const handleExport = (format: 'pdf' | 'excel') => {
    const reportsToExport = selectedReports.size > 0 
      ? filteredReports.filter(r => selectedReports.has(r._id))
      : filteredReports;

    if (reportsToExport.length === 0) {
      errorToast('No reports to export');
      return;
    }

    // Create export data
    const exportData = reportsToExport.map(report => ({
      'Report Type': report.type,
      'Department': report.department.name,
      'Period': `${new Date(2024, report.month - 1, 1).toLocaleString('default', { month: 'long' })} ${report.year}`,
      'Amount': report.amount,
      'Status': report.status.charAt(0).toUpperCase() + report.status.slice(1),
      'Created By': `${report.createdBy.firstName} ${report.createdBy.lastName}`,
      'Created Date': new Date(report.createdAt).toLocaleDateString(),
      'Notes': report.notes || 'N/A',
      // Department-specific fields
      ...(report.subscriptionPackage && { 'Subscription Package': report.subscriptionPackage }),
      ...(report.numberOfFirms && { 'Number of Firms': report.numberOfFirms }),
      ...(report.numberOfUsers && { 'Number of Users': report.numberOfUsers }),
      ...(report.projectName && { 'Project Name': report.projectName }),
      ...(report.developmentHours && { 'Development Hours': report.developmentHours }),
      ...(report.projectStatus && { 'Project Status': report.projectStatus }),
      ...(report.totalTickets && { 'Total Tickets': report.totalTickets }),
      ...(report.resolvedTickets && { 'Resolved Tickets': report.resolvedTickets }),
      ...(report.averageResponseTime && { 'Avg Response Time': report.averageResponseTime }),
      ...(report.customerSatisfaction && { 'Customer Satisfaction': report.customerSatisfaction }),
      ...(report.articlesPublished && { 'Articles Published': report.articlesPublished }),
      ...(report.totalViews && { 'Total Views': report.totalViews }),
      ...(report.newSubscribers && { 'New Subscribers': report.newSubscribers }),
      ...(report.revenue && { 'Revenue': report.revenue }),
    }));

    if (format === 'excel') {
      // Create CSV for Excel compatibility
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `monthly-reports-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // PDF export (simplified - in real app would use proper PDF library)
      const printContent = `
        <html>
          <head>
            <title>Monthly Reports Export</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <h1>Monthly Reports Export</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <p>Total Reports: ${reportsToExport.length}</p>
            <table>
              <thead>
                <tr>${Object.keys(exportData[0] || {}).map(key => `<th>${key}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${exportData.map(row => 
                  `<tr>${Object.values(row).map(value => `<td>${value || 'N/A'}</td>`).join('')}</tr>`
                ).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }

    successToast(`Exported ${reportsToExport.length} reports as ${format.toUpperCase()}`);
    setSelectedReports(new Set()); // Clear selection after export
  };

  // Toggle report status
  const handleStatusToggle = async (report: Report, newStatus: string) => {
    try {
      const formData = new FormData();
      formData.append('operation', 'update');
      formData.append('reportId', report._id);
      formData.append('status', newStatus);
      
      // Keep existing data
      formData.append('department', report.department._id);
      formData.append('departmentType', report.departmentType);
      formData.append('type', report.type);
      formData.append('month', report.month.toString());
      formData.append('year', report.year.toString());
      formData.append('amount', report.amount.toString());
      formData.append('notes', report.notes);

      // Add department-specific fields based on department type
      const deptType = report.departmentType;
      if (deptType === 'data') {
        if (report.subscriptionPackage) formData.append('subscriptionPackage', report.subscriptionPackage);
        if (report.numberOfFirms) formData.append('numberOfFirms', report.numberOfFirms.toString());
        if (report.numberOfUsers) formData.append('numberOfUsers', report.numberOfUsers.toString());
      } else if (deptType === 'software') {
        if (report.projectName) formData.append('projectName', report.projectName);
        if (report.developmentHours) formData.append('developmentHours', report.developmentHours.toString());
        if (report.projectStatus) formData.append('projectStatus', report.projectStatus);
      } else if (deptType === 'customer_service') {
        if (report.totalTickets) formData.append('totalTickets', report.totalTickets.toString());
        if (report.resolvedTickets) formData.append('resolvedTickets', report.resolvedTickets.toString());
        if (report.averageResponseTime) formData.append('averageResponseTime', report.averageResponseTime.toString());
        if (report.customerSatisfaction) formData.append('customerSatisfaction', report.customerSatisfaction.toString());
      } else if (deptType === 'news') {
        if (report.articlesPublished) formData.append('articlesPublished', report.articlesPublished.toString());
        if (report.totalViews) formData.append('totalViews', report.totalViews.toString());
        if (report.newSubscribers) formData.append('newSubscribers', report.newSubscribers.toString());
        if (report.revenue) formData.append('revenue', report.revenue.toString());
      }

      const response = await axios.post('/api/reports', formData);
      if (response.data.success) {
        // Update the report in the list
        setReports(prev => prev.map(r => 
          r._id === report._id ? { ...r, status: newStatus as any } : r
        ));
        successToast(`Status updated to ${newStatus}`);
      } else {
        errorToast('Failed to update status: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      errorToast('Failed to update status: ' + (error.response?.data?.message || error.message || 'Unknown error'));
    }
  };

  // Department type detection
  const determineDepartmentType = (deptName: string) => {
    const name = deptName.toLowerCase();
    if (name.includes('data')) {
      return 'data';
    } else if (name.includes('software') || name.includes('development') || name.includes('information technology') || name.includes('it') || name.includes('tech')) {
      return 'software';
    } else if (name.includes('customer') || name.includes('service')) {
      return 'customer_service';
    } else if (name.includes('news') || name.includes('media')) {
      return 'news';
    } else {
      return 'software';
    }
  };

  // Table columns configuration
  const columns: Column<Report>[] = [
    {
      key: 'select',
      title: '',
      sortable: false,
      searchable: false,
      width: '50px',
      align: 'center',
      render: (_, record: Report) => (
        <Checkbox
          isSelected={selectedReports.has(record._id)}
          onValueChange={(selected) => handleReportSelection(record._id, selected)}
        />
      )
    },
    {
      key: 'type',
      title: 'Report Type',
      sortable: true,
      searchable: true,
    },
    {
      key: 'department',
      title: 'Department',
      sortable: true,
      searchable: true,
      render: (value: any) => value?.name || 'N/A'
    },
    {
      key: 'period',
      title: 'Period',
      sortable: false,
      searchable: false,
      render: (_, record: Report) => {
        const monthName = new Date(2024, record.month - 1, 1).toLocaleString('default', { month: 'long' });
        return `${monthName} ${record.year}`;
      }
    },
    {
      key: 'amount',
      title: 'Amount',
      sortable: true,
      searchable: false,
      render: (value: number) => `$${value?.toLocaleString() || 'N/A'}`
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      searchable: false,
      render: (value: string, record: Report) => (
        <div className="flex items-center space-x-2">
          <Select
            size="sm"
            variant="flat"
            selectedKeys={[value]}
            onSelectionChange={(keys) => {
              const newStatus = Array.from(keys)[0] as string;
              if (newStatus !== value) {
                handleStatusToggle(record, newStatus);
              }
            }}
            className="min-w-[120px]"
            classNames={{
              trigger: `${
                value === 'submitted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700' :
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700'
              } border min-h-unit-6 h-6 hover:opacity-80`
            }}
          >
            <SelectItem key="draft">Draft</SelectItem>
            <SelectItem key="submitted">Submitted</SelectItem>
          </Select>
        </div>
      )
    },
    {
      key: 'createdBy',
      title: 'Created By',
      sortable: false,
      searchable: true,
      render: (value: any) => `${value?.firstName || ''} ${value?.lastName || ''}`
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      searchable: false,
      width: '150px',
      align: 'center',
      render: (_, record: Report) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            isIconOnly
            onPress={() => handleView(record)}
            className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
          >
            <Eye size={16} />
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="warning"
            isIconOnly
            onPress={() => handleEdit(record)}
            className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
          >
            <Edit size={16} />
          </Button>
          {((record.attachments && record.attachments.length > 0) || (selectedReport?._id === record._id && attachments.length > 0)) && (
            <Button
              size="sm"
              variant="flat"
              color="success"
              isIconOnly
              onPress={() => handleDownload(record)}
              title={`Download ${(record.attachments?.length || 0) + (selectedReport?._id === record._id ? attachments.length : 0)} file(s)`}
              className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
            >
              <Download size={16} />
            </Button>
          )}
          <Button
            size="sm"
            variant="flat"
            color="danger"
            isIconOnly
            onPress={() => handleDelete(record)}
            className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.department) errors.department = 'Department is required';
    if (!formData.type) errors.type = 'Report type is required';
    if (!formData.amount) errors.amount = 'Amount is required';
    if (formData.amount && isNaN(parseFloat(formData.amount))) errors.amount = 'Amount must be a valid number';

    // Department-specific validation
    if (formData.departmentType === 'data') {
      if (!formData.subscriptionPackage) errors.subscriptionPackage = 'Subscription package is required';
      if (!formData.numberOfFirms) errors.numberOfFirms = 'Number of firms is required';
      if (!formData.numberOfUsers) errors.numberOfUsers = 'Number of users is required';
    } else if (formData.departmentType === 'software') {
      if (!formData.projectName) errors.projectName = 'Project name is required';
      if (!formData.developmentHours) errors.developmentHours = 'Development hours is required';
      if (!formData.projectStatus) errors.projectStatus = 'Project status is required';
    } else if (formData.departmentType === 'customer_service') {
      if (!formData.totalTickets) errors.totalTickets = 'Total tickets is required';
      if (!formData.resolvedTickets) errors.resolvedTickets = 'Resolved tickets is required';
      if (!formData.averageResponseTime) errors.averageResponseTime = 'Average response time is required';
      if (!formData.customerSatisfaction) errors.customerSatisfaction = 'Customer satisfaction is required';
    } else if (formData.departmentType === 'news') {
      if (!formData.articlesPublished) errors.articlesPublished = 'Articles published is required';
      if (!formData.totalViews) errors.totalViews = 'Total views is required';
      if (!formData.newSubscribers) errors.newSubscribers = 'New subscribers is required';
      if (!formData.revenue) errors.revenue = 'Revenue is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof ReportFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleDepartmentChange = (deptId: string) => {
    const dept = departments.find(d => d._id === deptId);
    const deptType = dept ? determineDepartmentType(dept.name) : 'data';
    
    setFormData(prev => ({
      ...prev,
      department: deptId,
      departmentType: deptType
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCreate = () => {
    setDrawerMode('create');
    setSelectedReport(null);
    setFormData({
      department: '',
      departmentType: 'data',
      type: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amount: '',
      notes: '',
      status: 'draft'
    });
    setFormErrors({});
    setAttachments([]);
    setDrawerOpen(true);
  };

  const handleView = (report: Report) => {
    setDrawerMode('view');
    setSelectedReport(report);
    setFormData({
      department: report.department._id,
      departmentType: report.departmentType,
      type: report.type,
      month: report.month,
      year: report.year,
      amount: report.amount.toString(),
      notes: report.notes,
      status: report.status === 'approved' || report.status === 'rejected' ? 'submitted' : report.status as 'draft' | 'submitted',
      // Department-specific fields
      subscriptionPackage: report.subscriptionPackage || '',
      numberOfFirms: report.numberOfFirms?.toString() || '',
      numberOfUsers: report.numberOfUsers?.toString() || '',
      projectName: report.projectName || '',
      developmentHours: report.developmentHours?.toString() || '',
      projectStatus: report.projectStatus || '',
      totalTickets: report.totalTickets?.toString() || '',
      resolvedTickets: report.resolvedTickets?.toString() || '',
      averageResponseTime: report.averageResponseTime?.toString() || '',
      customerSatisfaction: report.customerSatisfaction?.toString() || '',
      articlesPublished: report.articlesPublished?.toString() || '',
      totalViews: report.totalViews?.toString() || '',
      newSubscribers: report.newSubscribers?.toString() || '',
      revenue: report.revenue?.toString() || ''
    });
    setAttachments([]);
    setDrawerOpen(true);
  };

  const handleEdit = (report: Report) => {
    setDrawerMode('edit');
    setSelectedReport(report);
    setFormData({
      department: report.department._id,
      departmentType: report.departmentType,
      type: report.type,
      month: report.month,
      year: report.year,
      amount: report.amount.toString(),
      notes: report.notes,
      status: report.status === 'approved' || report.status === 'rejected' ? 'submitted' : report.status as 'draft' | 'submitted',
      // Department-specific fields
      subscriptionPackage: report.subscriptionPackage || '',
      numberOfFirms: report.numberOfFirms?.toString() || '',
      numberOfUsers: report.numberOfUsers?.toString() || '',
      projectName: report.projectName || '',
      developmentHours: report.developmentHours?.toString() || '',
      projectStatus: report.projectStatus || '',
      totalTickets: report.totalTickets?.toString() || '',
      resolvedTickets: report.resolvedTickets?.toString() || '',
      averageResponseTime: report.averageResponseTime?.toString() || '',
      customerSatisfaction: report.customerSatisfaction?.toString() || '',
      articlesPublished: report.articlesPublished?.toString() || '',
      totalViews: report.totalViews?.toString() || '',
      newSubscribers: report.newSubscribers?.toString() || '',
      revenue: report.revenue?.toString() || ''
    });
    setFormErrors({});
    setAttachments([]);
    setDrawerOpen(true);
  };

  const handleDownload = (report: Report) => {
    if (!report.attachments || report.attachments.length === 0) {
      errorToast('No attachments found');
      return;
    }

    // Create a simple download alert for now
    const fileList = report.attachments.map(file => `• ${file.name} (${formatFileSize(file.size)})`).join('\n');
    alert(`Downloading ${report.attachments.length} file(s):\n\n${fileList}\n\nNote: In a real application, files would be downloaded from cloud storage.`);
    successToast(`Downloaded ${report.attachments.length} file(s)`);
  };

  const handleDelete = (report: Report) => {
    setReportToDelete(report);
    onConfirmOpen();
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;

    try {
      const formData = new FormData();
      formData.append('operation', 'delete');
      formData.append('reportId', reportToDelete._id);

      const response = await axios.post('/api/reports', formData);
      if (response.data.success) {
        setReports(prev => prev.filter(r => r._id !== reportToDelete._id));
        successToast('Report deleted successfully');
        onConfirmOpenChange();
        setReportToDelete(null);
      } else {
        errorToast('Failed to delete report: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      errorToast('Failed to delete report');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      
      if (drawerMode === 'create') {
        formDataToSend.append('operation', 'create');
      } else if (drawerMode === 'edit' && selectedReport) {
        formDataToSend.append('operation', 'update');
        formDataToSend.append('reportId', selectedReport._id);
      }

      // Add basic fields
      formDataToSend.append('department', formData.department);
      formDataToSend.append('departmentType', formData.departmentType);
      formDataToSend.append('type', formData.type);
      formDataToSend.append('month', formData.month.toString());
      formDataToSend.append('year', formData.year.toString());
      formDataToSend.append('amount', formData.amount);
      formDataToSend.append('notes', formData.notes);
      formDataToSend.append('status', formData.status);

      // Add department-specific fields based on department type
      const deptType = formData.departmentType;
      if (deptType === 'data') {
        if (formData.subscriptionPackage) formDataToSend.append('subscriptionPackage', formData.subscriptionPackage);
        if (formData.numberOfFirms) formDataToSend.append('numberOfFirms', formData.numberOfFirms);
        if (formData.numberOfUsers) formDataToSend.append('numberOfUsers', formData.numberOfUsers);
      } else if (deptType === 'software') {
        if (formData.projectName) formDataToSend.append('projectName', formData.projectName);
        if (formData.developmentHours) formDataToSend.append('developmentHours', formData.developmentHours);
        if (formData.projectStatus) formDataToSend.append('projectStatus', formData.projectStatus);
      } else if (deptType === 'customer_service') {
        if (formData.totalTickets) formDataToSend.append('totalTickets', formData.totalTickets);
        if (formData.resolvedTickets) formDataToSend.append('resolvedTickets', formData.resolvedTickets);
        if (formData.averageResponseTime) formDataToSend.append('averageResponseTime', formData.averageResponseTime);
        if (formData.customerSatisfaction) formDataToSend.append('customerSatisfaction', formData.customerSatisfaction);
      } else if (deptType === 'news') {
        if (formData.articlesPublished) formDataToSend.append('articlesPublished', formData.articlesPublished);
        if (formData.totalViews) formDataToSend.append('totalViews', formData.totalViews);
        if (formData.newSubscribers) formDataToSend.append('newSubscribers', formData.newSubscribers);
        if (formData.revenue) formDataToSend.append('revenue', formData.revenue);
      }

      // Add attachments
      attachments.forEach((file, index) => {
        formDataToSend.append(`attachment_${index}`, file);
      });
      formDataToSend.append('attachmentCount', attachments.length.toString());

      const response = await axios.post('/api/reports', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        if (drawerMode === 'create') {
          await loadReports(); // Reload to get the new report
          successToast('Report created successfully');
        } else {
          // Update the specific report in the list instead of reloading all
          const updatedReport = response.data.data || response.data.report;
          if (updatedReport) {
            setReports(prev => prev.map(r => 
              r._id === selectedReport?._id ? updatedReport : r
            ));
          } else {
            await loadReports(); // Fallback to reload if no updated data
          }
          successToast('Report updated successfully');
        }
        setDrawerOpen(false);
      } else {
        errorToast('Failed to save report: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving report:', error);
      errorToast('Failed to save report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setFormErrors({});
    setAttachments([]);
  };

  const getTemplateFields = () => {
    switch (formData.departmentType) {
      case 'data':
        return [
          { name: 'subscriptionPackage', label: 'Subscription Package', type: 'text', required: true },
          { name: 'numberOfFirms', label: 'Number of Firms', type: 'number', required: true },
          { name: 'numberOfUsers', label: 'Number of Users', type: 'number', required: true }
        ];
      case 'software':
        return [
          { name: 'projectName', label: 'Main Project/Initiative', type: 'text', required: true },
          { name: 'developmentHours', label: 'Total IT Hours', type: 'number', required: true },
          { name: 'projectStatus', label: 'Project Status', type: 'select', required: true, options: ['planning', 'in-progress', 'testing', 'deployed', 'maintenance'] }
        ];
      case 'customer_service':
        return [
          { name: 'totalTickets', label: 'Total Tickets', type: 'number', required: true },
          { name: 'resolvedTickets', label: 'Resolved Tickets', type: 'number', required: true },
          { name: 'averageResponseTime', label: 'Average Response Time (hours)', type: 'number', required: true },
          { name: 'customerSatisfaction', label: 'Customer Satisfaction (%)', type: 'number', required: true, min: 0, max: 100 }
        ];
      case 'news':
        return [
          { name: 'articlesPublished', label: 'Articles Published', type: 'number', required: true },
          { name: 'totalViews', label: 'Total Views', type: 'number', required: true },
          { name: 'newSubscribers', label: 'New Subscribers', type: 'number', required: true },
          { name: 'revenue', label: 'Revenue (Ad/Subscription)', type: 'number', required: true }
        ];
      default:
        return [];
    }
  };

  const renderViewField = (label: string, value: string | number | undefined) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
        {value || 'N/A'}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monthly Reports</h1>
            {currentUser && (
              <Chip 
                size="sm" 
                variant="flat" 
                className={`
                  ${currentUser.role?.toLowerCase() === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                    currentUser.role?.toLowerCase() === 'manager' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                    currentUser.role?.toLowerCase() === 'hod' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                    'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                  }
                `}
              >
                {currentUser.role?.toUpperCase()}
              </Chip>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {currentUser?.role?.toLowerCase() === 'hod' ? 'Create and manage your department reports' :
             currentUser?.role?.toLowerCase() === 'manager' ? 'Review submitted reports from all departments' :
             currentUser?.role?.toLowerCase() === 'admin' ? 'Full access to all monthly reports' :
             'Manage and view all monthly reports'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="flat"
            startContent={<Filter size={18} />}
            onPress={() => setShowFilters(!showFilters)}
            className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Filters
          </Button>
          {currentUser?.role?.toLowerCase() === 'hod' && (
            <Button
              color="primary"
              startContent={<Plus size={20} />}
              onPress={handleCreate}
              className="bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Create Report
            </Button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 border border-blue-200 dark:border-gray-600">
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Filter className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                Filters
              </h3>
              <Button
                size="sm"
                variant="flat"
                onPress={clearFilters}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Clear All
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Date Range
                </label>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  variant="bordered"
                  size="sm"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Status
                </label>
                <Select
                  placeholder="All Statuses"
                  selectedKeys={statusFilter ? [statusFilter] : []}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string;
                    setStatusFilter(selectedKey || '');
                  }}
                  variant="bordered"
                  size="sm"
                >
                  <SelectItem key="draft">Draft</SelectItem>
                  <SelectItem key="submitted">Submitted</SelectItem>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Department
                </label>
                <Select
                  placeholder="All Departments"
                  selectedKeys={departmentFilter ? [departmentFilter] : []}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string;
                    setDepartmentFilter(selectedKey || '');
                  }}
                  variant="bordered"
                  size="sm"
                >
                  {departments.map((dept) => (
                    <SelectItem key={dept._id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Created By
                </label>
                <Input
                  placeholder="Search by name..."
                  value={createdByFilter}
                  onValueChange={setCreatedByFilter}
                  variant="bordered"
                  size="sm"
                  startContent={<Users className="w-4 h-4 text-gray-400" />}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Export and Selection Actions */}
      {(selectedReports.size > 0 || filteredReports.length > 0) && (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Checkbox
                  isSelected={selectedReports.size === filteredReports.length && filteredReports.length > 0}
                  isIndeterminate={selectedReports.size > 0 && selectedReports.size < filteredReports.length}
                  onValueChange={handleSelectAll}
                  classNames={{
                    base: "text-gray-900 dark:text-white",
                    label: "text-gray-900 dark:text-white"
                  }}
                >
                  Select All ({filteredReports.length} reports)
                </Checkbox>
                {selectedReports.size > 0 && (
                  <Chip color="primary" variant="flat" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {selectedReports.size} selected
                  </Chip>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="flat"
                  startContent={<FileText size={16} />}
                  onPress={() => handleExport('pdf')}
                  isDisabled={filteredReports.length === 0}
                  className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  Export PDF
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  color="success"
                  startContent={<FileText size={16} />}
                  onPress={() => handleExport('excel')}
                  isDisabled={filteredReports.length === 0}
                  className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
                >
                  Export Excel
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Data Table */}
      <DataTable
        data={filteredReports}
        columns={columns}
        loading={loading}
        pageSize={10}
        searchPlaceholder="Search reports..."
        emptyText="No reports found"
      />

      {/* Report Form Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        title={
          drawerMode === 'create' ? 'Create New Report' :
          drawerMode === 'edit' ? 'Edit Report' : 'Report Details'
        }
        size="lg"
      >
        <div className="space-y-6">
          {drawerMode === 'view' ? (
            // View Mode - Display as text
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderViewField('Department', departments.find(d => d._id === formData.department)?.name)}
                {renderViewField('Report Type', formData.type)}
                {renderViewField('Month', new Date(2024, formData.month - 1, 1).toLocaleString('default', { month: 'long' }))}
                {renderViewField('Year', formData.year)}
                {renderViewField('Amount', `$${parseFloat(formData.amount || '0').toLocaleString()}`)}
                {renderViewField('Status', formData.status.charAt(0).toUpperCase() + formData.status.slice(1))}
              </div>

              {/* Department-Specific Fields - View Mode */}
              {formData.department && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Department Specific Fields
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getTemplateFields().map((field: any) => 
                      renderViewField(field.label, formData[field.name as keyof ReportFormData] as string)
                    )}
                  </div>
                </div>
              )}

              {/* Attachments - View Mode */}
              {selectedReport?.attachments && selectedReport.attachments.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Attachments ({selectedReport.attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedReport.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Upload className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          startContent={<Download size={16} />}
                          onPress={() => handleDownload(selectedReport)}
                        >
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {renderViewField('Notes', formData.notes)}
            </>
          ) : (
            // Edit/Create Mode - Display as inputs
            <>
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Select
                    label="Department"
                    placeholder="Select Department"
                    selectedKeys={formData.department ? [formData.department] : []}
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0] as string;
                      if (selectedKey) handleDepartmentChange(selectedKey);
                    }}
                    isRequired
                    variant="bordered"
                    isInvalid={!!formErrors.department}
                    errorMessage={formErrors.department}
                  >
                    {departments.map((dept) => (
                      <SelectItem key={dept._id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <Input
                  label="Report Type"
                  placeholder="e.g., Monthly Performance, Revenue Report"
                  value={formData.type}
                  onValueChange={(value) => handleInputChange('type', value)}
                  isRequired
                  variant="bordered"
                  isInvalid={!!formErrors.type}
                  errorMessage={formErrors.type}
                />

                <div>
                  <Select
                    label="Month"
                    placeholder="Select Month"
                    selectedKeys={[formData.month.toString()]}
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0] as string;
                      if (selectedKey) handleInputChange('month', parseInt(selectedKey));
                    }}
                    isRequired
                    variant="bordered"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={(i + 1).toString()}>
                        {new Date(2024, i, 1).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <Input
                  label="Year"
                  type="number"
                  value={formData.year.toString()}
                  onValueChange={(value) => handleInputChange('year', parseInt(value))}
                  min="2020"
                  max="2030"
                  isRequired
                  variant="bordered"
                />

                <Input
                  label="Amount"
                  type="number"
                  value={formData.amount}
                  onValueChange={(value) => handleInputChange('amount', value)}
                  placeholder="0.00"
                  step="0.01"
                  isRequired
                  variant="bordered"
                  isInvalid={!!formErrors.amount}
                  errorMessage={formErrors.amount}
                  startContent={
                    <div className="pointer-events-none flex items-center">
                      <span className="text-default-400 text-small">$</span>
                    </div>
                  }
                />

                <div>
                  <Select
                    label="Status"
                    placeholder="Select Status"
                    selectedKeys={[formData.status]}
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0] as string;
                      if (selectedKey) handleInputChange('status', selectedKey);
                    }}
                    variant="bordered"
                  >
                    <SelectItem key="draft">Draft</SelectItem>
                    <SelectItem key="submitted">Submitted</SelectItem>
                  </Select>
                </div>
              </div>

              {/* Department-Specific Fields */}
              {formData.department && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Department Specific Fields
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getTemplateFields().map((field: any) => (
                      <div key={field.name}>
                        {field.type === 'select' ? (
                          <Select
                            label={field.label}
                            placeholder={`Select ${field.label}`}
                            selectedKeys={formData[field.name as keyof ReportFormData] ? [formData[field.name as keyof ReportFormData] as string] : []}
                            onSelectionChange={(keys) => {
                              const selectedKey = Array.from(keys)[0] as string;
                              if (selectedKey) handleInputChange(field.name as keyof ReportFormData, selectedKey);
                            }}
                            isRequired={field.required}
                            variant="bordered"
                            isInvalid={!!formErrors[field.name]}
                            errorMessage={formErrors[field.name]}
                          >
                            {field.options?.map((option: string) => (
                              <SelectItem key={option}>
                                {option.charAt(0).toUpperCase() + option.slice(1).replace('-', ' ')}
                              </SelectItem>
                            ))}
                          </Select>
                        ) : (
                          <Input
                            label={field.label}
                            type={field.type}
                            value={formData[field.name as keyof ReportFormData] as string || ''}
                            onValueChange={(value) => handleInputChange(field.name as keyof ReportFormData, value)}
                            min={field.min}
                            max={field.max}
                            step={field.type === 'number' ? '0.01' : undefined}
                            isRequired={field.required}
                            variant="bordered"
                            isInvalid={!!formErrors[field.name]}
                            errorMessage={formErrors[field.name]}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* File Attachments */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Attachments
                </h3>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                      className="hidden"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                      <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Click to upload files
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        PDF, DOC, XLS, Images, TXT files up to 10MB each
                      </p>
                    </label>
                  </div>

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Uploaded Files ({attachments.length})
                      </h4>
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Upload className="w-5 h-5 text-blue-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <Textarea
                label="Notes"
                placeholder="Additional notes or comments..."
                value={formData.notes}
                onValueChange={(value) => handleInputChange('notes', value)}
                minRows={4}
                variant="bordered"
              />

              {/* Actions */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="flat"
                  onPress={handleCloseDrawer}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleSubmit}
                  isLoading={submitting}
                  isDisabled={submitting}
                >
                  {drawerMode === 'create' ? 'Create Report' : 'Update Report'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Drawer>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onOpenChange={onConfirmOpenChange}
        header="Delete Report"
        content={`Are you sure you want to delete the report "${reportToDelete?.type}"? This action cannot be undone.`}
      >
        <div className="flex space-x-3">
          <Button
            variant="flat"
            onPress={() => onConfirmOpenChange()}
          >
            Cancel
          </Button>
          <Button
            color="danger"
            onPress={confirmDelete}
          >
            Delete
          </Button>
        </div>
      </ConfirmModal>
    </div>
  );
};

export default MonthlyReportsList; 