export interface EmotionItem {
  emotion: string;
  hint: string;
}

export interface ProverbItem {
  start: string;
  end: string;
}

export interface MemoryItem {
  icon: string;
  name: string;
}

export type HelperType =
  | 'quickQuestion'
  | 'emotionAct'
  | 'proverb'
  | 'positiveQuote'
  | 'kindMessage'
  | 'memoryGame'
  | 'gratitudeThree'
  | 'breathingHelper'
  | 'strengthBadges'
  | 'selfCompassion';

export interface ChallengeData {
  id: number;
  title: string;
  shortTitle: string;
  icon3d: string;
  category: string;
  isPsych: boolean;
  color: string;
  scoreRing: string;
  mainPrompt: string;
  subPrompt: string;
  helperType: HelperType;
  questionsBank?: string[];
  emotionsBank?: EmotionItem[];
  proverbsBank?: ProverbItem[];
  quotesInspiration?: string[];
  memorySets?: MemoryItem[][];
}

export const challengesData: ChallengeData[] = [
  {
    id: 1,
    title: "جاوبي بسرعة عن سؤال",
    shortTitle: "جاوبي بسرعة",
    icon3d: "⚡",
    category: "تحدي السرعة والبديهة",
    isPsych: false,
    color: "#EE6B33", // UOSSM Primary Orange
    scoreRing: "100",
    mainPrompt: "جاوبي بسرعة عن سؤال!",
    subPrompt: "بدون تفكير طويل.. عبّري بعفوية ومن القلب خلال ثوانٍ!",
    helperType: "quickQuestion",
    questionsBank: [
      "ما هي أكثر كلمة تمنحكِ الشعور بالأمان والراحة؟",
      "لو كانت سعادتكِ اليوم بلون معين، أي لون تختارين ولماذا؟",
      "ما هو أول شيء تفعلينه عندما تشعرين بالضغط لتهدئة نفسكِ؟",
      "من هو الشخص الذي ترتاحين للحديث معه دائماً دون تكلف؟",
      "ما هي أكثر صفة تحبينها في شخصيتكِ؟",
      "ما هي الرائحة أو الأكلة التي تعيد لكِ ذكريات الطفولة الجميلة؟",
      "لو معكِ تذكرة سفر فورية الآن، إلى أين تذهبين ومع من؟",
      "ما هو الشيء البسيط الذي يجعل يومكِ جميلاً منذ الصباح؟"
    ]
  },
  {
    id: 2,
    title: "مثّلي شعوراً وعلى الجمهور تخمينه",
    shortTitle: "مثّلي شعوراً",
    icon3d: "🎭",
    category: "تحدي التمثيل والتعبير",
    isPsych: false,
    color: "#2B6CB0", // Medical Deep Steel Blue
    scoreRing: "50",
    mainPrompt: "مثّلي شعوراً وعلى الجمهور تخمينه!",
    subPrompt: "استخدمي تعابير الوجه وحركة اليدين فقط بدون كلام، وعلى السيدات الحاضرات تخمين الشعور!",
    helperType: "emotionAct",
    emotionsBank: [
      { emotion: "الفرح المفاجئ بخبر طال انتظاره 🎉", hint: "ابتسامة واسعة ويدين على الوجه من السعادة" },
      { emotion: "الفخر والاعتزاز بعد إنجاز صعب 🏆", hint: "وقفة واثقة ورفع الرأس بابتسامة رضا" },
      { emotion: "الطمأنينة والسكينة العميقة 🕊️", hint: "إغماض العينين بهدوء مع تنهدة راحة ويد على القلب" },
      { emotion: "الدهشة والانبهار بهدية غير متوقعة 🎁", hint: "فتح العينين بذهول جميل" },
      { emotion: "الحماس الشديد لبدء مغامرة جديدة 🚀", hint: "طاقة عالية وفرك اليدين بحماس" },
      { emotion: "الحنان والعطف على طفل صغير 🤱", hint: "نظرة دافئة وحركة طبطبة لطيفة" },
      { emotion: "الامتنان العميق لشخص ساعدكِ 🙏", hint: "وضع اليد على الصدر مع إيماءة شكر دافئة" }
    ]
  },
  {
    id: 3,
    title: "كمّلي المثل الشعبي",
    shortTitle: "كمّلي المثل الشعبي",
    icon3d: "🏺",
    category: "تحدي التراث والأمثال",
    isPsych: false,
    color: "#D97706", // Warm Amber Gold
    scoreRing: "75",
    mainPrompt: "كمّلي المثل الشعبي!",
    subPrompt: "اسمعي بداية المثل الشعبي وكمّليه بسرعة مع الحاضرات:",
    helperType: "proverb",
    proverbsBank: [
      { start: "اللي بيهونها...", end: "بتهون! 🌸" },
      { start: "الصبر مفتاح...", end: "الفرج! 🔑" },
      { start: "الجنة بدون ناس...", end: "ما بتنداس! 🌿" },
      { start: "جارك القريب ولا...", end: "أخوك البعيد! 🏡" },
      { start: "اللي ما إلو قديم...", end: "ما إلو جديد! ✨" },
      { start: "لاقييني ولا...", end: "تغديني! 😊" },
      { start: "إيد لوحدها...", end: "ما بتزقف! 👏" },
      { start: "الطيور على أشكالها...", end: "تقع! 🕊️" }
    ]
  },
  {
    id: 4,
    title: "احكي جملة إيجابية للسيدات",
    shortTitle: "جملة إيجابية",
    icon3d: "🌟",
    category: "طاقة إيجابية وتشجيع",
    isPsych: false,
    color: "#0D9488", // Caring Teal
    scoreRing: "30",
    mainPrompt: "احكي جملة إيجابية للسيدات الحاضرات تبعث فيهن الأمل والطاقة!",
    subPrompt: "شاركيهم كلمة من القلب، حكمة تؤمنين بها، أو دعوة جميلة ترفع المعنويات وتزرع الابتسامة.",
    helperType: "positiveQuote",
    quotesInspiration: [
      "«كل يوم جديد هو فرصة جديدة لنزهر من جديد مهما كانت الظروف.»",
      "«وجودكنّ معاً اليوم هو أجمل مصدر للقوة والدعم.. أنتنّ رائعات!»",
      "«لا تستصغري أي خطوة تقومين بها، فكل صبرٍ اليوم يصنع فرجاً غداً.»"
    ]
  },
  {
    id: 5,
    title: "اختاري سيدة ووجهي لها رسالة جميلة",
    shortTitle: "رسالة لسيدة",
    icon3d: "💌",
    category: "تواصل ومودة",
    isPsych: false,
    color: "#E0533C", // Coral Terracotta
    scoreRing: "20",
    mainPrompt: "اختاري سيدة من الحاضرات ووجهي لها رسالة جميلة ومُشجعة!",
    subPrompt: "كلمة طيبة، شكر، أو إشادة بابتسامتها وحضورها الجميل اليوم.",
    helperType: "kindMessage"
  },
  {
    id: 6,
    title: "تحدي الذاكرة: تذكري 5 أشياء ظهرت على الشاشة",
    shortTitle: "تحدي الذاكرة (5 أشياء)",
    icon3d: "🧠",
    category: "تحدي التركيز والذاكرة",
    isPsych: false,
    color: "#475569", // UOSSM Slate Grey-Blue
    scoreRing: "100",
    mainPrompt: "تحدي الذاكرة: تذكري 5 أشياء ظهرت على الشاشة!",
    subPrompt: "ركزي جيداً! ستظهر 5 أشياء لمدة 5 ثوانٍ فقط ثم تختفي، وعليكِ تذكرها بالترتيب أو بدون ترتيب!",
    helperType: "memoryGame",
    memorySets: [
      [
        { icon: "☕", name: "فنجان قهوة" },
        { icon: "🌸", name: "وردة جميلة" },
        { icon: "📖", name: "كتاب" },
        { icon: "🕯️", name: "شمعة مضيئة" },
        { icon: "🔑", name: "مفتاح" }
      ],
      [
        { icon: "🦋", name: "فراشة" },
        { icon: "🍎", name: "تفاحة حمراء" },
        { icon: "⌚", name: "ساعة يد" },
        { icon: "☂️", name: "مظلة" },
        { icon: "🎁", name: "صندوق هدية" }
      ],
      [
        { icon: "🌙", name: "هلال" },
        { icon: "🫒", name: "غصن زيتون" },
        { icon: "🫖", name: "إبريق شاي" },
        { icon: "🪞", name: "مرآة" },
        { icon: "💎", name: "جوهرة" }
      ]
    ]
  },
  {
    id: 7,
    title: "لحظة امتنان وتقدير",
    shortTitle: "لحظة امتنان",
    icon3d: "🌷",
    category: "دعم نفسي وتفريغ انفعالي",
    isPsych: true,
    color: "#F97316", // Bright Warm Orange
    scoreRing: "50",
    mainPrompt: "لحظة امتنان: اذكري 3 أشياء بسيطة في حياتكِ تشعرين بالامتنان لوجودها اليوم وتمنحكِ القوة.",
    subPrompt: "التركيز على النعم الصغيرة يجدد طاقتنا النفسية ويمنح القلب السكينة.",
    helperType: "gratitudeThree"
  },
  {
    id: 8,
    title: "ركن الهدوء وتفريغ التوتر",
    shortTitle: "ركن الهدوء والتنفس",
    icon3d: "🌬️",
    category: "دعم نفسي وتفريغ انفعالي",
    isPsych: true,
    color: "#0284C7", // Calm Sky Blue
    scoreRing: "75",
    mainPrompt: "تفريغ لطيف: خذي نفساً عميقاً مع جميع السيدات، وشاركي شيئاً واحداً يساعدكِ عادةً على تهدئة توتركِ وتجديد طاقتكِ.",
    subPrompt: "يمكنكِ مشاركة عادة يومية بسيطة، دعاء، مشروب دافئ، أو نشاط يريح بالكِ.",
    helperType: "breathingHelper"
  },
  {
    id: 9,
    title: "نقطة قوة وفخر",
    shortTitle: "نقطة قوة وفخر",
    icon3d: "💪",
    category: "دعم نفسي وتمكين ذاتي",
    isPsych: true,
    color: "#C2410C", // Deep Burnt Orange
    scoreRing: "30",
    mainPrompt: "فخر وإنجاز: احكي عن موقف صعب مررتِ به واستطعتِ تجاوزه، وما هي الصفة القوية التي اكتشفتِها في شخصيتكِ وقتها؟",
    subPrompt: "كل سيدة فينا تحمل بداخلها قوة خفية وحكمة تظهر في الأوقات الصعبة.",
    helperType: "strengthBadges"
  },
  {
    id: 10,
    title: "رسالة طبطبة لنفسكِ",
    shortTitle: "رسالة طبطبة لنفسكِ",
    icon3d: "🤍",
    category: "دعم نفسي وتعاطف مع الذات",
    isPsych: true,
    color: "#0F766E", // Deep Emerald Teal
    scoreRing: "100",
    mainPrompt: "رسالة لنفسكِ: لو أردتِ توجيه كلمة حنونة أو رسالة تشجيع وطبطبة لنفسكِ على كل ما تحملتِه، ماذا تقولين لها اليوم؟",
    subPrompt: "كوني لطيفة وحنونة مع نفسكِ اليوم كما أنتِ لطيفة ومعطاءة مع الجميع.",
    helperType: "selfCompassion"
  }
];
