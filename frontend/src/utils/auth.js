import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth as authApi, api, token, suppressAuthRedirect } from "./api";


export const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

export function useAuthProvider() {
  const [user, setUser] = useState(token.user());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = token.user();
    if (u) setUser(u);

    if (token.get()) {
      authApi.me().then(res => {
        const isAdmin = res.role === "admin" || res.profile?.role === "admin";
        const hasExplicitFalse = res.onboarding_completed === false || res.profile?.onboarding_completed === false;
        const userData = { 
          user_id: res.user_id, 
          nickname: res.nickname, 
          role: res.role, 
          avatar_url: res.avatar_url,
          onboarding_completed: isAdmin ? true : !hasExplicitFalse,
          onboarding_data: res.profile?.onboarding_data || res.onboarding_data || {},
          profile: res.profile 
        };
        token.setUser(userData);
        setUser(userData);
      }).catch(err => {
        console.error("Failed to load user profile on boot:", err);
      });
    }
  }, []);

  const login = useCallback(async (nickname, password, navigate) => {
    try {
      const res = await authApi.login(nickname, password);
      await token.set(res.access_token);
      suppressAuthRedirect();
      const isAdmin = res.role === "admin" || res.profile?.role === "admin";
      const hasExplicitFalse = res.onboarding_completed === false || res.profile?.onboarding_completed === false;
      const userData = { 
        user_id: res.user_id, 
        nickname: res.nickname, 
        role: res.role,
        avatar_url: res.avatar_url,
        onboarding_completed: isAdmin ? true : !hasExplicitFalse
      };
      await token.setUser(userData);
      setUser(userData);
      if (navigate) {
        navigate("/");
      } else {
        window.history.pushState({}, "", "/");
      }
      return res;
    } catch (err) {
      console.error("Login error:", err);
      throw err;
    }
  }, []);

  const loginGoogle = useCallback(async (googleToken, navigate) => {
    try {
      const res = await authApi.googleLogin(googleToken);
      await token.set(res.access_token);
      suppressAuthRedirect();
      const hasExplicitFalse = res.onboarding_completed === false || res.profile?.onboarding_completed === false;
      const userData = { 
        user_id: res.user_id, 
        nickname: res.nickname, 
        avatar_url: res.avatar_url,
        onboarding_completed: !hasExplicitFalse
      };
      await token.setUser(userData);
      setUser(userData);
      if (navigate) {
        navigate("/");
      } else {
        window.history.pushState({}, "", "/");
      }
      return res;
    } catch (err) {
      console.error("Google Login error:", err);
      throw err;
    }
  }, []);

  const requestOtp = useCallback(async (email) => {
    return await authApi.requestOtp(email);
  }, []);

  const verifyOtp = useCallback(async (email, otp, navigate) => {
    try {
      const res = await authApi.verifyOtp(email, otp);
      await token.set(res.access_token);
      suppressAuthRedirect();
      const hasExplicitFalse = res.onboarding_completed === false || res.profile?.onboarding_completed === false;
      const userData = { 
        user_id: res.user_id, 
        nickname: res.nickname, 
        avatar_url: res.avatar_url,
        onboarding_completed: !hasExplicitFalse
      };
      await token.setUser(userData);
      setUser(userData);
      if (navigate) {
        navigate("/");
      } else {
        window.history.pushState({}, "", "/");
      }
      return res;
    } catch (err) {
      console.error("OTP verify error:", err);
      throw err;
    }
  }, []);

  const register = useCallback(async (nickname, password, email, role = 'athlete', navigate) => {
    try {
      const res = await authApi.register(nickname, password, email, role);
      await token.set(res.access_token);
      suppressAuthRedirect();
      const userData = { 
        user_id: res.user_id, 
        nickname: res.nickname, 
        role, 
        avatar_url: res.avatar_url,
        onboarding_completed: false
      };
      await token.setUser(userData);
      setUser(userData);
      if (navigate) {
        navigate("/onboarding");
      } else {
        window.history.pushState({}, "", "/onboarding");
      }
      return res;
    } catch (err) {
      console.error("Register error:", err);
      throw err;
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    try {
      const res = await api.updateUser(data);

      const newUser = { 
        ...user, 
        ...res, 
        user_id: user?.user_id || user?.id || res?.user_id || res?.id,
        onboarding_completed: res?.onboarding_completed ?? data?.onboarding_completed ?? user?.onboarding_completed ?? true,
        onboarding_data: res?.onboarding_data || data?.onboarding_data || user?.onboarding_data || {},
        profile: { ...user?.profile, ...res }
      };
      token.setUser(newUser);
      setUser(newUser);
      return res;
    } catch (err) {
      console.error("Update profile error:", err);
      throw err;
    }
  }, [user]);

  const logout = useCallback(async () => {
    await token.clear();
    setUser(null);
  }, []);

  return { user, loading, login, loginGoogle, requestOtp, verifyOtp, register, logout, updateProfile };
}

