
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { Recipe } from "./recipes";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { useAllUsers } from "./users";

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
  group_id: string;
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
  const { allUsers } = useAllUsers();

  useEffect(() => {
    setGroups(serverGroups);
  }, [serverGroups]);

  useEffect(() => {
    if (!supabase || !allUsers.length) return;
    
    const userMap = new Map(allUsers.map(u => [u.id, u.name]));

    const handleGroupChanges = (payload: any) => {
      const { eventType, new: newRecord, old } = payload;
      setGroups(currentGroups => {
        if (eventType === 'INSERT') {
            // Ensure the new record and its essential fields exist.
            if (!newRecord || !newRecord.id || !newRecord.creator_id) {
                return currentGroups;
            }
            // Prevent duplicates if a message arrives multiple times.
            if (currentGroups.some(g => g.id === newRecord.id)) {
                return currentGroups;
            }

            // Construct a complete Group object.
            const creatorName = userMap.get(newRecord.creator_id) || 'Unknown User';
            const groupToAdd: Group = {
                id: newRecord.id,
                name: newRecord.name,
                description: newRecord.description,
                creator_id: newRecord.creator_id,
                created_at: newRecord.created_at,
                // On creation, the creator is the only member.
                members: [newRecord.creator_id],
                // New groups have no posts yet.
                posts: [],
                creator_name: creatorName,
            };
            return [...currentGroups, groupToAdd];
        }
        if (eventType === 'UPDATE') {
          return currentGroups.map(group => {
              if (group.id === newRecord.id) {
                  const creatorName = userMap.get(newRecord.creator_id) || group.creator_name;
                  return { ...group, ...newRecord, creator_name: creatorName };
              }
              return group;
          });
        }
        if (eventType === 'DELETE') {
          if (!old || !old.id) return currentGroups;
          return currentGroups.filter(group => group.id !== old.id);
        }
        return currentGroups;
      });
    };
    
    const channel = supabase
      .channel('community-group-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, handleGroupChanges)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [allUsers]);

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
