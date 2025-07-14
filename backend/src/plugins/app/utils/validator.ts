import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { RegisterFormData} from '../../schemas/users/register.js';
import { Credentials } from '../../schemas/users/login/local.js';
import { MultipartFile } from "@fastify/multipart";

declare module "fastify" {
	interface FastifyInstance {
		isValidEmail: (email: string) => string | null;
		isValidPassword: (password: string) => string | null;
		isValidName: (name: string) => string | null;
		isValidProfileImage: (file: MultipartFile) => string | null;

		isValidRegisterFormData: (registerFormData: RegisterFormData) => string | null;
		isValidLoginCredentials: (credentials: Credentials) => string | null;
		// isValidChatMessage: (message: string) => boolean;
		isValidChatMessage: (message: string) => boolean;
	}
}

// Email must be in standard format: local@domain.tld
function validateEmailFormat(email: string): string | null {
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	if (!emailRegex.test(email)) {
		return "Invalid email format.";
	}
	return null
}

// Password must be 8–15 characters, contain upper and lower case letters, digits, and special characters (@#%&!$*)
function validatePasswordFormat(password: string): string | null {
	const lengthValid = password.length >= 8 && password.length <= 15;
	const hasDigit = /[0-9]/.test(password);
	const hasLowerCase = /[a-z]/.test(password);
	const hasUpperCase = /[A-Z]/.test(password);
	const hasSpecialChar = /[@#%&!$*]/.test(password);
	if (!(lengthValid && hasDigit && hasLowerCase && hasUpperCase && hasSpecialChar)) {
		return "Password must be 8–15 characters, contain upper and lower case letters, digits, and special characters (@#%&!$*).";
	}
}

// name must be 2–16 characters, using letters, numbers, or Korean characters
function validateNameFormat(name: string): string | null {
	const nameRegex = /^[a-zA-Z0-9가-힣]{2,16}$/;
	if (!nameRegex.test(name)) {
		return "Name must be 2–16 characters, using letters, numbers, or Korean characters.";
	}
	return null;
}


// File must be JPEG, PNG, WEBP, or GIF, and <= 5MB
function validateProfileImageFormat(file: MultipartFile): string | null {
	if (!file || !file.mimetype)
		return null;
	const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
	console.log(allowedMimeTypes.indexOf(file.mimetype) !== -1);
	const maxSize = 5 * 1024 * 1024;
	if ( !(
		file &&
		allowedMimeTypes.indexOf(file.mimetype) !== -1 &&
		file.file.bytesRead <= maxSize
	)) {
		return "Profile image must be JPEG, PNG, WEBP, or GIF, and <= 5MB.";	
	}
	return null;
}

// Check all text fields (email, password, name) using above rules
function validateRegisterFormData(registerFormData: RegisterFormData): string | null {
	const emailMsg = validateEmailFormat(registerFormData.email);
	if (emailMsg) {
		return emailMsg;
	}
	const passwordMsg = validatePasswordFormat(registerFormData.password);
	if (passwordMsg) {
		return passwordMsg;
	}
	const nameMsg = validateNameFormat(registerFormData.name);
	if (nameMsg) {
		return nameMsg;
	}
	const avatarFile = registerFormData.files?.avatar?.file;
	if (avatarFile) {
		const avatarMsg = validateProfileImageFormat(avatarFile);
		if (avatarMsg) {
			return avatarMsg;
		}
	}
	return null;
}

function validateLoginCredentials(credentials: Credentials): string | null {
	const emailMsg = validateEmailFormat(credentials.email);
	if (emailMsg) {
		return emailMsg;
	}
	const passwordMsg = validatePasswordFormat(credentials.password);
	if (passwordMsg) {
		return passwordMsg;
	}
	return null;
}

// Message must be non-empty, max 500 characters, no forbidden words or HTML tags
// function validateChatMessage(message: string): string | null {
// 	const trimmed = message.trim();

// 	if (trimmed.length === 0 || trimmed.length > 500) {
// 		return false;
// 	}
// 	const forbiddenWords = ["bannedword1", "bannedword2"];
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
		fastify.decorate("isValidEmail", validateEmailFormat);
		fastify.decorate("isValidPassword", validatePasswordFormat);
		fastify.decorate("isValidName", validateNameFormat);
		fastify.decorate("isValidProfileImage", validateProfileImageFormat);

		fastify.decorate("isValidRegisterFormData", validateRegisterFormData);
		fastify.decorate("isValidLoginCredentials", validateLoginCredentials);
		// fastify.decorate("isValidChatMessage", validateChatMessage);
	},
	{
		name: "validator",
		dependencies: ["@fastify/multipart"]
	}
);
