import nodemailer from 'nodemailer';

interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
    encoding: string;
  }>;
}

export const sendEmail = async (options: EmailOptions) => {
  try {
    // Create transporter with SMTP configuration
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '465') === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error: any) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

export const createMemoEmailTemplate = (
  memoData: {
    refNumber: string;
    fromName: string;
    fromDepartment: string;
    subject: string;
    memoDate: string;
    dueDate: string;
    memoType: string;
    frequency: string;
    remark: string;
  },
  recipientName: string,
  recipientType: 'TO' | 'CC',
  hasAttachment: boolean = false
) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Memo Notification</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .memo-details { background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #495057; }
            .value { margin-top: 5px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .badge-primary { background-color: #007bff; color: white; }
            .badge-warning { background-color: #ffc107; color: #212529; }
            .badge-success { background-color: #28a745; color: white; }
            .attachment-notice { background-color: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; padding: 10px; margin: 15px 0; color: #1976d2; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0; color: #495057;">📝 New Memo Notification</h2>
                <p style="margin: 10px 0 0 0; color: #6c757d;">
                    You have been ${recipientType === 'TO' ? 'assigned' : 'copied'} on a new memorandum
                </p>
            </div>
            
            <div class="memo-details">
                <div class="field">
                    <div class="label">Reference Number:</div>
                    <div class="value"><strong>${memoData.refNumber}</strong></div>
                </div>
                
                <div class="field">
                    <div class="label">From:</div>
                    <div class="value">${memoData.fromName} (${memoData.fromDepartment})</div>
                </div>
                
                <div class="field">
                    <div class="label">To:</div>
                    <div class="value">${recipientName}</div>
                </div>
                
                <div class="field">
                    <div class="label">Subject:</div>
                    <div class="value">${memoData.subject}</div>
                </div>
                
                <div class="field">
                    <div class="label">Memo Date:</div>
                    <div class="value">${new Date(memoData.memoDate).toLocaleDateString()}</div>
                </div>
                
                <div class="field">
                    <div class="label">Due Date:</div>
                    <div class="value">${new Date(memoData.dueDate).toLocaleDateString()}</div>
                </div>
                
                <div class="field">
                    <div class="label">Type:</div>
                    <div class="value">
                        <span class="badge ${memoData.memoType === 'Open' ? 'badge-primary' : memoData.memoType === 'Processing' ? 'badge-warning' : 'badge-success'}">
                            ${memoData.memoType}
                        </span>
                    </div>
                </div>
                
                <div class="field">
                    <div class="label">Follow-up Frequency:</div>
                    <div class="value">${memoData.frequency}</div>
                </div>
                
                ${memoData.remark ? `
                <div class="field">
                    <div class="label">Remarks:</div>
                    <div class="value">${memoData.remark}</div>
                </div>
                ` : ''}

                ${hasAttachment ? `
                <div class="attachment-notice">
                    <strong>📎 Attachment Included</strong><br>
                    This memo includes a file attachment. Please check your email attachments to view the document.
                </div>
                ` : ''}
            </div>
            
            <div class="footer">
                <p>This is an automated notification from the Memorandum System.</p>
                <p><small>Please log in to your dashboard to view the complete memo and take any necessary actions.</small></p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export const createNewUserEmailTemplate = (
  userData: {
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    role: string;
    password: string;
  }
) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Addentech - Your Account Has Been Created</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .welcome-section { background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .access-section { background-color: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .user-details { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #495057; }
            .value { margin-top: 5px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
            .btn:hover { background-color: #0056b3; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .badge-primary { background-color: #007bff; color: white; }
            .badge-success { background-color: #28a745; color: white; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0; color: #495057;">🎉 Welcome to Addentech!</h2>
                <p style="margin: 10px 0 0 0; color: #6c757d;">
                    Your account has been successfully created and you can now access the system.
                </p>
            </div>
            
            <div class="welcome-section">
                <h3 style="margin-top: 0; color: #495057;">Hello ${userData.firstName} ${userData.lastName}!</h3>
                <p>Welcome to the Addentech team! Your account has been created successfully and you now have access to our internal management system.</p>
                <p>You can use this system to manage tasks, track attendance, submit reports, and collaborate with your team members.</p>
            </div>
            
            <div class="access-section">
                <h3 style="margin-top: 0; color: #1976d2;">🔗 Access Your Account</h3>
                <p>Click the button below to access your account:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="https://addentech-v2.vercel.app/" class="btn" style="color: white;">
                        Access Addentech System
                    </a>
                </div>
                <p style="margin-top: 15px; font-size: 14px; color: #666;">
                    <strong>Direct Link:</strong> <a href="https://addentech-v2.vercel.app/" style="color: #007bff;">https://addentech-v2.vercel.app/</a>
                </p>
            </div>
            
            <div class="user-details">
                <h3 style="margin-top: 0; color: #495057;">📋 Your Account Details</h3>
                <div class="field">
                    <div class="label">Full Name:</div>
                    <div class="value">${userData.firstName} ${userData.lastName}</div>
                </div>
                
                <div class="field">
                    <div class="label">Email Address:</div>
                    <div class="value">${userData.email}</div>
                </div>
                
                <div class="field">
                    <div class="label">Password:</div>
                    <div class="value" style="font-family: monospace; background-color: #f8f9fa; padding: 8px; border-radius: 4px; border: 1px solid #dee2e6;">${userData.password}</div>
                </div>
                
                <div class="field">
                    <div class="label">Position:</div>
                    <div class="value">${userData.position}</div>
                </div>
                
                <div class="field">
                    <div class="label">Role:</div>
                    <div class="value">
                        <span class="badge ${userData.role === 'admin' ? 'badge-primary' : 'badge-success'}">
                            ${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>Next Steps:</strong></p>
                <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                    <li>Visit the system using the link above</li>
                    <li>Log in with your email address and the password provided by your administrator</li>
                    <li>Complete your profile and set up your preferences</li>
                    <li>Familiarize yourself with the available features</li>
                </ul>
                <p style="margin-top: 20px;"><small>If you have any questions or need assistance, please contact your system administrator.</small></p>
                <p><small>This is an automated notification from the Addentech Management System.</small></p>
            </div>
        </div>
    </body>
    </html>
  `;
}; 