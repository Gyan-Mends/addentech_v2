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

const secret = "addenech-admin-session-secret";
if (!secret) {
  throw new Error("No session secret provided");
}

const { getSession, commitSession, destroySession } = createCookieSessionStorage<SessionData, SessionFlashData>({
  cookie: {
    name: "addenech-admin-session",
    httpOnly: true,
    path: "/",
    
    sameSite: "lax",
    secrets: [secret],
  },
});

// Utility function to set session with appropriate maxAge
export async function setSession(session:any, email:string, rememberMe:boolean) {
  session.set("email", email);
  return commitSession(session, {
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 45, // 30 days for remember me, 45 minutes otherwise
  });
}

export { getSession, commitSession, destroySession };
