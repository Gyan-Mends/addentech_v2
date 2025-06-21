import mongoose from 'mongoose';

async function checkDatabase() {
  try {
    console.log("🔌 Connecting to database...");
    
    // Connect to database (using the same connection as the app)
    const mongoUrl = process.env.MONGODB_URI || "mongodb://localhost:27017/addentech_v2";
    await mongoose.connect(mongoUrl);
    
    console.log("✅ Connected to database:", mongoUrl);

    // Check if database connection is ready
    if (!mongoose.connection.db) {
      console.log("❌ Database connection not ready");
      return;
    }

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("\n📂 Available collections:");
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`);
    });

    // Check registrations collection
    if (collections.some(c => c.name === 'registrations')) {
      const Registration = mongoose.connection.db.collection('registrations');
      const userCount = await Registration.countDocuments();
      console.log(`\n👥 Users in registrations collection: ${userCount}`);
      
      if (userCount > 0) {
        const users = await Registration.find({}).limit(5).toArray();
        console.log("\nSample users:");
        users.forEach((user: any) => {
          console.log(`  • ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
        });
      }
    } else {
      console.log("\n❌ No 'registrations' collection found");
    }

    // Check departments collection
    if (collections.some(c => c.name === 'departments')) {
      const Department = mongoose.connection.db.collection('departments');
      const deptCount = await Department.countDocuments();
      console.log(`\n🏢 Departments in departments collection: ${deptCount}`);
      
      if (deptCount > 0) {
        const departments = await Department.find({}).toArray();
        console.log("\nDepartments:");
        departments.forEach((dept: any) => {
          console.log(`  • ${dept.name}: ${dept.description}`);
        });
      }
    } else {
      console.log("\n❌ No 'departments' collection found");
    }

  } catch (error) {
    console.error("❌ Error checking database:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
    process.exit(0);
  }
}

checkDatabase(); 