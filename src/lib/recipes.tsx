
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/lib/auth";

// Types
export type Ingredient = {
    id: string;
    quantity: string;
    name: string;
};

export type Step = {
    id: string;
    step_number: number;
    description: string;
};

export type Tip = {
  id: string;
  user_id: string;
  user_name: string;
  tip: string;
  rating: number;
  created_at: string;
  updated_at: string;
};

export type Recipe = {
  id: string;
  name: string;
  region: string;
  description: string;
  prep_time: string;
  cook_time: string;
  servings: string;
  image_url: string;
  average_rating: number;
  rating_count: number;
  favorite_count: number;
  published: boolean;
  ingredients: Ingredient[];
  steps: Step[];
  tips: Tip[];
  dietary_type: 'Vegetarian' | 'Non-Vegetarian' | 'Vegan';
  meal_category: string;
  consumption_time: string[];
  dietary_notes: string[];
};

// This is just to satisfy the initial empty state.
const initialRecipes: Recipe[] = [];

type RecipeContextType = {
  recipes: Recipe[];
  // All mutation-related functions are now handled by server actions.
  // The context is now primarily for distributing client-side state.
};

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

// This provider will fetch data on the client side.
// A more advanced implementation might use server components to fetch initial data.
export const RecipeProvider = ({ children, initialRecipes: serverRecipes }: { children: ReactNode, initialRecipes: Recipe[] }) => {
  const [recipes, setRecipes] = useState<Recipe[]>(serverRecipes || initialRecipes);

  useEffect(() => {
    // Data is now passed in from the root layout, but we can update it if it changes
    setRecipes(serverRecipes);
  }, [serverRecipes]);

  return (
    <RecipeContext.Provider value={{ recipes }}>
      {children}
    </RecipeContext.Provider>
  );
};

export const useRecipes = () => {
  const context = useContext(RecipeContext);
  if (context === undefined) {
    throw new Error("useRecipes must be used within a RecipeProvider");
  }
  return context;
};
