/**
 * Explainer registry — ported verbatim from the vanilla EXPLAINERS table.
 * Pure data; the sheet that renders it lives in components/ExplainerSheet.tsx.
 */
export interface Explainer {
  term: string;
  /** Short label for the chip/related-pill button. Falls back to `term`. */
  chip?: string;
  short: string;
  formula?: string;
  body: string[];
  caveat?: string;
  related?: string[];
}

export const EXPLAINERS: Record<string, Explainer> = {
  tdee: {
    term: 'TDEE — Total Daily Energy Expenditure', chip: 'TDEE',
    short: 'Every calorie your body burns in a day — not just the ones you burn exercising.',
    body: [
      'It breaks down roughly into four parts: your <strong>basal metabolic rate</strong> (~60–70%), the energy spent <strong>digesting food</strong> (~10%), <strong>everyday movement</strong> like walking, fidgeting and standing, and finally <strong>deliberate exercise</strong>.',
      'That last slice is usually the smallest one, which is why “I trained today, so I earned this” arithmetic tends to disappoint — an hour in the gym might be 400 kcal against a 2,800 kcal day.',
    ],
    related: ['bmr', 'baseline_tdee', 'deficit'],
  },
  bmr: {
    term: 'BMR — Basal Metabolic Rate', chip: 'BMR',
    short: 'What you would burn lying in bed all day, doing absolutely nothing.',
    body: [
      'Beating your heart, breathing, running your brain, holding your body temperature steady, rebuilding tissue. It is the single largest part of your daily burn.',
      'BMR scales with <strong>lean mass</strong>, not total weight — which is why adding muscle nudges it up, and why losing weight fast enough to shed muscle drags it down.',
      'This dashboard never estimates BMR from a height-and-weight formula. Those formulas carry roughly 10% error, and the calibrated baseline — BMR and daily living measured together against real weight change — replaces the need for one.',
    ],
    related: ['tdee', 'baseline_tdee'],
  },
  baseline_tdee: {
    term: 'Adaptive baseline', chip: 'Baseline',
    short: 'Your daily burn splits into a slow-moving baseline plus whatever you actually trained, and the baseline gets re-measured against reality every week.',
    formula: 'TDEE  =  baseline  +  training burn\n\nbaseline  =  BMR  +  ordinary daily living\nburn      =  what Strava recorded that day',
    body: [
      '<strong>Why split it.</strong> Baseline moves slowly — over weeks, as bodyweight and habits shift. Training burn is wildly variable: nothing on a rest day, close to a thousand calories on a hard one. Treating total burn as one averaged figure gives you a number that is only correct on a day with average training, overstating rest days and understating hard ones by hundreds of calories. Splitting them lets each part be handled the way it actually behaves.',
      '<strong>How the baseline gets measured.</strong> Over a calibration window, whatever you ate but did not burn shows up as body mass. Subtract the training burn already accounted for, and what remains is the baseline that must have been true. Run that arithmetic and you get an <em>implied</em> baseline — what the last few weeks say your baseline really is.',
      '<strong>Why it is damped.</strong> The implied figure is not adopted whole. It moves the baseline part of the way — typically half — because a single window carries noise from water weight, logging gaps and cycle timing. Damping means the baseline converges on the truth over several calibrations instead of lurching after each one. The gap between the implied and adopted lines on the trend chart <em>is</em> that damping.',
      'The calibration runs server-side about once a week and every version is kept, so the baseline has a history rather than just a current value. This dashboard only reads it.',
    ],
    caveat: 'Training burn from Strava is gross, not net — it includes the calories you would have burned at rest during that hour anyway. Since the implied baseline is calculated by subtracting that burn, an inflated burn figure pushes the implied baseline down. The number is therefore a conservative floor: your true baseline is likely a little higher, not lower.',
    related: ['tdee', 'bmr', 'deficit'],
  },
  deficit: {
    term: 'Deficit and surplus', chip: 'Deficit',
    short: 'The gap between what you ate and what you burned.',
    body: [
      'Eat below your burn and you are in a <strong>deficit</strong>; your body covers the difference from its own stores. Eat above it and the <strong>surplus</strong> gets stored.',
      'The conventional exchange rate is about 3,500 kcal per pound of body mass, so a steady 500 kcal daily deficit works out near 1 lb per week.',
    ],
    caveat: 'A single day tells you almost nothing. Scale movement over hours to days is overwhelmingly water and gut contents — judge a deficit over weeks, never overnight.',
    related: ['tdee', 'baseline_tdee', 'energy_balance'],
  },
  energy_balance: {
    term: 'Energy balance', chip: 'Energy balance',
    short: 'Calories in versus calories out, and the running gap between the two.',
    body: [
      'The headline figure is what you ate against your daily target. The bar underneath shows how far through that target you are.',
      'Your target is your TDEE adjusted by your goal — lower to lose weight, higher to gain, unchanged to maintain.',
    ],
    related: ['tdee', 'deficit', 'macros'],
  },
  macros: {
    term: 'Macronutrients', chip: 'Macros',
    short: 'The three nutrients that carry energy — protein, carbohydrate and fat — plus fiber.',
    formula: 'protein  4 kcal per gram\ncarbs    4 kcal per gram\nfat      9 kcal per gram\nfiber    largely indigestible',
    body: [
      'Your calorie target sets the total; your diet style sets how that total is divided between the three.',
      'Protein is pinned to your bodyweight rather than to a percentage of calories, then fat and carbohydrate fill whatever energy remains.',
    ],
    related: ['protein_per_kg', 'net_carbs', 'fiber', 'diet_styles'],
  },
  protein_per_kg: {
    term: 'Protein per kilogram', chip: 'Protein target',
    short: 'Why your protein target is set per kilogram of bodyweight instead of as a share of calories.',
    body: [
      'Protein requirements track your body, not your plate. A 200 lb person and a 120 lb person eating identical calories need meaningfully different protein — a percentage-based target would hand them the same number and be wrong for at least one of them.',
      'Common anchors: around <strong>1.6 g/kg</strong> for general health, up to <strong>2.2 g/kg</strong> when cutting, where higher protein helps protect muscle in a deficit.',
    ],
    related: ['macros', 'custom_diet'],
  },
  net_carbs: {
    term: 'Net carbs', chip: 'Net carbs',
    short: 'Total carbohydrate minus fiber — the portion that actually reaches your bloodstream.',
    body: [
      'Fiber is technically a carbohydrate but you cannot digest it, so it contributes little usable energy and has minimal effect on blood sugar.',
      'Carb ceilings on keto and carnivore refer to net carbs, which is why a high-fiber vegetable can fit a low-carb day where its raw carbohydrate number suggests otherwise.',
    ],
    related: ['fiber', 'diet_styles', 'macros'],
  },
  fiber: {
    term: 'Fiber', chip: 'Fiber',
    short: 'Carbohydrate your body cannot break down — it feeds your gut bacteria rather than you.',
    body: [
      'The reference intake works out at about 14 g per 1,000 kcal, so a larger appetite carries a larger fiber target.',
      'Beyond digestion it slows sugar absorption, supports cholesterol clearance, and is the primary food source for your gut microbiome.',
    ],
    related: ['net_carbs', 'plant_diversity'],
  },
  hrv: {
    term: 'HRV — Heart Rate Variability', chip: 'HRV',
    short: 'How much the gap between consecutive heartbeats varies, measured in milliseconds.',
    body: [
      'The counterintuitive part: <strong>more variation is better</strong>. A healthy, recovered heart does not tick like a metronome — it adjusts constantly, beat to beat.',
      'It reflects your parasympathetic “rest and digest” nervous system. High HRV means that system is in charge and you are recovered. It falls with stress, illness, alcohol, short sleep and hard training — often a day before you consciously feel any of it.',
    ],
    caveat: 'HRV is intensely individual. One person’s excellent 40 ms is another’s poor 40 ms, so comparing your absolute number against anyone else’s tells you essentially nothing. Only your own trend is meaningful.',
    related: ['rhr', 'recovery', 'sleep_score'],
  },
  rhr: {
    term: 'RHR — Resting Heart Rate', chip: 'RHR',
    short: 'Your heart rate at true rest, usually captured during sleep.',
    body: [
      'A lower resting heart rate generally reflects a stronger, more efficient heart — each beat moves more blood, so fewer beats are needed.',
      'An overnight rise is among the earliest objective signals of illness, alcohol, under-recovery or accumulating training fatigue, and it frequently shows up before any symptom does.',
    ],
    related: ['hrv', 'recovery'],
  },
  recovery: {
    term: 'Recovery', chip: 'Recovery',
    short: 'A daily readiness figure blending heart rate variability, resting heart rate and sleep.',
    body: [
      'It is an attempt to answer one question: how much hard work can your body absorb today?',
      'The exact weighting is set by whichever device produced it, so treat the trend as the signal and the absolute value as merely a label.',
    ],
    related: ['hrv', 'rhr', 'sleep_score'],
  },
  sleep_score: {
    term: 'Sleep score', chip: 'Sleep score',
    short: 'A composite of how long you slept and how well.',
    body: [
      'Typically folds together total duration, the split across light, deep and REM stages, and how often you woke.',
      'Deep sleep drives physical repair; REM drives memory and emotional processing. A long night broken into fragments can score below a shorter uninterrupted one.',
    ],
    related: ['hrv', 'recovery'],
  },
  micronutrients: {
    term: 'Micronutrient analysis', chip: 'Micronutrients',
    short: 'Vitamins and minerals you need in small amounts, shown as a percentage of your daily target.',
    body: [
      'Unlike macros these carry no calories, but shortfalls surface as fatigue, poor recovery, weak immunity and worse over time.',
      'Tiles are ordered worst-first, so whatever most needs your attention sits at the top rather than being buried in an alphabetical list.',
    ],
    related: ['rda', 'watch_flags'],
  },
  rda: {
    term: 'RDA — Recommended Dietary Allowance', chip: 'RDA',
    short: 'The daily intake that covers the requirements of about 97% of healthy people.',
    body: [
      'These are set by sex and age, and the differences are not cosmetic. Iron is the clearest case: <strong>18 mg</strong> for women aged 19–50 against <strong>8 mg</strong> for men and post-menopausal women. Magnesium, zinc, and several vitamins vary too.',
      'This is why your profile’s sex and age drive the whole micronutrient card — a single fixed table would quietly misreport several nutrients for roughly half its users.',
    ],
    caveat: 'An RDA is a population target, not a personal prescription. Clearing it is not a guarantee of sufficiency, and missing it on one day is not a deficiency. Persistent shortfalls are what matter.',
    related: ['micronutrients', 'watch_flags'],
  },
  watch_flags: {
    term: 'Watch flags', chip: 'Watch flags',
    short: 'Nutrients your dietary restrictions place at higher risk, raised automatically.',
    body: [
      'Restrictions do not change your macro split, but they do remove entire food groups — and with them the nutrients those groups happened to supply.',
      'Cutting dairy removes a dominant source of calcium and vitamin D; going vegan removes essentially every reliable source of B12; avoiding gluten removes fortified wheat products, a main US source of folate and iron.',
      'Flagged nutrients are highlighted whether or not you are currently short on them, so a developing gap is visible early.',
    ],
    related: ['rda', 'micronutrients'],
  },
  plant_diversity: {
    term: 'Plant diversity', chip: 'Plant diversity',
    short: 'How many botanically distinct plants you have eaten this week.',
    body: [
      'The American Gut Project found that people eating <strong>30 or more different plants a week</strong> had markedly more diverse gut microbiomes than those eating fewer than ten — a stronger relationship than any single dietary label like vegetarian or omnivore.',
      'Variety is what counts here, not volume. Different species feed different bacterial populations, so thirty plants once each beats one plant thirty times.',
      'Herbs, spices, nuts, seeds, whole grains and legumes all count, which makes the target far more reachable than it first sounds.',
    ],
    related: ['fiber', 'micronutrients'],
  },
  correlation: {
    term: 'Correlation (r)', chip: 'Correlation',
    short: 'A number between −1 and +1 describing how tightly two measurements move together.',
    formula: ' 0.0   no relationship\n±0.1–0.3   weak\n±0.3–0.5   moderate\n±0.5+      strong (for human data)\n±1.0   perfect lockstep',
    body: [
      'A positive r means both rise together; negative means one rises as the other falls. Sleep and HRV usually run positive; resting heart rate against HRV usually runs negative.',
      'Human data is messy, so thresholds sit lower than in physics — an r of 0.5 between two health metrics is a genuinely strong relationship.',
    ],
    caveat: 'Correlation is not causation, and with only a few weeks of data r moves around a great deal. Two metrics can track each other closely because a third thing drives both — a stressful week wrecks sleep and HRV together without either causing the other.',
    related: ['standard_error', 'rolling_avg'],
  },
  standard_error: {
    term: 'Standard error (the ± figure)', chip: 'Standard error',
    short: 'How much a measured number would wobble if you gathered the data all over again.',
    body: [
      'A measured figure of 2,800 ±50 says the underlying data pins it tightly. The same 2,800 ±300 says the honest answer is “somewhere between 2,500 and 3,100”.',
      'It shrinks as you add data points and as those points fall into a cleaner pattern, which is why a longer measurement window reports a tighter range.',
    ],
    related: ['baseline_tdee', 'correlation'],
  },
  rolling_avg: {
    term: 'Rolling average', chip: 'Rolling average',
    short: 'An average across a sliding window of recent days, used to see past daily noise.',
    body: [
      'Each point averages itself with the days before it, so one enormous meal or one dehydrated morning cannot yank the line around.',
      'Longer windows are smoother but slower to reflect a genuine change in direction.',
    ],
    related: ['correlation', 'consistency'],
  },
  consistency: {
    term: 'Consistency', chip: 'Consistency',
    short: 'A calendar grid where each square is a day, shaded by how closely you hit your targets.',
    body: [
      'Darker squares are better days. What you are looking for is not a perfect grid but the absence of long pale stretches.',
      'Streaks and gaps are far easier to read as a grid than as a line chart, which is the whole reason this view exists.',
    ],
    related: ['rolling_avg'],
  },
  diet_styles: {
    term: 'Diet styles', chip: 'Diet styles',
    short: 'Each preset divides your calorie target between the macros differently.',
    body: [
      '<strong>Balanced</strong> — 1.6 g/kg protein, 30% of calories from fat. <strong>High protein / cutting</strong> — 2.2 g/kg to protect muscle in a deficit. <strong>Mediterranean</strong> — higher fat at 38%, weighted toward olive oil, fish and nuts. <strong>High carb</strong> — fat down to 22% to leave room for endurance fueling.',
      '<strong>Keto</strong> and <strong>carnivore</strong> invert the arithmetic: carbohydrate becomes a hard ceiling (30 g and 10 g net) and fat absorbs whatever energy is left. Both also raise the sodium target, because very low carbohydrate intake causes the kidneys to shed sodium noticeably faster.',
      '<strong>Custom</strong> hands the numbers to you directly.',
    ],
    related: ['macros', 'custom_diet', 'net_carbs'],
  },
  custom_diet: {
    term: 'Custom macros', chip: 'Custom macros',
    short: 'You set protein and optionally fat in grams; carbohydrate fills whatever calories remain.',
    body: [
      'Useful when you already know your numbers — “200 g of protein, minimum” is a target you hold to regardless of what a bodyweight formula would have suggested.',
      'Leave fat blank and it defaults to 30% of your calories. Carbohydrate is always the remainder, so the totals reconcile with your calorie target automatically.',
    ],
    related: ['macros', 'protein_per_kg', 'diet_styles'],
  },
};
