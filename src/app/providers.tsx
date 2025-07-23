
"use client";

import { AuthProvider, User } from "@/lib/auth";
import { RecipeProvider, Recipe } from "@/lib/recipes";
import { AllUsersProvider } from "@/lib/users";
import { CommunityProvider, Group } from "@/lib/community";
import type { ReactNode } from "react";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";


type ProviderProps = {
  children: ReactNode;
  currentUser: User | null;
  users: User[];
  recipes: Recipe[];
  groups: Group[];
};

export function Providers({ children, currentUser, users, recipes, groups }: ProviderProps) {
  const router = useRouter();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);
  
  return (
    <RecipeProvider initialRecipes={recipes}>
      <AllUsersProvider initialUsers={users}>
        <CommunityProvider initialGroups={groups}>
          <AuthProvider initialUser={currentUser}>
            {children}
          </AuthProvider>
        </CommunityProvider>
      </AllUsersProvider>
    </RecipeProvider>
  );
}