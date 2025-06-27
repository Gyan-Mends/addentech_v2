// CORS configuration for API routes
export const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.NODE_ENV === 'production'
    ? "*" // Allow all origins in production for now - you can restrict this later
    : "*", // Allow all origins in development
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400" // 24 hours
}; 