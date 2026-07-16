import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth as authApi, api, token } from "./api";


export const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

export function useAuthProvider() {
  const [user, setUser] = useState(token.user());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token.get()) {
      api.me().then(res => {
        const userData = { 
          user_id: res.user_id, 
          nickname: res.nickname, 
          role: res.role, 
          avatar_url: res.avatar_url,
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
      const userData = { user_id: res.user_id, nickname: res.nickname, avatar_url: res.avatar_url };
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
      const userData = { user_id: res.user_id, nickname: res.nickname, avatar_url: res.avatar_url };
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
      const userData = { user_id: res.user_id, nickname: res.nickname, avatar_url: res.avatar_url };
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
      const userData = { user_id: res.user_id, nickname: res.nickname, role, avatar_url: res.avatar_url };
      await token.setUser(userData);
      setUser(userData);
      if (navigate) {
        navigate("/");
      } else {
        window.history.pushState({}, "", "/");
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

      const newUser = { ...user, ...res };
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

