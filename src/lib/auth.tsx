
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

// Helper function to set a cookie
const setCookie = (name: string, value: string, days: number) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  // Note: We are not using httpOnly here because the client-side context needs to read it.
  // In a real production app with the new `loginAction`, this cookie could be httpOnly.
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

// Helper function to get a cookie
const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i=0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Helper function to erase a cookie
const eraseCookie = (name: string) => {
  document.cookie = name+'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Initialize user from cookie only on the client-side
    const userCookie = getCookie("user");
    if (userCookie) {
      try {
        const parsedUser = JSON.parse(userCookie);
        setUser(parsedUser);
      } catch (e) {
        // If cookie is invalid, erase it
        eraseCookie("user");
        setUser(null);
      }
    }
  }, []);

  const { toast } = useToast();

  const handleSetUser = (user: User | null) => {
    if (user) {
      setCookie("user", JSON.stringify(user), 7);
    } else {
      eraseCookie("user");
    }
    setUser(user);
  };

  const logout = () => {
    // Erase the cookie and refresh the page to clear server and client state
    eraseCookie("user");
    window.location.href = '/'; 
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
    
    // In a real DB-backed app, this would be an optimistic update
    // followed by a server action call.
    handleSetUser({
        ...user,
        favorites: isFavorite
            ? user.favorites.filter(id => id !== recipeId)
            : [...user.favorites, recipeId],
    });

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
      handleSetUser(updatedUser);
  };

  const updateFavoriteCuisines = (cuisines: string[]) => {
    if (!user) return;
    handleSetUser({ ...user, favoriteCuisines: cuisines });
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
