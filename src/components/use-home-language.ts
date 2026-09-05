"use client";
import { useEffect, useState } from "react";
import type { HomeLanguage } from "./home-language";

const KEY = "methelia-home-language";
export function useHomeLanguage() {
  const [language, setLanguage] = useState<HomeLanguage>("en");
  useEffect(() => {
    try {
      setLanguage(localStorage.getItem(KEY) === "zh" ? "zh" : "en");
    } catch {}
  }, []);
  function changeLanguage(next: HomeLanguage) {
    setLanguage(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  }
  return { language, changeLanguage };
}
