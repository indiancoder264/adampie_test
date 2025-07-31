
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { User } from "@/lib/auth";
import { supabase } from "./supabase";

const initialUsers: User[] = [];

type AllUsersContextType = {
  allUsers: User[];
};

const AllUsersContext = createContext<AllUsersContextType | undefined>(undefined);

export const AllUsersProvider = ({ children, initialUsers: serverUsers }: { children: ReactNode, initialUsers: User[] }) => {
  const [allUsers, setAllUsers] = useState<User[]>(serverUsers || initialUsers);

  useEffect(() => {
    setAllUsers(serverUsers);
  }, [serverUsers]);

  useEffect(() => {
    if (!supabase) return;
    
    const handleUserChanges = (payload: any) => {
      const { eventType, new: newRecord, old } = payload;
      setAllUsers(currentUsers => {
        if (eventType === 'INSERT') {
          return [...currentUsers, newRecord as User];
        }
        if (eventType === 'UPDATE') {
          return currentUsers.map(user => user.id === newRecord.id ? { ...user, ...newRecord } : user);
        }
        if (eventType === 'DELETE') {
          return currentUsers.filter(user => user.id !== old.id);
        }
        return currentUsers;
      });
    };

    const channel = supabase
      .channel('all-users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, handleUserChanges)
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <AllUsersContext.Provider value={{ allUsers }}>
      {children}
    </AllUsersContext.Provider>
  );
};

export const useAllUsers = () => {
  const context = useContext(AllUsersContext);
  if (context === undefined) {
    throw new Error("useAllUsers must be used within an AllUsersProvider");
  }
  return context;
};