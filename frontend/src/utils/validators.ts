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
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 16) {
    return { isValid: false, error: 'Password must be less than 16 characters long' };
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
