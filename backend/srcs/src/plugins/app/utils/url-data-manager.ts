import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';

declare module 'fastify' {
	export interface FastifyInstance {
		downloadImageFromUrl: (imageUrl: string, uploadDirPath: string) => Promise<string>;
	}
}

function ensureDirectoryExists(dirPath: string) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

async function downloadImageFromUrl(imageUrl: string, uploadDirPath: string): Promise<string> {
	const urlObj = new URL(imageUrl);
	const protocol = urlObj.protocol === 'https:' ? https : http;

	ensureDirectoryExists(uploadDirPath);

	const ext = path.extname(urlObj.pathname) || '.jpg';
	const filename = `${uuidv4()}${ext}`;
	const filepath = path.join(uploadDirPath, filename);

	return new Promise((resolve, reject) => {
		const file = fs.createWriteStream(filepath);
		const request = protocol.get(imageUrl, response => {
			if (response.statusCode !== 200) {
				file.close();
				fs.unlinkSync(filepath);
				return reject(new Error(`이미지 응답 실패: ${response.statusCode}`));
			}
			response.pipe(file);
			file.on('finish', () => {
				file.close(() => resolve(filepath));
			});
		});

		request.on('error', err => {
			fs.existsSync(filepath) && fs.unlinkSync(filepath);
			reject(err);
		});
	});
}

export default fp(async (fastify: FastifyInstance) => {
	fastify.decorate('downloadImageFromUrl', downloadImageFromUrl);
});
