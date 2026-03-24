"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Mic, FolderOpen, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidebarContent } from "./Sidebar";

const tabs = [
  { label: "ホーム", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "小論文", href: "/student/essay/new", icon: FileText },
  { label: "面接", href: "/student/interview/new", icon: Mic },
  { label: "書類", href: "/student/documents", icon: FolderOpen },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-[60px] border-t border-border bg-background/90 backdrop-blur-lg pb-safe">
        <div className="flex h-full items-center justify-around px-2">
          {tabs.map(({ label, href, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "size-5 transition-transform duration-200",
                    isActive && "scale-105"
                  )}
                />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </Link>
            );
          })}

          {/* その他タブ: Sheetを開く */}
          <button
            onClick={() => setMenuOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200",
              menuOpen ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Menu
              className={cn(
                "size-5 transition-transform duration-200",
                menuOpen && "scale-105"
              )}
            />
            <span className="text-[10px] font-medium leading-none">その他</span>
          </button>
        </div>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" showCloseButton>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
