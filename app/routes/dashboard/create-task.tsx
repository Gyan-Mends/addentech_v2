import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  CheckSquare,
  ArrowLeft,
  Calendar,
  Users,
  FileText,
  Settings,
  Plus,
} from "lucide-react";
import CustomInput from "~/components/CustomInput";
import { successToast, errorToast } from "~/components/toast";
import {
  Select,
  SelectItem,
  Button,
  Chip,
  Card,
  CardBody,
  CardHeader,
  Switch,
} from "@heroui/react";

interface FormData {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status:
    | "not_started"
    | "in_progress"
    | "under_review"
    | "completed"
    | "on_hold";
  category: string;
  tags: string;
  assignedTo: string;
  department: string;
  startDate: string;
  dueDate: string;
  estimatedHours: string;
  isRecurring: boolean;
  recurringType: "daily" | "weekly" | "monthly" | "yearly";
  recurringInterval: string;
  recurringEndDate: string;
}

export default function CreateTask() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tagsList, setTagsList] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    status: "not_started",
    category: "",
    tags: "",
    assignedTo: "",
    department: "",
    startDate: "",
    dueDate: "",
    estimatedHours: "",
    isRecurring: false,
    recurringType: "weekly",
    recurringInterval: "1",
    recurringEndDate: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadEmployees();
    loadDepartments();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    // Auto-set department for department heads
    if (currentUser?.role === 'department_head' && currentUser.departmentId) {
      handleInputChange('department', currentUser.departmentId);
    }
  }, [currentUser]);

  const loadEmployees = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      if (data.success) {
        setEmployees(data.users);
      } else {
        console.error("Failed to load employees:", data.error);
      }
    } catch (error) {
      console.error("Failed to load employees:", error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch("/api/departments");
      const data = await response.json();
      if (data.success) {
        setDepartments(data.departments);
      } else {
        console.error("Failed to load departments:", data.error);
      }
    } catch (error) {
      console.error("Failed to load departments:", error);
    }
  };

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

  const handleInputChange = (field: string, value: any) => {
    console.log(`handleInputChange - field: ${field}, value:`, value, typeof value);
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    
    // Clear assigned user when department changes
    if (field === 'department' && formData.assignedTo) {
      setFormData(prev => ({ ...prev, assignedTo: '' }));
    }
  };

  const addTag = (tag: string) => {
    if (tag && !tagsList.includes(tag)) {
      const newTags = [...tagsList, tag];
      setTagsList(newTags);
      setFormData((prev) => ({ ...prev, tags: newTags.join(", ") }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tagsList.filter((tag) => tag !== tagToRemove);
    setTagsList(newTags);
    setFormData((prev) => ({ ...prev, tags: newTags.join(", ") }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = "Task title is required";
    if (!formData.description.trim())
      newErrors.description = "Description is required";
    if (!formData.category.trim()) newErrors.category = "Category is required";
    if (!formData.dueDate) newErrors.dueDate = "Due date is required";
    if (!formData.department) newErrors.department = "Department is required";

    if (formData.isRecurring && !formData.recurringEndDate) {
      newErrors.recurringEndDate = "End date is required for recurring tasks";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const submitData = new FormData();
      submitData.append("operation", "createTask");

      // Add default status for new tasks
      submitData.append("status", "not_started");

      // Log the form data for debugging
      console.log("Form data being submitted:", formData);
      console.log("Priority value:", formData.priority);
      console.log("Priority type:", typeof formData.priority);

      Object.entries(formData).forEach(([key, value]) => {
        // Skip status since we set it manually above
        if (key === "status") return;
        
        if (key === "tags") {
          const tagArray = value
            .split(",")
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag);
          submitData.append(key, tagArray.join(","));
        } else if (key === "priority") {
          // Ensure priority is a valid value
          const validPriorities = ["low", "medium", "high", "critical"];
          const priorityValue = validPriorities.includes(value) ? value : "medium";
          console.log("Setting priority to:", priorityValue);
          submitData.append(key, priorityValue);
        } else if (typeof value === "boolean") {
          submitData.append(key, value.toString());
        } else if (value !== undefined && value !== null && value !== "") {
          submitData.append(key, value.toString());
        }
      });

      // Log what's actually being sent to the API
      console.log("FormData being sent:");
      for (let [key, value] of submitData.entries()) {
        console.log(key + ':', value);
      }

      const response = await fetch("/api/task", {
        method: "POST",
        body: submitData,
      });

      const data = await response.json();

      if (data.success) {
        successToast("Task created successfully");
        navigate("/dashboard/tasks");
      } else {
        console.error("Task creation failed:", data);
        errorToast(data.message || "Failed to create task");
      }
    } catch (error) {
      console.error("Task creation error:", error);
      errorToast("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="light"
              isIconOnly
              onClick={() => navigate("/dashboard/tasks")}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Create New Task
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Fill out the form below to create a new task
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top Row - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Information - Left Column (2/3 width) */}
            <div className="lg:col-span-2">
              <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Basic Information
                  </h2>
                </CardHeader>
                <CardBody className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Task Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        handleInputChange("title", e.target.value)
                      }
                      placeholder="Enter task title"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.title && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      placeholder="Describe the task in detail"
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    {errors.description && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Priority <span className="text-red-500">*</span>
                      </label>
                      <Select
                        selectedKeys={formData.priority ? new Set([formData.priority]) : new Set()}
                        onSelectionChange={(keys) => {
                          const selectedValue = Array.from(keys)[0] as string;
                          console.log("Priority selected:", selectedValue);
                          handleInputChange("priority", selectedValue);
                        }}
                        placeholder="Select priority"
                        classNames={{
                          trigger:
                            "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600",
                          value: "text-gray-900 dark:text-white",
                        }}
                      >
                        <SelectItem key="low">Low</SelectItem>
                        <SelectItem key="medium">Medium</SelectItem>
                        <SelectItem key="high">High</SelectItem>
                        <SelectItem key="critical">Critical</SelectItem>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) =>
                          handleInputChange("category", e.target.value)
                        }
                        placeholder="e.g., Development, Marketing"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.category && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.category}
                        </p>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
              <div className="flex flex-col gap-2 mt-2">
              {/* Assignment & Department - Full Width */}
              <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    Assignment & Department
                  </h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Department <span className="text-red-500">*</span>
                      </label>
                      {currentUser?.role === 'department_head' ? (
                        <div className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                          {currentUser.department}
                          <input type="hidden" value={currentUser.departmentId} name="department" />
                        </div>
                      ) : (
                        <Select
                          selectedKeys={
                            formData.department ? [formData.department] : []
                          }
                          onSelectionChange={(keys) =>
                            handleInputChange(
                              "department",
                              Array.from(keys)[0] || ""
                            )
                          }
                          placeholder="Select department"
                          classNames={{
                            trigger:
                              "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600",
                            value: "text-gray-900 dark:text-white",
                          }}
                        >
                          {departments && departments.length > 0 ? (
                            departments.map((dept) => (
                              <SelectItem key={dept._id}>{dept.name}</SelectItem>
                            ))
                          ) : (
                            <SelectItem key="no-departments" isDisabled>
                              {departments ? "No departments available" : "Loading departments..."}
                            </SelectItem>
                          )}
                        </Select>
                      )}
                      {errors.department && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.department}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {currentUser?.role === 'department_head' ? 'Assign To Staff' : 'Assign To Department Heads'}
                      </label>
                      <Select
                        selectedKeys={
                          formData.assignedTo ? [formData.assignedTo] : []
                        }
                        onSelectionChange={(keys) =>
                          handleInputChange(
                            "assignedTo",
                            Array.from(keys)[0] || ""
                          )
                        }
                        placeholder={
                          currentUser?.role === 'department_head' 
                            ? "Select staff member" 
                            : formData.department ? "Select department head" : "Select department first"
                        }
                        classNames={{
                          trigger:
                            "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600",
                          value: "text-gray-900 dark:text-white",
                        }}
                      >
                        {(() => {
                          if (!employees || employees.length === 0) {
                            return (
                              <SelectItem key="loading-users" isDisabled>
                                Loading users...
                              </SelectItem>
                            );
                          }

                          let filteredEmployees;

                          if (currentUser?.role === 'department_head') {
                            // Department heads can assign to staff in their department
                            filteredEmployees = employees.filter((emp) => {
                              return emp.role === "staff" && 
                                     emp.departmentId === currentUser.departmentId &&
                                     emp.status === 'active';
                            });
                          } else {
                            // Admin/Manager can assign to department heads
                            filteredEmployees = employees.filter((emp) => {
                              // Filter by role first
                              if (emp.role !== "department_head") return false;
                              
                              // If no department selected, show all department heads
                              if (!formData.department) return true;
                              
                              // Filter by selected department
                              return emp.departmentId === formData.department || emp.department === formData.department;
                            });
                          }

                          if (filteredEmployees.length === 0) {
                            return (
                              <SelectItem key="no-employees" isDisabled>
                                {currentUser?.role === 'department_head'
                                  ? "No staff members found in your department"
                                  : formData.department 
                                    ? "No department heads found for selected department"
                                    : "Select a department first"
                                }
                              </SelectItem>
                            );
                          }

                          return filteredEmployees.map((emp) => (
                            <SelectItem key={emp._id}>
                              {emp.firstName} {emp.lastName} ({emp.department || emp.position})
                            </SelectItem>
                          ));
                        })()}
                      </Select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {currentUser?.role === 'department_head'
                          ? `Staff members from your department`
                          : formData.department 
                            ? `Department heads from ${departments?.find(d => d._id === formData.department)?.name || 'selected department'}`
                            : 'Select a department first to see available department heads'
                        }
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
              {/* Timeline - Full Width */}
              <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Timeline
                  </h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Start Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          handleInputChange("startDate", e.target.value)
                        }
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Due Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) =>
                          handleInputChange("dueDate", e.target.value)
                        }
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.dueDate && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.dueDate}
                        </p>
                      )}
                    </div>

                    <div className="">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Estimated Hours (Optional)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.estimatedHours}
                          onChange={(e) =>
                            handleInputChange("estimatedHours", e.target.value)
                          }
                          placeholder="0"
                          min="0"
                          step="0.5"
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
              {/* Tags - Full Width */}
              <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Tags
                  </h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Add a tag"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const target = e.target as HTMLInputElement;
                          addTag(target.value);
                          target.value = "";
                        }
                      }}
                      className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Button
                      type="button"
                      color="primary"
                      variant="flat"
                      onClick={() => {
                        const input = document.querySelector(
                          'input[placeholder="Add a tag"]'
                        ) as HTMLInputElement;
                        if (input?.value) {
                          addTag(input.value);
                          input.value = "";
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>

                  {tagsList.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tagsList.map((tag, index) => (
                        <Chip
                          key={index}
                          size="sm"
                          variant="flat"
                          onClose={() => removeTag(tag)}
                          className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                        >
                          {tag}
                        </Chip>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="flat"
                  onClick={() => navigate("/dashboard/tasks")}
                  disabled={loading}
                  className="text-gray-600 dark:text-gray-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  isLoading={loading}
                  startContent={
                    !loading ? <CheckSquare className="w-4 h-4" /> : undefined
                  }
                  className="min-w-32"
                >
                  {loading ? "Creating Task..." : "Create Task"}
                </Button>
              </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">


              {/* Recurring Task */}
              <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-blue-600" />
                    Recurring Task
                  </h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Make Recurring
                    </span>
                    <Switch
                      isSelected={formData.isRecurring}
                      onValueChange={(checked) =>
                        handleInputChange("isRecurring", checked)
                      }
                      color="primary"
                    />
                  </div>

                  {formData.isRecurring && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Frequency
                        </label>
                        <Select
                          selectedKeys={[formData.recurringType]}
                          onSelectionChange={(keys) =>
                            handleInputChange(
                              "recurringType",
                              Array.from(keys)[0]
                            )
                          }
                          placeholder="Select frequency"
                          classNames={{
                            trigger:
                              "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600",
                            value: "text-gray-900 dark:text-white",
                          }}
                        >
                          <SelectItem key="daily">Daily</SelectItem>
                          <SelectItem key="weekly">Weekly</SelectItem>
                          <SelectItem key="monthly">Monthly</SelectItem>
                          <SelectItem key="yearly">Yearly</SelectItem>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Interval
                        </label>
                        <input
                          type="number"
                          value={formData.recurringInterval}
                          onChange={(e) =>
                            handleInputChange(
                              "recurringInterval",
                              e.target.value
                            )
                          }
                          placeholder="1"
                          min="1"
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Every {formData.recurringInterval}{" "}
                          {formData.recurringType}(s)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          End Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={formData.recurringEndDate}
                          onChange={(e) =>
                            handleInputChange(
                              "recurringEndDate",
                              e.target.value
                            )
                          }
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {errors.recurringEndDate && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.recurringEndDate}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
