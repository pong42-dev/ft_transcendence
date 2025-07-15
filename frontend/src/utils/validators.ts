import i18n from '../services/i18n.js';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: i18n.t('validation.email_required') };
  }
  
  // 백엔드와 동일한 이메일 정규식 사용
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: i18n.t('validation.invalid_email_format') };
  }
  
  return { isValid: true };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: i18n.t('validation.password_required') };
  }
  
  // 백엔드와 일치하는 검증 규칙
  const lengthValid = password.length >= 8 && password.length <= 15;
  const hasDigit = /[0-9]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSpecialChar = /[@#%&!$*]/.test(password);
  
  if (!lengthValid) {
    return { isValid: false, error: i18n.t('validation.password_length_invalid') };
  }
  
  if (!hasDigit) {
    return { isValid: false, error: i18n.t('validation.password_no_digit') };
  }
  
  if (!hasLowerCase) {
    return { isValid: false, error: i18n.t('validation.password_no_lowercase') };
  }
  
  if (!hasUpperCase) {
    return { isValid: false, error: i18n.t('validation.password_no_uppercase') };
  }
  
  if (!hasSpecialChar) {
    return { isValid: false, error: i18n.t('validation.password_no_special_char') };
  }
  
  return { isValid: true };
};

export const validateNickname = (nickname: string): ValidationResult => {
  if (!nickname) {
    return { isValid: false, error: i18n.t('validation.nickname_required') };
  }
  
  if (nickname.length < 2 || nickname.length > 16) {
    return { isValid: false, error: i18n.t('validation.nickname_length_invalid') };
  }
  
  // Check for valid characters (alphanumeric, Korean)
  const nicknameRegex = /^[a-zA-Z0-9가-힣]+$/;
  if (!nicknameRegex.test(nickname)) {
    return { isValid: false, error: i18n.t('validation.nickname_invalid_chars') };
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
    return { isValid: false, error: i18n.t('validation.invalid_url_format') };
  }
};
