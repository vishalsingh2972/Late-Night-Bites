import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ 
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  } 
});

// Configure multipart handling with low-latency memory limits
fastify.register(multipart, {
  limits: {
    fieldNameSize: 100, // Max field name size in bytes
    fileSize: 5 * 1024 * 1024, // Limit audio file uploads to 5MB max
    fields: 10 // Max non-file fields
  }
});

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'GREEN', runtime: 'NodeJS/TypeScript' };
});

// Ingress voice note webhook
fastify.post('/webhook/whatsapp', async (request, reply) => {
  fastify.log.info('🚀 Incoming media webhook intercepted from communication gate.');

  // Ensure request payload contains multipart data
  if (!request.isMultipart()) {
    fastify.log.warn('⚠️ Rejected request: Payload structure is not Multipart.');
    return reply.status(400).send({ error: 'Expected multi-part form data payload.' });
  }

  const parts = request.parts();
  let userAudioBuffer: Buffer | null = null;
  let metadataFields: Record<string, string> = {};

  try {
    for await (const part of parts) {
      if (part.type === 'file') {
        fastify.log.info(`📁 Capturing inbound audio channel stream: [${part.filename}]`);
        userAudioBuffer = await part.toBuffer();
      } else {
        // Track textual parameters sent alongside the message stream
        metadataFields[part.fieldname] = part.value as string;
      }
    }

    if (!userAudioBuffer) {
      fastify.log.warn('❌ Processing terminated: Zero audio binary bytes isolated.');
      return reply.status(422).send({ error: 'No audio media stream found in request.' });
    }

    fastify.log.info(`✅ Isolated Ingress Payload: Buffer Size ${userAudioBuffer.length} bytes.`);

    // --- DAY 3 WRITING TRACKER ---
    // This is exactly where we will pipe the buffer into Smallest AI Pulse STT tomorrow.
    
    return reply.status(200).send({
      message: 'Media binary isolated successfully.',
      capturedBytes: userAudioBuffer.length,
      status: 'PENDING_TRANSLATION'
    });

  } catch (error: any) {
    fastify.log.error(`🔥 Ingress Pipeline Error: ${error.message}`);
    return reply.status(500).send({ error: 'Internal gateway processing failure.' });
  }
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await fastify.listen({ port, host: '127.0.0.1' });
    fastify.log.info(`⚡ Gateway edge router actively listening on http://127.0.0.1:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();