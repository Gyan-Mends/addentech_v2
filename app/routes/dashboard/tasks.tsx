import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  Timer,
  User,
  Flag,
  Target,
  Activity,
  Reply,
  CornerDownRight,
  BarChart3
} from "lucide-react";
import DataTable, { type Column } from "~/components/DataTable";
import Drawer from "~/components/Drawer";
import CustomInput from "~/components/CustomInput";
import { successToast, errorToast } from "~/components/toast";
import { Select, SelectItem, Button, Chip, Progress, Card, CardBody, CardHeader } from "@heroui/react";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

interface Task {
  _id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'not_started' | 'in_progress' | 'under_review' | 'completed' | 'on_hold';
  category: string;
  tags: string[];
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedTo: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }[];
  department: {
    _id: string;
    name: string;
  };
  startDate?: string;
  dueDate: string;
  completedDate?: string;
  progress: number;
  estimatedHours?: number;
  actualHours: number;
  timeEntries: {
    user: string;
    hours: number;
    date: string;
    description?: string;
  }[];
  comments: {
    _id?: string;
    user: string | { firstName: string; lastName: string };
    message: string;
    timestamp: string;
    replies?: {
      user: string | { firstName: string; lastName: string };
      message: string;
      timestamp: string;
    }[];
  }[];
  isRecurring: boolean;
  approvalRequired: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

interface TaskStats {
  totalTasks: number;
  notStarted: number;
  inProgress: number;
  underReview: number;
  completed: number;
  onHold: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  highPriority: number;
  averageCompletion: number;
  totalHoursLogged: number;
  chartData?: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension: number;
    }[];
  };
}

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface FormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'not_started' | 'in_progress' | 'under_review' | 'completed' | 'on_hold';
  category: string;
  tags: string;
  assignedTo: string;
  startDate: string;
  dueDate: string;
  estimatedHours: string;
  approvalRequired: boolean;
  isRecurring: boolean;
}

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Comment functionality
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'not_started',
    category: '',
    tags: '',
    assignedTo: '',
    startDate: '',
    dueDate: '',
    estimatedHours: '',
    approvalRequired: false,
    isRecurring: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTasks();
    loadStats();
    loadEmployees();
    loadDepartments();
    loadCurrentUser();
  }, [page, searchTerm, statusFilter, priorityFilter, categoryFilter]);

  const loadCurrentUser = async () => {
    try {
      const response = await fetch('/api/users?action=getCurrentUser');
      const data = await response.json();
      if (data.success) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: searchTerm,
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter
      });

      const response = await fetch(`/api/task?${params}`);
      const data = await response.json();

      if (data.success) {
        setTasks(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        
        // Extract unique categories
        const uniqueCategories = [...new Set((data.data || []).map((task: Task) => task.category))];
        setCategories(uniqueCategories as string[]);
      } else {
        if (data.status === 401) {
          // Redirect to login if unauthorized
          navigate('/login');
          return;
        }
        errorToast(data.message);
      }
    } catch (error) {
      errorToast('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/task?operation=getStats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/users?operation=getAll');
      const data = await response.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  // Permission helper functions
  const canEditTask = (task: Task) => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || 
           currentUser.role === 'manager' || 
           (currentUser.role === 'department_head' && task.department._id === currentUser.departmentId);
  };

  const canChangeStatus = (task: Task) => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || 
           currentUser.role === 'manager' || 
           (currentUser.role === 'department_head' && task.department._id === currentUser.departmentId) ||
           (currentUser.role === 'staff' && task.assignedTo?.some(user => user._id === currentUser._id));
  };

  const canDeleteTask = (task: Task) => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || 
           currentUser.role === 'manager' || 
           (currentUser.role === 'department_head' && task.department._id === currentUser.departmentId);
  };

  const canCreateTasks = () => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || 
           currentUser.role === 'manager' || 
           currentUser.role === 'department_head' ||
           currentUser.role === 'staff' ||
           currentUser.role === 'intern';
  };

  const canViewTasks = () => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || 
           currentUser.role === 'manager' || 
           currentUser.role === 'department_head' ||
           currentUser.role === 'staff' ||
           currentUser.role === 'intern';
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category.trim()) newErrors.category = 'Category is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const submitData = new FormData();
      submitData.append('operation', drawerMode === 'create' ? 'createTask' : 'updateTask');
      
      if (drawerMode === 'edit' && selectedTask) {
        submitData.append('taskId', selectedTask._id);
      }

      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'tags') {
          submitData.append(key, JSON.stringify(value.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag)));
        } else if (typeof value === 'boolean') {
          submitData.append(key, value.toString());
        } else {
          submitData.append(key, value.toString());
        }
      });

      const response = await fetch('/api/task', {
        method: 'POST',
        body: submitData
      });

      const data = await response.json();

      if (data.success) {
        successToast(data.message);
        setDrawerOpen(false);
        resetForm();
        loadTasks();
        loadStats();
      } else {
        errorToast(data.message);
      }
    } catch (error) {
      errorToast('Failed to save task');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const formData = new FormData();
      formData.append('operation', 'deleteTask');
      formData.append('taskId', taskId);

      const response = await fetch('/api/task', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        successToast(data.message);
        loadTasks();
        loadStats();
      } else {
        errorToast(data.message);
      }
    } catch (error) {
      errorToast('Failed to delete task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const formData = new FormData();
      formData.append('operation', 'updateTaskStatus');
      formData.append('taskId', taskId);
      formData.append('status', newStatus);

      const response = await fetch('/api/task', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        successToast(data.message);
        loadTasks();
        loadStats();
      } else {
        errorToast(data.message);
      }
    } catch (error) {
      errorToast('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'not_started',
      category: '',
      tags: '',
      assignedTo: '',
      startDate: '',
      dueDate: '',
      estimatedHours: '',
      approvalRequired: false,
      isRecurring: false
    });
    setErrors({});
    setSelectedTask(null);
  };

  const openDrawer = (mode: 'create' | 'edit' | 'view', task?: Task) => {
    setDrawerMode(mode);
    if (task) {
      setSelectedTask(task);
      if (mode === 'edit') {
        setFormData({
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          category: task.category,
          tags: task.tags?.join(', ') || '',
          assignedTo: task.assignedTo?.map(u => u._id).join(',') || '',
          startDate: task.startDate ? task.startDate.split('T')[0] : '',
          dueDate: task.dueDate.split('T')[0],
          estimatedHours: task.estimatedHours?.toString() || '',
          approvalRequired: task.approvalRequired,
          isRecurring: task.isRecurring
        });
      }
    } else {
      resetForm();
    }
    setDrawerOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'danger';
      case 'critical': return 'danger';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'default';
      case 'in_progress': return 'primary';
      case 'under_review': return 'warning';
      case 'completed': return 'success';
      case 'on_hold': return 'danger';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'completed') return false;
    return new Date() > new Date(dueDate);
  };

  // Add comment to task
  const addComment = async () => {
    if (!selectedTask || !newComment.trim()) return;

    try {
      setAddingComment(true);
      const formData = new FormData();
      formData.append('operation', 'addComment');
      formData.append('taskId', selectedTask._id);
      formData.append('message', newComment.trim());

      const response = await fetch('/api/task', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        successToast('Comment added successfully');
        setNewComment('');
        // Refresh task details
        const updatedTask = { ...selectedTask };
        updatedTask.comments = [...(updatedTask.comments || []), {
          user: 'Current User', // This should come from user context
          message: newComment,
          timestamp: new Date().toISOString()
        }];
        setSelectedTask(updatedTask);
      } else {
        errorToast(data.message);
      }
    } catch (error) {
      errorToast('Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  // Add reply to comment
  const addReply = async (parentCommentId: string) => {
    if (!selectedTask || !replyText.trim()) return;

    try {
      setAddingComment(true);
      const formData = new FormData();
      formData.append('operation', 'addComment');
      formData.append('taskId', selectedTask._id);
      formData.append('message', replyText.trim());
      formData.append('parentCommentId', parentCommentId);

      const response = await fetch('/api/task', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        successToast('Reply added successfully');
        setReplyText('');
        setReplyingTo(null);
        // Refresh task details - you might want to reload the task data here
        loadTasks();
      } else {
        errorToast(data.message);
      }
    } catch (error) {
      errorToast('Failed to add reply');
    } finally {
      setAddingComment(false);
    }
  };

  const columns: Column<Task>[] = [
    {
      key: 'title',
      title: 'Task',
      sortable: true,
      searchable: true,
      render: (_, task: Task) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white">{task.title}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{task.category}</span>
        </div>
      )
    },
    {
      key: 'priority',
      title: 'Priority',
      sortable: true,
      searchable: false,
      render: (_, task: Task) => (
        <Chip color={getPriorityColor(task.priority)} variant="flat" size="sm">
          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </Chip>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      searchable: false,
      render: (_, task: Task) => (
        <Chip color={getStatusColor(task.status)} variant="flat" size="sm">
          {task.status.replace('_', ' ').split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')}
        </Chip>
      )
    },
    {
      key: 'assignedTo',
      title: 'Assigned To',
      sortable: false,
      searchable: true,
      render: (_, task: Task) => (
        <div className="flex flex-col">
          {task.assignedTo?.slice(0, 2).map((user, index) => (
            <span key={index} className="text-sm text-gray-600 dark:text-gray-300">
              {user.firstName} {user.lastName}
            </span>
          )) || []}
          {(task.assignedTo?.length || 0) > 2 && (
            <span className="text-xs text-gray-500">+{(task.assignedTo?.length || 0) - 2} more</span>
          )}
        </div>
      )
    },
    {
      key: 'progress',
      title: 'Progress',
      sortable: true,
      searchable: false,
      render: (_, task: Task) => (
        <div className="flex items-center space-x-2">
          <Progress 
            value={task.progress} 
            size="sm" 
            color={task.progress === 100 ? 'success' : 'primary'}
            className="w-16"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">{task.progress}%</span>
        </div>
      )
    },
    {
      key: 'dueDate',
      title: 'Due Date',
      sortable: true,
      searchable: false,
      render: (_, task: Task) => (
        <div className="flex flex-col">
          <span className={`text-sm ${isOverdue(task.dueDate, task.status) ? 'text-red-600 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
            {formatDate(task.dueDate)}
          </span>
          {isOverdue(task.dueDate, task.status) && (
            <span className="text-xs text-red-500">Overdue</span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      searchable: false,
      width: '120px',
      align: 'center',
      render: (_, task: Task) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="light"
            isIconOnly
            onClick={() => navigate(`/dashboard/task/${task._id}`)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {canEditTask(task) && (
            <Button
              size="sm"
              variant="light"
              isIconOnly
              onClick={() => openDrawer('edit', task)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {canDeleteTask(task) && (
            <Button
              size="sm"
              variant="light"
              color="danger"
              isIconOnly
              onClick={() => handleDelete(task._id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <CheckSquare className="w-8 h-8 mr-3 text-blue-600" />
            Task Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track all tasks and assignments
          </p>
        </div>
        {canCreateTasks() && (
          <Button
            color="primary"
            onClick={() => navigate('/dashboard/create-task')}
            startContent={<Plus className="w-4 h-4" />}
          >
            New Task
          </Button>
        )}
      </div>

      {/* Statistics Cards - First Row Only */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalTasks}</p>
                </div>
                <CheckSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardBody>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Not Started</p>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.notStarted}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-gray-600 dark:text-gray-400" />
              </div>
            </CardBody>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.inProgress}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </CardBody>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Under Review</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.underReview}</p>
                </div>
                <Eye className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardBody>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </CardBody>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Task Trends Chart */}
      {stats?.chartData && (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                  Task Trends (Last 7 Days)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Track daily task creation and completion patterns
                </p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="h-80">
              <Line
                data={stats.chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        usePointStyle: true,
                        padding: 20,
                        color: '#6B7280'
                      }
                    },
                    tooltip: {
                      mode: 'index',
                      intersect: false,
                      backgroundColor: 'rgba(17, 24, 39, 0.8)',
                      titleColor: '#F9FAFB',
                      bodyColor: '#F9FAFB',
                      borderColor: '#374151',
                      borderWidth: 1,
                      cornerRadius: 8,
                      padding: 12
                    }
                  },
                  scales: {
                    x: {
                      display: true,
                      grid: {
                        display: false
                      },
                      ticks: {
                        color: '#6B7280'
                      }
                    },
                    y: {
                      display: true,
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                      },
                      ticks: {
                        color: '#6B7280',
                        stepSize: 1
                      }
                    }
                  },
                  interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                  },
                  elements: {
                    point: {
                      radius: 4,
                      hoverRadius: 6,
                      borderWidth: 2,
                      hoverBorderWidth: 3
                    },
                    line: {
                      borderWidth: 3,
                      fill: true
                    }
                  }
                }}
              />
            </div>
          </CardBody>
        </Card>
      )}

            {/* Filters */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border border-blue-200 dark:border-gray-600 shadow-sm">
        <CardBody className="p-4">
          <div className="flex flex-col gap-4">
            {/* Filter Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
              </div>
              <Button
                variant="light"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setCategoryFilter('all');
                }}
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Clear All
              </Button>
            </div>


            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <Select
                  placeholder="All Status"
                  selectedKeys={statusFilter === 'all' ? [] : [statusFilter]}
                  onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0] as string || 'all')}
                  className="w-full"
                  size="sm"
                  variant="bordered"
                  classNames={{
                    trigger: "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500",
                    popoverContent: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  }}
                >
                  <SelectItem key="all">All Status</SelectItem>
                  <SelectItem key="not_started">Not Started</SelectItem>
                  <SelectItem key="in_progress">In Progress</SelectItem>
                  <SelectItem key="under_review">Under Review</SelectItem>
                  <SelectItem key="completed">Completed</SelectItem>
                  <SelectItem key="on_hold">On Hold</SelectItem>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                <Select
                  placeholder="All Priority"
                  selectedKeys={priorityFilter === 'all' ? [] : [priorityFilter]}
                  onSelectionChange={(keys) => setPriorityFilter(Array.from(keys)[0] as string || 'all')}
                  className="w-full"
                  size="sm"
                  variant="bordered"
                  classNames={{
                    trigger: "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500",
                    popoverContent: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  }}
                >
                  <SelectItem key="all">All Priority</SelectItem>
                  <SelectItem key="low">Low</SelectItem>
                  <SelectItem key="medium">Medium</SelectItem>
                  <SelectItem key="high">High</SelectItem>
                  <SelectItem key="critical">Critical</SelectItem>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <Select
                  placeholder="All Categories"
                  selectedKeys={categoryFilter === 'all' ? [] : [categoryFilter]}
                  onSelectionChange={(keys) => setCategoryFilter(Array.from(keys)[0] as string || 'all')}
                  className="w-full"
                  size="sm"
                  variant="bordered"
                  classNames={{
                    trigger: "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500",
                    popoverContent: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  }}
                >
                  <SelectItem key="all">All Categories</SelectItem>
                  {categories.filter(Boolean).map((category, index) => (
                    <SelectItem key={category || `category-${index}`} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all') && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-200 dark:border-gray-600">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Filters:</span>
                {searchTerm && (
                  <Chip
                    size="sm"
                    variant="flat"
                    color="primary"
                    onClose={() => setSearchTerm('')}
                  >
                    Search: "{searchTerm}"
                  </Chip>
                )}
                {statusFilter !== 'all' && (
                  <Chip
                    size="sm"
                    variant="flat"
                    color="secondary"
                    onClose={() => setStatusFilter('all')}
                  >
                    Status: {statusFilter.replace('_', ' ')}
                  </Chip>
                )}
                {priorityFilter !== 'all' && (
                  <Chip
                    size="sm"
                    variant="flat"
                    color="warning"
                    onClose={() => setPriorityFilter('all')}
                  >
                    Priority: {priorityFilter}
                  </Chip>
                )}
                {categoryFilter !== 'all' && (
                  <Chip
                    size="sm"
                    variant="flat"
                    color="success"
                    onClose={() => setCategoryFilter('all')}
                  >
                    Category: {categoryFilter}
                  </Chip>
                )}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Tasks Table */}
      <DataTable
        data={tasks || []}
        columns={columns}
        loading={loading}
        emptyText="No tasks found"
        showPagination={false}
        pageSize={10}
      />

      {/* Task Form Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          resetForm();
        }}
        title={
          drawerMode === 'create' 
            ? 'Create New Task' 
            : drawerMode === 'edit' 
            ? 'Edit Task' 
            : 'Task Details'
        }
        size="lg"
      >
        {drawerMode === 'view' && selectedTask ? (
          <div className="space-y-6">
            {/* Task Details View */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedTask.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {selectedTask.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                  <div className="mt-1">
                    <Chip color={getPriorityColor(selectedTask.priority)} variant="flat">
                      {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)}
                    </Chip>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <div className="mt-1">
                    <Chip color={getStatusColor(selectedTask.status)} variant="flat">
                      {selectedTask.status.replace('_', ' ').split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </Chip>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                  <p className="text-gray-900 dark:text-white mt-1">{selectedTask.category}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</label>
                  <div className="mt-1">
                    <Progress 
                      value={selectedTask.progress} 
                      size="sm" 
                      color={selectedTask.progress === 100 ? 'success' : 'primary'}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{selectedTask.progress}%</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
                  <p className={`mt-1 ${isOverdue(selectedTask.dueDate, selectedTask.status) ? 'text-red-600 font-medium' : 'text-gray-900 dark:text-white'}`}>
                    {formatDate(selectedTask.dueDate)}
                    {isOverdue(selectedTask.dueDate, selectedTask.status) && ' (Overdue)'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Created By</label>
                  <p className="text-gray-900 dark:text-white mt-1">
                    {selectedTask.createdBy.firstName} {selectedTask.createdBy.lastName}
                  </p>
                </div>
              </div>

              {(selectedTask.assignedTo?.length || 0) > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned To</label>
                  <div className="mt-2 space-y-1">
                    {selectedTask.assignedTo?.map((user, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName} ({user.role})
                        </span>
                      </div>
                    )) || []}
                  </div>
                </div>
              )}

              {(selectedTask.tags?.length || 0) > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedTask.tags?.map((tag, index) => (
                      <Chip key={index} size="sm" variant="flat">
                        {tag}
                      </Chip>
                    )) || []}
                  </div>
                </div>
              )}

              {selectedTask.estimatedHours && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estimated Hours</label>
                    <p className="text-gray-900 dark:text-white mt-1">{selectedTask.estimatedHours}h</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Actual Hours</label>
                    <p className="text-gray-900 dark:text-white mt-1">{selectedTask.actualHours}h</p>
                  </div>
                </div>
              )}

              {/* Comments Section - Enhanced */}
              <Card className="mt-6">
                <CardHeader>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                    Comments ({selectedTask.comments?.length || 0})
                  </h4>
                </CardHeader>
                <CardBody className="space-y-4">
                  {/* Existing Comments */}
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {selectedTask.comments?.length > 0 ? (
                      selectedTask.comments.map((comment, index) => (
                        <div key={index} className="space-y-3">
                          {/* Main Comment */}
                          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-xs">
                                  {typeof comment.user === 'string' 
                                    ? comment.user.charAt(0).toUpperCase()
                                    : `${comment.user.firstName?.charAt(0) || ''}${comment.user.lastName?.charAt(0) || ''}`.toUpperCase()
                                  }
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {typeof comment.user === 'string' ? comment.user : `${comment.user.firstName} ${comment.user.lastName}`}
                                  </h5>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(comment.timestamp)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {comment.message}
                                </p>
                                <div className="flex items-center mt-2">
                                  <Button
                                    size="sm"
                                    variant="light"
                                    onClick={() => setReplyingTo(comment._id || `comment-${index}`)}
                                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded-full transition-colors"
                                  >
                                    <Reply className="w-3 h-3 mr-1" />
                                    Reply
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="ml-4 pl-3 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
                              {comment.replies.map((reply, replyIndex) => (
                                <div key={replyIndex} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-2">
                                  <div className="flex items-start space-x-2">
                                    <div className="flex-shrink-0">
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-medium text-xs">
                                        {typeof reply.user === 'string' 
                                          ? reply.user.charAt(0).toUpperCase()
                                          : `${reply.user.firstName?.charAt(0) || ''}${reply.user.lastName?.charAt(0) || ''}`.toUpperCase()
                                        }
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-1">
                                        <h6 className="text-xs font-medium text-gray-900 dark:text-white">
                                          {typeof reply.user === 'string' ? reply.user : `${reply.user.firstName} ${reply.user.lastName}`}
                                        </h6>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          {formatDate(reply.timestamp)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {reply.message}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reply Form */}
                          {replyingTo === (comment._id || `comment-${index}`) && (
                            <div className="ml-4 pl-3 border-l-2 border-blue-200 dark:border-blue-700">
                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-2">
                                <div className="flex items-start space-x-2">
                                  <div className="flex-shrink-0">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-xs">
                                      Y
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <CustomInput
                                      label=""
                                      value={replyText}
                                      onChange={(value) => setReplyText(value)}
                                      type="textarea"
                                      placeholder="Write a reply..."
                                      className="resize-none text-sm border-0 bg-white dark:bg-gray-800 shadow-sm"
                                    />
                                    <div className="flex items-center justify-between mt-2">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {replyText.length}/500 characters
                                      </span>
                                      <div className="flex items-center space-x-2">
                                        <Button
                                          size="sm"
                                          variant="light"
                                          onClick={() => {
                                            setReplyingTo(null);
                                            setReplyText('');
                                          }}
                                          className="text-gray-600 dark:text-gray-400"
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          size="sm"
                                          color="primary"
                                          onClick={() => addReply(comment._id || `comment-${index}`)}
                                          isLoading={addingComment}
                                          disabled={!replyText.trim()}
                                          className="bg-blue-600 hover:bg-blue-700"
                                        >
                                          {addingComment ? 'Replying...' : 'Reply'}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No comments yet</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">Start the conversation</p>
                      </div>
                    )}
                  </div>

                  {/* Add New Comment */}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-medium text-xs">
                          Y
                        </div>
                      </div>
                      <div className="flex-1">
                        <CustomInput
                          label=""
                          value={newComment}
                          onChange={(value) => setNewComment(value)}
                          type="textarea"
                          placeholder="Add a comment..."
                          className="resize-none border-0 bg-gray-50 dark:bg-gray-700 shadow-sm"
                        />
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {newComment.length}/500 characters
                          </span>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="light"
                              onClick={() => setNewComment('')}
                              disabled={!newComment.trim()}
                              className="text-gray-600 dark:text-gray-400"
                            >
                              Clear
                            </Button>
                            <Button
                              size="sm"
                              color="primary"
                              onClick={addComment}
                              isLoading={addingComment}
                              disabled={!newComment.trim()}
                              className="bg-blue-600 hover:bg-blue-700"
                              startContent={!addingComment ? <MessageSquare className="w-4 h-4" /> : undefined}
                            >
                              {addingComment ? 'Adding...' : 'Comment'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {(selectedTask.comments?.length || 0) > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Comments</label>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                    {selectedTask.comments?.slice(0, 3).map((comment, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm">
                        <p className="text-gray-900 dark:text-white">{comment.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(comment.timestamp)}
                        </p>
                      </div>
                    )) || []}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                color="primary"
                onClick={() => {
                  setDrawerMode('edit');
                  setFormData({
                    title: selectedTask.title,
                    description: selectedTask.description,
                    priority: selectedTask.priority,
                    status: selectedTask.status,
                    category: selectedTask.category,
                    tags: selectedTask.tags?.join(', ') || '',
                    assignedTo: selectedTask.assignedTo?.map(u => u._id).join(',') || '',
                    startDate: selectedTask.startDate ? selectedTask.startDate.split('T')[0] : '',
                    dueDate: selectedTask.dueDate.split('T')[0],
                    estimatedHours: selectedTask.estimatedHours?.toString() || '',
                    approvalRequired: selectedTask.approvalRequired,
                    isRecurring: selectedTask.isRecurring
                  });
                }}
                startContent={<Edit className="w-4 h-4" />}
              >
                Edit Task
              </Button>
              
              {selectedTask.status !== 'completed' && (
                <Button
                  color="success"
                  variant="flat"
                  onClick={() => handleStatusChange(selectedTask._id, 'completed')}
                  startContent={<CheckCircle className="w-4 h-4" />}
                >
                  Mark Complete
                </Button>
              )}
              
              {selectedTask.status !== 'in_progress' && selectedTask.status !== 'completed' && (
                <Button
                  color="primary"
                  variant="flat"
                  onClick={() => handleStatusChange(selectedTask._id, 'in_progress')}
                  startContent={<Timer className="w-4 h-4" />}
                >
                  Start Task
                </Button>
              )}
              
              {selectedTask.status !== 'under_review' && selectedTask.status !== 'completed' && selectedTask.status !== 'not_started' && (
                <Button
                  color="secondary"
                  variant="flat"
                  onClick={() => handleStatusChange(selectedTask._id, 'under_review')}
                  startContent={<Eye className="w-4 h-4" />}
                >
                  Mark for Review
                </Button>
              )}
              
              {selectedTask.status !== 'not_started' && selectedTask.status !== 'completed' && (
                <Button
                  color="default"
                  variant="flat"
                  onClick={() => handleStatusChange(selectedTask._id, 'not_started')}
                  startContent={<AlertTriangle className="w-4 h-4" />}
                >
                  Reset to Not Started
                </Button>
              )}
              
              {selectedTask.status !== 'on_hold' && selectedTask.status !== 'completed' && (
                <Button
                  color="warning"
                  variant="flat"
                  onClick={() => handleStatusChange(selectedTask._id, 'on_hold')}
                  startContent={<AlertTriangle className="w-4 h-4" />}
                >
                  Put on Hold
                </Button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <CustomInput
                  label="Task Title"
                  value={formData.title}
                  onChange={(value) => handleInputChange('title', value)}
                  error={errors.title}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <CustomInput
                  label="Description"
                  value={formData.description}
                  onChange={(value) => handleInputChange('description', value)}
                  error={errors.description}
                  type="textarea"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <Select
                  selectedKeys={[formData.priority]}
                  onSelectionChange={(keys) => handleInputChange('priority', Array.from(keys)[0])}
                  placeholder="Select priority"
                >
                  <SelectItem key="low">Low</SelectItem>
                  <SelectItem key="medium">Medium</SelectItem>
                  <SelectItem key="high">High</SelectItem>
                  <SelectItem key="critical">Critical</SelectItem>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <Select
                  selectedKeys={[formData.status]}
                  onSelectionChange={(keys) => handleInputChange('status', Array.from(keys)[0])}
                  placeholder="Select status"
                >
                  <SelectItem key="not_started">Not Started</SelectItem>
                  <SelectItem key="in_progress">In Progress</SelectItem>
                  <SelectItem key="under_review">Under Review</SelectItem>
                  <SelectItem key="completed">Completed</SelectItem>
                  <SelectItem key="on_hold">On Hold</SelectItem>
                </Select>
              </div>

              <div>
                <CustomInput
                  label="Category"
                  value={formData.category}
                  onChange={(value) => handleInputChange('category', value)}
                  error={errors.category}
                  required
                />
              </div>

              <div>
                <CustomInput
                  label="Tags (comma separated)"
                  value={formData.tags}
                  onChange={(value) => handleInputChange('tags', value)}
                  placeholder="urgent, development, feature"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assign To
                </label>
                <Select
                  selectedKeys={formData.assignedTo ? [formData.assignedTo] : []}
                  onSelectionChange={(keys) => handleInputChange('assignedTo', Array.from(keys)[0] || '')}
                  placeholder="Select employee"
                >
                  {employees?.map(emp => (
                    <SelectItem key={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.role})
                    </SelectItem>
                  )) || []}
                </Select>
              </div>

              <div>
                <CustomInput
                  label="Estimated Hours"
                  type="number"
                  value={formData.estimatedHours}
                  onChange={(value) => handleInputChange('estimatedHours', value)}
                  min="0"
                  step="0.5"
                />
              </div>

              <div>
                <CustomInput
                  label="Start Date"
                  type="date"
                  value={formData.startDate}
                  onChange={(value) => handleInputChange('startDate', value)}
                />
              </div>

              <div>
                <CustomInput
                  label="Due Date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(value) => handleInputChange('dueDate', value)}
                  error={errors.dueDate}
                  required
                />
              </div>

              <div className="md:col-span-2 flex items-center space-x-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.approvalRequired}
                    onChange={(e) => handleInputChange('approvalRequired', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Requires Approval
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Recurring Task
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="light"
                onClick={() => {
                  setDrawerOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                color="primary"
              >
                {drawerMode === 'create' ? 'Create Task' : 'Update Task'}
              </Button>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
} 