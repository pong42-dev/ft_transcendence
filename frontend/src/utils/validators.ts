export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (email.length < 6 || email.length > 50) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  // 백엔드와 일치하는 검증 규칙
  const lengthValid = password.length >= 8 && password.length <= 15;
  const hasDigit = /[0-9]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSpecialChar = /[@#%&!$*]/.test(password);
  
  if (!lengthValid) {
    return { isValid: false, error: 'Password must be 8-15 characters long' };
  }
  
  if (!hasDigit) {
    return { isValid: false, error: 'Password must contain at least one digit (0-9)' };
  }
  
  if (!hasLowerCase) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter (a-z)' };
  }
  
  if (!hasUpperCase) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter (A-Z)' };
  }
  
  if (!hasSpecialChar) {
    return { isValid: false, error: 'Password must contain at least one special character (@#%&!$*)' };
  }
  
  return { isValid: true };
};

export const validateNickname = (nickname: string): ValidationResult => {
  if (!nickname) {
    return { isValid: false, error: 'Nickname is required' };
  }
  
  if (nickname.length < 2 || nickname.length > 16) {
    return { isValid: false, error: 'Nickname must be between 2 and 16 characters' };
  }
  
  // Check for valid characters (alphanumeric, spaces, underscores, hyphens)
  const nicknameRegex = /^[a-zA-Z0-9\s_-]+$/;
  if (!nicknameRegex.test(nickname)) {
    return { isValid: false, error: 'Nickname can only contain letters, numbers, spaces, underscores, and hyphens' };
  }
  
  return { isValid: true };
};

export const validateUrl = (url: string): ValidationResult => {
  if (!url) {
    return { isValid: true }; // URL is optional
  }
  
  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
};
