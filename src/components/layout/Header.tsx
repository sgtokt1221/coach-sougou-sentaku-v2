"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { signOutUser } from "@/lib/firebase/auth";
import { MobileMenuContent } from "./MobileMenuContent";
import { AdminScopeSelector } from "./AdminScopeSelector";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
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
    <header className="relative flex h-14 items-center justify-between border-b border-border/60 bg-background px-4 gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMenuOpen(true)}
        aria-label="メニューを開く"
      >
        <Menu className="size-5" />
      </Button>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" showCloseButton className="w-[85vw] sm:w-[360px] p-0">
          <MobileMenuContent onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* スマホ専用: 中央にロゴ */}
      <Link
        href={
          userProfile?.role === "admin" || userProfile?.role === "superadmin"
            ? "/admin/dashboard"
            : userProfile?.role === "teacher"
              ? "/teacher/dashboard"
              : "/student/dashboard"
        }
        className="lg:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center"
        aria-label="ホームへ"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="coach for 総合型選抜" className="h-9 lg:h-6 dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-dark.svg" alt="coach for 総合型選抜" className="h-9 lg:h-6 hidden dark:block" />
      </Link>

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
