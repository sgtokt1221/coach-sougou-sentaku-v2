"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface AdminScopeContextValue {
  viewAsAdminUid: string | null;
  viewAsAdminName: string | null;
  setViewAs: (uid: string | null, name?: string | null) => void;
}

const AdminScopeContext = createContext<AdminScopeContextValue>({
  viewAsAdminUid: null,
  viewAsAdminName: null,
  setViewAs: () => {},
});

export function AdminScopeProvider({ children }: { children: ReactNode }) {
  const [viewAsAdminUid, setViewAsAdminUid] = useState<string | null>(null);
  const [viewAsAdminName, setViewAsAdminName] = useState<string | null>(null);

  function setViewAs(uid: string | null, name?: string | null) {
    setViewAsAdminUid(uid);
    setViewAsAdminName(name ?? null);
  }

  return (
    <AdminScopeContext value={{ viewAsAdminUid, viewAsAdminName, setViewAs }}>
      {children}
    </AdminScopeContext>
  );
}

export function useAdminScope() {
  return useContext(AdminScopeContext);
}
