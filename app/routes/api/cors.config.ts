// CORS configuration for API routes
export const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.NODE_ENV === 'production'
    ? "https://addentech-v2-p1m9e9dzr-gyanmends-projects.vercel.app"
    : "http://localhost:5173",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400" // 24 hours
}; 