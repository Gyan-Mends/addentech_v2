import { type ActionFunctionArgs } from "react-router";
import { getSession, refreshSession } from "~/session";
import Registration from "~/model/registration";
import mongoose from "~/mongoose.server";
import { corsHeaders } from "./cors.config";

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

    // Get session
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (!email) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Not authenticated" 
      }), {
        status: 401,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
      });
    }

    // Verify user still exists and is active
    const user = await Registration.findOne({ 
      email: email.toLowerCase().trim(),
      status: "active"
    });

    if (!user) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "User not found or inactive" 
      }), {
        status: 401,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
      });
    }

    // Refresh session
    const sessionCookie = await refreshSession(session);

    if (!sessionCookie) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Failed to refresh session" 
      }), {
        status: 500,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Session refreshed successfully" 
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Set-Cookie": sessionCookie
      }
    });

  } catch (error: any) {
    console.error("Session refresh error:", error);
    
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
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
} 