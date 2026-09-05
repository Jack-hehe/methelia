"use client";
import { useEffect, useState } from "react";

const KEY = "methelia-theme";

/** Shared by the app shell and the explore route so both agree on the choice. */
export function useTheme() {
  const [dark, setDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setDark(localStorage.getItem(KEY) === "dark");
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    // Never persist the default before the stored choice has been read back.
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, dark ? "dark" : "light");
    } catch {}
  }, [dark, loaded]);

  return { dark, toggle: () => setDark((v) => !v) };
}
