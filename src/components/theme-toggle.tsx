"use client";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({
  dark,
  onToggle,
}: {
  dark: boolean;
  onToggle: () => void;
}) {
  return (
    <button className="icon-button" aria-label="切換深淺色" onClick={onToggle}>
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
