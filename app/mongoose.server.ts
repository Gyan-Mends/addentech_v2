import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Default MongoDB URI if environment variable is not set
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csts_online';

console.log('Connecting to MongoDB:', MONGODB_URI);

//connecting to the database 
mongoose.connect(MONGODB_URI);

//creating a new instance of the database connection
const db = mongoose.connection;

//checking if the database is connected successfully
db.once("open", () => {
    console.log("✅ Database connected successfully to:", MONGODB_URI);
});

//handling connection errors
db.on("error", (error) => {
    console.error("❌ Unable to connect to the database:", error);
    console.error("Make sure MongoDB is running and the connection string is correct");
});

db.on("disconnected", () => {
    console.log("⚠️ Database disconnected");
});

export default mongoose;
