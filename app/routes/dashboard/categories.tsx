import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, Briefcase } from "lucide-react";
import DataTable, { type Column } from "~/components/DataTable";
import Drawer from "~/components/Drawer";
import CustomInput from "~/components/CustomInput";
import ConfirmModal from "~/components/confirmModal";
import { Button, useDisclosure } from "@heroui/react";
import { successToast, errorToast } from "~/components/toast";
import { categoryAPI, type Category, type CreateCategoryData, type UpdateCategoryData } from "~/services/api";

interface CategoryFormData {
  name: string;
  description: string;
}

const Categories = () => {
  // State management
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Confirm modal state
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onOpenChange: onConfirmOpenChange } = useDisclosure();
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load categories from database
  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await categoryAPI.getAll();
      if (response.success && response.categories) {
        setCategories(response.categories);
      } else {
        errorToast('Failed to load categories: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      errorToast('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Table columns configuration
  const columns: Column<Category>[] = [
    {
      key: 'name',
      title: 'Category Name',
      sortable: true,
      searchable: true,
      render: (value: string, record: Category) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
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
      render: (_, record: Category) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            isIconOnly
            onPress={() => handleView(record)}
            title="View Category"
          >
            <Eye size={16} />
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="warning"
            isIconOnly
            onPress={() => handleEdit(record)}
            title="Edit Category"
          >
            <Edit size={16} />
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="danger"
            isIconOnly
            onPress={() => handleDelete(record)}
            title="Delete Category"
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
      errors.name = 'Category name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Category name must be at least 2 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    // Check for duplicate category name (excluding current category in edit mode)
    const existingCategory = categories.find(cat => 
      cat.name.toLowerCase() === formData.name.toLowerCase() && 
      cat._id !== selectedCategory?._id
    );
    if (existingCategory) {
      errors.name = 'Category name already exists';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (field: keyof CategoryFormData, value: any) => {
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
    setSelectedCategory(null);
    setFormData({
      name: '',
      description: ''
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleView = (category: Category) => {
    setDrawerMode('view');
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description
    });
    setDrawerOpen(true);
  };

  const handleEdit = (category: Category) => {
    setDrawerMode('edit');
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleDelete = (category: Category) => {
    setCategoryToDelete(category);
    onConfirmOpen();
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await categoryAPI.delete(categoryToDelete._id);
      if (response.success) {
        setCategories(prev => prev.filter(c => c._id !== categoryToDelete._id));
        successToast('Category deleted successfully');
        onConfirmOpenChange();
        setCategoryToDelete(null);
      } else {
        errorToast('Failed to delete category: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      errorToast('Failed to delete category. Please check your connection.');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (drawerMode === 'create') {
        const createData: CreateCategoryData = {
          name: formData.name.trim(),
          description: formData.description.trim()
        };
        
        const response = await categoryAPI.create(createData);
        if (response.success && response.category) {
          setCategories(prev => [response.category!, ...prev]);
          successToast('Category created successfully');
          setDrawerOpen(false);
        } else {
          errorToast('Failed to create category: ' + (response.error || 'Unknown error'));
        }
      } else if (drawerMode === 'edit' && selectedCategory) {
        const updateData: UpdateCategoryData = {
          categoryId: selectedCategory._id,
          name: formData.name.trim(),
          description: formData.description.trim()
        };
        
        const response = await categoryAPI.update(updateData);
        if (response.success && response.category) {
          setCategories(prev => prev.map(c => 
            c._id === selectedCategory._id ? response.category! : c
          ));
          successToast('Category updated successfully');
          setDrawerOpen(false);
        } else {
          errorToast('Failed to update category: ' + (response.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error saving category:', error);
      errorToast('Failed to save category. Please check your connection.');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Briefcase className="w-8 h-8 mr-3 text-purple-600" />
            Categories
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage product and service categories
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus size={20} />}
          onPress={handleCreate}
        >
          Add Category
        </Button>
      </div>

      {/* Statistics Card */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Categories</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{categories.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={categories}
        columns={columns}
        loading={loading}
        pageSize={10}
        searchPlaceholder="Search categories..."
        emptyText="No categories found"
      />

      {/* Category Form Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        title={
          drawerMode === 'create' ? 'Add New Category' :
          drawerMode === 'edit' ? 'Edit Category' : 'Category Details'
        }
        size="md"
      >
        <div className="space-y-6">
          {/* Category Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <CustomInput
              label="Category Name"
              isRequired
              value={formData.name}
              onChange={drawerMode === 'view' ? undefined : (value: string) => handleInputChange('name', value)}
              placeholder="Enter category name"
              error={formErrors.name}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter category description"
                rows={4}
                disabled={drawerMode === 'view'}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none transition-all duration-200 ${
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

          {/* Category Info (View Mode) */}
          {drawerMode === 'view' && selectedCategory && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Category Information</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Created Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(selectedCategory.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(selectedCategory.updatedAt).toLocaleDateString()}
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
                {drawerMode === 'create' ? 'Create Category' : 'Update Category'}
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
        header="Delete Category"
        content={
          categoryToDelete 
            ? `Are you sure you want to delete "${categoryToDelete.name}"? This action cannot be undone and may affect related blogs and products.`
            : "Are you sure you want to delete this category?"
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
              setCategoryToDelete(null);
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

export default Categories; 