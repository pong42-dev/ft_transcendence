import fp from 'fastify-plugin';
import cron from 'node-cron';
import dayjs from 'dayjs';

export default fp(async function cronPlugin(fastify, opts) {
	// 5분마다 실행되는 작업 등록
	cron.schedule('*/5 * * * *', async () => {
		try {
			await fastify.twoFAManager.cleanExpired2FA();
			fastify.log.info(`[${dayjs().format()}] 만료된 임시토큰 삭제 완료`);
		} catch (err) {
			fastify.log.error(`만료된 임시토큰 삭제 실패: ${err}`);
		}
	});

	fastify.log.info('Cron 작업 등록 완료');
});
