import type { ActionFunctionArgs } from "react-router";
import Contact from "~/model/contact";
import { getSession } from "~/session";
import { corsHeaders } from "./cors.config";

export async function loader({ request }: { request: Request }) {
  // Handle OPTIONS preflight request
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Check authentication
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (!email) {
      return Response.json({
        success: false,
        error: "Not authenticated"
      }, { 
        status: 401,
        headers: corsHeaders
      });
    }

    console.log("📧 Fetching contact messages...");
    
    const contacts = await Contact.find({})
      .sort({ createdAt: -1 });

    const formattedContacts = contacts.map(contact => ({
      _id: contact._id.toString(),
      firstName: contact.firstName,
      middleName: contact.middleName || '',
      lastName: contact.lastName,
      number: contact.number,
      company: contact.company,
      description: contact.description || '',
      createdAt: (contact as any).createdAt,
      updatedAt: (contact as any).updatedAt
    }));

    console.log(`✅ Found ${formattedContacts.length} contact messages`);
    
    return Response.json({
      success: true,
      contacts: formattedContacts
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("❌ Error fetching contact messages:", error);
    return Response.json({
      success: false,
      error: "Failed to fetch contact messages"
    }, { 
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const method = request.method;
  
  // Handle OPTIONS preflight request
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  
  try {
    if (method === "POST") {
      // Create new contact message (public endpoint - no authentication required)
      const data = await request.json();
      console.log("📝 Creating new contact message:", data);

      // Validate required fields
      if (!data.firstName || !data.lastName || !data.number || !data.company) {
        return Response.json({
          success: false,
          error: "Missing required fields: firstName, lastName, number, and company are required"
        }, { 
          status: 400,
          headers: corsHeaders
        });
      }

      // Validate phone number format (basic validation)
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(data.number.replace(/\s/g, ''))) {
        return Response.json({
          success: false,
          error: "Invalid phone number format"
        }, { 
          status: 400,
          headers: corsHeaders
        });
      }

      // Create new contact
      const newContact = new Contact({
        firstName: data.firstName.trim(),
        middleName: data.middleName?.trim() || '',
        lastName: data.lastName.trim(),
        number: data.number.trim(),
        company: data.company.trim(),
        description: data.description?.trim() || ''
      });

      await newContact.save();

      console.log("✅ Contact message created successfully");
      
      return Response.json({
        success: true,
        message: "Contact message submitted successfully",
        contact: {
          _id: newContact._id.toString(),
          firstName: newContact.firstName,
          middleName: newContact.middleName,
          lastName: newContact.lastName,
          number: newContact.number,
          company: newContact.company,
          description: newContact.description,
          createdAt: (newContact as any).createdAt
        }
      }, { 
        status: 201,
        headers: corsHeaders
      });

    } else if (method === "DELETE") {
      // Check authentication for admin actions
      const session = await getSession(request.headers.get("Cookie"));
      const email = session.get("email");

      if (!email) {
        return Response.json({
          success: false,
          error: "Not authenticated"
        }, { 
          status: 401,
          headers: corsHeaders
        });
      }

      // Allow admins to delete spam/inappropriate messages
      const data = await request.json();
      console.log("🗑️ Deleting contact message:", data.contactId);

      if (!data.contactId) {
        return Response.json({
          success: false,
          error: "Contact ID is required"
        }, { 
          status: 400,
          headers: corsHeaders
        });
      }

      // Check if contact exists
      const existingContact = await Contact.findById(data.contactId);
      if (!existingContact) {
        return Response.json({
          success: false,
          error: "Contact message not found"
        }, { 
          status: 404,
          headers: corsHeaders
        });
      }

      // Delete contact message
      await Contact.findByIdAndDelete(data.contactId);

      console.log("✅ Contact message deleted successfully");
      
      return Response.json({
        success: true,
        message: "Contact message deleted successfully"
      }, { headers: corsHeaders });

    } else {
      return Response.json({
        success: false,
        error: `Method ${method} not allowed`
      }, { 
        status: 405,
        headers: corsHeaders
      });
    }

  } catch (error) {
    console.error(`❌ Error in ${method} /api/contacts:`, error);
    return Response.json({
      success: false,
      error: "Internal server error"
    }, { 
      status: 500,
      headers: corsHeaders
    });
  }
} 