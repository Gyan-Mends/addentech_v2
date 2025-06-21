import bcrypt from "bcryptjs";
import mongoose from "~/mongoose.server";
import Registration from "~/modal/registration";
import Departments from "~/modal/department";

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connection.asPromise();
    console.log("Connected to MongoDB");

    // Check if admin user already exists
    const existingAdmin = await Registration.findOne({ 
      email: "admin@addenech.com" 
    });

    if (existingAdmin) {
      console.log("❌ Admin user already exists!");
      console.log("📧 Email: admin@addenech.com");
      console.log("🔑 Password: Admin123!");
      return;
    }

    // Create a default department first (if it doesn't exist)
    let department = await Departments.findOne({ name: "Administration" });
    
    if (!department) {
      department = new Departments({
        name: "Administration",
        description: "Administrative Department - System Management"
      });
      await department.save();
      console.log("✅ Created Administration department");
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash("Admin123!", saltRounds);

    // Create admin user
    const adminUser = new Registration({
      firstName: "System",
      middleName: "",
      lastName: "Administrator", 
      email: "admin@addenech.com",
      password: hashedPassword,
      phone: "+1234567890",
      role: "admin",
      position: "System Administrator",
      department: department._id,
      workMode: "in-house",
      image: "/api/placeholder/150/150",
      bio: "System Administrator with full access to all features",
      status: "active"
    });

    // Save the user (this will trigger the pre-save hook for permissions)
    const savedUser = await adminUser.save();

    console.log("🎉 Admin user created successfully!");
    console.log("==========================================");
    console.log("📧 Email: admin@addenech.com");
    console.log("🔑 Password: Admin123!");
    console.log("👤 Role: admin");
    console.log("📱 Phone: +1234567890");
    console.log("🏢 Department: Administration");
    console.log("==========================================");
    console.log("⚠️  Please change the password after first login!");

    // Display user info (without password)
    console.log("\n📋 User Details:");
    console.log(`ID: ${savedUser._id}`);
    console.log(`Name: ${savedUser.firstName} ${savedUser.lastName}`);
    console.log(`Email: ${savedUser.email}`);
    console.log(`Role: ${savedUser.role}`);
    console.log(`Status: ${savedUser.status}`);
    console.log(`Created: ${new Date().toISOString()}`);

  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
}

// Run the script
createAdminUser(); 