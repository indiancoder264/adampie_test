
"use client";

import { AuthProvider, User } from "@/lib/auth";
import { RecipeProvider, Recipe } from "@/lib/recipes";
import { AllUsersProvider } from "@/lib/users";
import { CommunityProvider, Group } from "@/lib/community";
import type { ReactNode } from "react";
import React from "react";


type ProviderProps = {
  children: ReactNode;
  currentUser: User | null;
  users: User[];
  recipes: Recipe[];
  groups: Group[];
};

export function Providers({ children, currentUser, users, recipes, groups }: ProviderProps) {
  return (
    <AuthProvider initialUser={currentUser}>
      <AllUsersProvider initialUsers={users}>
        <RecipeProvider initialRecipes={recipes}>
          <CommunityProvider initialGroups={groups}>
            {children}
          </CommunityProvider>
        </RecipeProvider>
      </AllUsersProvider>
    </AuthProvider>
  );
}
