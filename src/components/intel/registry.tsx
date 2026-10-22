import type { ReactNode } from 'react';
import type { ToolId } from '../../content/intelligences';
import { TimingLab, TraceLab } from './BodyTools';
import { CompressLab } from './CompressLab';
import { ChainLab, PatternLab } from './LogicTools';
import { Sequencer, Tapper } from './MusicTools';
import { KeyBuilder, ObservationJournal } from './NatureTools';
import { PrepSheet, StakeholderMap } from './PeopleTools';
import { RhythmLab } from './RhythmLab';
import { Calibration, CheckIn } from './SelfTools';
import { FrameLab, Turntable } from './SpatialTools';
import './tools.css';

export interface ToolDef {
  title: string;
  blurb: string;
  render: (ctx: { color: string; seed: string }) => ReactNode;
}

/** Every open practice tool, by id. A skill points at one with `tool`. */
export const TOOLS: Record<ToolId, ToolDef> = {
  rhythm: { title: 'מעבדת הקצב', blurb: 'כותבים, ורואים את הטקסט כמו שאוזן שומעת אותו: אורך המשפטים, ההפסקות והחזרות.', render: ({ color, seed }) => <RhythmLab color={color} seed={seed} /> },
  compress: { title: 'סדנת התמצות', blurb: 'אותו מידע בפחות מילים. הכתיבה נמדדת מול תקציב מילים, ובסוף אפשר להשוות לנוסח לדוגמה.', render: ({ color }) => <CompressLab color={color} /> },
  chain: { title: 'בודק השרשרת', blurb: 'מפרקים טיעון לחוליות ומסמנים כל אחת: עובדה, הנחה או מסקנה. הכלי מראה מה נשען על ההנחה הראשונה.', render: ({ color }) => <ChainLab color={color} /> },
  pattern: { title: 'מעבדת הדפוס', blurb: 'מקלידים סדרה ורואים את משולש ההפרשים ושורת היחסים. כך נראה כלל לפני שמנסחים אותו.', render: ({ color }) => <PatternLab color={color} /> },
  turntable: { title: 'שולחן הסיבוב', blurb: 'מסובבים צורה ביד עד שהיא מתיישרת עם המטרה, ומחליטים: אותה צורה או תמונת מראה.', render: ({ color }) => <Turntable color={color} /> },
  frame: { title: 'מסגור מבט', blurb: 'טוענים צילום, בוחרים יחס חיתוך ורשת עזר, ומזיזים את המסגרת. קומפוזיציה היא החלטה על מה נשאר בחוץ.', render: ({ color }) => <FrameLab color={color} /> },
  sequencer: { title: 'רשת הקצב', blurb: 'ארבעה קולות על 16 צעדים. בונים דפוס, שומעים אותו בלולאה, ומשנים צליל אחד כדי לשמוע מה הוא עושה.', render: ({ color }) => <Sequencer color={color} /> },
  tapper: { title: 'מד היציבות', blurb: 'מקישים קצב קבוע. הכלי מודד את הקצב ואת הסטייה בין הקשה להקשה.', render: ({ color }) => <Tapper color={color} /> },
  timing: { title: 'מול המטרונום', blurb: 'המטרונום מנגן, ומקישים על הפעמה. כל הקשה נרשמת: מוקדמת, בזמן או מאוחרת.', render: ({ color }) => <TimingLab color={color} /> },
  trace: { title: 'מעקב קו', blurb: 'עוברים על קו מתפתל בתנועה אחת, באצבע או בעכבר. נמדדים הדיוק והכיסוי.', render: ({ color }) => <TraceLab color={color} /> },
  stakeholders: { title: 'מפת בעלי עניין', blurb: 'ממקמים את האנשים סביב החלטה לפי השפעה ועניין. הרבע מציע איך לשתף כל אחד.', render: ({ color }) => <StakeholderMap color={color} /> },
  prep: { title: 'דף הכנה לשיחה', blurb: 'שבע שאלות לפני שיחה קשה. נשמר בדפדפן, ואפשר להדפיס.', render: () => <PrepSheet /> },
  checkin: { title: 'צ׳ק-אין יומי', blurb: 'שלושה מדדים ומשפט אחד, פעם ביום. הגרף של 14 ימים מראה דפוסים שיום בודד מסתיר.', render: () => <CheckIn /> },
  calibration: { title: 'הערכה מול מציאות', blurb: 'מעריכים את הדיוק שלך בכל תרגיל, ומשווים לנתונים האמיתיים מהאפליקציה.', render: ({ color }) => <Calibration color={color} /> },
  key: { title: 'בונה מפתח הגדרה', blurb: 'בונים מפתח של שאלות כן ולא שמבחין בין שמונה עלים. מפתח טוב שואל מעט ומפצל שווה.', render: ({ color }) => <KeyBuilder color={color} /> },
  journal: { title: 'יומן תצפית', blurb: 'תצפית אחת ביום: מה, איפה, איך זה נראה, ובמה זה שונה מהדומה לו.', render: () => <ObservationJournal /> },
};
