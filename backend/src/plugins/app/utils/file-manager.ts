import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fs from 'fs';
import path from 'path';
import { MultipartFile } from '@fastify/multipart';
import { v4 as uuidv4 } from 'uuid';

declare module 'fastify' {
	interface FastifyInstance {
		fileManager: ReturnType<typeof createFileManager>;
	}
}

export function createFileManager(fastify: FastifyInstance) {
	return {
		async saveFile(file: MultipartFile, dirPath: string): Promise<string> {
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
				fastify.log.error('An internal server error occurred while saving the file:', err);
				throw new Error('Failed to save the file.');
			}
		},

		deleteFile(filePath: string) {
			try {
				const resolvedPath = path.resolve(filePath);
				if (fs.existsSync(resolvedPath)) {
					fs.unlinkSync(resolvedPath);
					fastify.log.info(`Deleted file: ${resolvedPath}`);
				} else {
					fastify.log.warn(`File not found: ${resolvedPath}`);
				}
			} catch (err) {
				fastify.log.error(`Error deleting file: ${filePath}`, err);
			}
		},

		getMimeType(filePath: string): string {
			const ext = path.extname(filePath).toLowerCase();
			switch (ext) {
				case '.png': return 'image/png';
				case '.jpg':
				case '.jpeg': return 'image/jpeg';
				case '.gif': return 'image/gif';
				case '.webp': return 'image/webp';
				default: return 'application/octet-stream';
			}
		},
	};
}

export default fp(
	async function (fastify: FastifyInstance) {
		const manager = createFileManager(fastify);
		fastify.decorate('fileManager', manager);
	},
	{
		name: 'file-manager',
		dependencies: ['@fastify/multipart'],
	}
);

/**
 * 토너먼트 매치 배열을 프론트엔드에서 요구하는 rounds 구조로 변환
 */
export function makeBracketFromMatches(matches: any[]): { rounds: any[][] } {
	const roundsMap = new Map<number, any[]>();
	for (const match of matches) {
		if (
			!match.participants ||
			match.participants.length < 2 ||
			!match.participants[0] ||
			!match.participants[1]
		) continue;
		if (!roundsMap.has(match.round_number)) {
			roundsMap.set(match.round_number, []);
		}
		const getNickname = (p: any) => {
			if (p.type === 'user') {
				return p.name || `User${p.user_id}`;
			} else {
				return p.display_name || `Player${p.id}`;
			}
		};
		roundsMap.get(match.round_number)!.push({
			matchId: String(match.id),
			player1: {
				id: match.participants[0].id,
				nickname: getNickname(match.participants[0]),
			},
			player2: {
				id: match.participants[1].id,
				nickname: getNickname(match.participants[1]),
			},
			winnerId: match.winner_id ?? undefined,
		});
	}
	const sortedKeys = Array.from(roundsMap.keys()).sort((a, b) => a - b);
	const rounds = sortedKeys.reduce<any[][]>((acc, rn) => {
		const arr = roundsMap.get(rn);
		if (arr && Array.isArray(arr)) acc.push(arr);
		return acc;
	}, []);
	return { rounds };
}
