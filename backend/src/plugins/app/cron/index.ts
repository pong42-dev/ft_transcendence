import fp from 'fastify-plugin';
import cron from 'node-cron';
import dayjs from 'dayjs';

export default fp(async function cronPlugin(fastify, opts) {
	// Task scheduled to run every 5 minutes
	cron.schedule('*/5 * * * *', async () => {
		try {
			await fastify.tokenManager.cleanExpiredToken();
			await fastify.twoFAManager.cleanExpired2FA();
			fastify.log.info(`[${dayjs().format()}] Expired tokens cleaned successfully`);
		} catch (err) {
			fastify.log.error(`Failed to clean expired temporary tokens: ${err}`);
		}
	});

	fastify.log.info('Cron job scheduled successfully');
});
