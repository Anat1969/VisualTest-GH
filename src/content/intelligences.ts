// The intelligences block. Names, descriptions, keywords and colours mirror the INTELIGENS app
// (Anat1969/INTELIGENS, src/data/intelligences.ts) so both apps speak one language.
import type { TestType } from '../logic/types';

export type IntelligenceId =
  | 'linguistic'
  | 'logical'
  | 'spatial'
  | 'musical'
  | 'kinesthetic'
  | 'interpersonal'
  | 'intrapersonal'
  | 'naturalist'
  | 'existential'
  | 'emotional'
  | 'digital'
  | 'systems';

export interface Intelligence {
  id: IntelligenceId;
  number: string;
  name: string;
  domain: string;
  keyword: string;
  description: string;
  hue: string; // "H, S%, L%"
  group: 'gardner' | 'extension';
}

export const INTELLIGENCES_APP_URL = 'https://inteligens.lovable.app';

export const INTELLIGENCES: Intelligence[] = [
  { id: 'linguistic', number: '01', name: 'לשונית-מילולית', domain: 'שפה', keyword: 'פואטיקה', hue: '0, 82%, 62%', group: 'gardner', description: 'רגישות לשפה כחומר חי — לקצב המשפט, לבחירת המילה, לאופן שבו טיעון נבנה ומתמוטט. מי שניחן בה לא רק מסביר — הוא יוצר מציאות במילים.' },
  { id: 'logical', number: '02', name: 'לוגית-מתמטית', domain: 'הגיון', keyword: 'מבנה', hue: '30, 88%, 58%', group: 'gardner', description: 'חשיבה בדפוסים, ביחסי סיבה-תוצאה, בהוכחות. הכישרון לזהות שהנחה מוטעית בתחילת שרשרת — לפני שהיא הופכת לאסון.' },
  { id: 'spatial', number: '03', name: 'מרחבית-ויזואלית', domain: 'חזות', keyword: 'קומפוזיציה', hue: '52, 85%, 52%', group: 'gardner', description: 'חשיבה בתמונות ובמרחבים — היכולת לסובב אובייקט בנפש, לראות מה מסתתר מאחורי הפינה, לתכנן בשלוש ממדים לפני שמגיעים לשניים.' },
  { id: 'musical', number: '04', name: 'מוזיקלית-קצבית', domain: 'קצב', keyword: 'תבנית', hue: '90, 65%, 48%', group: 'gardner', description: 'רגישות לדפוסים אקוסטיים, לחזרה, לסטייה מהמצופה. היכולת לשמוע מבנה ברעש ולמצוא סדר בתוך אנרכיה קולית.' },
  { id: 'kinesthetic', number: '05', name: 'גופנית-קינסתטית', domain: 'גוף', keyword: 'מגע', hue: '145, 70%, 45%', group: 'gardner', description: 'ידע שמחזיקים הידיים לפני שהראש מעבד אותו. לומדים בעשייה, בנגיעה, בתנועה שמלמדת מה המחשבה לא יכולה.' },
  { id: 'interpersonal', number: '06', name: 'בינאישית', domain: 'חברה', keyword: 'נוכחות', hue: '180, 72%, 46%', group: 'gardner', description: 'קריאת מצבי רוח, כוונות ומה שלא נאמר בחדר. הכישרון לדעת — לפני ששאלת — מה האדם שמולך צריך.' },
  { id: 'intrapersonal', number: '07', name: 'תוך-אישית', domain: 'פנים', keyword: 'בהירות', hue: '210, 78%, 58%', group: 'gardner', description: 'הכרה עמוקה של עצמך — רגשות, כוחות, עיוורים, מניעים. זה לא בריאות נפשית. זה מפה פנימית שמאפשרת ניווט.' },
  { id: 'naturalist', number: '08', name: 'נטורליסטית', domain: 'מערכות', keyword: 'דפוס', hue: '240, 68%, 62%', group: 'gardner', description: 'הכישרון לסווג, לזהות ולהבחין בין דברים שנראים דומים. החשיבה האקולוגית — כל דבר הוא חלק ממערכת שמקיימת את עצמה.' },
  { id: 'existential', number: '09', name: 'קיומית-פילוסופית', domain: 'עומק', keyword: 'משמעות', hue: '270, 65%, 60%', group: 'extension', description: 'שאלות על מות, משמעות, תכלית ומקום האדם ביקום. לא כאבדוניזם — כאוריינטציה שמכוונת החלטות יומיומיות.' },
  { id: 'emotional', number: '10', name: 'רגשית', domain: 'לב', keyword: 'תהודה', hue: '300, 70%, 58%', group: 'extension', description: 'זיהוי, ויסות ותרגום של רגשות לאנרגיית פעולה. ההבדל בין להיות מוצף רגשית לבין להשתמש ברגש כנתון.' },
  { id: 'digital', number: '11', name: 'דיגיטלית-מערכתית', domain: 'טכנולוגיה', keyword: 'לוגיקה', hue: '330, 75%, 58%', group: 'extension', description: 'הבנת אלגוריתמים, ממשקים, שכבות הפשטה וזרימת מידע. היכולת לחשוב עם המכונה — לא לשרת אותה.' },
  { id: 'systems', number: '12', name: 'מערכתית-סיבתית', domain: 'קשרים', keyword: 'מינוף', hue: '350, 78%, 60%', group: 'extension', description: 'ראיית הקשרים הנסתרים — לולאות משוב, השפעות מושהות, נקודות מינוף. ידיעה שכל פתרון הוא גם גנן של בעיה עתידית.' },
];

export const intelligenceById = (id: string) => INTELLIGENCES.find((i) => i.id === id);
export const hsl = (hue: string, alpha?: number) => (alpha === undefined ? `hsl(${hue})` : `hsla(${hue}, ${alpha})`);

/* ---------------- practice programmes ---------------- */

export interface Skill {
  id: string;
  name: string;
  what: string; // what this sub-skill is, in one line
  drill?: TestType; // scored drill that trains it
  tool?: 'rhythm' | 'compress'; // open practice tool that trains it
  strategies: string[];
}

export interface Program {
  intelligence: IntelligenceId;
  premise: string; // why these skills, in one or two sentences
  skills: Skill[];
}

export const PROGRAMS: Partial<Record<IntelligenceId, Program>> = {
  linguistic: {
    intelligence: 'linguistic',
    premise:
      'שלוש מיומנויות שהתיאור עצמו מונה: בחירת המילה, האופן שבו טיעון נבנה, וקצב המשפט. שתיים נמדדות בתרגילים עם מפתח תשובות, והשלישית נבנית בכלי עבודה פתוח.',
    skills: [
      {
        id: 'relations',
        name: 'יחסי משמעות',
        what: 'לזהות את היחס בין שתי מילים ולמצוא זוג שמקיים אותו בדיוק.',
        drill: 'analogy',
        strategies: [
          'נסחי את היחס במשפט אחד לפני שאת מסתכלת על האפשרויות: "דף הוא חלק מספר".',
          'הציבי את המשפט בכל אפשרות. רק זוג אחד יעבור בלי לשנות את המשפט.',
          'שימי לב לכיוון: "חלק משלם" אינו "שלם שמכיל חלק".',
          'הבחיני בין משפחות קרובות: חלק-שלם מול פרט-קבוצה, עוצמה מול הפך.',
        ],
      },
      {
        id: 'precision',
        name: 'מיון ודיוק',
        what: 'להבחין בין מילים שנראות שייכות לאותה קבוצה, ולמצוא את זו שאינה.',
        drill: 'oddword',
        strategies: [
          'מצאי קודם את הקבוצה המשותפת לרוב המילים, ונסחי אותה במדויק.',
          'בדקי כל מילה מול ההגדרה, לא מול התחושה.',
          'מילה חריגה במראה אינה בהכרח חריגה בהגדרה: עטלף הוא יונק.',
        ],
      },
      {
        id: 'argument',
        name: 'רצף וטיעון',
        what: 'לסדר משפטים לטקסט שבו כל משפט נשען על הקודם, והמסקנה מגיעה בסוף.',
        drill: 'sequence',
        strategies: [
          'חפשי את משפט הפתיחה: זה שאינו מפנה לשום דבר קודם.',
          'מילות קישור מסמנות מקום: "לכן", "משום כך" ו"כך" באות אחרי הנימוק.',
          'כינויים ("הוא", "השלב הזה") מחייבים שהדבר שאליו הם מפנים כבר הוזכר.',
          'המסקנה מכלילה. אם משפט נשמע כמו סיכום, הוא כנראה האחרון.',
        ],
      },
      {
        id: 'rhythm',
        name: 'קצב המשפט',
        what: 'לשמוע את הטקסט: אורך המשפטים, ההפסקות, החזרות, ולשלוט בהם.',
        tool: 'rhythm',
        strategies: [
          'קצב חי משלב משפטים ארוכים וקצרים. רצף של משפטים באותו אורך נשמע מונוטוני.',
          'משפט קצר אחרי ארוך מדגיש את מה שנאמר בו.',
          'חזרה על מילה יכולה להיות כלי. חזרה לא מכוונת היא רעש.',
        ],
      },
      {
        id: 'economy',
        name: 'תמציתיות',
        what: 'לומר את אותו הדבר בפחות מילים, בלי לאבד מידע.',
        tool: 'compress',
        strategies: [
          'מחקי מילים שאינן מוסיפות מידע: "בעצם", "למעשה", "באופן כללי".',
          'החליפי צירוף בפועל אחד: "קיבל החלטה" הופך ל"החליט".',
          'בדקי שהמשפט המקוצר עדיין עונה על אותן שאלות: מי, מה, למה.',
        ],
      },
    ],
  },
};
