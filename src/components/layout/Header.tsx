"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { signOutUser } from "@/lib/firebase/auth";
import { SidebarContent } from "./Sidebar";
import { AdminScopeSelector } from "./AdminScopeSelector";

export function Header() {
  const { user, userProfile } = useAuth();
  const pathname = usePathname();
  const showScopeSelector = userProfile?.role === "superadmin" && pathname.startsWith("/admin");

  const initials =
    userProfile?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  return (
    <header className="flex h-12 lg:h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md gap-2">
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="lg:hidden" />
          }
        >
          <Menu className="size-5" />
          <span className="sr-only">Menu</span>
        </SheetTrigger>
        <SheetContent side="left" showCloseButton>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {showScopeSelector && (
        <div className="hidden lg:block">
          <AdminScopeSelector />
        </div>
      )}

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex items-center gap-2.5 rounded-full px-2 py-1 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring" />
          }
        >
          <span className="hidden text-sm font-medium sm:block">
            {userProfile?.displayName ?? "User"}
          </span>
          <Avatar size="default">
            <AvatarImage
              src={user?.photoURL ?? undefined}
              alt={userProfile?.displayName ?? "User"}
            />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" sideOffset={8}>
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">
              {userProfile?.displayName ?? "User"}
            </p>
            <p className="text-xs text-muted-foreground">
              {userProfile?.email}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOutUser()}>
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
