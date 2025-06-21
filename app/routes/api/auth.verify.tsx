import { type LoaderFunctionArgs } from "react-router";
import { getSession } from "~/session";
import Registration from "~/model/registration";
import mongoose from "~/mongoose.server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Connect to MongoDB
    await mongoose.connection.asPromise();

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

    // Find user by email
    const user = await Registration.findOne({ 
      email: email.toLowerCase().trim(),
      status: "active"
    }).populate('department');

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
      user: userData 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Auth verification error:", error);
    
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
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
} 