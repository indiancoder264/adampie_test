
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { User } from "@/lib/auth";

// Types
export type Report = {
  reporter_id: string;
  reason: string;
  details?: string;
}

export type Comment = {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  updated_at?: string;
  reports?: Report[];
};

export type Post = {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  updated_at?: string;
  reports?: Report[];
  likes: string[];
  dislikes: string[];
  comments: Comment[];
};

export type Group = {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  creator_name: string;
  created_at: string;
  members: string[];
  posts: Post[];
};

const initialGroups: Group[] = [];

type CommunityContextType = {
  groups: Group[];
  // All mutation-related functions are now handled by server actions.
  // The context is now primarily for distributing client-side state.
};

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export const CommunityProvider = ({ children, initialGroups: serverGroups }: { children: ReactNode, initialGroups: Group[] }) => {
  const [groups, setGroups] = useState<Group[]>(serverGroups || initialGroups);

  useEffect(() => {
    // Data is now passed in from the root layout, but we can update it if it changes
    setGroups(serverGroups);
  }, [serverGroups]);


  return (
    <CommunityContext.Provider value={{ groups }}>
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = () => {
  const context = useContext(CommunityContext);
  if (context === undefined) {
    throw new Error("useCommunity must be used within a CommunityProvider");
  }
  return context;
};

