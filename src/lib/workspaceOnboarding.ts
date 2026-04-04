const STORAGE_PREFIX = "neospark_workspace_onboarding_v1";

export function workspaceOnboardingKey(userId: number): string {
  return `${STORAGE_PREFIX}_${userId}`;
}

export function isWorkspaceOnboardingDone(userId: number): boolean {
  try {
    return localStorage.getItem(workspaceOnboardingKey(userId)) === "1";
  } catch {
    return true;
  }
}

export function setWorkspaceOnboardingDone(userId: number): void {
  try {
    localStorage.setItem(workspaceOnboardingKey(userId), "1");
  } catch {
    /* ignore */
  }
}
