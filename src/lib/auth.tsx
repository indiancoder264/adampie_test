
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { toggleFavoriteAction } from "./actions";
import { supabase } from "./supabase";

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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children, initialUser }: { children: ReactNode; initialUser: User | null }) => {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    if (!initialUser || !supabase) return;

    const channel = supabase
      .channel('user-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${initialUser.id}` },
        (payload) => {
            console.log('User data changed!', payload.new);
            // This is a simplified update. A real implementation might need more sophisticated merging.
            setUser(prevUser => {
                if (!prevUser) return null;
                const updatedUser = payload.new as Partial<User>;
                return { ...prevUser, ...updatedUser };
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        // The UI will now update via the realtime subscription, so optimistic updates are less critical.
        // We can leave this here for a faster "feel" on the client that performed the action.
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
