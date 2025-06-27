import { createCookieSessionStorage } from "react-router";

type SessionData = {
  email: string;
};

type SessionFlashData = {
  error: string;
  message: {
    title: string;
    description?: string;
    status: string;
  };
};

const isDevelopment = process.env.NODE_ENV === 'development';
const secret = process.env.SESSION_SECRET || "addenech-admin-session-secret";

const { getSession, commitSession, destroySession } = createCookieSessionStorage<SessionData, SessionFlashData>({
  cookie: {
    name: "addenech-admin-session",
    httpOnly: true,
    path: "/",
    sameSite: isDevelopment ? "lax" : "strict",
    secrets: [secret],
    secure: !isDevelopment,
    maxAge: 60 * 60 * 24 * 30, // 30 days default
  },
});

// Utility function to set session with appropriate maxAge
export async function setSession(session:any, email:string, rememberMe:boolean) {
  session.set("email", email);
  return commitSession(session, {
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 4, // 30 days for remember me, 4 hours otherwise
  });
}

export { getSession, commitSession, destroySession };
