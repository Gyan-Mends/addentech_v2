import { type ActionFunctionArgs } from "react-router";
import bcrypt from "bcryptjs";
import { getSession, setSession } from "~/session";
import Registration from "~/model/registration";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), { 
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {

    const body = await request.json();
    const { email, password, rememberMe } = body;

    // Validation
    if (!email || !password) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Email and password are required" 
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

    // Find user by email
    const user = await Registration.findOne({ 
      email: email.toLowerCase().trim(),
      status: { $ne: "suspended" } // Don't allow suspended users to login
    }).populate('department');

    if (!user) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Invalid email or password" 
      }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check if account is active
    if (user.status !== "active") {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Your account is not active. Please contact an administrator." 
      }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Invalid email or password" 
      }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Update last login
    await Registration.findByIdAndUpdate(user._id, {
      lastLogin: new Date()
    });

    // Get session
    const session = await getSession(request.headers.get("Cookie"));

    // Set session with appropriate duration
    const sessionCookie = await setSession(session, email, rememberMe || false);

    // Prepare user data (excluding password)
    const userData = {
      _id: user._id,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      position: user.position,
      department: user.department,
      workMode: user.workMode,
      permissions: Object.fromEntries(user.permissions || new Map()),
      status: user.status,
      image: user.image,
      bio: user.bio
    };

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Login successful",
      user: userData
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": sessionCookie
      }
    });

  } catch (error: any) {
    console.error("Login error:", error);
    
    if (error.name === 'ValidationError') {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Invalid input data" 
      }), { 
        status: 400,
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