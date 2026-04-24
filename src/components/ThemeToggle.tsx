"use client";

import { useEffect, useState } from "react";
import { ToggleButton, useTheme } from "@once-ui-system/core";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState("light");

  useEffect(() => {
    setCurrentTheme(document.documentElement.getAttribute("data-theme") || "light");
  }, [theme]);

  const nextTheme = currentTheme === "light" ? "dark" : "light";

  return (
    <ToggleButton
      prefixIcon={currentTheme === "dark" ? "light" : "dark"}
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
    />
  );
}
