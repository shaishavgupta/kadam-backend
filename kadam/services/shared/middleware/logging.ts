import { middleware } from "encore.dev/api";

export const loggingMiddleware = middleware({}, async (req, next) => {
	const started = Date.now();
	try {
		const resp = await next(req);
		console.info(`${req.requestMeta.method} ${req.requestMeta.pathAndQuery} ${Date.now()-started}ms`);
		return resp;
	} catch (err) {
		console.error(`${req.requestMeta.method} ${req.requestMeta.pathAndQuery} error`, err);
		throw err;
	}
});
