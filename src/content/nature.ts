// Small food webs for the naturalist drill. eats: [eater, food]. Level 0 = producers.
export interface FoodWeb {
  title: string;
  species: { name: string; level: number }[];
  eats: [string, string][];
}

export const FOOD_WEBS: FoodWeb[] = [
  {
    title: 'שדה',
    species: [
      { name: 'עשבים', level: 0 },
      { name: 'ארנבות', level: 1 },
      { name: 'חגבים', level: 1 },
      { name: 'שועלים', level: 2 },
      { name: 'ציפורים', level: 2 },
      { name: 'נצים', level: 3 },
    ],
    eats: [
      ['ארנבות', 'עשבים'],
      ['חגבים', 'עשבים'],
      ['שועלים', 'ארנבות'],
      ['ציפורים', 'חגבים'],
      ['נצים', 'ציפורים'],
    ],
  },
  {
    title: 'בריכה',
    species: [
      { name: 'אצות', level: 0 },
      { name: 'חלזונות', level: 1 },
      { name: 'ראשנים', level: 1 },
      { name: 'דגים קטנים', level: 2 },
      { name: 'אנפות', level: 3 },
    ],
    eats: [
      ['חלזונות', 'אצות'],
      ['ראשנים', 'אצות'],
      ['דגים קטנים', 'ראשנים'],
      ['אנפות', 'דגים קטנים'],
    ],
  },
  {
    title: 'גינה עירונית',
    species: [
      { name: 'צמחים', level: 0 },
      { name: 'כנימות', level: 1 },
      { name: 'זחלים', level: 1 },
      { name: 'פרות משה', level: 2 },
      { name: 'דרורים', level: 2 },
      { name: 'חתולים', level: 3 },
    ],
    eats: [
      ['כנימות', 'צמחים'],
      ['זחלים', 'צמחים'],
      ['פרות משה', 'כנימות'],
      ['דרורים', 'זחלים'],
      ['חתולים', 'דרורים'],
    ],
  },
];
