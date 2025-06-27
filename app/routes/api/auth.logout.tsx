import { type ActionFunctionArgs } from "react-router";
import { getSession, destroySession } from "~/session";
import Registration from "~/model/registration";
import { logActivity, getClientIP, getUserAgent } from "~/utils/activityLogger";

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Get session
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");
    
    // Log logout activity if user is authenticated
    if (email) {
      try {
        const user = await Registration.findOne({ 
          email: email.toLowerCase().trim(),
          status: "active"
        });

        if (user) {
          await logActivity({
            action: 'logout',
            description: `User ${user.firstName} ${user.lastName} logged out`,
            userId: user._id.toString(),
            ipAddress: getClientIP(request),
            userAgent: getUserAgent(request)
          });
        }
      } catch (logError) {
        console.error("Failed to log logout activity:", logError);
        // Continue with logout even if logging fails
      }
    }
    
    // Destroy session
    const sessionCookie = await destroySession(session);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Logged out successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": sessionCookie
      }
    });

  } catch (error: any) {
    console.error("Logout error:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      message: "An error occurred during logout" 
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