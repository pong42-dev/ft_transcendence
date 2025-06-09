import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest } from 'fastify';
import fs from 'fs';
import path from 'path';
import { MultipartFile, MultipartValue } from '@fastify/multipart';
import { v4 as uuidv4 } from 'uuid';
import { Register, RegisterFormData } from '../../../schemas/register.js';

declare module 'fastify' {
	export interface FastifyInstance {
		registerFormData: (request: FastifyRequest) => Promise<RegisterFormData>;
		saveFile: (file: MultipartFile, dirPath: string) => Promise<string>;
	}
}

async function handleRegisterFormData(request: FastifyRequest): Promise<RegisterFormData> {
	const parts = request.parts();
	const form: Record<string, string> = {};
	const files: Record<string, MultipartFile> = {};

	for await (const part of parts) {
		if (part.type === 'file') {
			const filePart = part as MultipartFile;
			const field = filePart.fieldname;

			// 배열이 아니라 단일 파일로 저장 (마지막 파일 덮어쓰기)
			files[field] = filePart;
		} else if (part.type === 'field') {
			const textPart = part as MultipartValue<string>;
			form[textPart.fieldname] = textPart.value;
		} else {
			continue;
		}
	}

	const registerData: Register = {
		email: form.email,
		name: form.name,
		password: form.password,
	};

	return {
		...registerData,
		files,
	};
}


async function saveFile(file: MultipartFile, dirPath: string): Promise<string> {
	try {
		const buffer = await file.toBuffer();

		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}

		const fileExtension = path.extname(file.filename);
		const uniqueFileName = `${uuidv4()}${fileExtension}`;
		const filePath = path.join(dirPath, uniqueFileName);

		fs.writeFileSync(filePath, buffer);
		return filePath;
	} catch (err) {
		console.error('파일 저장 중 오류 발생:', err);
		throw new Error('파일 저장에 실패했습니다.');
	}
}

export default fp(
	async (fastify: FastifyInstance) => {
		fastify.decorate('registerFormData', handleRegisterFormData);
		fastify.decorate('saveFile', saveFile);
	},
	{
		name: 'form-data-manager',
		dependencies: ['@fastify/multipart'],
	}
);
