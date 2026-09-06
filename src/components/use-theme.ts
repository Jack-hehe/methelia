"use client";
import { useEffect, useState } from "react";

const KEY = "methelia-theme";

/** Shared by the app shell and the explore route so both agree on the choice. */
export function useTheme() {
  const [dark, setDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let initial = document.documentElement.dataset.theme === "dark";
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "dark" || saved === "light") initial = saved === "dark";
    } catch {}
    setDark(initial);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // Do not overwrite the pre-paint theme while restoring state on a new route.
    if (!loaded) return;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem(KEY, dark ? "dark" : "light");
    } catch {}
  }, [dark, loaded]);

  return { dark, toggle: () => setDark((v) => !v) };
}
