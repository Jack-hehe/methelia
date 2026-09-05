"use client";
import { createContext, useContext, type ReactNode } from "react";
export type CourseLanguage = "en" | "zh-TW";
const Context = createContext<CourseLanguage>("zh-TW");
export function CourseLanguageProvider({
  language,
  children,
}: {
  language: CourseLanguage;
  children: ReactNode;
}) {
  return <Context.Provider value={language}>{children}</Context.Provider>;
}
export function useCourseLanguage() {
  const language = useContext(Context);
  return {
    language,
    english: language === "en",
    t: (zh: string, en: string) => (language === "en" ? en : zh),
  };
}
