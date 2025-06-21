import { type ActionFunctionArgs } from "react-router";
import { getSession, destroySession } from "~/session";

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Get session
    const session = await getSession(request.headers.get("Cookie"));
    
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