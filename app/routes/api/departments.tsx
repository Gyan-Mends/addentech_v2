import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import Departments from "~/model/department";
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

// GET - Fetch all departments
export async function loader({ request }: LoaderFunctionArgs) {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Use lean() for better performance and only select necessary fields
    const departments = await Departments.find({})
      .select('name description admin createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();
    
    return json({
      success: true,
      departments: departments.map(dept => ({
        _id: dept._id.toString(),
        name: dept.name,
        description: dept.description,
        admin: dept.admin || null,
        isActive: true, // Default since not in schema
        employeeCount: 0, // Default since not in schema
        createdAt: (dept as any).createdAt,
        updatedAt: (dept as any).updatedAt
      }))
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return json(
      { success: false, error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

// POST/PUT/DELETE - Handle department operations
export async function action({ request }: ActionFunctionArgs) {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  const method = request.method;
  
  try {
    if (method === "POST") {
      // Create new department
      const { name, description } = await request.json();
      
      if (!name || !description) {
        return json(
          { success: false, error: "Name and description are required" },
          { status: 400 }
        );
      }

      // Check if department already exists
      const existingDept = await Departments.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') } 
      });

      if (existingDept) {
        return json(
          { success: false, error: "Department with this name already exists" },
          { status: 409 }
        );
      }

      const newDepartment = new Departments({
        name: name.trim(),
        description: description.trim()
      });

      const savedDepartment = await newDepartment.save();

      return json({
        success: true,
        department: {
          _id: savedDepartment._id.toString(),
          name: savedDepartment.name,
          description: savedDepartment.description,
          admin: null,
          isActive: true,
          employeeCount: 0,
          createdAt: (savedDepartment as any).createdAt,
          updatedAt: (savedDepartment as any).updatedAt
        }
      });

    } else if (method === "PUT") {
      // Update department
      const { _id, name, description } = await request.json();
      
      if (!_id || !name || !description) {
        return json(
          { success: false, error: "ID, name and description are required" },
          { status: 400 }
        );
      }

      // Check if another department has the same name
      const existingDept = await Departments.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: _id }
      });

      if (existingDept) {
        return json(
          { success: false, error: "Department with this name already exists" },
          { status: 409 }
        );
      }

      const updatedDepartment = await Departments.findByIdAndUpdate(
        _id,
        { 
          name: name.trim(), 
          description: description.trim() 
        },
        { new: true }
      );

      if (!updatedDepartment) {
        return json(
          { success: false, error: "Department not found" },
          { status: 404 }
        );
      }

      return json({
        success: true,
        department: {
          _id: updatedDepartment._id.toString(),
          name: updatedDepartment.name,
          description: updatedDepartment.description,
          admin: null,
          isActive: true,
          employeeCount: 0,
          createdAt: (updatedDepartment as any).createdAt,
          updatedAt: (updatedDepartment as any).updatedAt
        }
      });

    } else if (method === "DELETE") {
      // Delete department
      const { _id } = await request.json();
      
      if (!_id) {
        return json(
          { success: false, error: "Department ID is required" },
          { status: 400 }
        );
      }

      const deletedDepartment = await Departments.findByIdAndDelete(_id);

      if (!deletedDepartment) {
        return json(
          { success: false, error: "Department not found" },
          { status: 404 }
        );
      }

      return json({
        success: true,
        message: "Department deleted successfully"
      });

    } else {
      return json(
        { success: false, error: "Method not allowed" },
        { status: 405 }
      );
    }

  } catch (error) {
    console.error(`Error in ${method} department:`, error);
    return json(
      { success: false, error: `Failed to ${method.toLowerCase()} department` },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function options() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
} 