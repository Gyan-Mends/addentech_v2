import Memo from "~/model/memo";
import Registration from "~/model/registration";
import Department from "~/model/department";
import { getSession } from "~/session";
import { sendEmail, createMemoEmailTemplate } from "~/components/email";
import type { ActionFunction, LoaderFunction } from "react-router";

// Get all memos or fetch specific memo data
export const loader: LoaderFunction = async ({ request }) => {
    
    try {
        const session = await getSession(request.headers.get("Cookie"));
        const email = session.get("email");
        
        if (!email) {
            return Response.json({
                message: "Unauthorized - Please login",
                success: false,
                status: 401
            }, { status: 401 });
        }

        // Get current user
        const currentUser = await Registration.findOne({ email }).populate('department');
        if (!currentUser) {
            return Response.json({
                message: "User not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        const url = new URL(request.url);
        const operation = url.searchParams.get("operation");
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const search_term = url.searchParams.get("search_term") || "";
        const memoId = url.searchParams.get("id");

        // Handle specific memo fetch
        if (operation === "getById" && memoId) {
            const memo = await Memo.findById(memoId)
                .populate("fromDepartment", "name")
                .populate("fromName", "firstName lastName email")
                .populate("toDepartment", "name")
                .populate("toName", "firstName lastName email")
                .populate("ccDepartment", "name")
                .populate("ccName", "firstName lastName email");

            if (!memo) {
                return Response.json({
                    message: "Memo not found",
                    success: false,
                    status: 404
                }, { status: 404 });
            }

            // Check if user can view this memo
            const canView = currentUser.role === "admin" || 
                          currentUser.role === "manager" || 
                          memo.fromName.toString() === currentUser._id.toString() ||
                          memo.toName.toString() === currentUser._id.toString() ||
                          memo.ccName.toString() === currentUser._id.toString();

            if (!canView) {
                return Response.json({
                    message: "Access denied",
                    success: false,
                    status: 403
                }, { status: 403 });
            }

            return Response.json({
                message: "Memo fetched successfully",
                success: true,
                data: memo,
                status: 200
            });
        }

        // Handle memo list fetch with filtering
        let query: any = {};
        
        // Role-based filtering
        if (currentUser.role !== "admin" && currentUser.role !== "manager") {
            // Regular users can only see memos they created, received, or were CC'd on
            query = {
                $or: [
                    { fromName: currentUser._id },
                    { toName: currentUser._id },
                    { ccName: currentUser._id }
                ]
            };
        }

        // Add search functionality
        if (search_term) {
            const searchRegex = new RegExp(search_term, 'i');
            query = {
                ...query,
                $or: [
                    ...(query.$or || []),
                    { refNumber: searchRegex },
                    { subject: searchRegex },
                    { memoType: searchRegex },
                    { remark: searchRegex }
                ]
            };
        }

        const skip = (page - 1) * limit;
        
        const memos = await Memo.find(query)
            .populate("fromDepartment", "name")
            .populate("fromName", "firstName lastName email")
            .populate("toDepartment", "name")
            .populate("toName", "firstName lastName email")
            .populate("ccDepartment", "name")
            .populate("ccName", "firstName lastName email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalMemos = await Memo.countDocuments(query);
        const totalPages = Math.ceil(totalMemos / limit);

        return Response.json({
            message: "Memos fetched successfully",
            success: true,
            data: memos,
            pagination: {
                currentPage: page,
                totalPages,
                totalMemos,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            status: 200
        });

    } catch (error: any) {
        console.error("Error in memo loader:", error);
        return Response.json({
            message: error.message || "Internal server error",
            success: false,
            status: 500
        }, { status: 500 });
    }
};

// Handle CREATE, UPDATE, DELETE operations
export const action: ActionFunction = async ({ request }) => {
    
    try {
        const session = await getSession(request.headers.get("Cookie"));
        const email = session.get("email");
        
        if (!email) {
            return Response.json({
                message: "Unauthorized - Please login",
                success: false,
                status: 401
            }, { status: 401 });
        }

        // Get current user
        const currentUser = await Registration.findOne({ email }).populate('department');
        if (!currentUser) {
            return Response.json({
                message: "User not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        const formData = await request.formData();
        const operation = formData.get("operation") as string;

        switch (operation) {
            case "create":
                return await createMemo(formData, currentUser);
            
            case "update":
                return await updateMemo(formData, currentUser);
            
            case "delete":
                return await deleteMemo(formData, currentUser);
            
            default:
                return Response.json({
                    message: "Invalid operation",
                    success: false,
                    status: 400
                }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Error in memo action:", error);
        return Response.json({
            message: error.message || "Internal server error",
            success: false,
            status: 500
        }, { status: 500 });
    }
};

// Create memo function
async function createMemo(formData: FormData, currentUser: any) {
    try {
        const refNumber = formData.get("refNumber") as string;
        const fromDepartment = formData.get("fromDepartment") as string;
        const fromName = formData.get("fromName") as string;
        const memoDate = formData.get("memoDate") as string;
        const toDepartment = formData.get("toDepartment") as string;
        const toName = formData.get("toName") as string;
        const subject = formData.get("subject") as string;
        const memoType = formData.get("memoType") as string;
        const dueDate = formData.get("dueDate") as string;
        const frequency = formData.get("frequency") as string;
        const remark = formData.get("remark") as string;
        const ccDepartment = formData.get("ccDepartment") as string;
        const ccName = formData.get("ccName") as string;
        const emailCheck = formData.get("emailCheck") === "true";
        const base64Image = formData.get("base64Image") as string;
        const status = (formData.get("status") as string) || "draft";

        // Validate required fields
        if (!refNumber || !fromDepartment || !fromName || !memoDate || !toDepartment || !toName || !subject || !memoType) {
            return Response.json({
                message: "Missing required fields",
                success: false,
                status: 400
            }, { status: 400 });
        }

        // Check if ref number already exists
        const existingMemo = await Memo.findOne({ refNumber });
        if (existingMemo) {
            return Response.json({
                message: "Reference number already exists",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const memo = new Memo({
            refNumber,
            fromDepartment,
            fromName,
            memoDate,
            toDepartment,
            toName,
            subject,
            memoType,
            dueDate,
            frequency,
            remark,
            ccDepartment,
            ccName,
            emailCheck: status === 'published', // Only enable email for published memos
            image: base64Image,
            status: status,
        });

        const savedMemo = await memo.save();

        // Only send emails if memo is published
        if (savedMemo && status === 'published') {
            // Send emails
            try {
                // Get recipient details for emails
                const toUser = await Registration.findById(toName).populate('department');
                const ccUser = await Registration.findById(ccName).populate('department');
                const fromUser = await Registration.findById(fromName).populate('department');

                if (toUser && ccUser && fromUser) {
                    const memoData = {
                        refNumber,
                        fromName: `${fromUser.firstName} ${fromUser.lastName}`,
                        fromDepartment: (fromUser.department as any)?.name || '',
                        subject,
                        memoDate,
                        dueDate,
                        memoType,
                        frequency,
                        remark
                    };

                    // Prepare attachment if image exists
                    let attachments: Array<{
                        filename: string;
                        content: string;
                        encoding: string;
                    }> = [];

                    if (base64Image && base64Image.trim() !== '') {
                        const base64Data = base64Image.includes(',') 
                            ? base64Image.split(',')[1] 
                            : base64Image;
                        
                        let fileExtension = 'jpg';
                        if (base64Image.includes('data:image/png')) {
                            fileExtension = 'png';
                        } else if (base64Image.includes('data:image/jpeg') || base64Image.includes('data:image/jpg')) {
                            fileExtension = 'jpg';
                        } else if (base64Image.includes('data:image/gif')) {
                            fileExtension = 'gif';
                        } else if (base64Image.includes('data:application/pdf')) {
                            fileExtension = 'pdf';
                        }

                        attachments.push({
                            filename: `memo_attachment_${refNumber}.${fileExtension}`,
                            content: base64Data,
                            encoding: 'base64'
                        });
                    }

                    // Send email to the "To" recipient
                    const toEmailTemplate = createMemoEmailTemplate(
                        memoData,
                        `${toUser.firstName} ${toUser.lastName}`,
                        'TO',
                        attachments.length > 0
                    );

                    await sendEmail({
                        from: currentUser.email,
                        to: toUser.email,
                        subject: `New Memo: ${subject} (Ref: ${refNumber})`,
                        html: toEmailTemplate,
                        attachments: attachments.length > 0 ? attachments : undefined
                    });

                    // Send email to the "CC" recipient
                    const ccEmailTemplate = createMemoEmailTemplate(
                        memoData,
                        `${ccUser.firstName} ${ccUser.lastName}`,
                        'CC',
                        attachments.length > 0
                    );

                    await sendEmail({
                        from: currentUser.email,
                        to: ccUser.email,
                        subject: `CC: New Memo - ${subject} (Ref: ${refNumber})`,
                        html: ccEmailTemplate,
                        attachments: attachments.length > 0 ? attachments : undefined
                    });

                    console.log('Emails sent successfully for memo:', refNumber);
                }
            } catch (emailError) {
                console.error('Error sending emails:', emailError);
                // Don't fail the memo creation if email fails
            }
        }

        return Response.json({
            message: "Memo created successfully",
            success: true,
            data: savedMemo,
            status: 201
        });

    } catch (error: any) {
        return Response.json({
            message: error.message,
            success: false,
            status: 500
        }, { status: 500 });
    }
}

// Update memo function
async function updateMemo(formData: FormData, currentUser: any) {
    try {
        const id = formData.get("id") as string;
        
        if (!id) {
            return Response.json({
                message: "Memo ID is required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const existingMemo = await Memo.findById(id);
        if (!existingMemo) {
            return Response.json({
                message: "Memo not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        // Check permissions
        const canUpdate = currentUser.role === "admin" || 
                         currentUser.role === "manager" || 
                         existingMemo.fromName.toString() === currentUser._id.toString();

        if (!canUpdate) {
            return Response.json({
                message: "You don't have permission to update this memo",
                success: false,
                status: 403
            }, { status: 403 });
        }

        const updateData: any = {};
        const newStatus = formData.get("status") as string;
        const wasPublishing = existingMemo.status === 'draft' && newStatus === 'published';
        
        // Update fields if provided
        const fields = ["refNumber", "fromDepartment", "fromName", "memoDate", "toDepartment", 
                       "toName", "subject", "memoType", "dueDate", "frequency", "remark", 
                       "ccDepartment", "ccName", "base64Image", "status"];
        
        fields.forEach(field => {
            const value = formData.get(field);
            if (value !== null && value !== undefined && value !== "") {
                if (field === "base64Image") {
                    updateData.image = value;
                } else {
                    updateData[field] = value;
                }
            }
        });

        // Update emailCheck based on status
        if (newStatus) {
            updateData.emailCheck = newStatus === 'published';
        }

        updateData.updatedAt = new Date();

        const updatedMemo = await Memo.findByIdAndUpdate(id, updateData, { new: true })
            .populate("fromDepartment", "name")
            .populate("fromName", "firstName lastName email")
            .populate("toDepartment", "name")
            .populate("toName", "firstName lastName email")
            .populate("ccDepartment", "name")
            .populate("ccName", "firstName lastName email");

        // Send emails if memo is being published for the first time
        if (updatedMemo && wasPublishing) {
            try {
                // Get recipient details for emails
                const toUser = await Registration.findById((updatedMemo.toName as any)._id);
                const ccUser = updatedMemo.ccName ? await Registration.findById((updatedMemo.ccName as any)._id) : null;
                const fromUser = await Registration.findById((updatedMemo.fromName as any)._id);

                if (toUser && fromUser) {
                    const memoData = {
                        refNumber: updatedMemo.refNumber,
                        fromName: `${fromUser.firstName} ${fromUser.lastName}`,
                        fromDepartment: (updatedMemo.fromDepartment as any)?.name || '',
                        subject: updatedMemo.subject,
                        memoDate: updatedMemo.memoDate,
                        dueDate: updatedMemo.dueDate,
                        memoType: updatedMemo.memoType,
                        frequency: updatedMemo.frequency,
                        remark: updatedMemo.remark
                    };

                    // Prepare attachment if image exists
                    let attachments: Array<{
                        filename: string;
                        content: string;
                        encoding: string;
                    }> = [];

                    if (updatedMemo.image && updatedMemo.image.trim() !== '') {
                        const base64Data = updatedMemo.image.includes(',') 
                            ? updatedMemo.image.split(',')[1] 
                            : updatedMemo.image;
                        
                        let fileExtension = 'jpg';
                        if (updatedMemo.image.includes('data:image/png')) {
                            fileExtension = 'png';
                        } else if (updatedMemo.image.includes('data:image/jpeg') || updatedMemo.image.includes('data:image/jpg')) {
                            fileExtension = 'jpg';
                        } else if (updatedMemo.image.includes('data:image/gif')) {
                            fileExtension = 'gif';
                        } else if (updatedMemo.image.includes('data:application/pdf')) {
                            fileExtension = 'pdf';
                        }

                        attachments.push({
                            filename: `memo_attachment_${updatedMemo.refNumber}.${fileExtension}`,
                            content: base64Data,
                            encoding: 'base64'
                        });
                    }

                    // Send email to the "To" recipient
                    const toEmailTemplate = createMemoEmailTemplate(
                        memoData,
                        `${toUser.firstName} ${toUser.lastName}`,
                        'TO',
                        attachments.length > 0
                    );

                    await sendEmail({
                        from: currentUser.email,
                        to: toUser.email,
                        subject: `New Memo: ${updatedMemo.subject} (Ref: ${updatedMemo.refNumber})`,
                        html: toEmailTemplate,
                        attachments: attachments.length > 0 ? attachments : undefined
                    });

                    // Send email to the "CC" recipient if exists
                    if (ccUser) {
                        const ccEmailTemplate = createMemoEmailTemplate(
                            memoData,
                            `${ccUser.firstName} ${ccUser.lastName}`,
                            'CC',
                            attachments.length > 0
                        );

                        await sendEmail({
                            from: currentUser.email,
                            to: ccUser.email,
                            subject: `CC: New Memo - ${updatedMemo.subject} (Ref: ${updatedMemo.refNumber})`,
                            html: ccEmailTemplate,
                            attachments: attachments.length > 0 ? attachments : undefined
                        });
                    }

                    console.log('Emails sent successfully for published memo:', updatedMemo.refNumber);
                }
            } catch (emailError) {
                console.error('Error sending emails:', emailError);
                // Don't fail the memo update if email fails
            }
        }

        return Response.json({
            message: wasPublishing ? "Memo published successfully and emails sent" : "Memo updated successfully",
            success: true,
            data: updatedMemo,
            status: 200
        });

    } catch (error: any) {
        return Response.json({
            message: error.message,
            success: false,
            status: 500
        }, { status: 500 });
    }
}

// Delete memo function
async function deleteMemo(formData: FormData, currentUser: any) {
    try {
        const id = formData.get("id") as string;
        
        if (!id) {
            return Response.json({
                message: "Memo ID is required",
                success: false,
                status: 400
            }, { status: 400 });
        }

        const existingMemo = await Memo.findById(id);
        if (!existingMemo) {
            return Response.json({
                message: "Memo not found",
                success: false,
                status: 404
            }, { status: 404 });
        }

        // Check permissions - only admin, manager, or memo creator can delete
        const canDelete = currentUser.role === "admin" || 
                         currentUser.role === "manager" || 
                         existingMemo.fromName.toString() === currentUser._id.toString();

        if (!canDelete) {
            return Response.json({
                message: "You don't have permission to delete this memo",
                success: false,
                status: 403
            }, { status: 403 });
        }

        await Memo.findByIdAndDelete(id);

        return Response.json({
            message: "Memo deleted successfully",
            success: true,
            status: 200
        });

    } catch (error: any) {
        return Response.json({
            message: error.message,
            success: false,
            status: 500
        }, { status: 500 });
    }
}
