import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { RegisterFormData} from '../../../schemas/register.js';
import { MultipartFile } from '@fastify/multipart';

declare module 'fastify' {
	interface FastifyInstance {
		// isValidEmail: (email: string) => boolean;
		// isValidPassword: (password: string) => boolean;
		// isValidNickname: (nickname: string) => boolean;
		// isValidProfileImage: (file: MultipartFile) => boolean;
		isValidRegisterFormData: (registerFormData: RegisterFormData) => Promise<boolean>;
		isValidChatMessage: (message: string) => boolean;
	}
}

// Email must be in standard format: local@domain.tld
function validateEmailFormat(email: string): boolean {
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	return emailRegex.test(email);
}

// Password must be 8–15 characters, contain upper and lower case letters, digits, and special characters (@#%&!$*)
function validatePasswordFormat(password: string): boolean {
	const lengthValid = password.length >= 8 && password.length <= 15;
	const hasDigit = /[0-9]/.test(password);
	const hasLowerCase = /[a-z]/.test(password);
	const hasUpperCase = /[A-Z]/.test(password);
	const hasSpecialChar = /[@#%&!$*]/.test(password);
	return lengthValid && hasDigit && hasLowerCase && hasUpperCase && hasSpecialChar;
}
// Nickname must be 2–16 characters, using letters, numbers, or Korean characters
function validateNicknameFormat(nickname: string): boolean {
	const nicknameRegex = /^[a-zA-Z0-9가-힣]{2,16}$/;
	return nicknameRegex.test(nickname);
}

// File must be JPEG, PNG, WEBP, or GIF, and <= 5MB
function validateProfileImageFormat(file: MultipartFile): boolean {
	console.log("file: ", file);
	const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
	console.log(allowedMimeTypes.indexOf(file.mimetype) !== -1);
	const maxSize = 5 * 1024 * 1024;
	return (
		file &&
		allowedMimeTypes.indexOf(file.mimetype) !== -1 &&
		file.file.bytesRead <= maxSize
	);
}

// Check all text fields (email, password, nickname) using above rules
async function validateRegisterFormData(registerFormData: RegisterFormData): Promise<boolean> {
	const emailValid = validateEmailFormat(registerFormData.email);
	const passwordValid = validatePasswordFormat(registerFormData.password);
	const nicknameValid = validateNicknameFormat(registerFormData.name);
	const avatarValid = validateProfileImageFormat(registerFormData.files.avatar);
	return emailValid && passwordValid && nicknameValid && avatarValid;
}

// Message must be non-empty, max 500 characters, no forbidden words or HTML tags
// function validateChatMessage(message: string): boolean {
// 	const trimmed = message.trim();

// 	if (trimmed.length === 0 || trimmed.length > 500) {
// 		return false;
// 	}
// 	const forbiddenWords = ['bannedword1', 'bannedword2'];
// 	for (const word of forbiddenWords) {
// 		if (trimmed.indexOf(word) !== -1) {
// 			return false;
// 		}
// 	}
// 	const htmlTagRegex = /<[^>]*>/;
// 	if (htmlTagRegex.test(trimmed)) {
// 		return false;
// 	}
// 	return true;
// }

export default fp(
	async function (fastify: FastifyInstance) {
		// fastify.decorate('isValidEmail', validateEmailFormat);
		// fastify.decorate('isValidPassword', validatePasswordFormat);
		// fastify.decorate('isValidNickname', validateNicknameFormat);
		// fastify.decorate('isValidProfileImage', validateProfileImageFormat);
		fastify.decorate('isValidRegisterFormData', validateRegisterFormData);
		// fastify.decorate('isValidChatMessage', validateChatMessage);
	},
	{
		name: 'validator',
		dependencies: ['@fastify/multipart']
	}
);
