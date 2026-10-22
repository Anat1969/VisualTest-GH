// Sentence rhythm of a Hebrew text: sentence lengths, pauses, repetition.
// Thresholds below are working rules of thumb of this app, not research findings.

export interface WordTok {
  w: string;
  len: number; // letters
  pause: 0 | 1 | 2; // 1 = comma-like pause after the word, 2 = end of sentence
}

export interface SentenceTok {
  text: string;
  words: WordTok[];
}

export interface RhythmStats {
  sentences: number;
  words: number;
  avg: number;
  sd: number;
  variety: number; // coefficient of variation of sentence length
  longest: number;
  shortest: number;
  repeated: [string, number][];
}

const NIQQUD = /[֑-ׇ]/g;
const STOP = new Set(
  'את של על עם זה זו זאת הוא היא הם הן אני אנחנו גם רק כי אם לא כל יש אין או אבל מה מי אשר כמו עוד אך כך לכן היה הייתה אל מן בין לפני אחרי כדי שלא כאשר כבר מאוד יותר פחות הזה הזו האלה אלה אותו אותה'.split(' '),
);

const clean = (w: string) => w.replace(NIQQUD, '').replace(/[^\p{L}\p{N}'"׳״-]/gu, '');
const letters = (w: string) => clean(w).replace(/['"׳״-]/g, '').length;

/** Light normalisation for repetition: drop a leading ו or ה on longer words. */
const stem = (w: string) => {
  const c = clean(w).replace(/['"׳״-]/g, '');
  return c.length > 3 && /^[וה]/.test(c) ? c.slice(1) : c;
};

export function tokenize(text: string): SentenceTok[] {
  const parts = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.map((sentence) => {
    const raw = sentence.split(' ').filter((w) => letters(w) > 0);
    const words: WordTok[] = raw.map((w, i) => ({
      w: clean(w),
      len: letters(w),
      pause: i === raw.length - 1 ? 2 : /[,;:—–]$/.test(w) ? 1 : 0,
    }));
    return { text: sentence, words };
  }).filter((s) => s.words.length);
}

export function stats(sents: SentenceTok[]): RhythmStats {
  const lens = sents.map((s) => s.words.length);
  const n = lens.length;
  const words = lens.reduce((a, b) => a + b, 0);
  const avg = n ? words / n : 0;
  const sd = n ? Math.sqrt(lens.reduce((a, l) => a + (l - avg) ** 2, 0) / n) : 0;
  const counts = new Map<string, number>();
  for (const s of sents)
    for (const t of s.words) {
      const k = stem(t.w);
      if (k.length < 3 || STOP.has(k) || STOP.has(t.w)) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  const repeated = [...counts.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return {
    sentences: n,
    words,
    avg,
    sd,
    variety: avg ? sd / avg : 0,
    longest: n ? Math.max(...lens) : 0,
    shortest: n ? Math.min(...lens) : 0,
    repeated,
  };
}

export function notes(sents: SentenceTok[], st: RhythmStats): string[] {
  const out: string[] = [];
  if (!st.sentences) return out;
  if (st.sentences >= 3 && st.variety < 0.25) out.push('הקצב אחיד מאוד: המשפטים כמעט באותו אורך. משפט קצר אחד בין ארוכים יחזיר לטקסט נשימה.');
  if (st.sentences >= 3 && st.variety >= 0.45) out.push('יש ניגוד חי בין משפטים ארוכים לקצרים. זה קצב שמושך קריאה.');
  if (st.avg > 20) out.push(`אורך ממוצע של ${st.avg.toFixed(0)} מילים למשפט. כדאי לפצל משפט או שניים.`);
  sents.forEach((s, i) => {
    if (s.words.length > 30) out.push(`משפט ${i + 1} ארוך מאוד (${s.words.length} מילים). נסי לחלק אותו במקום שבו מתחיל רעיון חדש.`);
  });
  const lens = sents.map((s) => s.words.length);
  for (let i = 1; i < lens.length; i++)
    if (lens[i - 1] >= 14 && lens[i] <= 6) {
      out.push(`משפט ${i + 1} הקצר שאחרי משפט ארוך מקבל הדגשה. ודאי שזה מה שרצית להדגיש.`);
      break;
    }
  if (st.repeated.length) out.push(`מילים שחוזרות: ${st.repeated.map(([w, c]) => `${w} (${c})`).join(', ')}. חזרה מכוונת היא כלי; חזרה מקרית היא רעש.`);
  return out;
}

export const wordCount = (text: string) => text.split(/\s+/).filter((w) => letters(w) > 0).length;
