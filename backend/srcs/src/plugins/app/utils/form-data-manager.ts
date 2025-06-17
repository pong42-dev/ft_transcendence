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

// async function handleRegisterFormData(request: FastifyRequest): Promise<RegisterFormData> {
// 	const parts = request.parts();
// 	const form: Record<string, string> = {};
// 	const files: Record<string, MultipartFile> = {};

	
// 	for await (const part of parts) {
// 		if (part.type === 'file') {

// 			console.log(1);
// 			const filePart = part as MultipartFile;
// 			console.log(2);
// 			if (!filePart.mimetype || !filePart.mimetype.startsWith('image/')) {
// 				filePart.file.resume();
// 				continue;
// 			}
// 			console.log(3);
// 			if (filePart.file.truncated) {
// 				filePart.file.resume();
// 				continue;
// 			}
// 			console.log(4);
// 			console.log(filePart);

// 			files[filePart.fieldname] = filePart;
// 			filePart.file.resume();
// 		} else if (part.type === 'field') {
// 			const textPart = part as MultipartValue<string>;
	

// 			form[textPart.fieldname] = textPart.value;
// 		}
// 	}

// 	const registerData: Register = {
// 		email: form.email,
// 		name: form.name,
// 		password: form.password,
// 	};

// 	return {
// 		...registerData,
// 		files,
// 	};
// }



async function handleRegisterFormData(request: FastifyRequest): Promise<RegisterFormData>
{
	const parts = request.parts();
	const form: Record<string, string> = {};
	const files: Record<string, { file: MultipartFile; buffer: Buffer }> = {};

	for await (const part of parts) {
		if (part.type === 'file') {
			const filePart = part as MultipartFile;

			if (!filePart.mimetype || !filePart.mimetype.startsWith('image/')) {
				filePart.file.resume(); // 허용되지 않은 파일은 버림
				continue;
			}

			if (filePart.file.truncated) {
				filePart.file.resume(); // 너무 큰 파일은 버림
				continue;
			}

			const buffer = await filePart.toBuffer();
			files[filePart.fieldname] = { file: filePart, buffer };
		} else if (part.type === 'field') {
			const textPart = part as MultipartValue<string>;
			form[textPart.fieldname] = textPart.value;
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
		console.error('An internal server error occurred while saving the file:', err);
		throw new Error('Failed to save the file.');
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
