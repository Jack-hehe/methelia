"use client";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({
  dark,
  onToggle,
  label = "切換深淺色",
}: {
  dark: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <button className="icon-button" aria-label={label} onClick={onToggle}>
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
