import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation, IgnoreIncomingRequestFunction } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { diag, DiagConsoleLogger, DiagLogLevel, Span } from '@opentelemetry/api';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

let sdk: NodeSDK | undefined;

// Ignore specific health/documentation endpoints
const ignoreEndpoints: IgnoreIncomingRequestFunction = (request) => {
    if (request.method === 'OPTIONS') {
        return true;
    }

    const urlsToIgnore = ['/health', '/documentation'];
    return urlsToIgnore.some(path => request.url?.startsWith(path));
};

export async function startTelemetry(): Promise<void> {
    const serviceName = process.env.OTEL_SERVICE_NAME || 'kadam-backend';
    const endpoint =
        (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318')
            .replace(/\/$/, '') + '/v1/traces';

    console.log(`🔍 Starting telemetry for service: ${serviceName}`);
    console.log(`🔍 OTLP endpoint: ${endpoint}`);

    const traceExporter = new OTLPTraceExporter({ url: endpoint });

    sdk = new NodeSDK({
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
            [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
        }),
        traceExporter,
        instrumentations: [
            new HttpInstrumentation({
                ignoreIncomingRequestHook: ignoreEndpoints,
                requestHook: (span: Span, req) => {
                    const method = (req as any).method;
                    const url = new URL((req as any).url, process.env.DOMAIN).pathname;
                    span.updateName(`${method} ${url}`);
                }
            }),
            new FastifyInstrumentation({
                requestHook: (span, info) => {
                    const method = info.request.method;
                    const path = info.request.routerPath ?? info.request.url; // routerPath is cleaner if available
                    span.updateName(`${method} ${path}`);
                }
            }),
            new PgInstrumentation(),
            new RedisInstrumentation(),
        ],
    });

    try {
        await sdk.start();
        console.log('✅ Telemetry started successfully');
    } catch (error) {
        console.error('❌ Failed to start telemetry:', error);
        process.exit(1);
    }
}

export async function shutdownTelemetry(): Promise<void> {
    if (!sdk) return;
    try {
        console.log('🔌 Shutting down telemetry...');
        await sdk.shutdown();
        console.log('✅ Telemetry shut down successfully.');
    } catch (error) {
        console.error('❌ Error shutting down telemetry:', error);
    }
}
