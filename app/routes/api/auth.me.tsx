import type { LoaderFunctionArgs } from "react-router";
import { getSession } from "~/session";
import Registration from "~/model/registration";
import { corsHeaders } from "./cors.config";

// Helper function to create JSON responses
const json = (data: any, init?: ResponseInit) => {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...init?.headers,
    },
  });
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (!email) {
      return json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const user = await Registration.findOne({ 
      email: email.toLowerCase().trim(),
      status: "active"
    }).populate('department', 'name').select('-password');

    if (!user) {
      return json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    return json({
      success: true,
      user: {
        _id: user._id.toString(),
        name: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`,
        firstName: user.firstName,
        middleName: user.middleName || '',
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: (user.department as any)?.name || 'N/A',
        departmentId: (user.department as any)?._id?.toString() || '',
        position: user.position,
        workMode: user.workMode,
        image: user.image,
        status: user.status,
        bio: user.bio || '',
        lastLogin: user.lastLogin,
        createdAt: (user as any).createdAt?.toISOString(),
        updatedAt: (user as any).updatedAt?.toISOString()
      }
    });

  } catch (error) {
    console.error('Error in auth/me API:', error);
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Handle OPTIONS requests for CORS preflight
export async function options() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
} 