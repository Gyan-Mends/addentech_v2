import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { sendEmail, createNewUserEmailTemplate } from '../components/email';

// Define the schemas directly here to avoid import issues
const RegistrationSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { type: String, required: true },
  position: { type: String, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'departments' },
  workMode: { type: String, required: true },
  image: { type: String },
  bio: { type: String },
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const DepartmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create models
let Registration: mongoose.Model<any>;
let Department: mongoose.Model<any>;

try {
  Registration = mongoose.model('Registration');
} catch {
  Registration = mongoose.model('Registration', RegistrationSchema);
}

try {
  Department = mongoose.model('departments');
} catch {
  Department = mongoose.model('departments', DepartmentSchema);
}

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
    image: "",
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

// Sample departments
const sampleDepartments = [
  {
    name: "Information Technology",
    description: "Manages all technology infrastructure and software development"
  },
  {
    name: "Human Resources",
    description: "Handles employee relations, recruitment, and HR policies"
  },
  {
    name: "Marketing",
    description: "Responsible for marketing strategies and brand management"
  },
  {
    name: "Finance",
    description: "Manages financial operations and accounting"
  }
];

async function createUsers() {
  try {
    console.log("🔌 Connecting to database...");
    
    // Connect to database
    const mongoUrl = process.env.MONGODB_URI || "mongodb://localhost:27017/addentech_v2";
    await mongoose.connect(mongoUrl);
    
    console.log("✅ Connected to database");

    // Create departments first
    console.log("📁 Creating departments...");
    await Department.deleteMany({}); // Clear existing departments
    
    const createdDepartments = [];
    for (const deptData of sampleDepartments) {
      const dept = new Department(deptData);
      await dept.save();
      createdDepartments.push(dept);
      console.log(`✅ Created department: ${dept.name}`);
    }

    // Clear existing users
    console.log("🗑️  Clearing existing users...");
    await Registration.deleteMany({});
    console.log("✅ Cleared existing users");

    // Create users
    console.log("👥 Creating users...");
    
    for (let i = 0; i < sampleUsers.length; i++) {
      const userData = sampleUsers[i];
      const department = createdDepartments[i % createdDepartments.length];
      
      try {
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
        
        // Send welcome email to the new user
        try {
          const emailTemplate = createNewUserEmailTemplate({
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            position: newUser.position,
            role: newUser.role,
            password: userData.password
          });

          await sendEmail({
            from: process.env.SMTP_USER || 'noreply@addentech.com',
            to: newUser.email,
            subject: 'Welcome to Addentech - Your Account Has Been Created',
            html: emailTemplate
          });

          console.log(`📧 Welcome email sent to ${newUser.email}`);
        } catch (emailError) {
          console.error(`❌ Failed to send email to ${newUser.email}:`, emailError);
          // Don't fail the user creation if email fails
        }
        
      } catch (userError) {
        console.error(`❌ Failed to create user ${userData.email}:`, userError);
      }
    }

    // Display summary
    console.log("\n📊 User Creation Summary:");
    const totalUsers = await Registration.countDocuments();
    const totalDepartments = await Department.countDocuments();
    console.log(`Total users in database: ${totalUsers}`);
    console.log(`Total departments in database: ${totalDepartments}`);
    
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
createUsers();

export default createUsers; 