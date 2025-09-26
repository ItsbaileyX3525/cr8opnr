export interface UserProfile {
  id: string;
  username: string;
  email: string;
  gems: number;
}

interface MeResponse {
  success?: boolean;
  userId?: string;
}

interface UserResponse {
  user?: {
    gems?: number;
    username?: string;
    email?: string;
  };
}

const defaultRequestInit: RequestInit = {
  credentials: "include"
};

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch (_) {
    return null;
  }
}

export async function fetchCurrentUserId(): Promise<string | null> {
  try {
    const res = await fetch("/api/me", defaultRequestInit);
    if (!res.ok) {
      return null;
    }
    const data = await parseJson<MeResponse>(res);
    if (!data?.success || !data.userId) {
      return null;
    }
    return data.userId;
  } catch (_) {
    return null;
  }
}

export async function fetchUserProfileById(userId: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`/api/user/${encodeURIComponent(userId)}`, {
      ...defaultRequestInit,
      method: "GET"
    });
    if (!res.ok) {
      return null;
    }
    const data = await parseJson<UserResponse>(res);
    const raw = data?.user;
    if (!raw) {
      return null;
    }
    return {
      id: userId,
      username: raw.username ?? "",
      email: raw.email ?? "",
      gems: typeof raw.gems === "number" ? raw.gems : 0
    };
  } catch (_) {
    return null;
  }
}

export async function fetchCurrentUserProfile(): Promise<UserProfile | null> {
  const userId = await fetchCurrentUserId();
  if (!userId) {
    return null;
  }
  return fetchUserProfileById(userId);
}

type HeaderElements = {
  gemBalance: HTMLElement | null;
  usernameText: HTMLElement | null;
  signinContainer: HTMLElement | null;
  registerContainer: HTMLElement | null;
  signoutContainer: HTMLElement | null;
  signinButton: HTMLElement | null;
  registerButton: HTMLElement | null;
  signoutButton: HTMLElement | null;
};

function getHeaderElements(): HeaderElements {
  return {
    gemBalance: document.getElementById("gem-balance"),
    usernameText: document.getElementById("username-text"),
    signinContainer: document.getElementById("signin-container"),
    registerContainer: document.getElementById("register-container"),
    signoutContainer: document.getElementById("signout-container"),
    signinButton: document.getElementById("signin-button"),
    registerButton: document.getElementById("register-button"),
    signoutButton: document.getElementById("signout-button")
  };
}

function setHidden(element: HTMLElement | null, hidden: boolean) {
  if (!element) return;
  if (hidden) {
    element.classList.add("hidden");
    element.setAttribute("aria-hidden", "true");
  } else {
    element.classList.remove("hidden");
    element.removeAttribute("aria-hidden");
  }
}

export function applyUserProfileToHeader(profile: UserProfile | null): void {
  const {
    gemBalance,
    usernameText,
    signinContainer,
    registerContainer,
    signoutContainer,
    signinButton,
    registerButton,
    signoutButton
  } = getHeaderElements();

  if (gemBalance) {
    gemBalance.textContent = profile ? String(profile.gems) : "0";
  }

  if (usernameText) {
    usernameText.textContent = profile ? profile.username : "Not logged in";
  }

  const showAuthOptions = !profile;
  setHidden(signinContainer, !showAuthOptions);
  setHidden(registerContainer, !showAuthOptions);

  if (!signinContainer) {
    setHidden(signinButton, !showAuthOptions);
  }
  if (!registerContainer) {
    setHidden(registerButton, !showAuthOptions);
  }

  const showSignOut = Boolean(profile);
  setHidden(signoutContainer, !showSignOut);
  if (!signoutContainer) {
    setHidden(signoutButton, !showSignOut);
  }
}

export function bindSignOutAction(buttonId = "signout-button"): void {
  const target = document.getElementById(buttonId);
  if (!target || target.dataset.logoutBound === "true") {
    return;
  }
  target.addEventListener("click", () => {
    window.location.href = "/api/logout";
  });
  target.dataset.logoutBound = "true";
}

export async function initializeHeaderAuth(): Promise<UserProfile | null> {
  const profile = await fetchCurrentUserProfile();
  applyUserProfileToHeader(profile);
  bindSignOutAction();
  return profile;
}

interface EnsureAuthOptions {
  redirectTo?: string;
}

export async function ensureAuthenticated(options?: EnsureAuthOptions): Promise<UserProfile | null> {
  const profile = await initializeHeaderAuth();
  if (profile) {
    return profile;
  }
  const target = options?.redirectTo ?? "/login.html";
  window.location.href = target;
  return null;
}
