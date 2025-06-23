import type { ActionFunctionArgs } from "react-router";

async function getMongoose() {
  const { default: mongoose } = await import("~/mongoose.server");
  return mongoose;
}

async function getContact() {
  const { default: Contact } = await import("~/model/contact");
  return Contact;
}

async function getSessionHelper() {
  const { getSession } = await import("~/session");
  return getSession;
}

export async function loader({ request }: { request: Request }) {
  try {
    // Dynamic imports
    const mongoose = await getMongoose();
    const Contact = await getContact();
    const getSession = await getSessionHelper();

    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/addentech_v2");
    }

    // Check authentication
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (!email) {
      return Response.json({
        success: false,
        error: "Not authenticated"
      }, { status: 401 });
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
    });
  } catch (error) {
    console.error("❌ Error fetching contact messages:", error);
    return Response.json({
      success: false,
      error: "Failed to fetch contact messages"
    }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const method = request.method;
  
  try {
    // Dynamic imports
    const mongoose = await getMongoose();
    const Contact = await getContact();
    const getSession = await getSessionHelper();

    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/addentech_v2");
    }

    // Check authentication for admin actions
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (!email) {
      return Response.json({
        success: false,
        error: "Not authenticated"
      }, { status: 401 });
    }

    if (method === "DELETE") {
      // Allow admins to delete spam/inappropriate messages
      const data = await request.json();
      console.log("🗑️ Deleting contact message:", data.contactId);

      if (!data.contactId) {
        return Response.json({
          success: false,
          error: "Contact ID is required"
        }, { status: 400 });
      }

      // Check if contact exists
      const existingContact = await Contact.findById(data.contactId);
      if (!existingContact) {
        return Response.json({
          success: false,
          error: "Contact message not found"
        }, { status: 404 });
      }

      // Delete contact message
      await Contact.findByIdAndDelete(data.contactId);

      console.log("✅ Contact message deleted successfully");
      
      return Response.json({
        success: true,
        message: "Contact message deleted successfully"
      });

    } else {
      return Response.json({
        success: false,
        error: `Method ${method} not allowed for monitoring`
      }, { status: 405 });
    }

  } catch (error) {
    console.error(`❌ Error in ${method} /api/contacts:`, error);
    return Response.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
} 