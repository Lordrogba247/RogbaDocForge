import { sdk } from "./sdk";
export async function createContext(opts) {
  let user = null;
  let authError = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
    if (user) {
      console.log("[Auth] Request authenticated:", user.email, "(", user.id, ")");
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    authError = error.message;
    console.warn("[Auth] Authentication failed:", authError);
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
    authError
  };
}