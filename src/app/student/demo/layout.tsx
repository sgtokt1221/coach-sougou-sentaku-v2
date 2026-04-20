import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { TutorialExitButton } from "@/components/tutorial/TutorialExitButton";

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="size-4" />
            チュートリアル (サンプルデータ)
          </div>
          <TutorialExitButton />
        </div>
      </div>
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
