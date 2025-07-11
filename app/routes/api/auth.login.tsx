import { type ActionFunctionArgs } from "react-router";
import bcrypt from "bcryptjs";
import { getSession, setSession } from "~/session";
import Registration from "~/model/registration";
import mongoose from "~/mongoose.server";
import { corsHeaders } from "./cors.config";
import { logActivity, getClientIP, getUserAgent } from "~/utils/activityLogger";

export async function action({ request }: ActionFunctionArgs) {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), { 
      status: 405,
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      }
    });
  }

  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error("Database connection not ready");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Service temporarily unavailable" 
      }), {
        status: 503,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": "5"
        }
      });
    }

    const body = await request.json();
    const { email, password, rememberMe } = body;

    // Validation
    if (!email || !password) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Email and password are required" 
      }), { 
        status: 400,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
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
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
      });
    }

    // Find user by email (optimized - no population needed)
    const user = await Registration.findOne({ 
      email: email.toLowerCase().trim(),
      status: { $ne: "suspended" } // Don't allow suspended users to login
    }).lean();

    if (!user) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Invalid email or password" 
      }), { 
        status: 401,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
      });
    }

    // Check if account is active
    if (user.status !== "active") {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Your account is not active. Please contact an administrator." 
      }), { 
        status: 401,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
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
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
      });
    }

    // Get session first (non-blocking)
    const session = await getSession(request.headers.get("Cookie"));
    const sessionCookie = await setSession(session, email, rememberMe || false);

    // Prepare user data (excluding password)
    let permissions = {};
    if (user.permissions) {
      if (user.permissions instanceof Map) {
        permissions = Object.fromEntries(user.permissions);
      } else if (typeof user.permissions === 'object') {
        permissions = user.permissions;
      }
    }

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
      permissions: permissions,
      status: user.status,
      image: user.image,
      bio: user.bio
    };

    // Async operations (don't block response)
    Promise.all([
      Registration.findByIdAndUpdate(user._id, { lastLogin: new Date() }),
      logActivity({
        action: 'login',
        description: `User ${user.firstName} ${user.lastName} logged in successfully`,
        userId: user._id.toString(),
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
        details: {
          email: user.email,
          rememberMe: rememberMe || false
        }
      })
    ]).catch(error => {
      // Log error but don't block response
      console.error('Error updating login data:', error);
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Login successful",
      user: userData
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
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
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
      });
    }

    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Service temporarily unavailable" 
      }), {
        status: 503,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": "5"
        }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      message: "An internal server error occurred. Please try again later." 
    }), { 
      status: 500,
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      }
    });
  }
}

// Handle preflight requests for CORS
export async function options() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
} 