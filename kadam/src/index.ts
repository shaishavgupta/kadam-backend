import { startTelemetry, shutdownTelemetry } from './infra/tracing';

async function bootstrap() {
	await startTelemetry();
	await import('./server');
}

bootstrap();

process.on('SIGTERM', () => {
	shutdownTelemetry();
});
process.on('SIGINT', () => {
	shutdownTelemetry();
});
