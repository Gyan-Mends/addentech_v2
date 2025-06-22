import { useState, useEffect } from "react";
import { type LoaderFunction, useLoaderData } from "react-router";
import { successToast, errorToast } from "~/components/toast";
import CustomInput from "~/components/CustomInput";
import { memoAPI, type MemoRecord, type CreateMemoData, type UpdateMemoData } from "~/services/api";
import { Button, useDisclosure } from "@heroui/react";
import { Plus, Edit, Trash2, Upload, X } from "lucide-react";
import Drawer from "~/components/Drawer";
import ConfirmModal from "~/components/confirmModal";
import DataTable from "~/components/DataTable";

// Server-side imports (only for loader function)
import { getSession } from "~/session";
import Registration from "~/model/registration";
import Department from "~/model/department";

// Loader function to get initial data
export const loader: LoaderFunction = async ({ request }) => {
    // MongoDB connection is already handled in mongoose.server.ts
    
    try {
        const session = await getSession(request.headers.get("Cookie"));
        const email = session.get("email");
        
        if (!email) {
            throw new Response("Unauthorized", { status: 401 });
        }

        // Get current user
        const currentUser = await Registration.findOne({ email }).populate('department');
        if (!currentUser) {
            throw new Response("User not found", { status: 404 });
        }

        // Get all users and departments for dropdowns
        const users = await Registration.find({ status: 'active' })
            .select('firstName lastName email department')
            .populate('department', 'name')
            .sort({ firstName: 1 });

        const departments = await Department.find()
            .select('name')
            .sort({ name: 1 });

        return Response.json({
            currentUser: {
                _id: currentUser._id,
                firstName: currentUser.firstName,
                lastName: currentUser.lastName,
                email: currentUser.email,
                role: currentUser.role,
                department: currentUser.department
            },
            users,
            departments
        });

    } catch (error: any) {
        console.error("Error in memo loader:", error);
        throw new Response("Internal server error", { status: 500 });
    }
};

interface LoaderData {
    currentUser: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        department: any;
    };
    users: Array<{
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        department: { _id: string; name: string };
    }>;
    departments: Array<{
        _id: string;
        name: string;
    }>;
}

export default function MemoPage() {
    const { currentUser, users, departments } = useLoaderData<LoaderData>();
    
    // State management
    const [memos, setMemos] = useState<MemoRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
    const [selectedMemo, setSelectedMemo] = useState<MemoRecord | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Confirm modal state
    const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onOpenChange: onConfirmOpenChange } = useDisclosure();
    const [memoToDelete, setMemoToDelete] = useState<MemoRecord | null>(null);
    
    // Form state
    const [formData, setFormData] = useState<CreateMemoData>({
        refNumber: '',
        fromDepartment: currentUser.department?._id || '',
        fromName: currentUser._id,
        memoDate: new Date().toISOString().split('T')[0],
        toDepartment: '',
        toName: '',
        subject: '',
        memoType: 'Open',
        dueDate: '',
        frequency: 'Once',
        remark: '',
        ccDepartment: '',
        ccName: '',
        base64Image: '',
        emailCheck: true
    });

    // Generate reference number
    const generateRefNumber = () => {
        const prefix = "REF-";
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substr(2, 5).toUpperCase();
        return `${prefix}${timestamp.slice(-6)}${random}`;
    };

    // Load memos
    const loadMemos = async (page = 1, search = "") => {
        setLoading(true);
        try {
            const response = await memoAPI.getAll(page, 10, search);
            if (response.success && response.data) {
                setMemos(Array.isArray(response.data) ? response.data : []);
                if (response.pagination) {
                    setTotalPages(response.pagination.totalPages);
                }
            } else {
                errorToast(response.error || "Failed to load memos");
            }
        } catch (error) {
            console.error("Error loading memos:", error);
            errorToast("Failed to load memos");
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        loadMemos(currentPage, searchTerm);
    }, [currentPage, searchTerm]);

    // Handle form input changes
    const handleInputChange = (name: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle image upload
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('File selected:', file.name, file.type, file.size);

        // Validate file type
        if (!file.type.startsWith('image/') && !file.type.includes('pdf') && !file.type.includes('doc')) {
            errorToast('Please select an image, PDF, or document file');
            event.target.value = ''; // Reset input
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            errorToast('File size should be less than 5MB');
            event.target.value = ''; // Reset input
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;
            console.log('Base64 generated, length:', base64?.length);
            setFormData(prev => ({ ...prev, base64Image: base64 }));
            successToast('File uploaded successfully');
        };
        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            errorToast('Failed to read file');
        };
        reader.readAsDataURL(file);
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (!formData.refNumber || !formData.subject || !formData.toName || !formData.toDepartment) {
            errorToast("Please fill in all required fields");
            return;
        }

        try {
            const memoData = { ...formData };
            
            if (drawerMode === 'edit' && selectedMemo) {
                // Update existing memo
                const updateData: UpdateMemoData = {
                    id: selectedMemo._id,
                    ...memoData
                };
                const response = await memoAPI.update(updateData);
                
                if (response.success) {
                    successToast("Memo updated successfully");
                    setDrawerOpen(false);
                    setSelectedMemo(null);
                    loadMemos(currentPage, searchTerm);
                } else {
                    errorToast(response.error || "Failed to update memo");
                }
            } else {
                // Create new memo
                const response = await memoAPI.create(memoData);
                
                if (response.success) {
                    successToast("Memo created successfully and emails sent");
                    setDrawerOpen(false);
                    resetForm();
                    loadMemos(currentPage, searchTerm);
                } else {
                    errorToast(response.error || "Failed to create memo");
                }
            }
        } catch (error) {
            console.error("Error submitting memo:", error);
            errorToast("An unexpected error occurred");
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            refNumber: generateRefNumber(),
            fromDepartment: currentUser.department?._id || '',
            fromName: currentUser._id,
            memoDate: new Date().toISOString().split('T')[0],
            toDepartment: '',
            toName: '',
            subject: '',
            memoType: 'Open',
            dueDate: '',
            frequency: 'Once',
            remark: '',
            ccDepartment: '',
            ccName: '',
            base64Image: '',
            emailCheck: true
        });
    };

    // CRUD Operations
    const handleCreate = () => {
        setDrawerMode('create');
        setSelectedMemo(null);
        resetForm();
        setFormData(prev => ({ ...prev, refNumber: generateRefNumber() }));
        setDrawerOpen(true);
    };

    const handleView = (memo: MemoRecord) => {
        setDrawerMode('view');
        setSelectedMemo(memo);
        setFormData({
            refNumber: memo.refNumber,
            fromDepartment: typeof memo.fromDepartment === 'object' ? memo.fromDepartment._id : memo.fromDepartment,
            fromName: typeof memo.fromName === 'object' ? memo.fromName._id : memo.fromName,
            memoDate: memo.memoDate.split('T')[0],
            toDepartment: typeof memo.toDepartment === 'object' ? memo.toDepartment._id : memo.toDepartment,
            toName: typeof memo.toName === 'object' ? memo.toName._id : memo.toName,
            subject: memo.subject,
            memoType: memo.memoType,
            dueDate: memo.dueDate?.split('T')[0] || '',
            frequency: memo.frequency || 'Once',
            remark: memo.remark || '',
            ccDepartment: memo.ccDepartment ? (typeof memo.ccDepartment === 'object' ? memo.ccDepartment._id : memo.ccDepartment) : '',
            ccName: memo.ccName ? (typeof memo.ccName === 'object' ? memo.ccName._id : memo.ccName) : '',
            base64Image: memo.image || '',
            emailCheck: memo.emailCheck
        });
        setDrawerOpen(true);
    };

    const handleEdit = (memo: MemoRecord) => {
        // Check if user can edit this memo
        const canEdit = currentUser.role === "admin" || 
                       currentUser.role === "manager" || 
                       (typeof memo.fromName === 'object' && memo.fromName._id === currentUser._id);

        if (!canEdit) {
            errorToast("You don't have permission to edit this memo");
            return;
        }

        setDrawerMode('edit');
        setSelectedMemo(memo);
        setFormData({
            refNumber: memo.refNumber,
            fromDepartment: typeof memo.fromDepartment === 'object' ? memo.fromDepartment._id : memo.fromDepartment,
            fromName: typeof memo.fromName === 'object' ? memo.fromName._id : memo.fromName,
            memoDate: memo.memoDate.split('T')[0],
            toDepartment: typeof memo.toDepartment === 'object' ? memo.toDepartment._id : memo.toDepartment,
            toName: typeof memo.toName === 'object' ? memo.toName._id : memo.toName,
            subject: memo.subject,
            memoType: memo.memoType,
            dueDate: memo.dueDate?.split('T')[0] || '',
            frequency: memo.frequency || 'Once',
            remark: memo.remark || '',
            ccDepartment: memo.ccDepartment ? (typeof memo.ccDepartment === 'object' ? memo.ccDepartment._id : memo.ccDepartment) : '',
            ccName: memo.ccName ? (typeof memo.ccName === 'object' ? memo.ccName._id : memo.ccName) : '',
            base64Image: memo.image || '',
            emailCheck: memo.emailCheck
        });
        setDrawerOpen(true);
    };

    const handleDelete = (memo: MemoRecord) => {
        // Check if user can delete this memo
        const canDelete = currentUser.role === "admin" || 
                         currentUser.role === "manager" || 
                         (typeof memo.fromName === 'object' && memo.fromName._id === currentUser._id);

        if (!canDelete) {
            errorToast("You don't have permission to delete this memo");
            return;
        }

        setMemoToDelete(memo);
        onConfirmOpen();
    };

    const confirmDelete = async () => {
        if (!memoToDelete) return;

        try {
            const response = await memoAPI.delete(memoToDelete._id);
            
            if (response.success) {
                setMemos(prev => prev.filter(m => m._id !== memoToDelete._id));
                successToast("Memo deleted successfully");
                onConfirmOpenChange();
                setMemoToDelete(null);
            } else {
                errorToast(response.error || "Failed to delete memo");
            }
        } catch (error) {
            console.error("Error deleting memo:", error);
            errorToast("Failed to delete memo");
        }
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setSelectedMemo(null);
    };

    // Table columns
    const columns = [
        {
            title: "Ref Number",
            key: "refNumber" as keyof MemoRecord,
            render: (value: any, memo: MemoRecord) => (
                <span className="font-semibold text-blue-600">{memo.refNumber}</span>
            )
        },
        {
            title: "From Department",
            key: "fromDepartment" as keyof MemoRecord,
            render: (value: any, memo: MemoRecord) => (
                <span>{typeof memo.fromDepartment === 'object' ? memo.fromDepartment.name : memo.fromDepartment}</span>
            )
        },
        {
            title: "From Name",
            key: "fromName" as keyof MemoRecord,
            render: (value: any, memo: MemoRecord) => (
                <span>
                    {typeof memo.fromName === 'object' 
                        ? `${memo.fromName.firstName} ${memo.fromName.lastName}`
                        : memo.fromName}
                </span>
            )
        },
        {
            title: "To Department",
            key: "toDepartment" as keyof MemoRecord,
            render: (value: any, memo: MemoRecord) => (
                <span>{typeof memo.toDepartment === 'object' ? memo.toDepartment.name : memo.toDepartment}</span>
            )
        },
        {
            title: "To Name",
            key: "toName" as keyof MemoRecord,
            render: (value: any, memo: MemoRecord) => (
                <span>
                    {typeof memo.toName === 'object' 
                        ? `${memo.toName.firstName} ${memo.toName.lastName}`
                        : memo.toName}
                </span>
            )
        },
        {
            title: "Subject",
            key: "subject" as keyof MemoRecord,
            render: (value: any, memo: MemoRecord) => (
                <div className="max-w-xs truncate" title={memo.subject}>
                    {memo.subject}
                </div>
            )
        },
        {
            title: "Memo Date",
            key: "memoDate" as keyof MemoRecord,
            render: (value: any, memo: MemoRecord) => (
                <span>{new Date(memo.memoDate).toLocaleDateString()}</span>
            )
        },
        {
            title: "Due Date",
            key: "dueDate" as keyof MemoRecord,
            render: (value: any, memo: MemoRecord) => (
                <span>{memo.dueDate ? new Date(memo.dueDate).toLocaleDateString() : 'N/A'}</span>
            )
        },
        {
            title: "Actions",
            key: "_id" as keyof MemoRecord,
            sortable: false,
            searchable: false,
            width: '120px',
            align: 'center' as const,
            render: (value: any, memo: MemoRecord) => (
                <div className="flex items-center space-x-2">
                    <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        isIconOnly
                        onPress={() => handleView(memo)}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </Button>
                    <Button
                        size="sm"
                        variant="flat"
                        color="warning"
                        isIconOnly
                        onPress={() => handleEdit(memo)}
                    >
                        <Edit size={16} />
                    </Button>
                    <Button
                        size="sm"
                        variant="flat"
                        color="danger"
                        isIconOnly
                        onPress={() => handleDelete(memo)}
                    >
                        <Trash2 size={16} />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Memorandum</h1>
                    <p className="text-gray-600 dark:text-gray-400">Create and manage organizational memos</p>
                </div>
                <Button
                    color="primary"
                    startContent={<Plus size={20} />}
                    onPress={handleCreate}
                >
                    Create Memo
                </Button>
            </div>

            {/* Data Table */}
            <DataTable
                data={memos}
                columns={columns}
                loading={loading}
                pageSize={10}
                searchPlaceholder="Search memos..."
                emptyText="No memos found"
            />

            {/* Memo Form Drawer */}
            <Drawer
                isOpen={drawerOpen}
                onClose={handleCloseDrawer}
                title={
                    drawerMode === 'create' ? 'Create New Memo' :
                    drawerMode === 'edit' ? 'Edit Memo' : 'Memo Details'
                }
                size="lg"
            >
                <div className="space-y-6">
                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Reference Number */}
                        <CustomInput
                            label="Reference Number"
                            isRequired
                            value={formData.refNumber}
                            onChange={drawerMode === 'view' ? undefined : (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('refNumber', e.target.value)}
                            placeholder="Enter reference number"
                            isReadOnly={drawerMode === 'edit'}
                        />

                        {/* Subject */}
                        <CustomInput
                            label="Subject"
                            isRequired
                            value={formData.subject}
                            onChange={drawerMode === 'view' ? undefined : (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('subject', e.target.value)}
                            placeholder="Enter memo subject"
                        />

                        {/* From Department */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                From Department <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.fromDepartment}
                                onChange={(e) => handleInputChange('fromDepartment', e.target.value)}
                                disabled={drawerMode === 'view'}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                    <option key={dept._id} value={dept._id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* From Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                From Name <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.fromName}
                                onChange={(e) => handleInputChange('fromName', e.target.value)}
                                disabled={drawerMode === 'view'}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select User</option>
                                {users.map((user) => (
                                    <option key={user._id} value={user._id}>
                                        {user.firstName} {user.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* To Department */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                To Department <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.toDepartment}
                                onChange={(e) => handleInputChange('toDepartment', e.target.value)}
                                disabled={drawerMode === 'view'}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                    <option key={dept._id} value={dept._id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* To Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                To Name <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.toName}
                                onChange={(e) => handleInputChange('toName', e.target.value)}
                                disabled={drawerMode === 'view'}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select User</option>
                                {users.map((user) => (
                                    <option key={user._id} value={user._id}>
                                        {user.firstName} {user.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* CC Department */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                CC Department
                            </label>
                            <select
                                value={formData.ccDepartment}
                                onChange={(e) => handleInputChange('ccDepartment', e.target.value)}
                                disabled={drawerMode === 'view'}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                    <option key={dept._id} value={dept._id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* CC Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                CC Name
                            </label>
                            <select
                                value={formData.ccName}
                                onChange={(e) => handleInputChange('ccName', e.target.value)}
                                disabled={drawerMode === 'view'}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select User</option>
                                {users.map((user) => (
                                    <option key={user._id} value={user._id}>
                                        {user.firstName} {user.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Memo Date */}
                        <CustomInput
                            label="Memo Date"
                            type="date"
                            isRequired
                            value={formData.memoDate}
                            onChange={drawerMode === 'view' ? undefined : (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('memoDate', e.target.value)}
                        />

                        {/* Due Date */}
                        <CustomInput
                            label="Due Date"
                            type="date"
                            value={formData.dueDate}
                            onChange={drawerMode === 'view' ? undefined : (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('dueDate', e.target.value)}
                        />

                        {/* Memo Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Memo Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.memoType}
                                onChange={(e) => handleInputChange('memoType', e.target.value)}
                                disabled={drawerMode === 'view'}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="Open">Open</option>
                                <option value="Processing">Processing</option>
                                <option value="Closed">Closed</option>
                                <option value="Urgent">Urgent</option>
                                <option value="Confidential">Confidential</option>
                            </select>
                        </div>

                        {/* Frequency */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Frequency
                            </label>
                            <select
                                value={formData.frequency}
                                onChange={(e) => handleInputChange('frequency', e.target.value)}
                                disabled={drawerMode === 'view'}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="Once">Once</option>
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Quarterly">Quarterly</option>
                                <option value="Annually">Annually</option>
                            </select>
                        </div>
                    </div>

                    {/* Remarks */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Remarks
                        </label>
                        <textarea
                            value={formData.remark}
                            onChange={(e) => handleInputChange('remark', e.target.value)}
                            placeholder="Additional remarks or comments..."
                            rows={4}
                            disabled={drawerMode === 'view'}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Attachment
                        </label>
                        {drawerMode !== 'view' && (
                            <div className="flex items-center space-x-2">
                                <input
                                    type="file"
                                    accept="image/*,.pdf,.doc,.docx"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    id="attachment-upload"
                                />
                                <label htmlFor="attachment-upload" className="cursor-pointer">
                                    <Button
                                        variant="flat"
                                        color="primary"
                                        size="sm"
                                        startContent={<Upload size={16} />}
                                        as="span"
                                    >
                                        Upload File
                                    </Button>
                                </label>
                                
                                {formData.base64Image && (
                                    <Button
                                        variant="flat"
                                        color="danger"
                                        size="sm"
                                        isIconOnly
                                        onPress={() => {
                                            setFormData(prev => ({ ...prev, base64Image: '' }));
                                            // Reset the file input
                                            const fileInput = document.getElementById('attachment-upload') as HTMLInputElement;
                                            if (fileInput) fileInput.value = '';
                                        }}
                                    >
                                        <X size={16} />
                                    </Button>
                                )}
                            </div>
                        )}
                        {formData.base64Image && (
                            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                                ✓ File attached
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {drawerMode !== 'view' && (
                        <div className="flex items-center space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                color="primary"
                                onPress={handleSubmit}
                                className="flex-1"
                            >
                                {drawerMode === 'create' ? 'Create Memo' : 'Update Memo'}
                            </Button>
                            <Button
                                variant="flat"
                                onPress={handleCloseDrawer}
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
                header="Delete Memo"
                content={
                    memoToDelete 
                        ? `Are you sure you want to delete memo "${memoToDelete.refNumber}"? This action cannot be undone and will remove all memo data.`
                        : "Are you sure you want to delete this memo?"
                }
            >
                <div className="flex gap-3">
                    <Button
                        color="danger"
                        onPress={confirmDelete}
                        className="flex-1"
                    >
                        Delete Memo
                    </Button>
                    <Button
                        variant="flat"
                        onPress={() => {
                            onConfirmOpenChange();
                            setMemoToDelete(null);
                        }}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                </div>
            </ConfirmModal>
        </div>
    );
}
