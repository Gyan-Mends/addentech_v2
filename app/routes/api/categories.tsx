import type { ActionFunctionArgs } from "react-router";
import mongoose from "~/mongoose.server";
import Category from "~/model/category";
import Registration from "~/model/registration";
import { getSession } from "~/session";

// Ensure database connection
if (mongoose.connection.readyState !== 1) {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/addentech_v2");
}

export async function loader() {
  try {
    console.log("📂 Fetching categories...");
    
    const categories = await Category.find({})
      .sort({ createdAt: -1 });

    const formattedCategories = categories.map(category => ({
      _id: category._id.toString(),
      name: category.name,
      description: category.description,
      createdAt: (category as any).createdAt,
      updatedAt: (category as any).updatedAt
    }));

    console.log(`✅ Found ${formattedCategories.length} categories`);
    
    return Response.json({
      success: true,
      categories: formattedCategories
    });
  } catch (error) {
    console.error("❌ Error fetching categories:", error);
    return Response.json({
      success: false,
      error: "Failed to fetch categories"
    }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const method = request.method;
  
  try {
    // Get current user from session
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (!email) {
      return Response.json({
        success: false,
        error: "Not authenticated"
      }, { status: 401 });
    }

    // Find current user
    const currentUser = await Registration.findOne({ 
      email: email.toLowerCase().trim(),
      status: "active"
    });

    if (!currentUser) {
      return Response.json({
        success: false,
        error: "User not found or inactive"
      }, { status: 401 });
    }

    if (method === "POST") {
      // Create new category
      const data = await request.json();
      console.log("📝 Creating category with data:", data);

      // Validation
      if (!data.name?.trim()) {
        return Response.json({
          success: false,
          error: "Category name is required"
        }, { status: 400 });
      }

      if (!data.description?.trim()) {
        return Response.json({
          success: false,
          error: "Category description is required"
        }, { status: 400 });
      }

      // Create category with current user as admin
      const newCategory = new Category({
        name: data.name.trim(),
        description: data.description.trim(),
        admin: currentUser._id
      });

      await newCategory.save();

      const formattedCategory = {
        _id: newCategory._id.toString(),
        name: newCategory.name,
        description: newCategory.description,
        createdAt: (newCategory as any).createdAt,
        updatedAt: (newCategory as any).updatedAt
      };

      console.log("✅ Category created successfully:", formattedCategory.name);
      
      return Response.json({
        success: true,
        category: formattedCategory,
        message: "Category created successfully"
      });

    } else if (method === "PUT") {
      // Update category
      const data = await request.json();
      console.log("📝 Updating category with data:", data);

      if (!data.categoryId) {
        return Response.json({
          success: false,
          error: "Category ID is required"
        }, { status: 400 });
      }

      // Validation
      if (!data.name?.trim()) {
        return Response.json({
          success: false,
          error: "Category name is required"
        }, { status: 400 });
      }

      if (!data.description?.trim()) {
        return Response.json({
          success: false,
          error: "Category description is required"
        }, { status: 400 });
      }

      // Check if category exists
      const existingCategory = await Category.findById(data.categoryId);
      if (!existingCategory) {
        return Response.json({
          success: false,
          error: "Category not found"
        }, { status: 404 });
      }

      // Update category 
      const updatedCategory = await Category.findByIdAndUpdate(
        data.categoryId,
        {
          name: data.name.trim(),
          description: data.description.trim(),
        },
        { new: true }
      );

      const formattedCategory = {
        _id: updatedCategory!._id.toString(),
        name: updatedCategory!.name,
        description: updatedCategory!.description,
        createdAt: (updatedCategory as any)!.createdAt,
        updatedAt: (updatedCategory as any)!.updatedAt
      };

      console.log("✅ Category updated successfully:", formattedCategory.name);
      
      return Response.json({
        success: true,
        category: formattedCategory,
        message: "Category updated successfully"
      });

    } else if (method === "DELETE") {
      // Delete category
      const data = await request.json();
      console.log("🗑️ Deleting category:", data.categoryId);

      if (!data.categoryId) {
        return Response.json({
          success: false,
          error: "Category ID is required"
        }, { status: 400 });
      }

      // Check if category exists
      const existingCategory = await Category.findById(data.categoryId);
      if (!existingCategory) {
        return Response.json({
          success: false,
          error: "Category not found"
        }, { status: 404 });
      }

      // Delete category
      await Category.findByIdAndDelete(data.categoryId);

      console.log("✅ Category deleted successfully");
      
      return Response.json({
        success: true,
        message: "Category deleted successfully"
      });

    } else {
      return Response.json({
        success: false,
        error: `Method ${method} not allowed`
      }, { status: 405 });
    }

  } catch (error) {
    console.error(`❌ Error in ${method} /api/categories:`, error);
    return Response.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
} 