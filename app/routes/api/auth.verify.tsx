import { type LoaderFunctionArgs } from "react-router";
import { getSession } from "~/session";
import Registration from "~/model/registration";
import mongoose from "~/mongoose.server";

export async function loader({ request }: LoaderFunctionArgs) {
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
          "Content-Type": "application/json",
          "Retry-After": "5"
        }
      });
    }

    // Get session
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (!email) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Not authenticated" 
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Find user by email (optimized - no population needed)
    const user = await Registration.findOne({ 
      email: email.toLowerCase().trim(),
      status: "active"
    }).lean();

    if (!user) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "User not found or inactive" 
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

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

    return new Response(JSON.stringify({ 
      success: true, 
      user: userData 
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });

  } catch (error: any) {
    console.error("Auth verification error:", error);
    
    // Handle specific MongoDB errors
    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Service temporarily unavailable" 
      }), {
        status: 503,
        headers: { 
          "Content-Type": "application/json",
          "Retry-After": "5"
        }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      message: "An internal server error occurred" 
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
      "Access-Control-Allow-Origin": process.env.NODE_ENV === 'development' ? "*" : "https://your-production-domain.com",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true"
    },
  });
} 