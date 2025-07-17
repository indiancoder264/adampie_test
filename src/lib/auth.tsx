"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateUserAction, updateFavoriteCuisinesAction, toggleFavoriteAction } from "./actions";

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
  toggleFavorite: (recipeId: string) => void;
  updateUser: (data: Partial<Pick<User, 'name' | 'email' | 'country' | 'dietaryPreference'>>) => void;
  updateFavoriteCuisines: (cuisines: string[]) => void;
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
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  const updateUser = (data: Partial<Pick<User, 'name' | 'email' | 'country' | 'dietaryPreference'>>) => {
      if (!user) return;
      startTransition(async () => {
        const result = await updateUserAction(data);
        if (result.success) {
            toast({ title: "Profile Updated", description: "Your details have been saved." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
      });
  };

  const updateFavoriteCuisines = (cuisines: string[]) => {
    if (!user) return;
    startTransition(async () => {
        const result = await updateFavoriteCuisinesAction(cuisines);
         if (result.success) {
            toast({ title: "Cuisines Updated", description: "Your favorite cuisines have been saved." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    });
  };

  return (
    <AuthContext.Provider value={{ user, toggleFavorite, updateUser, updateFavoriteCuisines }}>
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
