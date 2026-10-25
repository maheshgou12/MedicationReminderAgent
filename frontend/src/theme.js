import { useState } from "react";

/* =========================================================
   Theme (light / dark) persisted in localStorage.
   Surfaces use CSS variables, so flipping
   documentElement.dataset.theme repaints the app.
======================================================== */

export const getTheme = () => {
  try {
    return (
      localStorage.getItem("theme") ||
      "light"
    );
  } catch {
    return "light";
  }
};

export const applyTheme = (theme) => {
  document.documentElement.dataset.theme =
    theme;

  try {
    localStorage.setItem(
      "theme",
      theme
    );
  } catch {
    /* storage unavailable — theme still applies */
  }
};

// Apply stored theme before first paint
applyTheme(getTheme());

export const useTheme = () => {
  const [theme, setTheme] =
    useState(getTheme());

  const toggleTheme = () => {
    const next =
      theme === "dark"
        ? "light"
        : "dark";

    setTheme(next);
    applyTheme(next);
  };

  return { theme, toggleTheme };
};
