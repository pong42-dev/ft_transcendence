import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { MultipartFile, MultipartValue } from '@fastify/multipart';
import { Register, RegisterFormData } from '../../../schemas/register.js';

declare module 'fastify' {
	interface FastifyInstance {
		formDataManager: ReturnType<typeof createFormDataManager>;
	}
}

export function createFormDataManager(fastify: FastifyInstance) {
	return {
		async registerFormData(request: FastifyRequest): Promise<RegisterFormData> {
			const parts = request.parts();
			const form: Record<string, string> = {};
			const files: Record<string, { file: MultipartFile; buffer: Buffer }> = {};

			for await (const part of parts) {
				if (part.type === 'file') {
					const filePart = part as MultipartFile;
					if (!filePart.mimetype || !filePart.mimetype.startsWith('image/')) {
						filePart.file.resume();
						continue;
					}
					if (filePart.file.truncated) {
						filePart.file.resume();
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
	}
}

export default fp(
	async function (fastify: FastifyInstance) {
		const manager = createFormDataManager(fastify);
		fastify.decorate('formDataManager', manager);
	},
	{
		name: 'form-data-manager',
		dependencies: ['@fastify/multipart'],
	}
);
