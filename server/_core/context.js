import { sdk } from "./sdk";
import { ENV } from "./env";
export async function createContext(opts) {
  let user = null;
  let authError = null;
  const authHeader = opts.req.headers.authorization;
  const hasAuthHeader = typeof authHeader === "string" && authHeader.length > 0;
  const isBearer = typeof authHeader === "string" && authHeader.startsWith("Bearer ");
  console.log("[ServerAuth] Authorization header present:", hasAuthHeader, "| is Bearer:", isBearer);
  console.log("[ServerAuth] SUPABASE_URL defined:", Boolean(ENV.supabaseUrl), "| SUPABASE_SERVICE_ROLE_KEY defined:", Boolean(ENV.supabaseServiceRoleKey));
  try {
    user = await sdk.authenticateRequest(opts.req);
    if (user) {
      console.log("[ServerAuth] Request authenticated:", user.email, "(", user.id, ")");
    } else {
      console.log("[ServerAuth] Request not authenticated — user is null");
    }
  } catch (error) {
    // Authentication is optional for public procedures — do not swallow silently.
    authError = error.message;
    console.warn("[ServerAuth] Authentication failed:", error.message);
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
    authError
  };
}