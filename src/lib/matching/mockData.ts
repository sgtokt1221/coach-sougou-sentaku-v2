import type { University } from "@/lib/types/university";

import kyuteiData from "@/data/universities/kyutei.json";
import nationalData from "@/data/universities/national.json";
import publicData from "@/data/universities/public.json";
import soukeijochiData from "@/data/universities/soukeijochi.json";
import marchData from "@/data/universities/march.json";
import kankandouritsuData from "@/data/universities/kankandouritsu.json";
import sankinkohryuData from "@/data/universities/sankinkohryu.json";
import nittoukomasenData from "@/data/universities/nittoukomasen.json";
import seiseimeidokuData from "@/data/universities/seiseimeidoku.json";
import privateData from "@/data/universities/private.json";

export const MOCK_UNIVERSITIES: University[] = [
  ...(kyuteiData as University[]),
  ...(nationalData as University[]),
  ...(publicData as University[]),
  ...(soukeijochiData as University[]),
  ...(marchData as University[]),
  ...(kankandouritsuData as University[]),
  ...(sankinkohryuData as University[]),
  ...(nittoukomasenData as University[]),
  ...(seiseimeidokuData as University[]),
  ...(privateData as University[]),
];
