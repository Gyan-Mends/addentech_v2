import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("routes/_publicLayout.tsx", [
        route("/", "routes/public/index.tsx")
    ]),
    layout("routes/_adminLayout.tsx", [
        route("/dashboard", "routes/dashboard/index.tsx"),
        route("/dashboard/user", "routes/dashboard/user.tsx"), // User CRUD operations
        route("/dashboard/department", "routes/dashboard/department.tsx"), // Department CRUD operations
        route("/dashboard/tasks", "routes/dashboard/tasks.tsx"),
        route("/dashboard/create-task", "routes/dashboard/create-task.tsx"),
        route("/dashboard/attendance", "routes/dashboard/attendance.tsx"),
        route("/dashboard/leaves", "routes/dashboard/leaves.tsx"),
        route("/dashboard/apply-leave", "routes/dashboard/apply-leave.tsx"), // Apply for leave
        route("/dashboard/team-calendar", "routes/dashboard/team-calendar.tsx"), // Team calendar
        route("/dashboard/leave-policies", "routes/dashboard/leave-policies.tsx"), // Leave policies
        route("/dashboard/leave-balance", "routes/dashboard/leave-balance.tsx"), // Leave balance
        route("/dashboard/reports", "routes/dashboard/reports.tsx"),
        route("/dashboard/categories", "routes/dashboard/categories.tsx"), // Categories CRUD operations
        route("/dashboard/contacts", "routes/dashboard/contacts.tsx"), // Contact monitoring
        route("/dashboard/blogs", "routes/dashboard/blogs.tsx"), // Blogs CRUD operations
        route("/dashboard/memo", "routes/dashboard/memo.tsx"), // Memo CRUD operations
        // Coming soon - will be added as needed
        // route("/dashboard/task-activities", "routes/dashboard/task-activities.tsx"),
    ]),

    // Authentication routes
    route("/login", "routes/login.tsx"),
    
    // API routes - these are server-side only, minimal impact on client bundle
    route("/api/auth/login", "routes/api/auth.login.tsx"),
    route("/api/auth/verify", "routes/api/auth.verify.tsx"),
    route("/api/auth/logout", "routes/api/auth.logout.tsx"),
    route("/api/auth/register", "routes/api/auth.register.tsx"),
    route("/api/departments", "routes/api/departments.tsx"), // Department CRUD API
    route("/api/users", "routes/api/users.tsx"), // User CRUD API  
    route("/api/categories", "routes/api/categories.tsx"), // Categories CRUD API
    route("/api/contacts", "routes/api/contacts.tsx"), // Contact monitoring API
    route("/api/blogs", "routes/api/blogs.tsx"), // Blogs CRUD API
    route("/api/attendance", "routes/api/attendance.tsx"), // Attendance management API
    route("/api/memo", "routes/api/memo.tsx"), // Memo CRUD API
    route("/api/leaves", "routes/api/leaves.tsx"), // Leave management API
    route("/api/task", "routes/api/task.tsx"), // Task management API

] satisfies RouteConfig;
