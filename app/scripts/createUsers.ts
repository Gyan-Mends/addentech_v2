import mongoose from "../mongoose.server";
import Registration from "../model/registration";
import Departments from "../model/department";
import bcrypt from "bcryptjs";

// Sample user data
const sampleUsers = [
  {
    firstName: "John",
    middleName: "Michael",
    lastName: "Doe",
    email: "john.doe@addenech.com",
    password: "password123",
    phone: "+1234567890",
    role: "admin",
    position: "System Administrator",
    workMode: "in-house",
    image: "", // You can add base64 image data here if needed
    bio: "Experienced system administrator with 10+ years in IT management.",
    status: "active"
  },
  {
    firstName: "Jane",
    middleName: "Elizabeth",
    lastName: "Smith",
    email: "jane.smith@addenech.com",
    password: "password123",
    phone: "+1234567891",
    role: "manager",
    position: "HR Manager",
    workMode: "in-house",
    image: "",
    bio: "Human Resources manager specializing in employee relations and recruitment.",
    status: "active"
  },
  {
    firstName: "Bob",
    middleName: "",
    lastName: "Johnson",
    email: "bob.johnson@addenech.com",
    password: "password123",
    phone: "+1234567892",
    role: "department_head",
    position: "IT Department Head",
    workMode: "in-house",
    image: "",
    bio: "Leading the IT department with focus on digital transformation.",
    status: "active"
  },
  {
    firstName: "Alice",
    middleName: "Marie",
    lastName: "Wilson",
    email: "alice.wilson@addenech.com",
    password: "password123",
    phone: "+1234567893",
    role: "staff",
    position: "Software Developer",
    workMode: "remote",
    image: "",
    bio: "Full-stack developer with expertise in React and Node.js.",
    status: "active"
  },
  {
    firstName: "Charlie",
    middleName: "",
    lastName: "Brown",
    email: "charlie.brown@addenech.com",
    password: "password123",
    phone: "+1234567894",
    role: "staff",
    position: "Marketing Specialist",
    workMode: "in-house",
    image: "",
    bio: "Creative marketing professional with digital marketing expertise.",
    status: "active"
  },
  {
    firstName: "Alex",
    middleName: "",
    lastName: "Chen",
    email: "alex.chen@addenech.com",
    password: "password123",
    phone: "+1234567895",
    role: "intern",
    position: "Software Engineering Intern",
    workMode: "in-house",
    image: "",
    bio: "Intern learning software development and gaining hands-on experience.",
    status: "active"
  }
];

async function createUsers() {
  try {
    console.log("🔌 Connecting to database...");
    
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL || "mongodb://localhost:27017/addenech_online");
    }
    
    console.log("✅ Connected to database");

    // Get all departments to assign users to
    console.log("📋 Fetching departments...");
    const departments = await Departments.find({});
    
    if (departments.length === 0) {
      console.log("⚠️  No departments found. Creating a default department...");
      const defaultDept = new Departments({
        name: "General",
        description: "Default department for all users"
      });
      await defaultDept.save();
      departments.push(defaultDept);
      console.log("✅ Created default department");
    }

    console.log(`📁 Found ${departments.length} department(s)`);

    // Clear existing users (optional - comment out if you want to keep existing users)
    console.log("🗑️  Clearing existing users...");
    await Registration.deleteMany({});
    console.log("✅ Cleared existing users");

    // Create users
    console.log("👥 Creating users...");
    
    for (let i = 0; i < sampleUsers.length; i++) {
      const userData = sampleUsers[i];
      const department = departments[i % departments.length]; // Distribute users across departments
      
      try {
        // Check if user already exists
        const existingUser = await Registration.findOne({ email: userData.email });
        if (existingUser) {
          console.log(`⚠️  User ${userData.email} already exists, skipping...`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create user
        const newUser = new Registration({
          ...userData,
          password: hashedPassword,
          department: department._id
        });

        await newUser.save();
        console.log(`✅ Created user: ${userData.firstName} ${userData.lastName} (${userData.email}) - ${userData.role}`);
        
      } catch (userError) {
        console.error(`❌ Failed to create user ${userData.email}:`, userError);
      }
    }

    // Display summary
    console.log("\n📊 User Creation Summary:");
    const totalUsers = await Registration.countDocuments();
    console.log(`Total users in database: ${totalUsers}`);
    
    // Show users by role
    const usersByRole = await Registration.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);
    
    console.log("\nUsers by role:");
    usersByRole.forEach(role => {
      console.log(`  ${role._id}: ${role.count}`);
    });

    // Show all users
    console.log("\n👥 All Users:");
    const allUsers = await Registration.find({})
      .populate('department', 'name')
      .select('firstName lastName email role position department status');
    
    allUsers.forEach(user => {
      const dept = (user.department as any)?.name || 'No Department';
      console.log(`  • ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`    Role: ${user.role} | Position: ${user.position} | Department: ${dept} | Status: ${user.status}`);
    });

    console.log("\n🎉 User creation completed successfully!");
    console.log("\n🔐 Default password for all users: password123");
    console.log("📧 You can now login with any of the created email addresses");

  } catch (error) {
    console.error("❌ Error creating users:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  createUsers();
}

export default createUsers; 