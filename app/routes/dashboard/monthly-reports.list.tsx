import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import axios from "axios";

export default function MonthlyReportsList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<any>({});
    
    // Filter states
    const [filters, setFilters] = useState({
        status: searchParams.get("status") || "all",
        department: searchParams.get("department") || "all",
        month: searchParams.get("month") || "",
        year: searchParams.get("year") || "",
        search: searchParams.get("search") || ""
    });

    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1"));

    useEffect(() => {
        fetchReports();
    }, [filters, currentPage]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: "10",
                status: filters.status,
                department: filters.department,
                ...(filters.month && { month: filters.month }),
                ...(filters.year && { year: filters.year }),
                ...(filters.search && { search: filters.search })
            });

            const response = await axios.get(`/api/reports?${params}`);
            
            if (response.data.success) {
                setReports(response.data.data || []);
                setPagination(response.data.pagination || {});
            } else {
                // Mock data fallback
                setReports([
                    {
                        _id: "1",
                        type: "Monthly Performance",
                        status: "approved",
                        department: { name: "Data Department" },
                        createdBy: { firstName: "John", lastName: "Doe" },
                        createdAt: new Date().toISOString(),
                        month: 12,
                        year: 2024,
                        amount: 15000
                    },
                    {
                        _id: "2",
                        type: "Revenue Report",
                        status: "submitted",
                        department: { name: "Software Department" },
                        createdBy: { firstName: "Jane", lastName: "Smith" },
                        createdAt: new Date().toISOString(),
                        month: 12,
                        year: 2024,
                        amount: 25000
                    },
                    {
                        _id: "3",
                        type: "Customer Service Report",
                        status: "draft",
                        department: { name: "Customer Service" },
                        createdBy: { firstName: "Mike", lastName: "Johnson" },
                        createdAt: new Date().toISOString(),
                        month: 11,
                        year: 2024,
                        amount: 8000
                    }
                ]);
                setPagination({
                    currentPage: 1,
                    totalPages: 1,
                    totalReports: 3,
                    hasNextPage: false,
                    hasPrevPage: false
                });
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
            setError('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        setCurrentPage(1);
        
        // Update URL params
        const newSearchParams = new URLSearchParams();
        Object.entries(newFilters).forEach(([k, v]) => {
            if (v && v !== "all") {
                newSearchParams.set(k, v);
            }
        });
        if (currentPage > 1) {
            newSearchParams.set("page", "1");
        }
        setSearchParams(newSearchParams);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set("page", page.toString());
        setSearchParams(newSearchParams);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'submitted':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
            case 'rejected':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        }
    };

    const getMonthName = (month: number) => {
        return new Date(2024, month - 1, 1).toLocaleString('default', { month: 'long' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-600 dark:text-gray-400 mt-4">Loading reports...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Reports</div>
                        <p className="text-gray-600 dark:text-gray-400">{error}</p>
                        <button 
                            onClick={() => fetchReports()} 
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Monthly Reports</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Manage and view all monthly reports
                        </p>
                    </div>
                    <div className="mt-4 md:mt-0 flex space-x-3">
                        <Link
                            to="/dashboard/monthly-reports/create"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Report
                        </Link>
                        <Link
                            to="/dashboard/monthly-reports"
                            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                            </svg>
                            Dashboard
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Filters</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange("status", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Status</option>
                                <option value="draft">Draft</option>
                                <option value="submitted">Submitted</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Month
                            </label>
                            <select
                                value={filters.month}
                                onChange={(e) => handleFilterChange("month", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Months</option>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {getMonthName(i + 1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Year
                            </label>
                            <select
                                value={filters.year}
                                onChange={(e) => handleFilterChange("year", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Years</option>
                                <option value="2024">2024</option>
                                <option value="2023">2023</option>
                                <option value="2022">2022</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Search
                            </label>
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => handleFilterChange("search", e.target.value)}
                                placeholder="Search reports..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setFilters({
                                        status: "all",
                                        department: "all",
                                        month: "",
                                        year: "",
                                        search: ""
                                    });
                                    setCurrentPage(1);
                                    setSearchParams({});
                                }}
                                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Reports Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                            Reports ({pagination.totalReports || reports.length})
                        </h2>
                    </div>

                    {reports.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Report
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Department
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Period
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Created By
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {reports.map((report) => (
                                        <tr key={report._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {report.type}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(report.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {report.department?.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {getMonthName(report.month)} {report.year}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                ${report.amount?.toLocaleString() || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                                                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {report.createdBy?.firstName} {report.createdBy?.lastName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => alert(`Viewing report: ${report.type}\nStatus: ${report.status}\nAmount: $${report.amount?.toLocaleString()}\nDepartment: ${report.department?.name}`)}
                                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                    >
                                                        View
                                                    </button>
                                                    {report.status === 'draft' && (
                                                        <Link
                                                            to="/dashboard/monthly-reports/create"
                                                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                                        >
                                                            Edit
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-600 dark:text-gray-400">No reports found</p>
                            <Link 
                                to="/dashboard/monthly-reports/create" 
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium mt-2 inline-block"
                            >
                                Create your first report
                            </Link>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                Showing page {pagination.currentPage} of {pagination.totalPages}
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={!pagination.hasPrevPage}
                                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`px-3 py-1 text-sm rounded ${
                                            page === currentPage
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={!pagination.hasNextPage}
                                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 