import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import DataTable, { type Column } from "~/components/DataTable";
import Drawer from "~/components/Drawer";
import CustomInput from "~/components/CustomInput";
import ConfirmModal from "~/components/confirmModal";
import { Button, useDisclosure } from "@heroui/react";
import { successToast, errorToast } from "~/components/toast";
import { blogAPI, categoryAPI, userAPI, type Blog, type CreateBlogData, type UpdateBlogData, type Category, type User } from "~/services/api";

interface BlogFormData {
  name: string;
  description: string;
  image: string;
  category: string;
  admin: string;
}

const Blogs = () => {
  // State management
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [formData, setFormData] = useState<BlogFormData>({
    name: '',
    description: '',
    image: '',
    category: '',
    admin: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Confirm modal state
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onOpenChange: onConfirmOpenChange } = useDisclosure();
  const [blogToDelete, setBlogToDelete] = useState<Blog | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadBlogs();
    loadCategories();
    loadUsers();
  }, []);

  // Load blogs from database
  const loadBlogs = async () => {
    setLoading(true);
    try {
      const response = await blogAPI.getAll();
      if (response.success && response.blogs) {
        setBlogs(response.blogs);
      } else {
        errorToast('Failed to load blogs: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading blogs:', error);
      errorToast('Failed to load blogs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load categories for dropdown
  const loadCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      if (response.success && response.categories) {
        setCategories(response.categories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Load users for admin dropdown
  const loadUsers = async () => {
    try {
      const response = await userAPI.getAll();
      if (response.success && response.users) {
        setUsers(response.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Table columns configuration
  const columns: Column<Blog>[] = [
    {
      key: 'image',
      title: 'Image',
      sortable: false,
      searchable: false,
      width: '80px',
      align: 'center',
      render: (value: string, record: Blog) => (
        <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
          {value ? (
            <img 
              src={value} 
              alt={record.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="w-6 h-6 text-gray-400" />
          )}
        </div>
      )
    },
    {
      key: 'name',
      title: 'Blog Title',
      sortable: true,
      searchable: true,
      render: (value: string, record: Blog) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
            {record.description}
          </div>
        </div>
      )
    },
    {
      key: 'categoryName',
      title: 'Category',
      sortable: true,
      searchable: true,
      render: (value: string) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          {value}
        </span>
      )
    },
    {
      key: 'adminName',
      title: 'Author',
      sortable: true,
      searchable: true,
      render: (value: string) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {value}
        </span>
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
      render: (_, record: Blog) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            isIconOnly
            onPress={() => handleView(record)}
            title="View Blog"
          >
            <Eye size={16} />
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="warning"
            isIconOnly
            onPress={() => handleEdit(record)}
            title="Edit Blog"
          >
            <Edit size={16} />
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="danger"
            isIconOnly
            onPress={() => handleDelete(record)}
            title="Delete Blog"
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
      errors.name = 'Blog title is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Blog title must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Blog description is required';
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    if (!formData.image.trim()) {
      errors.image = 'Blog image is required';
    }

    if (!formData.category.trim()) {
      errors.category = 'Category is required';
    }

    if (!formData.admin.trim()) {
      errors.admin = 'Author is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle image upload and convert to base64
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      errorToast('Please select an image file');
      event.target.value = '';
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      errorToast('Image size should be less than 2MB');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setFormData(prev => ({ ...prev, image: base64 }));
      successToast('Image uploaded successfully');
    };
    reader.onerror = () => {
      errorToast('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  // Handle form input changes
  const handleInputChange = (field: keyof BlogFormData, value: any) => {
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
    setSelectedBlog(null);
    setFormData({
      name: '',
      description: '',
      image: '',
      category: '',
      admin: ''
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleView = (blog: Blog) => {
    setDrawerMode('view');
    setSelectedBlog(blog);
    setFormData({
      name: blog.name,
      description: blog.description,
      image: blog.image,
      category: blog.category,
      admin: blog.admin
    });
    setDrawerOpen(true);
  };

  const handleEdit = (blog: Blog) => {
    setDrawerMode('edit');
    setSelectedBlog(blog);
    setFormData({
      name: blog.name,
      description: blog.description,
      image: blog.image,
      category: blog.category,
      admin: blog.admin
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleDelete = (blog: Blog) => {
    setBlogToDelete(blog);
    onConfirmOpen();
  };

  const confirmDelete = async () => {
    if (!blogToDelete) return;

    try {
      const response = await blogAPI.delete(blogToDelete._id);
      if (response.success) {
        setBlogs(prev => prev.filter(b => b._id !== blogToDelete._id));
        successToast('Blog deleted successfully');
        onConfirmOpenChange();
        setBlogToDelete(null);
      } else {
        errorToast('Failed to delete blog: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      errorToast('Failed to delete blog. Please check your connection.');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (drawerMode === 'create') {
        const createData: CreateBlogData = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          image: formData.image,
          category: formData.category,
          admin: formData.admin
        };
        
        const response = await blogAPI.create(createData);
        if (response.success && response.blog) {
          setBlogs(prev => [response.blog!, ...prev]);
          successToast('Blog created successfully');
          setDrawerOpen(false);
        } else {
          errorToast('Failed to create blog: ' + (response.error || 'Unknown error'));
        }
      } else if (drawerMode === 'edit' && selectedBlog) {
        const updateData: UpdateBlogData = {
          blogId: selectedBlog._id,
          name: formData.name.trim(),
          description: formData.description.trim(),
          image: formData.image,
          category: formData.category,
          admin: formData.admin
        };
        
        const response = await blogAPI.update(updateData);
        if (response.success && response.blog) {
          setBlogs(prev => prev.map(b => 
            b._id === selectedBlog._id ? response.blog! : b
          ));
          successToast('Blog updated successfully');
          setDrawerOpen(false);
        } else {
          errorToast('Failed to update blog: ' + (response.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error saving blog:', error);
      errorToast('Failed to save blog. Please check your connection.');
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
            <FileText className="w-8 h-8 mr-3 text-green-600" />
            Blogs
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage blog posts and articles
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus size={20} />}
          onPress={handleCreate}
        >
          Add Blog
        </Button>
      </div>

      {/* Statistics Card */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Blogs</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{blogs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={blogs}
        columns={columns}
        loading={loading}
        pageSize={10}
        searchPlaceholder="Search blogs..."
        emptyText="No blogs found"
      />

      {/* Blog Form Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        title={
          drawerMode === 'create' ? 'Add New Blog' :
          drawerMode === 'edit' ? 'Edit Blog' : 'Blog Details'
        }
        size="lg"
      >
        <div className="space-y-6">
          {/* Blog Image Upload */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-32 h-32 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {formData.image ? (
                <img 
                  src={formData.image} 
                  alt="Blog"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-12 h-12 text-gray-400" />
              )}
            </div>
            
            {drawerMode !== 'view' && (
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="blog-image-upload"
                />
                <label htmlFor="blog-image-upload" className="cursor-pointer">
                  <Button
                    variant="flat"
                    color="primary"
                    size="sm"
                    startContent={<Upload size={16} />}
                    as="span"
                  >
                    Upload Image
                  </Button>
                </label>
                
                {formData.image && (
                  <Button
                    variant="flat"
                    color="danger"
                    size="sm"
                    isIconOnly
                    onPress={() => {
                      setFormData(prev => ({ ...prev, image: '' }));
                      const fileInput = document.getElementById('blog-image-upload') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <CustomInput
              label="Blog Title"
              isRequired
              value={formData.name}
              onChange={drawerMode === 'view' ? undefined : (value: string) => handleInputChange('name', value)}
              placeholder="Enter blog title"
              className={formErrors.name ? 'border-red-500' : ''}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter blog description or content"
                rows={6}
                disabled={drawerMode === 'view'}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none transition-all duration-200 ${
                  formErrors.description 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {formErrors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  disabled={drawerMode === 'view'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {formErrors.category && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Author <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.admin}
                  onChange={(e) => handleInputChange('admin', e.target.value)}
                  disabled={drawerMode === 'view'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select Author</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                {formErrors.admin && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.admin}</p>
                )}
              </div>
            </div>
          </div>

          {/* Blog Info (View Mode) */}
          {drawerMode === 'view' && selectedBlog && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Blog Information</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Published Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(selectedBlog.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(selectedBlog.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedBlog.categoryName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Author</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedBlog.adminName}
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
                {drawerMode === 'create' ? 'Create Blog' : 'Update Blog'}
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
        header="Delete Blog"
        content={
          blogToDelete 
            ? `Are you sure you want to delete "${blogToDelete.name}"? This action cannot be undone and will permanently remove the blog post.`
            : "Are you sure you want to delete this blog?"
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
              setBlogToDelete(null);
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

export default Blogs; 