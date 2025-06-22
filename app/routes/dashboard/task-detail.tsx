import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { 
  ArrowLeft,
  Edit,
  Trash2,
  MessageSquare,
  Clock,
  Calendar,
  User,
  Flag,
  Target,
  CheckCircle,
  AlertTriangle,
  Users,
  Building,
  Tag,
  Timer,
  Activity,
  Reply,
  CornerDownRight
} from "lucide-react";
import { Button, Chip, Progress, Card, CardBody, CardHeader, Avatar } from "@heroui/react";
import CustomInput from "~/components/CustomInput";
import { successToast, errorToast } from "~/components/toast";

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

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (id) {
      loadTask();
      loadCurrentUser();
    }
  }, [id]);

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

  const loadTask = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/task?operation=getTask&taskId=${id}`);
      const data = await response.json();

      if (data.success) {
        setTask(data.data);
      } else {
        if (data.status === 401) {
          navigate('/login');
          return;
        }
        errorToast(data.message);
        navigate('/dashboard/tasks');
      }
    } catch (error) {
      errorToast('Failed to load task');
      navigate('/dashboard/tasks');
    } finally {
      setLoading(false);
    }
  };

  // Permission helper functions
  const canEditTask = () => {
    if (!currentUser || !task) return false;
    return currentUser.role === 'admin' || 
           currentUser.role === 'manager' || 
           (currentUser.role === 'department_head' && task.department._id === currentUser.departmentId);
  };

  const canChangeStatus = () => {
    if (!currentUser || !task) return false;
    return currentUser.role === 'admin' || 
           currentUser.role === 'manager' || 
           (currentUser.role === 'department_head' && task.department._id === currentUser.departmentId) ||
           (currentUser.role === 'staff' && task.assignedTo?.some(user => user._id === currentUser._id));
  };

  const canAssignTask = () => {
    if (!currentUser || !task) return false;
    return currentUser.role === 'admin' || 
           currentUser.role === 'manager' || 
           (currentUser.role === 'department_head' && task.department._id === currentUser.departmentId);
  };

  const canDeleteTask = () => {
    if (!currentUser || !task) return false;
    return currentUser.role === 'admin' || 
           currentUser.role === 'manager' || 
           (currentUser.role === 'department_head' && task.department._id === currentUser.departmentId);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

    try {
      const formData = new FormData();
      formData.append('operation', 'updateTaskStatus');
      formData.append('taskId', task._id);
      formData.append('status', newStatus);

      const response = await fetch('/api/task', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        successToast(data.message);
        loadTask();
      } else {
        errorToast(data.message);
      }
    } catch (error) {
      errorToast('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm('Are you sure you want to delete this task?')) return;

    try {
      const formData = new FormData();
      formData.append('operation', 'deleteTask');
      formData.append('taskId', task._id);

      const response = await fetch('/api/task', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        successToast(data.message);
        navigate('/dashboard/tasks');
      } else {
        errorToast(data.message);
      }
    } catch (error) {
      errorToast('Failed to delete task');
    }
  };

  const addComment = async () => {
    if (!task || !newComment.trim()) return;

    try {
      setAddingComment(true);
      const formData = new FormData();
      formData.append('operation', 'addComment');
      formData.append('taskId', task._id);
      formData.append('message', newComment.trim());

      const response = await fetch('/api/task', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        successToast('Comment added successfully');
        setNewComment('');
        loadTask(); // Reload to get updated comments
      } else {
        errorToast(data.message);
      }
    } catch (error) {
      errorToast('Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  const addReply = async (parentCommentId: string) => {
    if (!task || !replyText.trim()) return;

    try {
      setAddingComment(true);
      const formData = new FormData();
      formData.append('operation', 'addComment');
      formData.append('taskId', task._id);
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
        loadTask(); // Reload to get updated comments
      } else {
        errorToast(data.message);
      }
    } catch (error) {
      errorToast('Failed to add reply');
    } finally {
      setAddingComment(false);
    }
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'completed') return false;
    return new Date() > new Date(dueDate);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Task Not Found</h2>
        <Button color="primary" onClick={() => navigate('/dashboard/tasks')}>
          Back to Tasks
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="light"
            isIconOnly
            onClick={() => navigate('/dashboard/tasks')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {task.title}
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <Chip color={getPriorityColor(task.priority)} variant="flat" size="sm" className="text-gray-800 dark:text-gray-200">
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Chip>
              <Chip color={getStatusColor(task.status)} variant="flat" size="sm" className="text-gray-800 dark:text-gray-200">
                {task.status.replace('_', ' ').split(' ').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </Chip>
              {isOverdue(task.dueDate, task.status) && (
                <Chip color="danger" variant="flat" size="sm" className="text-white dark:text-gray-100">
                  OVERDUE
                </Chip>
              )}
            </div>
          </div>
        </div>


      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Description
              </h3>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {task.description}
              </p>
            </CardBody>
          </Card>

          {/* Comments */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                Comments ({task.comments?.length || 0})
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              {/* Add New Comment */}
              <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <Avatar
                  size="sm"
                  name="You"
                  className="flex-shrink-0"
                />
                <div className="flex-1">
                  <CustomInput
                    label=""
                    value={newComment}
                    onChange={(value) => setNewComment(value)}
                    type="textarea"
                    placeholder="Add a comment..."
                    className="resize-none"
                  />
                                      <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {newComment.length}/500 characters
                      </span>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="light"
                        onClick={() => setNewComment('')}
                        disabled={!newComment.trim()}
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        onClick={addComment}
                        isLoading={addingComment}
                        disabled={!newComment.trim()}
                        startContent={!addingComment ? <MessageSquare className="w-4 h-4" /> : undefined}
                      >
                        {addingComment ? 'Adding...' : 'Add Comment'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Existing Comments */}
              <div className="space-y-4">
                {task.comments?.length > 0 ? (
                  task.comments.map((comment, index) => (
                    <div key={index} className="space-y-3">
                      {/* Main Comment */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
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
                            <div className="flex items-center mt-3">
                              <Button
                                size="sm"
                                variant="light"
                                onClick={() => setReplyingTo(comment._id || `comment-${index}`)}
                                className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1 rounded-full transition-colors"
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
                        <div className="ml-6 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-3">
                          {comment.replies.map((reply, replyIndex) => (
                            <div key={replyIndex} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-3">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-medium text-xs">
                                    {typeof reply.user === 'string' 
                                      ? reply.user.charAt(0).toUpperCase()
                                      : `${reply.user.firstName?.charAt(0) || ''}${reply.user.lastName?.charAt(0) || ''}`.toUpperCase()
                                    }
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h6 className="text-sm font-medium text-gray-900 dark:text-white">
                                      {typeof reply.user === 'string' ? reply.user : `${reply.user.firstName} ${reply.user.lastName}`}
                                    </h6>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatDate(reply.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
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
                        <div className="ml-6 pl-4 border-l-2 border-blue-200 dark:border-blue-700">
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-3">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-xs">
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
                                  className="resize-none border-0 bg-white dark:bg-gray-800 shadow-sm"
                                />
                                <div className="flex items-center justify-between mt-3">
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
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-1">No comments yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Start the conversation by adding the first comment</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Task Information */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Task Information
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <Building className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
                  Department
                </label>
                <p className="text-gray-900 dark:text-white mt-1">{task.department.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Created By
                </label>
                <p className="text-gray-900 dark:text-white mt-1">
                  {task.createdBy.firstName} {task.createdBy.lastName}
                </p>
              </div>

              {(task.assignedTo?.length || 0) > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Assigned To
                  </label>
                  <div className="mt-2 space-y-2">
                    {task.assignedTo?.map((user, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Avatar size="sm" name={`${user.firstName} ${user.lastName}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user.role}
                          </p>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Due Date
                </label>
                <p className={`mt-1 ${isOverdue(task.dueDate, task.status) ? 'text-red-600 font-medium' : 'text-gray-900 dark:text-white'}`}>
                  {formatDate(task.dueDate)}
                  {isOverdue(task.dueDate, task.status) && ' (Overdue)'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Created
                </label>
                <p className="text-gray-900 dark:text-white mt-1">{formatDate(task.createdAt)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Last Updated
                </label>
                <p className="text-gray-900 dark:text-white mt-1">{formatDate(task.updatedAt)}</p>
              </div>
            </CardBody>
          </Card>

          {/* Tags */}
          {(task.tags?.length || 0) > 0 && (
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Tag className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                  Tags
                </h3>
              </CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-2">
                  {task.tags?.map((tag, index) => (
                    <Chip key={index} size="sm" variant="flat" className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {tag}
                    </Chip>
                  )) || []}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Actions */}
          {currentUser && (
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Actions
                </h3>
              </CardHeader>
              <CardBody className="space-y-3">
                {/* Status Change Actions - Available to assigned staff and above */}
                {canChangeStatus() && (
                  <div className="space-y-2">
                    {task.status !== 'completed' && (
                      <Button
                        color="success"
                        variant="flat"
                        fullWidth
                        onClick={() => handleStatusChange('completed')}
                        startContent={<CheckCircle className="w-4 h-4" />}
                      >
                        Mark Complete
                      </Button>
                    )}
                    
                    {task.status !== 'in_progress' && task.status !== 'completed' && (
                      <Button
                        color="primary"
                        variant="flat"
                        fullWidth
                        onClick={() => handleStatusChange('in_progress')}
                        startContent={<Timer className="w-4 h-4" />}
                      >
                        Start Task
                      </Button>
                    )}
                    
                    {task.status !== 'on_hold' && task.status !== 'completed' && (
                      <Button
                        color="warning"
                        variant="flat"
                        fullWidth
                        onClick={() => handleStatusChange('on_hold')}
                        startContent={<AlertTriangle className="w-4 h-4" />}
                      >
                        Put on Hold
                      </Button>
                    )}
                  </div>
                )}

                {/* Edit Actions - Only for admin, manager, and department heads */}
                {canEditTask() && (
                  <div className="space-y-2">
                    {canChangeStatus() && <div className="border-t border-gray-200 dark:border-gray-600 pt-3" />}
                    <Button
                      color="primary"
                      variant="light"
                      fullWidth
                      onClick={() => navigate(`/dashboard/create-task?edit=${task._id}`)}
                      startContent={<Edit className="w-4 h-4" />}
                    >
                      Edit Task
                    </Button>
                  </div>
                )}

                {/* Assignment Actions - Only for admin, manager, and department heads */}
                {canAssignTask() && !task.assignedTo?.length && (
                  <div className="space-y-2">
                    {(canEditTask() || canChangeStatus()) && <div className="border-t border-gray-200 dark:border-gray-600 pt-3" />}
                    <Button
                      color="secondary"
                      variant="light"
                      fullWidth
                      onClick={() => {
                        // Navigate to assignment page or open assignment modal
                        // For now, we'll navigate to edit page where assignment can be done
                        navigate(`/dashboard/create-task?edit=${task._id}&focus=assign`);
                      }}
                      startContent={<Users className="w-4 h-4" />}
                    >
                      Assign Task
                    </Button>
                  </div>
                )}

                {/* Delete Actions - Only for admin, manager, and department heads */}
                {canDeleteTask() && (
                  <div className="space-y-2">
                    {(canEditTask() || canChangeStatus() || canAssignTask()) && <div className="border-t border-gray-200 dark:border-gray-600 pt-3" />}
                    <Button
                      color="danger"
                      variant="light"
                      fullWidth
                      onClick={handleDelete}
                      startContent={<Trash2 className="w-4 h-4" />}
                    >
                      Delete Task
                    </Button>
                  </div>
                )}

                {/* Role-based information */}
                <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                  {currentUser.role === 'staff' && (
                    <p>As a staff member, you can change task status but cannot edit task details.</p>
                  )}
                  {currentUser.role === 'department_head' && (
                    <p>As a department head, you have full control over tasks in your department.</p>
                  )}
                  {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                    <p>You have full administrative access to all tasks.</p>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

         
        </div>
      </div>
    </div>
  );
} 