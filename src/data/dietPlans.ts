export interface DietItem {
  name: string;
  emoji: string;
}
export interface DietPlan {
  condition: string;
  eat: DietItem[];
  avoid: DietItem[];
  tips: string[];
}

const DIET_PLANS: Record<string, DietPlan> = {
  diabetes: {
    condition: "Diabetes",
    eat: [
      { emoji: "🥦", name: "Leafy greens & non-starchy vegetables" },
      { emoji: "🍗", name: "Lean protein (chicken, fish, tofu)" },
      { emoji: "🌾", name: "Whole grains (brown rice, oats)" },
      { emoji: "🥜", name: "Nuts & seeds (small portions)" },
      { emoji: "🫘", name: "Legumes (lentils, chickpeas)" },
      { emoji: "💧", name: "Plenty of water" },
    ],
    avoid: [
      { emoji: "🍬", name: "Sugary sweets & desserts" },
      { emoji: "🥤", name: "Sugary drinks & sodas" },
      { emoji: "🍞", name: "Refined white bread & pastries" },
      { emoji: "🍟", name: "Fried & processed foods" },
      { emoji: "🍚", name: "Excess white rice" },
    ],
    tips: [
      "Eat at consistent times every day",
      "Check blood sugar before and after meals",
      "Prefer smaller, more frequent meals",
    ],
  },
  hypertension: {
    condition: "Hypertension",
    eat: [
      { emoji: "🥬", name: "Leafy greens (spinach, kale)" },
      { emoji: "🍌", name: "Potassium-rich fruits (banana, orange)" },
      { emoji: "🐟", name: "Fatty fish (salmon, mackerel)" },
      { emoji: "🌾", name: "Whole grains" },
      { emoji: "🧄", name: "Garlic & herbs for flavor" },
      { emoji: "🥛", name: "Low-fat dairy" },
    ],
    avoid: [
      { emoji: "🧂", name: "Salt & high-sodium foods" },
      { emoji: "🥓", name: "Processed & cured meats" },
      { emoji: "🍕", name: "Fast food & packaged snacks" },
      { emoji: "🍷", name: "Alcohol" },
      { emoji: "🥫", name: "Canned soups (high sodium)" },
    ],
    tips: [
      "Limit salt to under 5g per day",
      "Read food labels for hidden sodium",
      "Cook at home more often",
    ],
  },
  heart_disease: {
    condition: "Heart Disease",
    eat: [
      { emoji: "🐟", name: "Omega-3 rich fish" },
      { emoji: "🥑", name: "Healthy fats (avocado, olive oil)" },
      { emoji: "🫐", name: "Berries & antioxidant-rich fruits" },
      { emoji: "🌾", name: "Whole grains & fiber" },
      { emoji: "🥦", name: "Vegetables (all colors)" },
    ],
    avoid: [
      { emoji: "🧈", name: "Saturated fats (butter, ghee in excess)" },
      { emoji: "🍔", name: "Red & processed meat" },
      { emoji: "🍩", name: "Trans fats & fried foods" },
      { emoji: "🧂", name: "Excess salt" },
    ],
    tips: [
      "Stay physically active as advised by your doctor",
      "Monitor cholesterol levels regularly",
      "Manage stress with relaxation techniques",
    ],
  },
  other: {
    condition: "General Recovery",
    eat: [
      { emoji: "🍎", name: "Fresh fruits & vegetables" },
      { emoji: "🍗", name: "Lean protein for healing" },
      { emoji: "💧", name: "Plenty of fluids" },
      { emoji: "🌾", name: "Whole grains" },
      { emoji: "🥛", name: "Calcium-rich foods" },
    ],
    avoid: [
      { emoji: "🍟", name: "Fried & oily foods" },
      { emoji: "🥤", name: "Sugary beverages" },
      { emoji: "🧂", name: "Excess salt & spice" },
      { emoji: "🍷", name: "Alcohol" },
    ],
    tips: [
      "Eat small, frequent meals during recovery",
      "Stay hydrated throughout the day",
      "Follow nurse's specific dietary instructions",
    ],
  },
};

// Patient.diagnosis on the backend is a strict enum:
// "hypertension" | "diabetes" | "heart_disease" | "other" — match directly,
// with a fuzzy fallback for any free-text diagnosisDetails.
export function getDietPlanForDiagnosis(diagnosis?: string): DietPlan {
  if (!diagnosis) return DIET_PLANS.other;
  if (DIET_PLANS[diagnosis]) return DIET_PLANS[diagnosis];
  const d = diagnosis.toLowerCase();
  if (d.includes("diabet")) return DIET_PLANS.diabetes;
  if (
    d.includes("hypertens") ||
    d.includes("blood pressure") ||
    d.includes("bp")
  )
    return DIET_PLANS.hypertension;
  if (d.includes("heart") || d.includes("cardiac") || d.includes("cardio"))
    return DIET_PLANS.heart_disease;
  return DIET_PLANS.other;
}

export function getAllDietPlans(): DietPlan[] {
  return Object.values(DIET_PLANS);
}

// Merges a nurse's custom diet items on top of the diagnosis-based defaults.
// Custom items are ADDED to the default list (not a full replace), so the
// baseline guidance for the diagnosis is never lost.
export function getEffectiveDietPlan(
  diagnosis: string | undefined,
  customDiet?: { eat: string[]; avoid: string[] },
): DietPlan {
  const base = getDietPlanForDiagnosis(diagnosis);
  if (!customDiet || (!customDiet.eat?.length && !customDiet.avoid?.length))
    return base;

  return {
    ...base,
    eat: [
      ...base.eat,
      ...(customDiet.eat ?? []).map((name) => ({ emoji: "⭐", name })),
    ],
    avoid: [
      ...base.avoid,
      ...(customDiet.avoid ?? []).map((name) => ({ emoji: "🚫", name })),
    ],
  };
}
