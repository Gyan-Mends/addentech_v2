export interface RegistrationInterface {
    _id: string,
    firstName: string,
    middleName: string,
    lastName: string,
    email: string,
    password: string,
    phone: string,
    role: string,
    admin: string,
    position: string,
    department: string,
    image: string,
    permissions: Map<string, boolean>,
    status: string,
    lastLogin: Date,
    workMode: string,  // Added workMode field
    // Bio field
    bio?: string,
}

export interface LeaveInterface {
    _id: string;
    employee: string;
    leaveType: string;
    startDate: Date;
    endDate: Date;
    totalDays: number;
    reason: string;
    status: string;
    priority: string;
    approvalWorkflow: Array<{
        approver: string;
        approverRole: string;
        status: string;
        comments?: string;
        actionDate?: Date;
        order: number;
    }>;
    department: string;
    submissionDate: Date;
    lastModified: Date;
    modifiedBy?: string;
    isActive: boolean;
}
export interface ContactInterface {
    _id: string,
    firstName: string,
    middleName: string,
    lastName: string,
    number: string,
    company: string,
    description: string,
}

export interface CategoryInterface {
    _id: string;
    name: string
    description: string
    seller: string
}
export interface DepartmentInterface {
    _id: string;
    name: string
    description: string
    admin: string
}
export interface BlogInterface {
    _id: string
    name: string
    description: string
    category: string
    admin: string
}

// Enhanced Task Interface with comprehensive framework fields
export interface TaskInterface {
    _id: string;
    
    // Essential Task Elements
    title: string;
    description: string;
    
    // Task Categories
    category: "Strategic Initiatives" | "Operational Tasks" | "Project Work" | "Administrative Tasks" | "Emergency/Urgent Items";
    
    // Priority Matrix (P1-P4)
    priority: "Critical (P1)" | "High (P2)" | "Medium (P3)" | "Low (P4)";
    
    // Enhanced Status with Workflow Stages
    status: "Not Started" | "In Progress" | "Under Review" | "Completed" | "Blocked" | "On Hold" | "Cancelled";
    
    // Assignment and Ownership
    assignedOwner: string | RegistrationInterface;
    
    // Collaborators (additional team members involved)
    collaborators: Array<{
        user: string | RegistrationInterface;
        role: "Contributor" | "Reviewer" | "Stakeholder" | "Observer";
        addedAt: Date;
    }>;
    
    department: string | DepartmentInterface;
    createdBy: string | RegistrationInterface;
    
    // Time Management
    dueDate: Date;
    
    estimatedTimeInvestment: {
        hours: number;
        unit: "hours" | "days" | "weeks";
    };
    
    actualTimeSpent: {
        hours: number;
        unit: "hours" | "days" | "weeks";
    };
    
    // Dependencies
    dependencies: Array<{
        taskId: string | TaskInterface;
        type: "Blocks" | "Blocked By" | "Related To";
        description?: string;
    }>;
    
    // Success Criteria
    successCriteria: Array<{
        criterion: string;
        completed: boolean;
        completedAt?: Date;
        completedBy?: string | RegistrationInterface;
    }>;
    
    // Required Resources/Tools
    requiredResources: Array<{
        name: string;
        type: "Tool" | "Software" | "Hardware" | "Budget" | "Personnel" | "Other";
        description?: string;
        status: "Available" | "Requested" | "Approved" | "Denied";
    }>;
    
    // Client/Stakeholder Information
    stakeholders: Array<{
        name?: string;
        role?: string;
        email?: string;
        department?: string;
        involvement: "Primary" | "Secondary" | "Informed";
    }>;
    
    // Budget Implications
    budgetImplications: {
        estimatedCost: number;
        actualCost: number;
        currency: string;
        budgetCategory?: string;
        approved: boolean;
    };
    
    // Risk Factors
    riskFactors: Array<{
        risk: string;
        probability: "Low" | "Medium" | "High";
        impact: "Low" | "Medium" | "High";
        mitigation?: string;
        status: "Identified" | "Mitigated" | "Accepted" | "Resolved";
    }>;
    
    // Progress Notes/Updates
    progressUpdates: Array<{
        createdBy: string | RegistrationInterface;
        update: string;
        percentComplete: number;
        milestone?: string;
        blockers: Array<{
            description?: string;
            severity: "Low" | "Medium" | "High" | "Critical";
            resolvedAt?: Date;
            resolvedBy?: string | RegistrationInterface;
        }>;
        createdAt: Date;
    }>;
    
    // Enhanced Comments with Replies Support
    comments?: Array<{
        _id?: string;
        createdBy: string | RegistrationInterface;
        comment: string;
        type: "General" | "Status Update" | "Escalation" | "Resolution" | "Feedback";
        visibility: "Public" | "Team Only" | "Stakeholders Only" | "Private";
        parentCommentId?: string | null;
        mentionedUsers?: string[];
        createdAt: Date;
        updatedAt: Date;
        reactions?: Array<{
            user: string | RegistrationInterface;
            type: "like" | "helpful" | "concern" | "approved";
            createdAt: Date;
        }>;
    }>;
    
    // File Attachments/References
    attachments: Array<{
        filename: string;
        originalName?: string;
        mimeType?: string;
        size?: number;
        url?: string;
        uploadedBy?: string | RegistrationInterface;
        uploadedAt: Date;
        description?: string;
        category: "Document" | "Image" | "Specification" | "Reference" | "Template" | "Other";
    }>;
    
    // Workflow and Approval
    approvalWorkflow: Array<{
        approver: string | RegistrationInterface;
        level: number;
        status: "Pending" | "Approved" | "Rejected" | "Skipped";
        approvedAt?: Date;
        comments?: string;
        required: boolean;
    }>;
    
    // Performance Metrics
    metrics: {
        viewCount: number;
        editCount: number;
        completionScore: number;
        qualityScore: number;
        stakeholderSatisfaction: number;
    };
    
    // Recurrence (for recurring tasks)
    recurrence: {
        isRecurring: boolean;
        frequency?: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly";
        interval: number;
        endDate?: Date;
        nextDueDate?: Date;
        parentTaskId?: string | TaskInterface;
    };
    
    // Archive and Closure
    archived: boolean;
    archivedAt?: Date;
    archivedBy?: string | RegistrationInterface;
    completedAt?: Date;
    lessonsLearned?: string;
    
    // Task Templates
    isTemplate?: boolean;
    templateName?: string;
    templateDescription?: string;
    usageCount?: number;
    
    // Enhanced Workflow Fields
    taskAssignmentLevel?: "department" | "member";
    departmentAssignmentComplete?: boolean;
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

export interface MemoInterface {
    _id: string;
    refNumber: string;
    fromDepartment: string | DepartmentInterface;
    fromName: string | RegistrationInterface;
    memoDate: string;
    toDepartment: string | DepartmentInterface;        
    toName: string | RegistrationInterface;              // Name of the recipient
    subject: string;             // Subject of the memo
    memoType: string;            // Type of the memo
    dueDate: string;            // Optional due date
    frequency: string;          // Optional frequency (e.g., daily, weekly)
    remark: string;             // Optional remarks
    ccDepartment: string | DepartmentInterface;       // Optional CC department
    ccName: string | RegistrationInterface;             // Optional CC recipient name
    image: string;                // Optional image attachment (base64 string)
    emailCheck: boolean;         // Whether to send via email
    createdAt: string;           // Timestamp for when the memo is created
    updatedAt: string;          // Optional, for tracking updates
    status: string;             // Optional, e.g., "draft" or "sent"
}

export interface ComplaintInterface {
    description: string;
    attachment: string;
    unique_id: string;
    status: string
}
