import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { errorStatus, setSessionExpiredHandler } from "@/api/client";
import { fetchMe, logout, spectatorLogin, unregisterPushDevice } from "@/api/endpoints";
import * as session from "@/api/session";
import type { SpectatorRole, Tokens, User } from "@/api/types";
import { getPushToken } from "@/notifications/push";
import { queryPersister } from "@/providers/queryPersistence";

const USER_CACHE_KEY = "auth.user";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "signedOut"; user: null }
  | { status: "signedIn"; user: User };

interface AuthContextValue {
  status: AuthState["status"];
  user: User | null;
  signIn: (tokens: Tokens) => Promise<void>;
  signOut: () => Promise<void>;
  /** Spectator mode: view the app as another role (a fresh read-only session, nothing cached carried over). */
  switchSpectatorView: (role: SpectatorRole) => Promise<void>;
  /** Replace the cached profile, e.g. after editing it. */
  setUser: (user: User) => void;
  /** Last signed-in user; still set while signed-in screens unmount after sign-out. */
  lastUser: User | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function readCachedUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function cacheUser(user: User | null): void {
  const write = user
    ? AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
    : AsyncStorage.removeItem(USER_CACHE_KEY);
  write.catch(() => undefined);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });
  const [lastUser, setLastUser] = useState<User | null>(null);
  // Adjusting state while rendering (React's pattern for deriving from changed state).
  if (state.user && state.user !== lastUser) setLastUser(state.user);

  const signOutLocally = useCallback(async () => {
    await session.clearTokens();
    cacheUser(null);
    queryClient.clear();
    // Don't leave the previous user's saved screens on the phone.
    await queryPersister.removeClient();
    setState({ status: "signedOut", user: null });
  }, [queryClient]);

  // The API client calls this when the server rejects the refresh token.
  useEffect(() => {
    setSessionExpiredHandler(() => void signOutLocally());
    return () => setSessionExpiredHandler(null);
  }, [signOutLocally]);

  // Restore the previous session on launch.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await session.loadTokens();
      if (!session.getRefreshToken()) {
        if (!cancelled) setState({ status: "signedOut", user: null });
        return;
      }

      const cached = await readCachedUser();
      try {
        const user = await fetchMe();
        cacheUser(user);
        if (!cancelled) setState({ status: "signedIn", user });
      } catch (error) {
        const status = errorStatus(error);
        if (cached && status !== 401 && status !== 403) {
          // Offline or server hiccup: keep the user in with their cached profile.
          if (!cancelled) setState({ status: "signedIn", user: cached });
        } else {
          await signOutLocally();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signOutLocally]);

  const signIn = useCallback(async (tokens: Tokens) => {
    await session.saveTokens(tokens.access, tokens.refresh);
    const user = await fetchMe();
    cacheUser(user);
    setState({ status: "signedIn", user });
  }, []);

  const signOut = useCallback(async () => {
    // Best effort: stop this phone's notifications and revoke the refresh token.
    const pushToken = getPushToken();
    const refresh = session.getRefreshToken();
    await Promise.allSettled([
      pushToken ? unregisterPushDevice(pushToken) : Promise.resolve(),
      refresh ? logout(refresh) : Promise.resolve(),
    ]);
    await signOutLocally();
  }, [signOutLocally]);

  const setUser = useCallback((user: User) => {
    cacheUser(user);
    setState({ status: "signedIn", user });
  }, []);

  const switchSpectatorView = useCallback(
    async (role: SpectatorRole) => {
      const previous = session.getRefreshToken();
      const tokens = await spectatorLogin(role);
      await session.saveTokens(tokens.access, tokens.refresh);
      // Revoke the replaced session (best effort; spectators may still log out).
      if (previous) logout(previous).catch(() => undefined);
      // Every saved screen belongs to the previous person.
      queryClient.clear();
      await queryPersister.removeClient();
      const user = await fetchMe();
      cacheUser(user);
      setState({ status: "signedIn", user });
    },
    [queryClient]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      user: state.user,
      signIn,
      signOut,
      switchSpectatorView,
      setUser,
      lastUser: state.user ?? lastUser,
    }),
    [state, signIn, signOut, switchSpectatorView, setUser, lastUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

/** For screens inside the signed-in area, where a user is guaranteed. */
export function useCurrentUser(): User {
  const { lastUser } = useAuth();
  if (!lastUser) throw new Error("useCurrentUser used outside the signed-in area");
  return lastUser;
}
