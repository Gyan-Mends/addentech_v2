import { type ActionFunctionArgs } from "react-router";
import bcrypt from "bcryptjs";
import Registration from "~/model/registration";
import Departments from "~/model/department";
import { sendEmail, createNewUserEmailTemplate } from "~/components/email";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), { 
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Connect to MongoDB

    const body = await request.json();
    const { 
      firstName, 
      middleName, 
      lastName, 
      email, 
      password, 
      phone, 
      role, 
      position, 
      department, 
      workMode, 
      image, 
      bio 
    } = body;

    // Validation
    if (!firstName || !lastName || !email || !password || !phone || !role || !position || !department) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Required fields are missing: firstName, lastName, email, password, phone, role, position, department" 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Please enter a valid email address" 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Password must be at least 8 characters long" 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate role
    const validRoles = ["admin", "staff", "department_head", "manager", "intern"];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Invalid role. Must be one of: admin, staff, department_head, manager, intern" 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate work mode
    const validWorkModes = ["in-house", "remote"];
    if (workMode && !validWorkModes.includes(workMode)) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Invalid work mode. Must be either 'in-house' or 'remote'" 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check if email already exists
    const existingUser = await Registration.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (existingUser) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "A user with this email already exists" 
      }), { 
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify department exists
    const departmentDoc = await Departments.findById(department);
    if (!departmentDoc) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Invalid department ID" 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Hash password with bcrypt
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new Registration({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || "",
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword, // Store hashed password
      phone: phone.trim(),
      role,
      position: position.trim(),
      department,
      workMode: workMode || "in-house",
      image: image || "/api/placeholder/150/150", // Default placeholder image
      bio: bio?.trim() || "",
      status: "active", // Default to active
      employee: true // Default to employee
    });

    // Save user to database (this will trigger the pre-save hook for permissions)
    const savedUser = await newUser.save();

    // Send welcome email to the new user
    try {
      const emailTemplate = createNewUserEmailTemplate({
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        email: savedUser.email,
        position: savedUser.position,
        role: savedUser.role,
        password: password // Use the original password before hashing
      });

      await sendEmail({
        from: `Addentech <${process.env.SMTP_USER || 'noreply@addentech.com'}>`,
        to: savedUser.email,
        subject: 'Welcome to Addentech - Your Account Has Been Created',
        html: emailTemplate
      });

      console.log(`Welcome email sent successfully to ${savedUser.email}`);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the user registration if email fails
    }

    // Prepare user data for response (excluding password)
    const userData = {
      _id: savedUser._id,
      firstName: savedUser.firstName,
      middleName: savedUser.middleName,
      lastName: savedUser.lastName,
      email: savedUser.email,
      role: savedUser.role,
      position: savedUser.position,
      department: savedUser.department,
      workMode: savedUser.workMode,
      permissions: Object.fromEntries(savedUser.permissions || new Map()),
      status: savedUser.status,
      image: savedUser.image,
      bio: savedUser.bio
    };

    return new Response(JSON.stringify({ 
      success: true, 
      message: "User registered successfully",
      user: userData
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Registration error:", error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Validation error",
        errors: validationErrors
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    if (error.code === 11000) {
      // Duplicate key error
      return new Response(JSON.stringify({ 
        success: false, 
        message: "A user with this email already exists" 
      }), { 
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      message: "An internal server error occurred. Please try again later." 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Handle preflight requests for CORS
export async function options() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
} 