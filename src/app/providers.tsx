
"use client";

import { AuthProvider, User } from "@/lib/auth";
import { RecipeProvider, Recipe } from "@/lib/recipes";
import { AllUsersProvider } from "@/lib/users";
import { CommunityProvider, Group } from "@/lib/community";
import type { ReactNode } from "react";

type ProviderProps = {
  children: ReactNode;
  users: User[];
  recipes: Recipe[];
  groups: Group[];
};

export function Providers({ children, users, recipes, groups }: ProviderProps) {
  return (
    <RecipeProvider initialRecipes={recipes}>
      <AllUsersProvider initialUsers={users}>
        <CommunityProvider initialGroups={groups}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </CommunityProvider>
      </AllUsersProvider>
    </RecipeProvider>
  );
}
