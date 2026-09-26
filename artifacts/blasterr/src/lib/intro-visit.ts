const INTRO_VISITED_KEY = "blasterr:has-visited:v1";

export function hasVisitedIntro(): boolean {
  try {
    return window.localStorage.getItem(INTRO_VISITED_KEY) === "true";
  } catch {
    return false;
  }
}

export function markIntroVisited(): void {
  try {
    window.localStorage.setItem(INTRO_VISITED_KEY, "true");
  } catch {
    // The app still works when browser storage is unavailable.
  }
}