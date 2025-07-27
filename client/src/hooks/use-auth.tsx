// auth context

import { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User, InsertUser, LoginCredentials } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: InsertUser) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const { data: authData, isLoading } = useQuery<{ user: User } | null>({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (authData?.user) {
      setUser(authData.user);
    } else {
      setUser(null);
    }
  }, [authData]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiRequest('POST', '/api/auth/login', credentials);
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(['/api/auth/me'], data);
      queryClient.invalidateQueries();
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await apiRequest('POST', '/api/auth/register', userData);
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(['/api/auth/me'], data);
      queryClient.invalidateQueries();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/auth/logout');
    },
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
    },
  });

  const login = async (credentials: LoginCredentials) => {
    await loginMutation.mutateAsync(credentials);
  };

  const register = async (userData: InsertUser) => {
    await registerMutation.mutateAsync(userData);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
