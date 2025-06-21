import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("routes/_publicLayout.tsx", [
        route("/", "routes/public/index.tsx")
    ]),
    layout("routes/_adminLayout.tsx", [
        route("/dashboard", "routes/dashboard/index.tsx"),
        // Commented out for now - will be added as needed
        // route("/dashboard/users", "routes/dashboard/users.tsx"),
        // route("/dashboard/departments", "routes/dashboard/departments.tsx"),
        // route("/dashboard/tasks", "routes/dashboard/tasks.tsx"),
        // route("/dashboard/task-activities", "routes/dashboard/task-activities.tsx"),
        // route("/dashboard/attendance", "routes/dashboard/attendance.tsx"),
        // route("/dashboard/leaves", "routes/dashboard/leaves.tsx"),
        // route("/dashboard/leave-policies", "routes/dashboard/leave-policies.tsx"),
        // route("/dashboard/memos", "routes/dashboard/memos.tsx"),
        // route("/dashboard/reports", "routes/dashboard/reports.tsx"),
        // route("/dashboard/categories", "routes/dashboard/categories.tsx"),
        // route("/dashboard/contacts", "routes/dashboard/contacts.tsx"),
        // route("/dashboard/blog", "routes/dashboard/blog.tsx")
    ]),

    // Authentication routes
    route("/login", "routes/login.tsx"),
    
    // API routes - these are server-side only, minimal impact on client bundle
    route("/api/auth/login", "routes/api/auth.login.tsx"),
    route("/api/auth/verify", "routes/api/auth.verify.tsx"),
    route("/api/auth/logout", "routes/api/auth.logout.tsx"),
    route("/api/auth/register", "routes/api/auth.register.tsx"),

] satisfies RouteConfig;
