import fs from 'fs';
import path from 'path';
import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';

declare module 'fastify' {
	export interface FastifyInstance {
		fileManager: {
			deleteFile: (filePath: string) => void;
		};
	}
}

function deleteFile(filePath: string) {
	try {
		const resolvedPath = path.resolve(filePath);
		if (fs.existsSync(resolvedPath)) {
			fs.unlinkSync(resolvedPath);
			console.log(`Deleted file: ${resolvedPath}`);
		} else {
			console.warn(`File not found: ${resolvedPath}`);
		}
	} catch (err) {
		console.error(`Error deleting file: ${filePath}`, err);
	}
}

export default fp(
	async (fastify: FastifyInstance) => {
		fastify.decorate('fileManager', {
			deleteFile
		});
	},
	{
		name: 'file-manager',
	}
);