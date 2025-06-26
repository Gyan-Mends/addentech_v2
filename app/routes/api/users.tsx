import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import Registration from "~/model/registration";
import bcrypt from "bcryptjs";

// Helper function to create JSON responses
const json = (data: any, init?: ResponseInit) => {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
};

// GET - Fetch all users or current user
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'getCurrentUser') {
      // Get current user from session
      const { getSession } = await import("~/session");
      const session = await getSession(request.headers.get("Cookie"));
      const email = session.get("email");

      if (!email) {
        return json({
          success: false,
          error: 'Not authenticated'
        }, { status: 401 });
      }

      const currentUser = await Registration.findOne({ 
        email: email.toLowerCase().trim(),
        status: "active"
      }).populate('department', 'name').select('-password');

      if (!currentUser) {
        return json({
          success: false,
          error: 'User not found'
        }, { status: 404 });
      }

      return json({
        success: true,
        user: {
          _id: currentUser._id.toString(),
          name: `${currentUser.firstName} ${currentUser.middleName ? currentUser.middleName + ' ' : ''}${currentUser.lastName}`,
          firstName: currentUser.firstName,
          middleName: currentUser.middleName || '',
          lastName: currentUser.lastName,
          email: currentUser.email,
          phone: currentUser.phone,
          role: currentUser.role,
          department: (currentUser.department as any)?.name || 'N/A',
          departmentId: (currentUser.department as any)?._id?.toString() || '',
          position: currentUser.position,
          workMode: currentUser.workMode,
          image: currentUser.image,
          status: currentUser.status,
          bio: currentUser.bio || '',
          lastLogin: currentUser.lastLogin,
          createdAt: (currentUser as any).createdAt?.toISOString(),
          updatedAt: (currentUser as any).updatedAt?.toISOString()
        }
      });
    }

    // Default: fetch all users
    const users = await Registration.find({})
      .populate('department', 'name')
      .select('-password')
      .sort({ createdAt: -1 });

    return json({
      success: true,
      users: users.map((user: any) => ({
        _id: user._id.toString(),
        name: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`,
        firstName: user.firstName,
        middleName: user.middleName || '',
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department?.name || 'N/A',
        departmentId: user.department?._id?.toString() || '',
        position: user.position,
        workMode: user.workMode,
        image: user.image,
        status: user.status,
        bio: user.bio || '',
        lastLogin: user.lastLogin,
        createdAt: user.createdAt?.toISOString(),
        updatedAt: user.updatedAt?.toISOString()
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return json({
      success: false,
      error: 'Failed to fetch users'
    }, { status: 500 });
  }
}

// POST/PUT/DELETE - Handle user operations
export async function action({ request }: ActionFunctionArgs) {
  const method = request.method;
  
  try {
    if (method === 'POST') {
      // Create new user
      const formData = await request.formData();
      const userData: any = {
        firstName: formData.get('firstName') as string,
        middleName: formData.get('middleName') as string || '',
        lastName: formData.get('lastName') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        phone: formData.get('phone') as string,
        role: formData.get('role') as string,
        department: formData.get('department') as string,
        position: formData.get('position') as string,
        workMode: formData.get('workMode') as string || 'in-house',
        image: formData.get('image') as string,
        bio: formData.get('bio') as string || '',
        status: formData.get('status') as string || 'active'
      };

      // Validate required fields
      if (!userData.firstName || !userData.lastName || !userData.email || !userData.password || !userData.position) {
        console.log('Missing required fields:', { 
          firstName: !!userData.firstName, 
          lastName: !!userData.lastName, 
          email: !!userData.email, 
          password: !!userData.password,
          position: !!userData.position 
        });
        return json({
          success: false,
          error: 'Missing required fields: firstName, lastName, email, password, and position are required'
        }, { status: 400 });
      }

      // Check if email already exists
      const existingUser = await Registration.findOne({ email: userData.email });
      if (existingUser) {
        return json({
          success: false,
          error: 'Email already exists'
        }, { status: 400 });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      userData.password = hashedPassword;

      // Create user
      const newUser = new Registration(userData);
      await newUser.save();
      
      // Populate department for response
      await newUser.populate('department', 'name');

      return json({
        success: true,
        user: {
          _id: newUser._id.toString(),
          name: `${newUser.firstName} ${newUser.middleName ? newUser.middleName + ' ' : ''}${newUser.lastName}`,
          firstName: newUser.firstName,
          middleName: newUser.middleName || '',
          lastName: newUser.lastName,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          department: (newUser.department as any)?.name || 'N/A',
          departmentId: (newUser.department as any)?._id?.toString() || '',
          position: newUser.position,
          workMode: newUser.workMode,
          image: newUser.image,
          status: newUser.status,
          bio: newUser.bio || '',
          createdAt: (newUser as any).createdAt?.toISOString(),
          updatedAt: (newUser as any).updatedAt?.toISOString()
        }
      });

    } else if (method === 'PUT') {
      // Update user
      const formData = await request.formData();
      const userId = formData.get('userId') as string;
      const userData: any = {
        firstName: formData.get('firstName') as string,
        middleName: formData.get('middleName') as string || '',
        lastName: formData.get('lastName') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        role: formData.get('role') as string,
        department: formData.get('department') as string,
        position: formData.get('position') as string,
        workMode: formData.get('workMode') as string,
        image: formData.get('image') as string,
        bio: formData.get('bio') as string || '',
        status: formData.get('status') as string
      };

      // Handle password update if provided
      const newPassword = formData.get('password') as string;
      if (newPassword) {
        userData.password = await bcrypt.hash(newPassword, 10);
      }

      // Check if email exists for other users
      if (userData.email) {
        const existingUser = await Registration.findOne({ 
          email: userData.email, 
          _id: { $ne: userId } 
        });
        if (existingUser) {
          return json({
            success: false,
            error: 'Email already exists'
          }, { status: 400 });
        }
      }

      // Update user
      const updatedUser = await Registration.findByIdAndUpdate(
        userId,
        { $set: userData },
        { new: true, runValidators: true }
      ).populate('department', 'name');

      if (!updatedUser) {
        return json({
          success: false,
          error: 'User not found'
        }, { status: 404 });
      }

      return json({
        success: true,
        user: {
          _id: updatedUser._id.toString(),
          name: `${updatedUser.firstName} ${updatedUser.middleName ? updatedUser.middleName + ' ' : ''}${updatedUser.lastName}`,
          firstName: updatedUser.firstName,
          middleName: updatedUser.middleName || '',
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          department: (updatedUser.department as any)?.name || 'N/A',
          departmentId: (updatedUser.department as any)?._id?.toString() || '',
          position: updatedUser.position,
          workMode: updatedUser.workMode,
          image: updatedUser.image,
          status: updatedUser.status,
          bio: updatedUser.bio || '',
          createdAt: (updatedUser as any).createdAt?.toISOString(),
          updatedAt: (updatedUser as any).updatedAt?.toISOString()
        }
      });

    } else if (method === 'DELETE') {
      // Delete user
      const formData = await request.formData();
      const userId = formData.get('userId') as string;

      const deletedUser = await Registration.findByIdAndDelete(userId);
      
      if (!deletedUser) {
        return json({
          success: false,
          error: 'User not found'
        }, { status: 404 });
      }

      return json({
        success: true,
        message: 'User deleted successfully'
      });
    }

    return json({
      success: false,
      error: 'Method not allowed'
    }, { status: 405 });

  } catch (error) {
    console.error('Error in user API:', error);
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 