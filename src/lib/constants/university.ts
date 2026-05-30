import type { University } from "@/lib/types/university";

/** 大学グループ → 日本語ラベル */
export const GROUP_LABELS: Record<University["group"], string> = {
  kyutei: "旧帝大",
  soukeijochi: "早慶上智",
  march: "MARCH",
  kankandouritsu: "関関同立",
  sankinkohryu: "産近甲龍",
  nittoukomasen: "日東駒専",
  seiseimeidoku: "成成明獨國武",
  sesshintsuitou: "摂神追桃",
  national: "国立大学",
  public: "公立大学",
  private: "その他私立",
};

/** 大学グループ → バッジ配色 */
export const GROUP_COLORS: Record<University["group"], string> = {
  kyutei: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  soukeijochi: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  march: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  kankandouritsu: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sankinkohryu: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  nittoukomasen: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  seiseimeidoku: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  sesshintsuitou: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  national: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  public: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  private: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

/** 表示順（難関順） */
export const GROUP_ORDER: University["group"][] = [
  "kyutei",
  "soukeijochi",
  "march",
  "kankandouritsu",
  "sankinkohryu",
  "nittoukomasen",
  "seiseimeidoku",
  "sesshintsuitou",
  "national",
  "public",
  "private",
];

/** 47都道府県（北→南のおおよその順） */
export const PREFECTURES: string[] = [
  "北海道",
  "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];
