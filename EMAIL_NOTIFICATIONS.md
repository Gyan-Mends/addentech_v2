# Email Notifications for New Users

## Overview

The system now automatically sends welcome email notifications to new users when their accounts are created. This includes the site access link and account details.

## Features

- **Automatic Email Sending**: When a new user is created, an email is automatically sent to their email address
- **Professional Email Template**: Beautiful HTML email with company branding and clear instructions
- **Site Access Link**: Includes the direct link to access the system: `https://addentech-v2.vercel.app/`
- **Account Details**: Email includes user's name, position, role, email address, and password
- **Error Handling**: Email failures don't prevent user creation - they're logged but don't break the process

## Email Template

The welcome email includes:

1. **Welcome Header**: Personalized greeting with the user's name
2. **System Introduction**: Brief description of what the system offers
3. **Access Button**: Prominent button linking to the system
4. **Direct Link**: Text link as backup
5. **Account Details**: User's information including login credentials for reference
6. **Next Steps**: Clear instructions on what to do next

## Implementation Locations

Email notifications are sent from the following places:

### 1. User Management API (`app/routes/api/users.tsx`)
- When administrators create new users through the dashboard
- Sends email after successful user creation

### 2. User Registration API (`app/routes/api/auth.register.tsx`)
- When users register themselves
- Sends email after successful registration

### 3. User Creation Scripts
- `app/scripts/createUsers.ts` - Bulk user creation
- `app/scripts/createAdminUser.ts` - Admin user creation
- `app/scripts/createInternUser.ts` - Intern user creation
- `app/scripts/createUsersSimple.ts` - Simple user creation

## Email Configuration

The system uses the following environment variables for email configuration:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Email Template Function

The email template is created using the `createNewUserEmailTemplate` function in `app/components/email.ts`:

```typescript
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
  // Returns HTML email template
}
```

## Error Handling

- Email sending is wrapped in try-catch blocks
- If email fails, it's logged but doesn't prevent user creation
- Console logs show success/failure of email sending
- User creation continues even if email fails

## Testing

To test the email functionality:

1. Ensure SMTP settings are configured in environment variables
2. Create a new user through the dashboard or registration
3. Check the console logs for email sending status
4. Verify the email is received by the new user

## Customization

To customize the email template:

1. Edit the `createNewUserEmailTemplate` function in `app/components/email.ts`
2. Modify the HTML structure and styling
3. Update the site URL if needed
4. Add additional information as required

## Security Notes

- Email addresses are validated before sending
- SMTP credentials should be stored securely in environment variables
- The system uses secure SMTP connections
- Email failures don't expose sensitive information
- **Password Security**: Passwords are included in welcome emails for initial access
- **Password Change**: Users should change their password after first login for security

## Troubleshooting

### Common Issues:

1. **Email not sending**: Check SMTP configuration in environment variables
2. **Email going to spam**: Ensure proper SPF/DKIM records for your domain
3. **SMTP authentication failed**: Verify SMTP credentials and app passwords
4. **Connection timeout**: Check firewall settings and SMTP port

### Debug Steps:

1. Check console logs for email sending status
2. Verify SMTP settings in environment variables
3. Test SMTP connection manually
4. Check email server logs if available 