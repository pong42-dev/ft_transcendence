import fp from 'fastify-plugin';
import { FastifyError, FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';

declare module 'fastify' {
interface FastifyInstance {
	customErrorHandler: (context?: string) => (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => void;
}
}

function factory(context?: string) {
return (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
	if ((error as any).validation) {
	const emailFormatError = (error as any).validation.find(
		(v: any) => v.instancePath === '/email' && v.keyword === 'format'
	);
	if (emailFormatError) {
		return reply.status(400).send({ success: false, msg: '이메일 형식이 잘못되었습니다.' });
	}
	return reply.status(400).send({ success: false, msg: '요청 데이터 형식이 잘못되었습니다.' });
	}

	request.log.error(error);
	reply.status(500).send({
	success: false,
	msg: context
		? `[${context}] 서버 내부 오류가 발생했습니다.`
		: '서버 내부 오류가 발생했습니다.',
	});
};
}

export default fp(async function (fastify: FastifyInstance) {
fastify.decorate('customErrorHandler', factory);
});
