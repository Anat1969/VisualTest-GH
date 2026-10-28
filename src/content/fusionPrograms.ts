// Dedicated practice for fusions, keyed by fusion key ('a+b', alphabetical), like PROGRAMS is keyed by intelligence id.
// A fusion page always works without an entry: it falls back to a mixed round of both intelligences' keyed drills
// and the card's daily challenge. Entries are added in batches of ten, in FUSIONS key order.
import type { Skill } from './intelligences';

export interface FusionProgram {
  premise: string;
  skills: Skill[];
}

export const FUSION_PROGRAMS: Record<string, FusionProgram> = {
  'digital+emotional': {
    premise: "התרגיל מציג מסר אחד ושואל באיזה ערוץ להעביר אותו. הוא בודק את שני הצעדים יחד: הערכת הרגש, והתאמת רוחב הפס.",
    skills: [{ id: 'fx_channel', name: "רוחב פס רגשי", what: "להעריך כמה רגש יש במסר, ולבחור ערוץ שמסוגל לשאת אותו.", drill: 'fx_channel', strategies: ["דרגי את המסר מ-1 עד 5 לפני שאת בוחרת ערוץ.", "מעל 2: קול. מעל 4: מפגש.", "יותר מילים לא מעבירות טון."] }],
  },
  'digital+existential': {
    premise: "התרגיל מציג מסך הגדרות ושואל איזו ברירת מחדל מקודדת הנחה על המשתמשת. ברמות הגבוהות יש גם ברירות מחדל שמגינות עלייך, וצריך להבדיל.",
    skills: [{ id: 'fx_defaults', name: "ברירת המחדל המקודדת", what: "לזהות בהגדרות המערכת את ההחלטה שנעשתה בשמך, לטובת המערכת.", drill: 'fx_defaults', strategies: ["שאלי: מי מרוויח אם לא אשנה?", "ברירת מחדל מגינה בוחרת בשבילך לטובתך. מקודדת בוחרת בשבילך לטובתה."] }],
  },
  'digital+interpersonal': {
    premise: "התרגיל מציג שבוע של הודעות ואת ההודעה של היום, ושואל מה חורג. ברמה 3 הרעש הרגיל גדל, וצריך להבחין בינו לבין חריגה.",
    skills: [{ id: 'fx_baseline', name: "חריגה מהבסיס", what: "לזהות שינוי בהתנהגות הדיגיטלית של אדם, מול הבסיס שלו עצמו.", drill: 'fx_baseline', strategies: ["בדקי לכל ממד את הטווח של השבוע.", "חריגה היא מחוץ לטווח של האדם, לא מחוץ לנורמה שלך."] }],
  },
  'digital+intrapersonal': {
    premise: "התרגיל מציג יומן תנאים ותגובות ושואל איזה צירוף מפעיל אותה. רק צירוף אחד מתאים לכל השורות.",
    skills: [{ id: 'fx_conditions', name: "הצירוף המפעיל", what: "למצוא את צירוף התנאים המדויק שמפעיל תגובה, מתוך יומן.", drill: 'fx_conditions', strategies: ["בדקי את הצירוף גם בימים בלי תגובה: שם הוא לא אמור להופיע.", "תנאי שמופיע בכל ימי התגובה עדיין לא מספיק לבד."] }],
  },
  'digital+kinesthetic': {
    premise: "התרגיל מציג רצף תנועה ומטרה, ושואל איזו פקודה שגויה. בכל רצף יש גם פקודה שנראית חשודה אבל משרתת את המטרה.",
    skills: [{ id: 'fx_motion', name: "השורה השגויה", what: "לקרוא תנועה כרצף פקודות ולמצוא את השורה שסותרת את המטרה.", drill: 'fx_motion', strategies: ["חפשי \"אם...\" ו\"כדי לחסוך\": שם מסתתרים הבאגים.", "מתקנים שורה אחת, לא את כל התנועה."] }],
  },
  'digital+linguistic': {
    premise: "התרגיל מציג שני משפטים מוויכוח ושואל באיזו קומה כל אחד מדבר: מטרה, תהליך או ביצוע.",
    skills: [{ id: 'fx_floors', name: "קומות ההפשטה", what: "לשמוע באיזו רמת הפשטה כל אחד מדבר, ולזהות ויכוח בין קומות.", drill: 'fx_floors', strategies: ["למה: תוצאה וערך. מה: שלבים וסדר. איך: חומר ומידה.", "ויכוח בין קומות לא נגמר עד שמסכימים על הקומה."] }],
  },
  'digital+logical': {
    premise: "התרגיל מפרק טענה לארבע קומות ושואל איפה היא נשברת. ברוב המקרים השבר נמוך מההסקה.",
    skills: [{ id: 'fx_broken', name: "הקומה השבורה", what: "למצוא את הקומה הנמוכה שבה טיעון נשבר: מדידה, העברה, סיכום או הסקה.", drill: 'fx_broken', strategies: ["בודקים מלמטה למעלה.", "שאלי על כל קומה: מה הייתי צריכה לראות כדי לסמוך עליה?"] }],
  },
  'digital+musical': {
    premise: "התרגיל מציג כמה בקרים של אותה שגרה ושואל איזה צעד משתנה. ברמה 3 צעד קבוע גם זז ממקומו, וצריך להבחין בין הזזה לשינוי.",
    skills: [{ id: 'fx_loop', name: "החלק המשתנה בלופ", what: "לפרק שגרה לחלק שחוזר ולחלק שמשתנה.", drill: 'fx_loop', strategies: ["עברי עמודה-עמודה.", "צעד שזז אבל נשאר אותו צעד הוא חלק מהלופ."] }],
  },
  'digital+naturalist': {
    premise: "התרגיל מציג פיד לפני לחיצה ואחריה ושואל מה המנגנון. התשובה מסתתרת במכנה המשותף של מה שעלה.",
    skills: [{ id: 'fx_feed', name: "קריאת הדירוג", what: "להסיק את מנגנון הדירוג מתוך מה שעלה וירד בפיד.", drill: 'fx_feed', strategies: ["השווי לפני ואחרי.", "מה משותף לכל מה שעלה: נושא, זמן או פופולריות?"] }],
  },
  'digital+spatial': {
    premise: "התרגיל מציג פריטים בחזית עם מרחק צפייה, משך מבט ושטח, ושואל לאן ללכת עם תקציב הפירוט.",
    skills: [{ id: 'fx_resolution', name: "איפה הפירוט משתלם", what: "להשקיע פירוט היכן שהעין נעצרת, לפי מרחק ומשך מבט.", drill: 'fx_resolution', strategies: ["חלקי משך מבט במרחק.", "גודל ושטח אינם תשומת לב."] }],
  },
};
