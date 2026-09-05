export type HomeLanguage = "en" | "zh";

export const homeCopy = {
  en: {
    lang: "en",
    title: "I want to learn",
    courses: "Courses",
    login: "Log in",
    loginTitle: "Log in is coming soon",
    loginMessage:
      "You can try a lesson without an account. Your progress is saved in this browser.",
    loginClose: "Got it",
    explore: "Explore projects",
    github: "View source on GitHub",
    language: "Choose language",
    goal: "What do you want to learn?",
    start: "Start Exploring",
    demo: "Try a Lesson",
    dismiss: "Dismiss message",
    subjects: [
      "Web Design",
      "Technical Analysis",
      "Digital Marketing",
      "Fluid Dynamics",
    ],
    ideas: [
      "I want to build my own website from scratch",
      "I want to understand technical analysis",
      "I want to plan a digital marketing campaign",
      "I want to understand how fluids move",
    ],
    errors: {
      goal: "Enter a learning goal between 1 and 1,500 characters.",
      ai: "AI courses are not available yet. Try a sample lesson instead.",
      busy: "Please wait for your current courses to finish generating.",
      connection: "Connection failed. Please try again.",
      other: "Something went wrong. Please try again.",
    },
  },
  zh: {
    lang: "zh-Hant",
    title: "我想學習",
    courses: "課程",
    login: "登入",
    loginTitle: "登入功能即將開放",
    loginMessage: "目前無需帳號即可體驗課程，學習進度會保存在此瀏覽器中。",
    loginClose: "知道了",
    explore: "看看其他人做了什麼",
    github: "在 GitHub 上查看原始碼",
    language: "選擇語言",
    goal: "你想學什麼？",
    start: "開始學習",
    demo: "先體驗一堂課",
    dismiss: "關閉訊息",
    subjects: ["網頁設計", "技術分析", "數位行銷", "流體動力學"],
    ideas: [
      "我想從零開始，做一個屬於自己的網站",
      "我想了解技術分析的基本概念",
      "我想規劃一個數位行銷活動",
      "我想理解流體如何運動",
    ],
    errors: {
      goal: "請輸入 1–1500 字的學習目標",
      ai: "目前尚未開放 AI 課程，請先體驗一堂課。",
      busy: "請等待目前的課程生成完成",
      connection: "連線失敗，請再試一次",
      other: "發生錯誤，請再試一次。",
    },
  },
} as const;

export function homeError(message: string, language: HomeLanguage) {
  const errors = homeCopy[language].errors;
  if (message === "請輸入 1–1500 字的學習目標") return errors.goal;
  if (message.startsWith("尚未設定 AI。")) return errors.ai;
  if (message === "請等待目前的課程生成完成") return errors.busy;
  if (
    message === "連線失敗，請再試一次" ||
    /failed to fetch|networkerror|fetch failed/i.test(message)
  )
    return errors.connection;
  return errors.other;
}
