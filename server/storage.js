// Storage helpers backed by Supabase Storage (a public bucket named
// "conversions"). Replaces the old Manus-only "Forge" storage backend,
// which only worked inside Manus's own hosting.

import { createClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

const BUCKET = "conversions";

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    throw new Error(
      "Storage config missing: set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (the service_role secret key from Supabase > Settings > API Keys)."
    );
  }
  // The service role key bypasses Row Level Security, so this client must
  // only ever be used on the server — never sent to the browser.
  _supabaseAdmin = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey);
  return _supabaseAdmin;
}

function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}

/**
 * Upload a file's contents and return its key + a public URL.
 * @example
 * const { url } = await storagePut("conversions/123/file.docx", buffer, "application/...");
 */
export async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const supabase = getSupabaseAdmin();
  const key = normalizeKey(relKey);
  const { error } = await supabase.storage.from(BUCKET).upload(key, data, {
    contentType,
    upsert: true
  });
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return {
    key,
    url: publicUrlData.publicUrl
  };
}

export async function storageGet(relKey) {
  const supabase = getSupabaseAdmin();
  const key = normalizeKey(relKey);
  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return {
    key,
    url: publicUrlData.publicUrl
  };
}

export async function storageGetSignedUrl(relKey) {
  const supabase = getSupabaseAdmin();
  const key = normalizeKey(relKey);
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(key, 60 * 60);
  if (error) {
    throw new Error(`Storage signed URL failed: ${error.message}`);
  }
  return data.signedUrl;
}
