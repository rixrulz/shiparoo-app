import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { auth as authApi, storeTokens, clearTokens, getAccessToken } from '../services/api';

const AuthContext = createContext(null);

const initialState = { user: null, loading: true, error: null };

function reducer(state, action) {
  switch (action.type) {
    case 'RESTORE':  return { ...state, user: action.user, loading: false };
    case 'LOGIN':    return { ...state, user: action.user, error: null, loading: false };
    case 'LOGOUT':   return { ...state, user: null, error: null, loading: false };
    case 'ERROR':    return { ...state, error: action.error, loading: false };
    case 'LOADING':  return { ...state, loading: true, error: null };
    default:         return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Restore session on app launch
  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const { user } = await authApi.me();
          dispatch({ type: 'RESTORE', user });
        } else {
          dispatch({ type: 'RESTORE', user: null });
        }
      } catch {
        await clearTokens();
        dispatch({ type: 'RESTORE', user: null });
      }
    })();
  }, []);

  const login = async (email, password) => {
    dispatch({ type: 'LOADING' });
    try {
      const res = await authApi.login(email, password);
      await storeTokens(res.tokens);
      dispatch({ type: 'LOGIN', user: res.user });
      return res.user;
    } catch (e) {
      dispatch({ type: 'ERROR', error: e.message });
      throw e;
    }
  };

  const register = async (data) => {
    dispatch({ type: 'LOADING' });
    try {
      const res = await authApi.register(data);
      await storeTokens(res.tokens);
      dispatch({ type: 'LOGIN', user: res.user });
      return res.user;
    } catch (e) {
      dispatch({ type: 'ERROR', error: e.message });
      throw e;
    }
  };

  const logout = async () => {
    await authApi.logout();
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (user) => dispatch({ type: 'LOGIN', user });

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
