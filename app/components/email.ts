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