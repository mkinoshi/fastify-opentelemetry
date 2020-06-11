const fp = require('fastify-plugin');
const get = require('lodash.get');
const attributesNames = {
  FASTIFY_TYPE: 'fastify.type'
};

const spanNames = {
  ROOT: 'Request',
  ON_REQUEST: 'OnRequest',
  PARSING: 'Parsing',
  VALIDATION: 'Validation',
  HANDLER: 'Handler',
  SERIALIZATOIN: 'Serialization',
  ON_ERROR: 'OnError',
  ON_SEND: 'OnSend'
};

function buildRootOption(req, tracePluginOptions) {
  const urlForHttp = get(req.raw, 'client.parser.incoming.originalUrl', null);
  const urlForHttp2 = get(req.headers, ':path', null);
  const url = urlForHttp || urlForHttp2;
  const methodForHttp = get(req.raw, 'client.parser.incoming.method', null);
  const methodForHttp2 = get(req.headers, ':method', null);
  const method = methodForHttp || methodForHttp2;

  return {
    name: tracePluginOptions.nameOverride ? tracePluginOptions.nameOverride(req) : url,
    url,
    method
  };
}

function initializeOpentelemetry(tracer) {
  return {
    tracer,
    rootSpan: null,
    onRequestSpan: null,
    parsingSpan: null,
    validationSpan: null,
    handlerSpan: null,
    serializationSpan: null,
    onErrorSpan: null,
    onSend: null
  };
}

function ignoreFromCondition(ignoreConditions, target) {
  return (
    !target ||
    ignoreConditions.some(condition => {
      if (typeof condition === 'string') {
        return condition === target;
      }

      if (typeof condition === 'object') {
        return target.match(condition);
      }

      if (typeof condition === 'function') {
        return condition(target);
      }
    })
  );
}

function plugin(fastify, options = {enabled: true, tracer: null}, next) {
  const {enabled, tracer, ignoreUrls = [], ignoreMethods = []} = options;
  const commonAttribute = {
    [attributesNames.FASTIFY_TYPE]: 'fastify.hook'
  };

  if (!tracer) {
    fastify.log.warn('Tracer is not initialized properly');
  }

  fastify.decorateRequest('opentelemetry', initializeOpentelemetry(tracer));

  fastify.addHook('onRequest', (req, reply, done) => {
    if (enabled && tracer) {
      const rootSpanOption = buildRootOption(req, options || {});
      const shouldCreateSpan =
        !ignoreFromCondition(ignoreUrls, rootSpanOption.url) &&
        !ignoreFromCondition(ignoreMethods, rootSpanOption.method);
      if (shouldCreateSpan) {
        const rootSpan = tracer.startSpan(rootSpanOption.name, {parent: tracer.getCurrentSpan()});
        rootSpan.setAttribute('method', rootSpanOption.method);
        rootSpan.setAttribute('url', rootSpanOption.url);
        const onRequestSpan = tracer.startSpan(spanNames.ON_REQUEST, {
          parent: rootSpan,
          ...commonAttribute
        });
        req.opentelemetry.rootSpan = rootSpan;
        req.opentelemetry.onRequestSpan = onRequestSpan;
      }
      done();
    } else {
      done();
    }
  });

  fastify.addHook('preParsing', (req, reply, done) => {
    const {tracer, rootSpan, onRequestSpan} = req.opentelemetry;
    if (onRequestSpan) {
      onRequestSpan.end();
      req.opentelemetry.onRequestSpan = null;
    }

    if (rootSpan) {
      const parsingSpan = tracer.startSpan(spanNames.PARSING, {
        parent: rootSpan,
        ...commonAttribute
      });
      req.opentelemetry.parsingSpan = parsingSpan;
    }
    done();
  });

  fastify.addHook('preValidation', (req, reply, done) => {
    const {tracer, rootSpan, parsingSpan} = req.opentelemetry;
    if (parsingSpan) {
      parsingSpan.end();
      req.opentelemetry.parsingSpan = null;
    }

    if (rootSpan) {
      const validationSpan = tracer.startSpan(spanNames.VALIDATION, {
        parent: rootSpan,
        ...commonAttribute
      });
      req.opentelemetry.validationSpan = validationSpan;
    }
    done();
  });

  fastify.addHook('preHandler', (req, reply, done) => {
    const {tracer, rootSpan, validationSpan} = req.opentelemetry;
    if (validationSpan) {
      validationSpan.end();
      req.opentelemetry.validationSpan = null;
    }

    if (rootSpan) {
      const handlerSpan = tracer.startSpan(spanNames.HANDLER, {
        parent: rootSpan,
        ...commonAttribute
      });
      req.opentelemetry.handlerSpan = handlerSpan;
    }
    done();
  });

  fastify.addHook('preSerialization', (req, reply, payload, done) => {
    const {tracer, rootSpan, handlerSpan} = req.opentelemetry;
    if (handlerSpan) {
      handlerSpan.end();
      req.opentelemetry.handlerSpan = null;
    }

    if (rootSpan) {
      const serializationSpan = tracer.startSpan(spanNames.SERIALIZATOIN, {
        parent: rootSpan,
        ...commonAttribute
      });
      req.opentelemetry.serializationSpan = serializationSpan;
    }
    done();
  });

  fastify.addHook('onError', (req, reply, error, done) => {
    const {
      tracer,
      rootSpan,
      parsingSpan,
      validationSpan,
      handlerSpan,
      serializationSpan
    } = req.opentelemetry;
    if (parsingSpan) {
      parsingSpan.end();
      req.opentelemetry.parsingSpan = null;
    }

    if (validationSpan) {
      validationSpan.end();
      req.opentelemetry.validationSpan = null;
    }

    if (handlerSpan) {
      handlerSpan.end();
      req.opentelemetry.handlerSpan = null;
    }

    if (serializationSpan) {
      serializationSpan.end();
      req.opentelemetry.serializationSpan = null;
    }

    if (rootSpan) {
      const onErrorSpan = tracer.startSpan(spanNames.ON_ERROR, {
        parent: rootSpan,
        ...commonAttribute
      });
      req.opentelemetry.onErrorSpan = onErrorSpan;
    }
    done();
  });

  fastify.addHook('onSend', (req, reply, payload, done) => {
    const {tracer, rootSpan, onErrorSpan, serializationSpan} = req.opentelemetry;
    if (onErrorSpan) {
      onErrorSpan.end();
      req.opentelemetry.onErrorSpan = null;
    }

    if (serializationSpan) {
      serializationSpan.end();
      req.opentelemetry.serializationSpan = null;
    }

    if (rootSpan) {
      const onSendSpan = tracer.startSpan(spanNames.ON_SEND, {
        parent: rootSpan,
        ...commonAttribute
      });
      req.opentelemetry.onSendSpan = onSendSpan;
    }
    done();
  });

  fastify.addHook('onResponse', (req, reply, done) => {
    const {rootSpan, onSendSpan} = req.opentelemetry;
    if (onSendSpan) {
      onSendSpan.end();
      req.opentelemetry.onSendSpan = null;
    }

    if (rootSpan) {
      req.log.info(`New trace<${rootSpan.context().traceId}> was created`);
      rootSpan.end();
      req.opentelemetry.rootSpan = null;
    }
    done();
  });

  next();
}

module.exports = fp(plugin, {
  fastify: '>= 2.0.0',
  name: 'fastify-opentelemetry'
});
