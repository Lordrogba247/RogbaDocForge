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
      console.warn("[Auth] Missing access token");
      return null;
    }
    try {
      const { data, error } = await this.supabase.auth.getUser(accessToken);
      if (error || !data?.user) {
        console.warn("[Auth] Token verification failed:", error?.message);
        return null;
      }
      return data.user;
    } catch (error) {
      console.warn("[Auth] Token verification threw:", String(error));
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
    }
    const supaUser = await this.verifySupabaseToken(accessToken);
    if (!supaUser) {
      throw ForbiddenError("Invalid or missing session");
    }
    const openId = supaUser.id;
    const email = supaUser.email ?? null;
    const name = supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || (email ? email.split("@")[0] : "User");
    const loginMethod = this.deriveLoginMethod(supaUser.app_metadata);
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(openId);
    if (!user) {
      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod,
        lastSignedIn: signedInAt
      });
      user = await db.getUserByOpenId(openId);
    } else {
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: signedInAt
      });
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    return user;
  }
}

export const sdk = new SDKServer();
