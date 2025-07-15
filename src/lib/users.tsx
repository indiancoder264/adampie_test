
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { User } from "@/lib/auth";

const initialUsers: User[] = [];

type AllUsersContextType = {
  allUsers: User[];
  // All mutation-related functions are now handled by server actions.
};

const AllUsersContext = createContext<AllUsersContextType | undefined>(undefined);

export const AllUsersProvider = ({ children, initialUsers: serverUsers }: { children: ReactNode, initialUsers: User[] }) => {
  const [allUsers, setAllUsers] = useState<User[]>(serverUsers || initialUsers);

  useEffect(() => {
    // Data is now passed in from the root layout, but we can update it if it changes
    setAllUsers(serverUsers);
  }, [serverUsers]);

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
