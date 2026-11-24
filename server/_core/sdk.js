import { createClient } from "@supabase/supabase-js";
import { ForbiddenError } from "../../shared/_core/errors.js";
import * as db from "../db";
import { ENV } from "./env";

function createSupabaseServerClient() {
  console.log("[Auth] Supabase client initialized with URL:", ENV.supabaseUrl || "(missing)");
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
    console.error("[Auth] ERROR: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not configured! Set them in your .env file.");
  }
  return createClient(ENV.supabaseUrl, ENV.supabaseAnonKey);
}

class SDKServer {
  constructor() {
    this.supabase = createSupabaseServerClient();
  }

  deriveLoginMethod(appMetadata) {
    return appMetadata?.provider || "email";
  }

  /**
   * Verify a Supabase access token (sent by the client as a Bearer token)
   * and return the Supabase auth user, or null if invalid/expired.
   */
  async verifySupabaseToken(accessToken) {
    if (!accessToken) {
      console.warn("[ServerAuth] Missing access token in request");
      return null;
    }
    try {
      const { data, error } = await this.supabase.auth.getUser(accessToken);
      if (error || !data?.user) {
        console.warn("[ServerAuth] Token verification failed — error:", error?.message, "| token prefix:", accessToken.substring(0, 20) + "...", "| data.user present:", Boolean(data?.user));
        return null;
      }
      console.log("[ServerAuth] Token verification succeeded — user id:", data.user.id, "| email:", data.user.email);
      return data.user;
    } catch (error) {
      console.warn("[ServerAuth] Token verification threw — error:", String(error));
      return null;
    }
  }

  /**
   * Authenticate an incoming request using the Supabase access token sent
   * in the Authorization header, then sync/lookup the local app user row.
   * @example
   * const user = await sdk.authenticateRequest(req);
   */
  async authenticateRequest(req) {
    const authHeader = req.headers.authorization;
    let accessToken;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.slice(7);
      console.log("[ServerAuth] Received Bearer token (prefix:", accessToken.substring(0, 20) + "...)");
    } else {
      console.warn("[ServerAuth] No Authorization header or not a Bearer token. Header present:", Boolean(authHeader));
    }
    const supaUser = await this.verifySupabaseToken(accessToken);
    if (!supaUser) {
      console.warn("[ServerAuth] Token verification returned no user — throwing ForbiddenError");
      throw ForbiddenError("Invalid or missing session");
    }
    const openId = supaUser.id;
    const email = supaUser.email ?? null;
    const name = supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || (email ? email.split("@")[0] : "User");
    const loginMethod = this.deriveLoginMethod(supaUser.app_metadata);
    const signedInAt = new Date();
    console.log("[ServerAuth] Looking up user row by openId:", openId);
    let user = await db.getUserByOpenId(openId);
    if (!user) {
      console.log("[ServerAuth] No user row found for openId:", openId, "— creating row automatically");
      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod,
        lastSignedIn: signedInAt
      });
      user = await db.getUserByOpenId(openId);
      if (!user) {
        console.warn("[ServerAuth] User row still not found after auto-creation for openId:", openId);
        throw ForbiddenError("User row could not be created");
      }
      console.log("[ServerAuth] User row created successfully for openId:", openId);
    } else {
      console.log("[ServerAuth] User row found for openId:", openId, "| email:", user.email);
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: signedInAt
      });
    }
    return user;
  }
}

export const sdk = new SDKServer();
