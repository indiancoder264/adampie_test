
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export type User = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  favorites: string[]; // array of recipe IDs
  favoriteCuisines: string[];
  readHistory: string[];
  suspendedUntil?: string;
  country: string;
  dietaryPreference: 'All' | 'Vegetarian' | 'Non-Vegetarian' | 'Vegan';
  avatar: string; // seed for DiceBear or 'none'
};

type AuthContextType = {
  user: User | null;
  logout: () => void;
  toggleFavorite: (recipeId: string) => void;
  updateUser: (data: Partial<Pick<User, 'name' | 'email' | 'country' | 'dietaryPreference'>>) => void;
  updateFavoriteCuisines: (cuisines: string[]) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to set a cookie on the client for optimistic updates
const setClientCookie = (name: string, value: string, days: number) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

const eraseCookie = (name: string) => {
  document.cookie = name+'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

export const AuthProvider = ({ children, initialUser }: { children: ReactNode; initialUser: User | null }) => {
  const [user, setUser] = useState<User | null>(initialUser);

  // This effect keeps the client-side state in sync with the server-provided prop.
  // This is crucial for reflecting the login state after a `router.refresh()`.
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const { toast } = useToast();

  const logout = () => {
    eraseCookie("user");
    window.location.href = '/'; 
  };
  
  const updateUserAndCookie = (updatedUser: User | null) => {
      setUser(updatedUser);
      if (updatedUser) {
          setClientCookie("user", JSON.stringify(updatedUser), 7);
      } else {
          eraseCookie("user");
      }
  };

  const toggleFavorite = (recipeId: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to favorite recipes.",
        variant: "destructive"
      });
      return;
    }

    const isFavorite = user.favorites.includes(recipeId);
    
    const updatedUser = {
        ...user,
        favorites: isFavorite
            ? user.favorites.filter(id => id !== recipeId)
            : [...user.favorites, recipeId],
    };
    updateUserAndCookie(updatedUser);

    if (!isFavorite) {
        toast({ title: "Added to Favorites!" });
    } else {
        toast({ title: "Removed from Favorites" });
    }
  };

  const updateUser = (data: Partial<Pick<User, 'name' | 'email' | 'country' | 'dietaryPreference'>>) => {
      if (!user) return;
      const updatedUser = { ...user, ...data };
      if (data.name) {
        updatedUser.avatar = data.name;
      }
      updateUserAndCookie(updatedUser);
  };

  const updateFavoriteCuisines = (cuisines: string[]) => {
    if (!user) return;
    updateUserAndCookie({ ...user, favoriteCuisines: cuisines });
  };

  return (
    <AuthContext.Provider value={{ logout, toggleFavorite, updateUser, updateFavoriteCuisines, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
