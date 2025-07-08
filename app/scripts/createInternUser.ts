import Registration from "~/model/registration";
import bcrypt from "bcryptjs";
import { sendEmail, createNewUserEmailTemplate } from "~/components/email";

async function createInternUser() {
  try {
    // Check if intern user already exists
    const existingIntern = await Registration.findOne({ email: "intern@addentech.com" });
    if (existingIntern) {
      console.log("Intern user already exists");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("intern123", 10);

    // Create intern user
    const internUser = new Registration({
      firstName: "Intern",
      lastName: "User",
      email: "intern@addentech.com",
      password: hashedPassword,
      phone: "1234567890",
      role: "intern",
      position: "Intern",
      department: "65f1a2b3c4d5e6f7g8h9i0j1", // You'll need to replace this with an actual department ID
      workMode: "in-house",
      image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkZGRkZGIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iI0NDQ0NDQyIvPgo8cmVjdCB4PSI2MCIgeT0iMTIwIiB3aWR0aD0iODAiIGhlaWdodD0iNjAiIGZpbGw9IiNDQ0NDQ0MiLz4KPC9zdmc+",
      bio: "Intern user for testing purposes",
      status: "active"
    });

    await internUser.save();
    
    // Send welcome email to the intern user
    try {
      const emailTemplate = createNewUserEmailTemplate({
        firstName: internUser.firstName,
        lastName: internUser.lastName,
        email: internUser.email,
        position: internUser.position,
        role: internUser.role,
        password: "intern123"
      });

      await sendEmail({
        from: `Addentech <${process.env.SMTP_USER || 'noreply@addentech.com'}>`,
        to: internUser.email,
        subject: 'Welcome to Addentech - Your Intern Account Has Been Created',
        html: emailTemplate
      });

      console.log("📧 Welcome email sent to intern user");
    } catch (emailError) {
      console.error("❌ Failed to send email to intern user:", emailError);
      // Don't fail the intern creation if email fails
    }
    
    console.log("Intern user created successfully");
    console.log("Email: intern@addentech.com");
    console.log("Password: intern123");
  } catch (error) {
    console.error("Error creating intern user:", error);
  }
}

// Run the script
createInternUser(); 