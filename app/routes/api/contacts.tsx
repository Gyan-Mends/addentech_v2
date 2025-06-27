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

    // Get current user and check permissions
    const Registration = (await import("~/model/registration")).default;
    const currentUser = await Registration.findOne({ email });
    if (!currentUser) {
      return Response.json({
        success: false,
        error: "User not found"
      }, { 
        status: 404,
        headers: corsHeaders
      });
    }

    // Only allow admin and manager roles to access contact messages
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
      return Response.json({
        success: false,
        error: "Insufficient permissions to access contact messages"
      }, { 
        status: 403,
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
      console.log("📋 Received data fields:", Object.keys(data));
      console.log("📋 Data values:", {
        firstName: data.firstName,
        lastName: data.lastName,
        number: data.number,
        company: data.company,
        middleName: data.middleName,
        description: data.description
      });

      // Validate required fields
      const missingFields = [];
      if (!data.firstName) missingFields.push('firstName');
      if (!data.lastName) missingFields.push('lastName');
      if (!data.number) missingFields.push('number');
      if (!data.company) missingFields.push('company');

      if (missingFields.length > 0) {
        console.log("❌ Missing required fields:", missingFields);
        return Response.json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')} are required`,
          missingFields: missingFields
        }, { 
          status: 400,
          headers: corsHeaders
        });
      }

      // Validate phone number format (more flexible validation)
      const phoneRegex = /^[\+]?[0-9][\d]{0,15}$/;
      const cleanNumber = data.number.replace(/\s/g, '');
      console.log("📞 Phone number validation:", {
        original: data.number,
        cleaned: cleanNumber,
        isValid: phoneRegex.test(cleanNumber)
      });
      
      if (!phoneRegex.test(cleanNumber)) {
        return Response.json({
          success: false,
          error: "Invalid phone number format. Please use a valid phone number (e.g., +233593125184, 0593125184, 1234567890)",
          receivedNumber: data.number,
          cleanedNumber: cleanNumber
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

      // Get current user and check permissions
      const Registration = (await import("~/model/registration")).default;
      const currentUser = await Registration.findOne({ email });
      if (!currentUser) {
        return Response.json({
          success: false,
          error: "User not found"
        }, { 
          status: 404,
          headers: corsHeaders
        });
      }

      // Only allow admin and manager roles to delete contact messages
      if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        return Response.json({
          success: false,
          error: "Insufficient permissions to delete contact messages"
        }, { 
          status: 403,
          headers: corsHeaders
        });
      }

      // Allow admins and managers to delete spam/inappropriate messages
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