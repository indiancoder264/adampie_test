
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { toggleFavoriteAction } from "./actions";

export type User = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  favorites: string[]; // array of recipe IDs
  favoriteCuisines: string[];
  readHistory: string[];
  achievements: string[];
  suspendedUntil?: string;
  country: string;
  dietaryPreference: 'All' | 'Vegetarian' | 'Non-Vegetarian' | 'Vegan';
  avatar: string; // seed for DiceBear or 'none'
  // Rate limiting fields
  passwordChangeAttempts?: number;
  lastPasswordAttemptAt?: string;
  nameLastChangedAt?: string;
  newEmailRequestsSent?: number;
  lastNewEmailRequestAt?: string;
};

type AuthContextType = {
  user: User | null;
  toggleFavorite: (recipeId: string) => void;
  // Note: updateUser and updateFavoriteCuisines are removed from here
  // and are now handled directly in the profile page to prevent toast conflicts.
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children, initialUser }: { children: ReactNode; initialUser: User | null }) => {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const toggleFavorite = (recipeId: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to favorite recipes.",
        variant: "destructive"
      });
      return;
    }
    
    startTransition(async () => {
      const result = await toggleFavoriteAction(recipeId);
      if (result.success) {
        toast({ title: result.isFavorite ? "Added to Favorites!" : "Removed from Favorites" });
        // Optimistically update user state
        setUser(prevUser => {
          if (!prevUser) return null;
          const newFavorites = result.isFavorite
            ? [...prevUser.favorites, recipeId]
            : prevUser.favorites.filter(id => id !== recipeId);
          
          const newAchievements = result.isFavorite && !prevUser.achievements.includes('first_favorite')
            ? [...prevUser.achievements, 'first_favorite']
            : prevUser.achievements;
            
          return { ...prevUser, favorites: newFavorites, achievements: newAchievements };
        });
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <AuthContext.Provider value={{ user, toggleFavorite }}>
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
