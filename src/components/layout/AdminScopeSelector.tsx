"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminScope } from "@/contexts/AdminScopeContext";
import { authFetch, setViewAsAdmin } from "@/lib/api/client";
import type { AdminListItem } from "@/lib/types/admin";

export function AdminScopeSelector() {
  const { viewAsAdminUid, viewAsAdminName, setViewAs } = useAdminScope();
  const [admins, setAdmins] = useState<AdminListItem[]>([]);

  useEffect(() => {
    async function fetchAdmins() {
      try {
        const res = await authFetch("/api/superadmin/admins");
        if (res.ok) {
          const data = await res.json();
          setAdmins(Array.isArray(data) ? data : []);
        }
      } catch {
        // ignore
      }
    }
    fetchAdmins();
  }, []);

  function handleChange(value: string | null) {
    if (!value || value === "__all__") {
      setViewAs(null, null);
      setViewAsAdmin(null);
    } else {
      const admin = admins.find((a) => a.uid === value);
      setViewAs(value, admin?.displayName ?? null);
      setViewAsAdmin(value);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {viewAsAdminName && (
        <div className="flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          <Eye className="size-3" />
          {viewAsAdminName}として閲覧中
        </div>
      )}
      <Select
        value={viewAsAdminUid ?? "__all__"}
        onValueChange={handleChange}
      >
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder="視点を選択" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">全体表示</SelectItem>
          {admins.map((admin) => (
            <SelectItem key={admin.uid} value={admin.uid}>
              {admin.displayName}（{admin.role === "admin" ? "管理者" : "講師"}）
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
