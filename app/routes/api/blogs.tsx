import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import Blog from "~/model/blog";
import Category from "~/model/category";
import Registration from "~/model/registration";
import { corsHeaders } from "./cors.config";
import mongoose from "~/mongoose.server";


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
    // Check authentication and permissions
    const { getSession } = await import("~/session");
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (!email) {
      return json({
        success: false,
        error: "Authentication required"
      }, { status: 401 });
    }

    // Get current user and check permissions
    const currentUser = await Registration.findOne({ email });
    if (!currentUser) {
      return json({
        success: false,
        error: "User not found"
      }, { status: 404 });
    }

    // Only allow admin and manager roles to access blogs
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
      return json({
        success: false,
        error: "Insufficient permissions to access blogs"
      }, { status: 403 });
    }

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
    // Get pagination parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    
    const skip = (page - 1) * limit;
    
    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Get total count and blogs in parallel
    const [totalCount, blogs] = await Promise.all([
      Blog.countDocuments(searchQuery),
      Blog.find(searchQuery)
        .populate('category', 'name')
        .populate('admin', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    const formattedBlogs = blogs.map(blog => {
      const blogDoc = blog.toObject() as any;
      return {
        _id: blogDoc._id.toString(),
        name: blogDoc.name,
        description: blogDoc.description,
        image: blogDoc.image || '',
        category: blogDoc.category?._id?.toString() || '',
        categoryName: blogDoc.category?.name || 'Unknown Category',
        admin: blogDoc.admin?._id?.toString() || '',
        adminName: blogDoc.admin ? `${blogDoc.admin.firstName} ${blogDoc.admin.lastName}` : 'Unknown Admin',
        createdAt: blogDoc.createdAt,
        updatedAt: blogDoc.updatedAt
      };
    });

    const totalPages = Math.ceil(totalCount / limit);
    
    console.log(`✅ Found ${formattedBlogs.length} blogs`);
    
    return json({
      success: true,
      blogs: formattedBlogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    });
  } catch (error) {
    console.error("❌ Error fetching blogs:", error);
    return json({
      success: false,
      error: "Failed to fetch blogs"
    }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const method = request.method;
  
  try {
    // Check authentication and permissions
    const { getSession } = await import("~/session");
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (!email) {
      return Response.json({
        success: false,
        error: "Authentication required"
      }, { status: 401 });
    }

    // Get current user and check permissions
    const currentUser = await Registration.findOne({ email });
    if (!currentUser) {
      return Response.json({
        success: false,
        error: "User not found"
      }, { status: 404 });
    }

    // Only allow admin and manager roles to manage blogs
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
      return Response.json({
        success: false,
        error: "Insufficient permissions to manage blogs"
      }, { status: 403 });
    }
    if (method === "POST") {
      // Create new blog
      const data = await request.json();
      console.log("📝 Creating blog with data:", data);

      // Validation
      if (!data.name?.trim()) {
        return Response.json({
          success: false,
          error: "Blog name is required"
        }, { status: 400 });
      }

      if (!data.description?.trim()) {
        return Response.json({
          success: false,
          error: "Blog description is required"
        }, { status: 400 });
      }

      if (!data.image?.trim()) {
        return Response.json({
          success: false,
          error: "Blog image is required"
        }, { status: 400 });
      }

      if (!data.category?.trim()) {
        return Response.json({
          success: false,
          error: "Category is required"
        }, { status: 400 });
      }

      if (!data.admin?.trim()) {
        return Response.json({
          success: false,
          error: "Admin is required"
        }, { status: 400 });
      }

      // Check if category exists
      const categoryExists = await Category.findById(data.category);
      if (!categoryExists) {
        return Response.json({
          success: false,
          error: "Selected category does not exist"
        }, { status: 400 });
      }

      // Check if admin exists
      const adminExists = await Registration.findById(data.admin);
      if (!adminExists) {
        return Response.json({
          success: false,
          error: "Selected admin does not exist"
        }, { status: 400 });
      }

      // Create blog
      const newBlog = new Blog({
        name: data.name.trim(),
        description: data.description.trim(),
        image: data.image,
        category: data.category,
        admin: data.admin
      });

      await newBlog.save();

      // Populate the response
      await newBlog.populate('category', 'name');
      await newBlog.populate('admin', 'firstName lastName');

      const formattedBlog = {
        _id: newBlog._id.toString(),
        name: newBlog.name,
        description: newBlog.description,
        image: newBlog.image,
        category: newBlog.category?._id?.toString() || '',
        categoryName: (newBlog.category as any)?.name || 'Unknown Category',
        admin: newBlog.admin?._id?.toString() || '',
        adminName: newBlog.admin ? `${(newBlog.admin as any).firstName} ${(newBlog.admin as any).lastName}` : 'Unknown Admin',
        createdAt: newBlog.createdAt,
        updatedAt: newBlog.updatedAt
      };

      console.log("✅ Blog created successfully:", formattedBlog.name);
      
      return Response.json({
        success: true,
        blog: formattedBlog,
        message: "Blog created successfully"
      });

    } else if (method === "PUT") {
      // Update blog
      const data = await request.json();
      console.log("📝 Updating blog with data:", data);

      if (!data.blogId) {
        return Response.json({
          success: false,
          error: "Blog ID is required"
        }, { status: 400 });
      }

      // Validation
      if (!data.name?.trim()) {
        return Response.json({
          success: false,
          error: "Blog name is required"
        }, { status: 400 });
      }

      if (!data.description?.trim()) {
        return Response.json({
          success: false,
          error: "Blog description is required"
        }, { status: 400 });
      }

      if (!data.image?.trim()) {
        return Response.json({
          success: false,
          error: "Blog image is required"
        }, { status: 400 });
      }

      if (!data.category?.trim()) {
        return Response.json({
          success: false,
          error: "Category is required"
        }, { status: 400 });
      }

      if (!data.admin?.trim()) {
        return Response.json({
          success: false,
          error: "Admin is required"
        }, { status: 400 });
      }

      // Check if blog exists
      const existingBlog = await Blog.findById(data.blogId);
      if (!existingBlog) {
        return Response.json({
          success: false,
          error: "Blog not found"
        }, { status: 404 });
      }

      // Check if category exists
      const categoryExists = await Category.findById(data.category);
      if (!categoryExists) {
        return Response.json({
          success: false,
          error: "Selected category does not exist"
        }, { status: 400 });
      }

      // Check if admin exists
      const adminExists = await Registration.findById(data.admin);
      if (!adminExists) {
        return Response.json({
          success: false,
          error: "Selected admin does not exist"
        }, { status: 400 });
      }

      // Update blog
      const updatedBlog = await Blog.findByIdAndUpdate(
        data.blogId,
        {
          name: data.name.trim(),
          description: data.description.trim(),
          image: data.image,
          category: data.category,
          admin: data.admin
        },
        { new: true }
      ).populate('category', 'name').populate('admin', 'firstName lastName');

      const formattedBlog = {
        _id: updatedBlog!._id.toString(),
        name: updatedBlog!.name,
        description: updatedBlog!.description,
        image: updatedBlog!.image,
        category: updatedBlog!.category?._id?.toString() || '',
        categoryName: (updatedBlog!.category as any)?.name || 'Unknown Category',
        admin: updatedBlog!.admin?._id?.toString() || '',
        adminName: updatedBlog!.admin ? `${(updatedBlog!.admin as any).firstName} ${(updatedBlog!.admin as any).lastName}` : 'Unknown Admin',
        createdAt: updatedBlog!.createdAt,
        updatedAt: updatedBlog!.updatedAt
      };

      console.log("✅ Blog updated successfully:", formattedBlog.name);
      
      return Response.json({
        success: true,
        blog: formattedBlog,
        message: "Blog updated successfully"
      });

    } else if (method === "DELETE") {
      // Delete blog
      const data = await request.json();
      console.log("🗑️ Deleting blog:", data.blogId);

      if (!data.blogId) {
        return Response.json({
          success: false,
          error: "Blog ID is required"
        }, { status: 400 });
      }

      // Check if blog exists
      const existingBlog = await Blog.findById(data.blogId);
      if (!existingBlog) {
        return Response.json({
          success: false,
          error: "Blog not found"
        }, { status: 404 });
      }

      // Delete blog
      await Blog.findByIdAndDelete(data.blogId);

      console.log("✅ Blog deleted successfully");
      
      return Response.json({
        success: true,
        message: "Blog deleted successfully"
      });

    } else {
      return Response.json({
        success: false,
        error: `Method ${method} not allowed`
      }, { status: 405 });
    }

  } catch (error) {
    console.error(`❌ Error in ${method} /api/blogs:`, error);
    return Response.json({
      success: false,
      error: "Internal server error"
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