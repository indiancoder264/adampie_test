
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { Recipe } from "./recipes";
import { supabase } from "./supabase";

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
  shared_recipe?: Pick<Recipe, 'id' | 'name' | 'image_url' | 'description'>;
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

type CommunityContextType = {
  groups: Group[];
};

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export const CommunityProvider = ({ children, initialGroups: serverGroups }: { children: ReactNode, initialGroups: Group[] }) => {
  const [groups, setGroups] = useState<Group[]>(serverGroups || []);

  useEffect(() => {
    setGroups(serverGroups);
  }, [serverGroups]);

  useEffect(() => {
    const handleGroupChanges = (payload: any) => {
      const { eventType, new: newRecord, old } = payload;
      setGroups(currentGroups => {
        if (eventType === 'INSERT') {
          return [...currentGroups, newRecord as Group];
        }
        if (eventType === 'UPDATE') {
          return currentGroups.map(group => group.id === newRecord.id ? { ...group, ...newRecord } : group);
        }
        if (eventType === 'DELETE') {
          return currentGroups.filter(group => group.id !== old.id);
        }
        return currentGroups;
      });
    };
    
    // This is a simplified listener. A full implementation would need to handle
    // updates to posts, comments, members, etc., and merge them into the correct group.
    // For now, we'll listen to the top-level group changes.
    const channel = supabase
      .channel('community-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, handleGroupChanges)
      // In a real app, you would add more listeners for posts, comments, etc.
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
