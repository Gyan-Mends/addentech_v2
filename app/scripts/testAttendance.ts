import mongoose from "mongoose";
import Attendance from "../model/attendance";
import Registration from "../model/registration";

// Test the attendance API functionality
async function testAttendanceRules() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/addentech_v2");
    console.log("✅ Connected to database");

    // Test 1: Weekend check
    const testWeekend = () => {
      const saturday = new Date();
      saturday.setDate(saturday.getDate() - saturday.getDay() + 6); // Set to Saturday
      const isWeekend = saturday.getDay() === 0 || saturday.getDay() === 6;
      console.log(`📅 Weekend test: ${isWeekend ? '✅ PASS' : '❌ FAIL'} - Saturday detected as weekend`);
    };

    // Test 2: Time check
    const testTimeRules = () => {
      const now = new Date();
      const hour = now.getHours();
      const isValidTime = hour >= 7 && hour < 17;
      console.log(`⏰ Time test: Current hour is ${hour}, Valid time: ${isValidTime ? '✅ YES' : '❌ NO'}`);
    };

    // Test 3: Check existing attendance records
    const testExistingRecords = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      
      const todayRecords = await Attendance.find({
        date: {
          $gte: today,
          $lt: tomorrow,
        }
      }).populate('user', 'firstName lastName email');

      console.log(`📊 Today's attendance: ${todayRecords.length} records found`);
      
      todayRecords.forEach((record, index) => {
        const user = record.user as any;
        const checkIn = new Date(record.checkInTime).toLocaleTimeString();
        const checkOut = record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : 'Not checked out';
        const workHours = record.workHours || 0;
        const autoCheckout = record.autoCheckout ? ' (Auto)' : '';
        
        console.log(`  ${index + 1}. ${user?.firstName} ${user?.lastName} - In: ${checkIn}, Out: ${checkOut}${autoCheckout}, Hours: ${workHours}h`);
      });
    };

    // Test 4: Location distance calculation
    const testLocationDistance = () => {
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Radius of the Earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km
        return distance;
      };

      const deg2rad = (deg: number): number => {
        return deg * (Math.PI / 180);
      };

      // Office location (actual coordinates)
      const officeLatitude = 5.661204271486543;
      const officeLongitude = -0.1566814758038094;
      
      // Test locations
      const testLocations = [
        { name: 'Office (exact)', lat: officeLatitude, lon: officeLongitude },
        { name: 'Near office (50m)', lat: officeLatitude + 0.0005, lon: officeLongitude },
        { name: 'Far from office (200m)', lat: officeLatitude + 0.002, lon: officeLongitude },
      ];

      testLocations.forEach(location => {
        const distance = calculateDistance(
          location.lat,
          location.lon,
          officeLatitude,
          officeLongitude
        );
        const distanceMeters = Math.round(distance * 1000);
        const withinRange = distanceMeters <= 100;
        
        console.log(`📍 ${location.name}: ${distanceMeters}m away - ${withinRange ? '✅ ALLOWED' : '❌ TOO FAR'}`);
      });
    };

    // Run all tests
    console.log("\n🧪 Running Attendance API Tests...\n");
    
    testWeekend();
    testTimeRules();
    await testExistingRecords();
    testLocationDistance();

    // Test auto-checkout functionality
    console.log("\n🕕 Testing Auto-checkout...");
    const now = new Date();
    const isAutoCheckoutTime = now.getHours() === 18 && now.getMinutes() === 0;
    console.log(`Current time: ${now.toLocaleTimeString()}`);
    console.log(`Auto-checkout time (6:00 PM): ${isAutoCheckoutTime ? '✅ YES' : '❌ NO'}`);

    console.log("\n✅ All tests completed!");

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("📡 Disconnected from database");
  }
}

// Run the test
testAttendanceRules(); 