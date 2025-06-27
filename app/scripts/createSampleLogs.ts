import mongoose from "mongoose";
import ActivityLog from "../model/activityLog";
import Registration from "../model/registration";

async function createSampleLogs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/addenech_onlined');
    console.log('Connected to MongoDB');

    // Get some users to create logs for
    const users = await Registration.find({ status: 'active' }).limit(5);
    
    if (users.length === 0) {
      console.log('No active users found. Please create some users first.');
      return;
    }

    console.log(`Found ${users.length} users, creating sample logs...`);

    const sampleLogs = [];
    const actions = ['login', 'logout', 'create', 'update', 'view', 'delete'];
    const descriptions = {
      login: 'User logged in successfully',
      logout: 'User logged out',
      create: 'Created a new task',
      update: 'Updated task information',
      view: 'Viewed dashboard',
      delete: 'Deleted a document'
    };

    // Create logs for the past 7 days
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      
      // Create 3-8 logs per day
      const logsPerDay = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < logsPerDay; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const action = actions[Math.floor(Math.random() * actions.length)] as keyof typeof descriptions;
        
        // Randomize time within the day
        const logDate = new Date(date);
        logDate.setHours(Math.floor(Math.random() * 24));
        logDate.setMinutes(Math.floor(Math.random() * 60));
        logDate.setSeconds(Math.floor(Math.random() * 60));

        sampleLogs.push({
          action,
          description: `${descriptions[action]} - ${user.firstName} ${user.lastName}`,
          user: user._id,
          targetModel: action === 'create' || action === 'update' || action === 'delete' ? 'Task' : undefined,
          targetId: action === 'create' || action === 'update' || action === 'delete' ? new mongoose.Types.ObjectId() : undefined,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          details: {
            timestamp: logDate,
            sessionId: `session_${Math.random().toString(36).substr(2, 9)}`
          },
          createdAt: logDate,
          updatedAt: logDate
        });
      }
    }

    // Insert all logs
    await ActivityLog.insertMany(sampleLogs);
    console.log(`Created ${sampleLogs.length} sample activity logs`);

    // Show summary
    const logCounts = await ActivityLog.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\nLog summary by action:');
    logCounts.forEach(item => {
      console.log(`${item._id}: ${item.count} logs`);
    });

  } catch (error) {
    console.error('Error creating sample logs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createSampleLogs(); 