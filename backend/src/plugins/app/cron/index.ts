import fp from 'fastify-plugin';
import cron from 'node-cron';
import dayjs from 'dayjs';

export default fp(async function cronPlugin(fastify, opts) {
	const cronSchedule = fastify.config.CRON_SCHEDULE;

	cron.schedule(cronSchedule, async () => {
		try {
			await fastify.tokenManager.cleanExpiredToken();
			await fastify.twoFAManager.cleanExpired2FA();
			fastify.log.info(`[${dayjs().format()}] Expired tokens cleaned successfully`);
		} catch (err) {
			fastify.log.error(`[${dayjs().format()}] Failed to clean expired temporary tokens: ${err}`);
		}
	});
	fastify.log.info(`[${dayjs().format()}] Cron job scheduled successfully`);
});
