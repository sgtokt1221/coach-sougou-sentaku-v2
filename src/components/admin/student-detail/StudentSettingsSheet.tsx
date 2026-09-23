"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * 生徒詳細の「設定」のパネル（右から出る）。入れ物だけ。
 * 中身（プロフィール・機能スイッチ・プラン・担当・探究授業・削除）はページが children で渡し、
 * 表示条件（講師には出さない等）もページ側で今のまま持つ。
 */
export function StudentSettingsSheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b pr-14">
          <SheetTitle className="text-xl font-bold">設定</SheetTitle>
          <SheetDescription>プロフィールや利用できる機能を変えます</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
