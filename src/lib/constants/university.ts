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

/** 地域区分（8 区分） */
export const REGIONS = [
  "北海道",
  "東北",
  "関東",
  "中部",
  "近畿",
  "中国",
  "四国",
  "九州・沖縄",
] as const;
export type Region = (typeof REGIONS)[number];

/** 都道府県 → 地域区分 */
export const PREFECTURE_TO_REGION: Record<string, Region> = {
  北海道: "北海道",
  青森県: "東北", 岩手県: "東北", 宮城県: "東北", 秋田県: "東北", 山形県: "東北", 福島県: "東北",
  茨城県: "関東", 栃木県: "関東", 群馬県: "関東", 埼玉県: "関東", 千葉県: "関東", 東京都: "関東", 神奈川県: "関東",
  新潟県: "中部", 富山県: "中部", 石川県: "中部", 福井県: "中部", 山梨県: "中部", 長野県: "中部",
  岐阜県: "中部", 静岡県: "中部", 愛知県: "中部", 三重県: "中部",
  滋賀県: "近畿", 京都府: "近畿", 大阪府: "近畿", 兵庫県: "近畿", 奈良県: "近畿", 和歌山県: "近畿",
  鳥取県: "中国", 島根県: "中国", 岡山県: "中国", 広島県: "中国", 山口県: "中国",
  徳島県: "四国", 香川県: "四国", 愛媛県: "四国", 高知県: "四国",
  福岡県: "九州・沖縄", 佐賀県: "九州・沖縄", 長崎県: "九州・沖縄", 熊本県: "九州・沖縄",
  大分県: "九州・沖縄", 宮崎県: "九州・沖縄", 鹿児島県: "九州・沖縄", 沖縄県: "九州・沖縄",
};

/** 偏差値バンド（大学の最大偏差値で判定） */
export const DEVIATION_BANDS: { id: string; label: string; test: (max: number) => boolean }[] = [
  { id: "65", label: "65以上", test: (m) => m >= 65 },
  { id: "60", label: "60〜64", test: (m) => m >= 60 && m < 65 },
  { id: "55", label: "55〜59", test: (m) => m >= 55 && m < 60 },
  { id: "50", label: "50〜54", test: (m) => m >= 50 && m < 55 },
  { id: "u50", label: "50未満", test: (m) => m < 50 },
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
