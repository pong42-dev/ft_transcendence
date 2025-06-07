import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest } from 'fastify';
import fs from 'fs';
import path from 'path';
import { MultipartFile, MultipartValue } from '@fastify/multipart';
import { v4 as uuidv4 } from 'uuid';
import { Register } from '../../../schemas/auth.js';

declare module 'fastify' {
	export interface FastifyInstance {
		registerFormData: (request: FastifyRequest, dirPath: string) => Promise<Register>;
	}
}

async function handleRegisterFormData(request: FastifyRequest, dirPath: string): Promise<Register> {
	const parts = request.parts();
	const form: Record<string, string> = {};
	let avatarFilePath: string | null = null;

	try {
		for await (const part of parts) {
			if (part.type === 'file') {
				try {
					avatarFilePath = await handleFilePart(part as MultipartFile, dirPath);
				} catch (fileErr) {
					console.error('파일 처리 중 오류 발생:', fileErr);
					throw new Error('파일 업로드에 실패했습니다.');
				}
			} else {
				try {
					handleTextPart(part as MultipartValue<string>, form);
				} catch (textErr) {
					console.error('텍스트 파트 처리 중 오류 발생:', textErr);
					throw new Error('폼 데이터 처리 중 오류가 발생했습니다.');
				}
			}
		}
	} catch (err) {
		console.error('폼 데이터 파싱 중 오류 발생:', err);
		throw new Error('폼 데이터를 처리하는 데 실패했습니다.');
	}

	return {
		email: form.email,
		name: form.name,
		password: form.password,
		avatar: avatarFilePath,
	};
}

function handleTextPart(part: MultipartValue<string>, form: Record<string, string>) {
	if (!part.fieldname || !part.value) {
		throw new Error('잘못된 텍스트 입력입니다.');
	}
	form[part.fieldname] = part.value;
}

async function handleFilePart(file: MultipartFile, dirPath: string): Promise<string> {
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
	},
	{
		name: 'form-data-manager',
		dependencies: ['@fastify/multipart'],
	}
);
