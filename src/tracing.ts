import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter';
import { resourceFromAttributes, Resource, defaultResource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { ExpressLayerType } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { Response } from 'express';

import { envDetector, processDetector } from '@opentelemetry/resources';
import { gcpDetector } from '@opentelemetry/resource-detector-gcp';

const IGNORED_INCOMING_URLS = ['/health', '/v1/health', '/favicon.ico'];

const traceExporter = new TraceExporter();

export const otelSDK = new NodeSDK({
  // resource: resourceFromAttributes({
  //   [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'saev-backend',
  //   [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || '0.0.0',
  // }),

  resource: defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'saev-backend',
      [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || '0.0.0',
    })
  ),

  spanProcessors: [
    new BatchSpanProcessor(traceExporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    }),
  ],

  resourceDetectors: [envDetector, processDetector, gcpDetector],

  instrumentations: [
    new NestInstrumentation(),
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-express': {
        enabled: false,
        ignoreLayersType: [
          ExpressLayerType.MIDDLEWARE,
          ExpressLayerType.ROUTER,
          ExpressLayerType.REQUEST_HANDLER,
        ],
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        responseHook: (span, res: Response) => {
          if ('req' in res && res.req.route) {
            const routePath = res.req.route.path;
            const method = res.req.method?.toUpperCase();
            span.updateName(`${method} ${routePath}`); 
          }
        },
        ignoreIncomingRequestHook: (req) => {
          if (req.method === 'OPTIONS') return true;
          const url = req.url ?? '';
          return IGNORED_INCOMING_URLS.some((path) => url.startsWith(path));
        },
        ignoreOutgoingRequestHook: (req) => {
          return IGNORED_INCOMING_URLS.some((path) => req.path?.startsWith(path));
        },
        requireParentforOutgoingSpans: true,
        // Capture request/response sizes for performance analysis
        applyCustomAttributesOnSpan: (span, request, response) => {
          const contentLength = (response as Response).getHeader?.('content-length');
          if (contentLength) {
            span.setAttribute('http.response_content_length', Number(contentLength));
          }
        },
      },
      '@opentelemetry/instrumentation-mysql2': { enabled: true },
    }),
  ],
});

const shutdown = () =>
  otelSDK.shutdown()
    .then(() => console.log('OpenTelemetry SDK finalizado'))
    .catch((error) => console.log('Erro ao finalizar OpenTelemetry SDK', error))
    .finally(() => process.exit(0));

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

otelSDK.start();