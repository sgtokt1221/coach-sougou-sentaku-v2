import type { University } from "@/lib/types/university";

import kyuteiData from "@/data/universities/kyutei.json";
import kankandouritsuData from "@/data/universities/kankandouritsu.json";
import marchData from "@/data/universities/march.json";
import sankinkohryuData from "@/data/universities/sankinkohryu.json";
import soukeijochiData from "@/data/universities/soukeijochi.json";

export const MOCK_UNIVERSITIES: University[] = [
  ...(kyuteiData as University[]),
  ...(kankandouritsuData as University[]),
  ...(marchData as University[]),
  ...(sankinkohryuData as University[]),
  ...(soukeijochiData as University[]),
];
