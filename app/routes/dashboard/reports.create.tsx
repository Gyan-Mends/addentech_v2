import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import axios from "axios";

export default function CreateReport() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<any>({});
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userDepartment, setUserDepartment] = useState<any>(null);
    
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [departmentType, setDepartmentType] = useState("");
    const [formData, setFormData] = useState({
        type: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        amount: "",
        notes: "",
        // Department-specific fields
        subscriptionPackage: "",
        numberOfFirms: "",
        numberOfUsers: "",
        projectName: "",
        developmentHours: "",
        projectStatus: "",
        totalTickets: "",
        resolvedTickets: "",
        averageResponseTime: "",
        customerSatisfaction: "",
        articlesPublished: "",
        totalViews: "",
        newSubscribers: "",
        revenue: "",
        metric1: "",
        value1: "",
        metric2: "",
        value2: ""
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const getTemplateDefinitions = () => {
        return {
            data: {
                name: "Data Department",
                description: "Subscription services and user management",
                fields: [
                    { name: "subscriptionPackage", label: "Subscription Package", type: "text", required: true, description: "Package type offered" },
                    { name: "numberOfFirms", label: "Number of Firms", type: "number", required: true, description: "Total firms served" },
                    { name: "numberOfUsers", label: "Number of Users", type: "number", required: true, description: "Total active users" },
                    { name: "amount", label: "Amount (Revenue Generated)", type: "number", required: true, min: 0, step: "0.01", description: "Revenue generated from subscriptions" }
                ]
            },
            software: {
                name: "Information Technology Department", 
                description: "Technology projects, system maintenance, and IT services",
                fields: [
                    { name: "projectName", label: "Main Project/Initiative", type: "text", required: true, description: "Primary IT project or system implementation" },
                    { name: "developmentHours", label: "Total IT Hours", type: "number", required: true, description: "Total hours worked on IT tasks" },
                    { name: "projectStatus", label: "Project Status", type: "select", required: true, options: ["planning", "in-progress", "testing", "deployed", "maintenance"], description: "Current project or system status" },
                    { name: "amount", label: "Amount (IT Budget/Savings)", type: "number", required: true, min: 0, step: "0.01", description: "IT budget allocated or cost savings achieved" }
                ]
            },
            customer_service: {
                name: "Customer Service Department",
                description: "Support metrics and customer satisfaction", 
                fields: [
                    { name: "totalTickets", label: "Total Tickets", type: "number", required: true, description: "Tickets received" },
                    { name: "resolvedTickets", label: "Resolved Tickets", type: "number", required: true, description: "Tickets resolved" },
                    { name: "averageResponseTime", label: "Average Response Time (hours)", type: "number", required: true, min: 0, description: "Average response time in hours" },
                    { name: "customerSatisfaction", label: "Customer Satisfaction (%)", type: "number", required: true, min: 0, max: 100, description: "Customer satisfaction percentage (0-100)" },
                    { name: "amount", label: "Amount (Cost Savings/Revenue Impact)", type: "number", required: true, min: 0, step: "0.01", description: "Cost savings or revenue impact from service improvements" }
                ]
            },
            news: {
                name: "News Department",
                description: "Content creation and audience engagement",
                fields: [
                    { name: "articlesPublished", label: "Articles Published", type: "number", required: true, description: "Total articles published" },
                    { name: "totalViews", label: "Total Views", type: "number", required: true, description: "Total article views" },
                    { name: "newSubscribers", label: "New Subscribers", type: "number", required: true, description: "New subscriptions gained" },
                    { name: "revenue", label: "Revenue (Ad/Subscription)", type: "number", required: true, min: 0, step: "0.01", description: "Ad revenue or subscription revenue" },
                    { name: "amount", label: "Amount (Total Revenue)", type: "number", required: true, min: 0, step: "0.01", description: "Total revenue generated" }
                ]
            }
        };
    };

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
            // Default to software department for IT-related departments
            return 'software';
        }
    };

    const handleDepartmentChange = (deptId: string) => {
        setSelectedDepartment(deptId);
        const dept = departments.find((d: any) => d._id === deptId);
        if (dept) {
            setDepartmentType(determineDepartmentType(dept.name));
        }
    };

    useEffect(() => {
        const fetchUserAndTemplates = async () => {
            try {
                setLoading(true);
                
                // Fetch user data and templates in parallel
                const [userResponse, templatesResponse] = await Promise.all([
                    axios.get('/api/auth/verify'), // Get current user
                    axios.get('/api/reports?operation=getTemplates')
                ]);
                
                // Handle user data
                if (userResponse.data.success && userResponse.data.user) {
                    const user = userResponse.data.user;
                    setUserDepartment(user.department);
                    
                    // Auto-select user's department
                    if (user.department) {
                        setSelectedDepartment(user.department._id || user.department);
                        setDepartmentType(determineDepartmentType(user.department.name || ''));
                    }
                }
                
                // Handle templates and departments
                if (templatesResponse.data.success) {
                    setTemplates(getTemplateDefinitions());
                    setDepartments(templatesResponse.data.data.departments || []);
                } else {
                    // Use predefined templates and mock departments
                    setTemplates(getTemplateDefinitions());
                    setDepartments([
                        { _id: "1", name: "Data Department" },
                        { _id: "2", name: "Software Department" },
                        { _id: "3", name: "Customer Service Department" },
                        { _id: "4", name: "News Department" },
                        { _id: "5", name: "General Department" }
                    ]);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Failed to load form data');
                
                // Fallback to mock data
                setTemplates(getTemplateDefinitions());
                setDepartments([
                    { _id: "1", name: "Data Department" },
                    { _id: "2", name: "Software Department" },
                    { _id: "3", name: "Customer Service Department" },
                    { _id: "4", name: "News Department" },
                    { _id: "5", name: "General Department" }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchUserAndTemplates();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            setSubmitting(true);
            setError(null);

            const submitData = {
                operation: "create",
                department: selectedDepartment,
                departmentType: departmentType,
                type: formData.type,
                month: formData.month,
                year: formData.year,
                amount: parseFloat(formData.amount),
                notes: formData.notes,
                // Department-specific fields
                ...(departmentType === 'data' && {
                    subscriptionPackage: formData.subscriptionPackage,
                    numberOfFirms: parseInt(formData.numberOfFirms) || 0,
                    numberOfUsers: parseInt(formData.numberOfUsers) || 0
                }),
                ...(departmentType === 'software' && {
                    projectName: formData.projectName,
                    developmentHours: parseInt(formData.developmentHours) || 0,
                    projectStatus: formData.projectStatus
                }),
                ...(departmentType === 'customer_service' && {
                    totalTickets: parseInt(formData.totalTickets) || 0,
                    resolvedTickets: parseInt(formData.resolvedTickets) || 0,
                    averageResponseTime: parseFloat(formData.averageResponseTime) || 0,
                    customerSatisfaction: parseFloat(formData.customerSatisfaction) || 0
                }),
                ...(departmentType === 'news' && {
                    articlesPublished: parseInt(formData.articlesPublished) || 0,
                    totalViews: parseInt(formData.totalViews) || 0,
                    newSubscribers: parseInt(formData.newSubscribers) || 0,
                    revenue: parseFloat(formData.revenue) || 0
                }),
                ...(departmentType === 'general' && {
                    metric1: formData.metric1,
                    value1: parseFloat(formData.value1) || 0,
                    metric2: formData.metric2,
                    value2: parseFloat(formData.value2) || 0
                })
            };

            const response = await axios.post('/api/reports', submitData);
            
            if (response.data.success) {
                navigate("/dashboard/monthly-reports");
            } else {
                setError(response.data.message || 'Failed to create report');
            }
        } catch (error: any) {
            console.error('Error creating report:', error);
            setError(error.response?.data?.message || 'Failed to create report');
        } finally {
            setSubmitting(false);
        }
    };

    const currentTemplate = templates[departmentType as keyof typeof templates];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-600 dark:text-gray-400 mt-4">Loading form...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Monthly Report</h1>
                            <button
                                onClick={() => navigate("/dashboard/monthly-reports")}
                                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <div className="flex">
                                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-red-700 dark:text-red-300">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Department Info */}
                        {userDepartment && departmentType && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <div className="flex">
                                    <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-blue-700 dark:text-blue-300 font-medium">
                                            Creating report for: {userDepartment.name || currentTemplate?.name}
                                        </p>
                                        <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                                            Focus: {currentTemplate?.description || 'Department-specific reporting'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Department *
                                </label>
                                <select
                                    value={selectedDepartment}
                                    onChange={(e) => handleDepartmentChange(e.target.value)}
                                    required
                                    disabled={!!userDepartment}
                                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        userDepartment 
                                            ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' 
                                            : 'bg-white dark:bg-gray-700'
                                    }`}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((dept: any) => (
                                        <option key={dept._id} value={dept._id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                                {userDepartment && (
                                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                        📍 Auto-selected based on your department assignment
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Report Type *
                                </label>
                                <input
                                    type="text"
                                    value={formData.type}
                                    onChange={(e) => handleInputChange("type", e.target.value)}
                                    required
                                    placeholder="e.g., Monthly Performance, Revenue Report"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Month *
                                </label>
                                <select
                                    value={formData.month}
                                    onChange={(e) => handleInputChange("month", e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                            {new Date(2024, i, 1).toLocaleString('default', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Year *
                                </label>
                                <input
                                    type="number"
                                    value={formData.year}
                                    onChange={(e) => handleInputChange("year", e.target.value)}
                                    required
                                    min="2020"
                                    max="2030"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>


                        </div>

                        {/* Department-Specific Fields */}
                        {currentTemplate && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                        {currentTemplate.name} Specific Fields
                                    </h3>
                                    {userDepartment && (
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm font-medium">
                                            Your Department
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {currentTemplate.fields.map((field: any) => (
                                        <div key={field.name}>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {field.label} {field.required && "*"}
                                            </label>
                                            {field.type === "select" ? (
                                                <select
                                                    value={formData[field.name as keyof typeof formData]}
                                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                                    required={field.required}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="">Select {field.label}</option>
                                                    {field.options?.map((option: string) => (
                                                        <option key={option} value={option}>
                                                            {option.charAt(0).toUpperCase() + option.slice(1).replace('-', ' ')}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type={field.type}
                                                    value={formData[field.name as keyof typeof formData]}
                                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                                    required={field.required}
                                                    min={field.min}
                                                    max={field.max}
                                                    step={field.type === "number" ? "0.01" : undefined}
                                                    placeholder={field.description ? `e.g., ${field.description}` : undefined}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            )}
                                            {field.description && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                    {field.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleInputChange("notes", e.target.value)}
                                rows={4}
                                placeholder="Additional notes or comments..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => navigate("/dashboard/monthly-reports")}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !selectedDepartment || !formData.type}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {submitting ? "Creating..." : "Create Report"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
} 