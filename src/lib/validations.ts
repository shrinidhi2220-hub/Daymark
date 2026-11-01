export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  // RFC 5322 compliant regex approximation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
}

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0 to 4
  errors: string[];
}

export function validatePassword(password: string): PasswordStrengthResult {
  const errors: string[] = [];
  if (!password || typeof password !== "string") {
    return { isValid: false, score: 0, errors: ["Password is required."] };
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must include at least one lowercase letter.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must include at least one uppercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must include at least one number.");
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("Password must include at least one special character.");
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;

  return {
    isValid: errors.length === 0,
    score,
    errors,
  };
}

export function isValidHttpUrl(stringUrl: string): boolean {
  if (!stringUrl || typeof stringUrl !== "string") return false;
  try {
    const url = new URL(stringUrl.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path || typeof path !== "string") return "/dashboard";
  const trimmed = path.trim();
  // Prevent open redirect: must start with / and not // or /\\ or scheme
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\") && !trimmed.includes("://")) {
    return trimmed;
  }
  return "/dashboard";
}

