import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
import type { LoaderFunction, ActionFunction } from "react-router";
import { getSession } from "~/session";

export const loader: LoaderFunction = async ({ request }) => {
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");
    
    if (!email) {
        throw new Response("Unauthorized", { status: 401 });
    }

    try {
        // Fetch templates and departments
        const apiUrl = new URL(request.url);
        apiUrl.pathname = "/api/reports";
        apiUrl.searchParams.set("operation", "getTemplates");

        const response = await fetch(apiUrl.toString(), {
            headers: {
                Cookie: request.headers.get("Cookie") || ""
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch templates");
        }

        const result = await response.json();
        
        return {
            templates: result.data?.templates || {},
            departments: result.data?.departments || [],
            user: { email }
        };
    } catch (error) {
        console.error("Error loading templates:", error);
        return {
            templates: {},
            departments: [],
            user: { email }
        };
    }
};

export const action: ActionFunction = async ({ request }) => {
    const formData = await request.formData();
    formData.append("operation", "create");

    const response = await fetch("/api/reports", {
        method: "POST",
        body: formData,
        headers: {
            Cookie: request.headers.get("Cookie") || ""
        }
    });

    return response;
};

export default function CreateReport() {
    const { templates, departments } = useLoaderData<typeof loader>();
    const fetcher = useFetcher();
    const navigate = useNavigate();
    
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

    const handleDepartmentChange = (deptId: string) => {
        setSelectedDepartment(deptId);
        const dept = departments.find((d: any) => d._id === deptId);
        if (dept) {
            // Determine department type based on name
            const deptName = dept.name.toLowerCase();
            if (deptName.includes('data')) {
                setDepartmentType('data');
            } else if (deptName.includes('software') || deptName.includes('development')) {
                setDepartmentType('software');
            } else if (deptName.includes('customer') || deptName.includes('service')) {
                setDepartmentType('customer_service');
            } else if (deptName.includes('news') || deptName.includes('media')) {
                setDepartmentType('news');
            } else {
                setDepartmentType('general');
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const submitData = new FormData();
        submitData.append("operation", "create");
        submitData.append("department", selectedDepartment);
        submitData.append("departmentType", departmentType);
        submitData.append("type", formData.type);
        submitData.append("month", formData.month.toString());
        submitData.append("year", formData.year.toString());
        submitData.append("amount", formData.amount);
        submitData.append("notes", formData.notes);

        // Add department-specific fields
        if (departmentType === 'data') {
            submitData.append("subscriptionPackage", formData.subscriptionPackage);
            submitData.append("numberOfFirms", formData.numberOfFirms);
            submitData.append("numberOfUsers", formData.numberOfUsers);
        } else if (departmentType === 'software') {
            submitData.append("projectName", formData.projectName);
            submitData.append("developmentHours", formData.developmentHours);
            submitData.append("projectStatus", formData.projectStatus);
        } else if (departmentType === 'customer_service') {
            submitData.append("totalTickets", formData.totalTickets);
            submitData.append("resolvedTickets", formData.resolvedTickets);
            submitData.append("averageResponseTime", formData.averageResponseTime);
            submitData.append("customerSatisfaction", formData.customerSatisfaction);
        } else if (departmentType === 'news') {
            submitData.append("articlesPublished", formData.articlesPublished);
            submitData.append("totalViews", formData.totalViews);
            submitData.append("newSubscribers", formData.newSubscribers);
            submitData.append("revenue", formData.revenue);
        } else if (departmentType === 'general') {
            submitData.append("metric1", formData.metric1);
            submitData.append("value1", formData.value1);
            submitData.append("metric2", formData.metric2);
            submitData.append("value2", formData.value2);
        }

        fetcher.submit(submitData, {
            method: "POST",
            action: "/api/reports"
        });
    };

    // Handle successful submission
    useEffect(() => {
        if (fetcher.data && fetcher.data.success) {
            navigate("/dashboard/reports");
        }
    }, [fetcher.data, navigate]);

    const currentTemplate = templates[departmentType as keyof typeof templates];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Monthly Report</h1>
                            <button
                                onClick={() => navigate("/dashboard/reports")}
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
                        {fetcher.data && !fetcher.data.success && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <div className="flex">
                                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-red-700 dark:text-red-300">{fetcher.data.message}</p>
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((dept: any) => (
                                        <option key={dept._id} value={dept._id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Amount *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => handleInputChange("amount", e.target.value)}
                                    required
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Department-Specific Fields */}
                        {currentTemplate && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                    {currentTemplate.name} Specific Fields
                                </h3>
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
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
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
                                onClick={() => navigate("/dashboard/reports")}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={fetcher.state === "submitting" || !selectedDepartment || !formData.type}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {fetcher.state === "submitting" ? "Creating..." : "Create Report"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
} 