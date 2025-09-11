import { context, trace } from "@opentelemetry/api";
import { FastifyRequest, FastifyReply } from 'fastify';

// Extend FastifyRequest to include trace and span IDs
export const requestLogger = async (request: FastifyRequest, reply: FastifyReply) => {
	const start = Date.now();
	const span = trace.getSpan(context.active());
	const spanCtx = span?.spanContext();

	reply.raw.on('finish', () => {
		const duration = Date.now() - start;

		const logEntry = {
			timestamp: new Date().toISOString(),
			level: 'info',
			message: 'HTTP Request',
			method: request.method,
			url: request.url,
			statusCode: reply.statusCode,
			duration: `${duration}ms`,
			traceId: spanCtx?.traceId,
			spanId: spanCtx?.spanId,
			userAgent: request.headers['user-agent'],
			ip: request.ip,
			requestId: request.id
		};

		console.log(JSON.stringify(logEntry));
	});
};
