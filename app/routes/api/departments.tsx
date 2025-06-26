import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import mongoose from "~/mongoose.server";
import Departments from "~/model/department";

// GET - Fetch all departments
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/addentech_v2");
    }
    
    const departments = await Departments.find({}).sort({ createdAt: -1 });
    
    return Response.json({
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
    return Response.json(
      { success: false, error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

// POST/PUT/DELETE - Handle department operations
export async function action({ request }: ActionFunctionArgs) {
  const method = request.method;
  
  try {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/addentech_v2");
    }
    
    if (method === "POST") {
      // Create new department
      const { name, description } = await request.json();
      
      if (!name || !description) {
        return Response.json(
          { success: false, error: "Name and description are required" },
          { status: 400 }
        );
      }

      // Check if department already exists
      const existingDept = await Departments.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') } 
      });

      if (existingDept) {
        return Response.json(
          { success: false, error: "Department with this name already exists" },
          { status: 409 }
        );
      }

      const newDepartment = new Departments({
        name: name.trim(),
        description: description.trim()
      });

      const savedDepartment = await newDepartment.save();

      return Response.json({
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
        return Response.json(
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
        return Response.json(
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
        return Response.json(
          { success: false, error: "Department not found" },
          { status: 404 }
        );
      }

      return Response.json({
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
        return Response.json(
          { success: false, error: "Department ID is required" },
          { status: 400 }
        );
      }

      const deletedDepartment = await Departments.findByIdAndDelete(_id);

      if (!deletedDepartment) {
        return Response.json(
          { success: false, error: "Department not found" },
          { status: 404 }
        );
      }

      return Response.json({
        success: true,
        message: "Department deleted successfully"
      });

    } else {
      return Response.json(
        { success: false, error: "Method not allowed" },
        { status: 405 }
      );
    }

  } catch (error) {
    console.error(`Error in ${method} department:`, error);
    return Response.json(
      { success: false, error: `Failed to ${method.toLowerCase()} department` },
      { status: 500 }
    );
  }
} 