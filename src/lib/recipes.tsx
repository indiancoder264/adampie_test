
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "./supabase";

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

type RecipeContextType = {
  recipes: Recipe[];
};

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const RecipeProvider = ({ children, initialRecipes: serverRecipes }: { children: ReactNode, initialRecipes: Recipe[] }) => {
  const [recipes, setRecipes] = useState<Recipe[]>(serverRecipes || []);

  useEffect(() => {
    setRecipes(serverRecipes);
  }, [serverRecipes]);

  useEffect(() => {
    if (!supabase) return;
    
    const handleRecipeChanges = (payload: any) => {
        const { eventType, new: newRecord, old } = payload;
        setRecipes(currentRecipes => {
            if (eventType === 'INSERT') {
                return [...currentRecipes, newRecord as Recipe];
            }
            if (eventType === 'UPDATE') {
                return currentRecipes.map(recipe => recipe.id === newRecord.id ? { ...recipe, ...newRecord } : recipe);
            }
            if (eventType === 'DELETE') {
                return currentRecipes.filter(recipe => recipe.id !== old.id);
            }
            return currentRecipes;
        });
    };

    const channel = supabase
      .channel('recipe-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, handleRecipeChanges)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
