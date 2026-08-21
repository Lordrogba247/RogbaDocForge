import { startLogin } from "@/const";
import { supabase } from "@/lib/supabaseClient";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";
export function useAuth(options) {
  // Login is started via startLogin() in the effect below, which just
  // navigates to the /signin page (Supabase Auth handles the rest).
  const {
    redirectOnUnauthenticated = false,
    redirectPath
  } = options ?? {};
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false
  });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    }
  });
  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED") {
        return;
      }
      throw error;
    } finally {
      // Clear the actual Supabase session — without this, the browser
      // would keep sending a still-valid access token and the user would
      // appear signed in again on the next request.
      try {
        await supabase.auth.signOut();
      } catch {}
      // Clear the legacy Preview auto-login mirror too, in case it's still set.
      try {
        sessionStorage.removeItem("manus-cookie");
      } catch {}
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);
  const state = useMemo(() => {
    localStorage.setItem("manus-runtime-user-info", JSON.stringify(meQuery.data));
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data)
    };
  }, [meQuery.data, meQuery.error, meQuery.isLoading, logoutMutation.error, logoutMutation.isPending]);
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    // Navigate at this moment only, not during render.
    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      startLogin();
    }
  }, [redirectOnUnauthenticated, redirectPath, logoutMutation.isPending, meQuery.isLoading, state.user]);
  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout
  };
}