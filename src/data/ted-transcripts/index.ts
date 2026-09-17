import { transcript as alGoreTheCaseForOptimismOnClimateChange } from "./al_gore_the_case_for_optimism_on_climate_change";
import { transcript as alexanderBettsOurRefugeeSystemIsFailingHereSHowWeCanFixIt } from "./alexander_betts_our_refugee_system_is_failing_here_s_how_we_can_fix_it";
import { transcript as andrewMcafeeWhatWillFutureJobsLookLike } from "./andrew_mcafee_what_will_future_jobs_look_like";
import { transcript as ericLiuHowToReviveYourBeliefInDemocracy } from "./eric_liu_how_to_revive_your_belief_in_democracy";
import { transcript as jenniferDoudnaHowCrisprLetsUsEditOurDna } from "./jennifer_doudna_how_crispr_lets_us_edit_our_dna";
import { transcript as kenRobinsonSaysSchoolsKillCreativity } from "./ken_robinson_says_schools_kill_creativity";
import { transcript as richardWilkinsonHowEconomicInequalityHarmsSocieties } from "./richard_wilkinson_how_economic_inequality_harms_societies";
import { transcript as stevenPinkerIsTheWorldGettingBetterOrWorseALookAtTheNumbers } from "./steven_pinker_is_the_world_getting_better_or_worse_a_look_at_the_numbers";

/**
 * talkId → 日本語字幕の書き起こし。
 *
 * 講義型の採点では、この書き起こしを出題資料として渡す。要約を挟むと
 * 「講演がそう言ったか」を要約の精度が決めてしまうため、原文を正本にする。
 */
export const TED_TRANSCRIPTS: Record<string, string> = {
  al_gore_the_case_for_optimism_on_climate_change:
    alGoreTheCaseForOptimismOnClimateChange,
  alexander_betts_our_refugee_system_is_failing_here_s_how_we_can_fix_it:
    alexanderBettsOurRefugeeSystemIsFailingHereSHowWeCanFixIt,
  andrew_mcafee_what_will_future_jobs_look_like:
    andrewMcafeeWhatWillFutureJobsLookLike,
  eric_liu_how_to_revive_your_belief_in_democracy:
    ericLiuHowToReviveYourBeliefInDemocracy,
  jennifer_doudna_how_crispr_lets_us_edit_our_dna:
    jenniferDoudnaHowCrisprLetsUsEditOurDna,
  ken_robinson_says_schools_kill_creativity:
    kenRobinsonSaysSchoolsKillCreativity,
  richard_wilkinson_how_economic_inequality_harms_societies:
    richardWilkinsonHowEconomicInequalityHarmsSocieties,
  steven_pinker_is_the_world_getting_better_or_worse_a_look_at_the_numbers:
    stevenPinkerIsTheWorldGettingBetterOrWorseALookAtTheNumbers,
};

export function getTedTranscript(talkId: string): string | undefined {
  return TED_TRANSCRIPTS[talkId];
}
