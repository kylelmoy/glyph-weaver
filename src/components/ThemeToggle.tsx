"use client";

import { useEffect, useState } from "react";
import { ToggleButton, useTheme } from "@once-ui-system/core";

/**
 * Button that toggles between light and dark colour modes.
 *
 * `displayTheme` is initialised to "light" to match the server render (which
 * has no knowledge of the user's saved preference). The effect corrects it to
 * the real theme after hydration, avoiding a server/client HTML mismatch.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [displayTheme, setDisplayTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setDisplayTheme(theme === "dark" ? "dark" : "light");
  }, [theme]);

  const nextTheme = displayTheme === "light" ? "dark" : "light";

  return (
    <ToggleButton
      prefixIcon={displayTheme === "dark" ? "light" : "dark"}
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
    />
  );
}
