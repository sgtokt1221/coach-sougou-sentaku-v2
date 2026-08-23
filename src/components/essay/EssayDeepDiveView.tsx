"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import type { EssayDeepDive } from "@/lib/types/essay";

/**
 * テーマの深掘り（長文）。
 *
 * 採点の中で作っていた短い版は「入力から確認できる背景だけ」しか書けず、
 * 背景知識を補うという目的を果たせていなかった。ここは読み物として、
 * 対立軸・立場・具体・誤解・切り口までを通しで読ませる。
 */
export function EssayDeepDiveView({
  deepDive,
  generating,
  onGenerate,
}: {
  deepDive?: EssayDeepDive;
  generating: boolean;
  onGenerate: () => void;
}) {
  if (!deepDive) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="bg-primary/10 mb-4 inline-flex size-14 items-center justify-center rounded-full">
            <Sparkles className="text-primary size-7" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">このテーマを詳しく読む</h3>
          <p className="text-muted-foreground mx-auto mb-5 max-w-md text-sm leading-relaxed">
            何が対立している論点なのか、主な立場とその根拠、知っておくと書ける具体、
            よくある誤解までを通しでまとめます。次に同じテーマが出たときに書けるようにするための読み物です。
            一度作ると保存されます。
          </p>
          <Button onClick={onGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                作成中…（1分ほどかかります）
              </>
            ) : (
              <>
                <BookOpen className="mr-2 size-4" />
                詳しく読む
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="text-primary size-5" />
            {deepDive.issue}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Section title="何が対立している論点か">
            <Body>{deepDive.conflict}</Body>
          </Section>
        </CardContent>
      </Card>

      {deepDive.positions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">主な立場</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {deepDive.positions.map((p, i) => (
              <div key={i} className="space-y-2">
                <p className="font-semibold">{p.label}</p>
                <Body>{p.claim}</Body>
                <div className="border-primary/40 space-y-2 border-l-2 pl-3">
                  <Labeled label="根拠">{p.grounds}</Labeled>
                  <Labeled label="弱いところ">{p.weakness}</Labeled>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {deepDive.facts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">知っていると書ける具体</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deepDive.facts.map((f, i) => (
              <div key={i} className="space-y-1">
                <p className="font-semibold">{f.title}</p>
                <Body>{f.detail}</Body>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {deepDive.misconceptions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">よくある誤解</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deepDive.misconceptions.map((m, i) => (
              <div key={i} className="space-y-1">
                <p className="text-rose-600">{m.belief}</p>
                <Body>{m.correction}</Body>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {deepDive.angles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">この設問で使える切り口</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deepDive.angles.map((a, i) => (
              <div key={i} className="space-y-1">
                <p className="font-semibold">{a.angle}</p>
                <Body>{a.howToUse}</Body>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {deepDive.furtherQuestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">さらに考えるための問い</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
              {deepDive.furtherQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-semibold">{title}</p>
      {children}
    </div>
  );
}

/** 読み物なので行間を広く取る。詰まった長文は読まれない */
function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-[1.9] whitespace-pre-wrap sm:text-[0.95rem]">
      {children}
    </p>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <p className="text-sm leading-[1.9]">
      <span className="text-muted-foreground mr-2 text-xs font-semibold">
        {label}
      </span>
      {children}
    </p>
  );
}
