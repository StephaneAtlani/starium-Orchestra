'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { getMe, type MeProfile } from '../services/me';
import {
  loginApi,
  verifyMfaEmailApi,
  verifyMfaTotpApi,
  sendMfaFallbackEmailApi,
} from '../services/auth';
import {
  getTrustedDeviceToken,
  setTrustedDeviceToken,
} from '../lib/auth/trusted-device-storage';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  department: string | null;
  jobTitle: string | null;
  company: string | null;
  office: string | null;
  hasAvatar: boolean;
  platformRole: 'PLATFORM_ADMIN' | null;
};

const REFRESH_TOKEN_KEY = 'starium.refreshToken';
const ACTIVE_CLIENT_KEY = 'starium.activeClient';

function profileToAuthUser(p: MeProfile): AuthUser {
  return {
    id: p.id,
    email: p.email,
    firstName: p.firstName ?? null,
    lastName: p.lastName ?? null,
    department: p.department ?? null,
    jobTitle: p.jobTitle ?? null,
    company: p.company ?? null,
    office: p.office ?? null,
    hasAvatar: p.hasAvatar,
    platformRole: p.platformRole,
  };
}

export type LoginOutcome =
  | { status: 'authenticated'; user: AuthUser; accessToken: string }
  | {
      status: 'mfa_required';
      challengeId: string;
      expiresAt: string;
    };

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  /** Finalise le login après challenge TOTP ou code de secours. */
  completeMfaTotp: (
    challengeId: string,
    otp: string,
    trustDevice?: boolean,
  ) => Promise<{ user: AuthUser; accessToken: string }>;
  sendMfaFallbackEmail: (challengeId: string) => Promise<void>;
  completeMfaEmail: (
    challengeId: string,
    code: string,
    trustDevice?: boolean,
  ) => Promise<{ user: AuthUser; accessToken: string }>;
  logout: () => Promise<void>;
  /** Returns new accessToken on success, null otherwise (for 401 retry). */
  refreshSession: () => Promise<string | null>;
  /** Recharge le profil depuis GET /me (après édition compte, etc.). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

function applySessionTokens(
  accessToken: string,
  refreshToken: string,
  setAccessToken: (t: string | null) => void,
  setUser: (u: AuthUser | null) => void,
  options?: { trustedDeviceToken?: string },
): Promise<{ user: AuthUser; accessToken: string }> {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  setAccessToken(accessToken);
  return getMe(accessToken).then((profile) => {
    const user = profileToAuthUser(profile);
    setUser(user);
    if (options?.trustedDeviceToken) {
      setTrustedDeviceToken(user.email, options.trustedDeviceToken);
    }
    return { user, accessToken };
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.localStorage.removeItem(ACTIVE_CLIENT_KEY);
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return null;
    }
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored }),
      });
      if (!res.ok) {
        clearSession();
        setIsLoading(false);
        return null;
      }
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
      };
      window.localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      setAccessToken(data.accessToken);
      const profile = await getMe(data.accessToken);
      setUser(profileToAuthUser(profile));
      setIsLoading(false);
      return data.accessToken;
    } catch {
      clearSession();
      setIsLoading(false);
      return null;
    }
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginOutcome> => {
      const td =
        typeof window !== 'undefined' ? getTrustedDeviceToken(email) : null;
      const data = await loginApi(email, password, td ?? undefined);
      if (data.status === 'MFA_REQUIRED') {
        return {
          status: 'mfa_required',
          challengeId: data.challengeId,
          expiresAt: data.expiresAt,
        };
      }
      const session = await applySessionTokens(
        data.accessToken,
        data.refreshToken,
        setAccessToken,
        setUser,
      );
      return {
        status: 'authenticated',
        user: session.user,
        accessToken: session.accessToken,
      };
    },
    [],
  );

  const completeMfaTotp = useCallback(
    async (challengeId: string, otp: string, trustDevice?: boolean) => {
      const data = await verifyMfaTotpApi(challengeId, otp, trustDevice);
      return applySessionTokens(
        data.accessToken,
        data.refreshToken,
        setAccessToken,
        setUser,
        data.trustedDeviceToken
          ? { trustedDeviceToken: data.trustedDeviceToken }
          : undefined,
      );
    },
    [],
  );

  const sendMfaFallbackEmail = useCallback(async (challengeId: string) => {
    await sendMfaFallbackEmailApi(challengeId);
  }, []);

  const completeMfaEmail = useCallback(
    async (challengeId: string, code: string, trustDevice?: boolean) => {
      const data = await verifyMfaEmailApi(challengeId, code, trustDevice);
      return applySessionTokens(
        data.accessToken,
        data.refreshToken,
        setAccessToken,
        setUser,
        data.trustedDeviceToken
          ? { trustedDeviceToken: data.trustedDeviceToken }
          : undefined,
      );
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    const t = accessToken;
    if (!t) return;
    try {
      const profile = await getMe(t);
      setUser(profileToAuthUser(profile));
    } catch {
      // ignore
    }
  }, [accessToken]);

  const logout = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(REFRESH_TOKEN_KEY);
      if (stored) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: stored }),
          });
        } catch {
          // Ignore: always clear local session
        }
      }
    }
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    const stored = window.localStorage.getItem(REFRESH_TOKEN_KEY);
    if (stored) {
      void refreshSession();
    } else {
      setIsLoading(false);
    }
  }, [refreshSession]);

  const value: AuthContextValue = {
    user,
    accessToken,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    login,
    completeMfaTotp,
    sendMfaFallbackEmail,
    completeMfaEmail,
    logout,
    refreshSession,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
