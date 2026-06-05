import type { DistinctiveFeature } from "@/lib/types/university";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  Wallet,
  MapPin,
  GraduationCap,
  Award,
  Sprout,
  FlaskConical,
  Compass,
  Microscope,
  Activity,
  Ship,
  Rocket,
  Globe,
  LineChart,
  Building,
  Network,
  Users,
  Home,
  Scale,
  Stethoscope,
  Sparkles,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

/** DistinctiveFeature.icon（Lucide名文字列）→ アイコンコンポーネントの対応表。 */
const ICON_MAP: Record<string, LucideIcon> = {
  Building2,
  Wallet,
  MapPin,
  GraduationCap,
  Award,
  Sprout,
  FlaskConical,
  Compass,
  Microscope,
  Activity,
  Ship,
  Rocket,
  Globe,
  LineChart,
  Building,
  Network,
  Users,
  Home,
  Scale,
  Stethoscope,
};

/** アイコン名を解決。未知名は Sparkles にフォールバックする。 */
function iconFor(name: string): LucideIcon {
  return ICON_MAP[name] ?? Sparkles;
}

interface DistinctiveFeatureCardsProps {
  /** セクション見出し（任意） */
  title?: string;
  features?: DistinctiveFeature[];
}

/**
 * 「他大学にない特色」をカードグリッドで表示する。
 * 各カードは title / summary /（あれば）志望理由書・面接での活用ヒント / 出典バッジ（公式リンク＋取得年月）を持つ。
 * features が空・未指定なら何も描画しない（レイアウトが崩れない）。
 */
export function DistinctiveFeatureCards({
  title,
  features,
}: DistinctiveFeatureCardsProps) {
  if (!features || features.length === 0) return null;

  return (
    <section className="space-y-3">
      {title && (
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Sparkles className="size-4 text-primary" />
          {title}
        </h2>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = iconFor(feature.icon);
          return (
            <Card key={feature.id} className="h-full">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <h3 className="text-sm font-bold leading-snug">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.summary}
                </p>
                {feature.useForAdmissions && (
                  <p className="rounded-md bg-muted/60 p-2 text-xs leading-relaxed">
                    <span className="font-semibold">活用: </span>
                    {feature.useForAdmissions}
                  </p>
                )}
                <a
                  href={feature.source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="size-3" />
                  公式 {feature.source.retrievedAt}
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
