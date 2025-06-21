import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, Building2, Users } from "lucide-react";
import DataTable, { type Column } from "~/components/DataTable";
import Drawer from "~/components/Drawer";
import CustomInput from "~/components/CustomInput";
import ConfirmModal from "~/components/confirmModal";
import { Button, useDisclosure } from "@heroui/react";
import { departmentAPI, type Department as DeptType, type CreateDepartmentData, type UpdateDepartmentData } from "~/services/api";
import { successToast, errorToast } from "~/components/toast";

interface DepartmentFormData {
  name: string;
  description: string;
}

const Department = () => {
  // State management
  const [departments, setDepartments] = useState<DeptType[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedDepartment, setSelectedDepartment] = useState<DeptType | null>(null);
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    description: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Confirm modal state
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onOpenChange: onConfirmOpenChange } = useDisclosure();
  const [departmentToDelete, setDepartmentToDelete] = useState<DeptType | null>(null);

  // Load departments on component mount
  useEffect(() => {
    loadDepartments();
  }, []);

  // Load departments from API
  const loadDepartments = async () => {
    setLoading(true);
    try {
      const response = await departmentAPI.getAll();
      if (response.success && response.departments) {
        setDepartments(response.departments);
      } else {
        console.error('Failed to load departments:', response.error);
        errorToast('Failed to load departments: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading departments:', error);
      errorToast('Failed to load departments. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Table columns configuration
  const columns: Column<DeptType>[] = [
    {
      key: 'name',
      title: 'Department Name',
      sortable: true,
      searchable: true,
      render: (value: string, record: DeptType) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          </div>
        </div>
      )
    },
    {
      key: 'description',
      title: 'Description',
      sortable: false,
      searchable: true,
      render: (value: string) => (
        <div className="max-w-xs">
          <p className="text-sm text-gray-900 dark:text-white truncate" title={value}>
            {value}
          </p>
        </div>
      )
    },
    {
      key: 'createdAt',
      title: 'Created',
      sortable: true,
      searchable: false,
      render: (value: string) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(value).toLocaleDateString()}
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
      render: (_, record: DeptType) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            isIconOnly
            onPress={() => handleView(record)}
            title="View Department"
          >
            <Eye size={16} />
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="warning"
            isIconOnly
            onPress={() => handleEdit(record)}
            title="Edit Department"
          >
            <Edit size={16} />
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="danger"
            isIconOnly
            onPress={() => handleDelete(record)}
            title="Delete Department"
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

    if (!formData.name.trim()) {
      errors.name = 'Department name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Department name must be at least 2 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    // Check for duplicate department name (excluding current department in edit mode)
    const existingDept = departments.find(dept => 
      dept.name.toLowerCase() === formData.name.toLowerCase() && 
      dept._id !== selectedDepartment?._id
    );
    if (existingDept) {
      errors.name = 'Department name already exists';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (field: keyof DepartmentFormData, value: any) => {
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

  // CRUD Operations
  const handleCreate = () => {
    setDrawerMode('create');
    setSelectedDepartment(null);
    setFormData({
      name: '',
      description: ''
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleView = (department: DeptType) => {
    setDrawerMode('view');
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      description: department.description
    });
    setDrawerOpen(true);
  };

  const handleEdit = (department: DeptType) => {
    setDrawerMode('edit');
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      description: department.description
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleDelete = (department: DeptType) => {
    setDepartmentToDelete(department);
    onConfirmOpen();
  };

  const confirmDelete = async () => {
    if (!departmentToDelete) return;

    try {
      const response = await departmentAPI.delete(departmentToDelete._id);
      if (response.success) {
        setDepartments(prev => prev.filter(d => d._id !== departmentToDelete._id));
        successToast('Department deleted successfully');
        onConfirmOpenChange();
        setDepartmentToDelete(null);
      } else {
        errorToast('Failed to delete department: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      errorToast('Failed to delete department. Please check your connection.');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (drawerMode === 'create') {
        const createData: CreateDepartmentData = {
          name: formData.name.trim(),
          description: formData.description.trim()
        };
        
                 const response = await departmentAPI.create(createData);
         if (response.success && response.department) {
           setDepartments(prev => [response.department!, ...prev]);
           successToast('Department created successfully');
           setDrawerOpen(false);
         } else {
           errorToast('Failed to create department: ' + (response.error || 'Unknown error'));
         }
      } else if (drawerMode === 'edit' && selectedDepartment) {
        const updateData: UpdateDepartmentData = {
          _id: selectedDepartment._id,
          name: formData.name.trim(),
          description: formData.description.trim()
        };
        
                 const response = await departmentAPI.update(updateData);
         if (response.success && response.department) {
           setDepartments(prev => prev.map(d => 
             d._id === selectedDepartment._id ? response.department! : d
           ));
           successToast('Department updated successfully');
           setDrawerOpen(false);
         } else {
           errorToast('Failed to update department: ' + (response.error || 'Unknown error'));
         }
      }
    } catch (error) {
      console.error('Error saving department:', error);
      errorToast('Failed to save department. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setFormErrors({});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Departments</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage organizational departments and their information
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus size={20} />}
          onPress={handleCreate}
        >
          Add Department
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Departments</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{departments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={departments}
        columns={columns}
        loading={loading}
        pageSize={10}
        searchPlaceholder="Search departments..."
        emptyText="No departments found"
      />

      {/* Department Form Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        title={
          drawerMode === 'create' ? 'Add New Department' :
          drawerMode === 'edit' ? 'Edit Department' : 'Department Details'
        }
        size="md"
      >
        <div className="space-y-6">
          {/* Department Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <CustomInput
              label="Department Name"
              isRequired
              value={formData.name}
              onChange={(e: any) => handleInputChange('name', e.target.value)}
              placeholder="Enter department name"
              className={formErrors.name ? 'border-red-500' : ''}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter department description"
                rows={4}
                disabled={drawerMode === 'view'}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 ${
                  formErrors.description 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {formErrors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.description}</p>
              )}
            </div>
          </div>

          {/* Department Info (View Mode) */}
          {drawerMode === 'view' && selectedDepartment && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Department Information</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Created Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(selectedDepartment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(selectedDepartment.updatedAt || selectedDepartment.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {Object.keys(formErrors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Please fix the following errors:
              </h4>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {Object.entries(formErrors).map(([field, error]) => (
                  <li key={field}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          {drawerMode !== 'view' && (
            <div className="flex items-center space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                color="primary"
                onPress={handleSubmit}
                isLoading={submitting}
                className="flex-1"
              >
                {drawerMode === 'create' ? 'Create Department' : 'Update Department'}
              </Button>
              <Button
                variant="flat"
                onPress={handleCloseDrawer}
                isDisabled={submitting}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Drawer>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onOpenChange={onConfirmOpenChange}
        header="Delete Department"
        content={
          departmentToDelete 
            ? `Are you sure you want to delete "${departmentToDelete.name}"? This action cannot be undone and will remove all associated data.`
            : "Are you sure you want to delete this department?"
        }
      >
        <div className="flex gap-3">
          <Button
            color="danger"
            onPress={confirmDelete}
            className="flex-1"
          >
            Delete
          </Button>
          <Button
            variant="flat"
            onPress={() => {
              onConfirmOpenChange();
              setDepartmentToDelete(null);
            }}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </ConfirmModal>
    </div>
  );
};

export default Department; 