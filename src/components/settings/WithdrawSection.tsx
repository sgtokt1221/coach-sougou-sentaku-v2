"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserX } from "lucide-react";
import { signOutUser } from "@/lib/firebase/auth";
import { AdmissionResultDialog } from "@/components/student/AdmissionResultDialog";

/**
 * 退会セクション。退会には進学先（合格大学）の登録が必須。
 * 登録後にアカウントを論理削除（role:"disabled"）し、サインアウトする。
 */
export function WithdrawSection() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <UserX className="size-4" />
          退会
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          退会すると、このアカウントは利用できなくなります。退会の前に、進学先（合格した大学）の登録をお願いします。
        </p>
        <Button variant="outline" className="text-destructive" onClick={() => setOpen(true)}>
          <UserX className="mr-1 size-4" />
          退会する
        </Button>
      </CardContent>

      <AdmissionResultDialog
        open={open}
        onOpenChange={setOpen}
        endpoint="/api/student/withdraw"
        withdraw
        onDone={() => void signOutUser()}
      />
    </Card>
  );
}
