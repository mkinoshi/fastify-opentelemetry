const t = require('tap')
const split = require('split2')
const request = require('request')
const Fastify = require('fastify')
const api = require('@opentelemetry/api')
const { SimpleSpanProcessor } = require('@opentelemetry/tracing')
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin')
const { NodeTracerProvider } = require('@opentelemetry/node')
const fastifyOpentelemetry = require('../')

const provider = new NodeTracerProvider({
  logger: console,
  logLevel: 'DEBUG'
})
provider.addSpanProcessor(
  new SimpleSpanProcessor(
    new ZipkinExporter({
      serviceName: 'fastify',
      url: 'http://host.docker.internal:9411/api/v2/spans'
    })
  )
)
provider.register()
const tracer = api.trace.getTracer('fastify-test')

t.test('When you use http for GET method', t => {
  const stream = split(JSON.parse)
  const provider = new NodeTracerProvider()
  provider.addSpanProcessor(
    new SimpleSpanProcessor(
      new ZipkinExporter({
        serviceName: 'fastify'
      })
    )
  )

  const fastify = Fastify({
    logger: {
      level: 'info',
      stream
    }
  })

  fastify.register(fastifyOpentelemetry, {
    enabled: true,
    tracer
  })
  fastify.get('/user', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.plan(4)
    t.error(err)
    t.tearDown(() => fastify.close())

    request(
      {
        method: 'GET',
        url: `http://0.0.0.0:${fastify.server.address().port}/user`
      },
      (err, res) => {
        t.error(err)
        t.strictEqual(res.statusCode, 200)
      }
    )

    stream.on('data', log => {
      if (log.msg.match(/New trace<[a-z0-9]+> was created/)) {
        t.match(log.msg, /New trace<[a-z0-9]+> was created/)
      }
    })
  })
})

t.test('When you use http for POST method', t => {
  const stream = split(JSON.parse)
  const provider = new NodeTracerProvider()
  provider.addSpanProcessor(
    new SimpleSpanProcessor(
      new ZipkinExporter({
        serviceName: 'fastify'
      })
    )
  )

  const fastify = Fastify({
    logger: {
      level: 'info',
      stream
    }
  })

  fastify.register(fastifyOpentelemetry, {
    enabled: true,
    tracer
  })
  fastify.post('/user', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.plan(4)
    t.error(err)
    t.tearDown(() => fastify.close())

    request(
      {
        method: 'POST',
        url: `http://0.0.0.0:${fastify.server.address().port}/user`
      },
      (err, res) => {
        t.error(err)
        t.strictEqual(res.statusCode, 200)
      }
    )

    stream.on('data', log => {
      if (log.msg.match(/New trace<[a-z0-9]+> was created/)) {
        t.match(log.msg, /New trace<[a-z0-9]+> was created/)
      }
    })
  })
})

t.test('Test on ignoreUrls', t => {
  const stream = split(JSON.parse)
  const provider = new NodeTracerProvider()
  provider.addSpanProcessor(
    new SimpleSpanProcessor(
      new ZipkinExporter({
        serviceName: 'fastify'
      })
    )
  )

  const fastify = Fastify({
    logger: {
      level: 'info',
      stream
    }
  })

  fastify.register(fastifyOpentelemetry, {
    enabled: true,
    tracer,
    ignoreUrls: [/.*user.*/]
  })
  fastify.get('/user', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  let matchCount = 0
  fastify.listen(0, err => {
    t.plan(4)
    t.error(err)
    t.tearDown(() => fastify.close())

    request(
      {
        method: 'GET',
        url: `http://0.0.0.0:${fastify.server.address().port}/user`
      },
      (err, res) => {
        t.error(err)
        t.strictEqual(res.statusCode, 200)
        t.strictEqual(matchCount, 0)
      }
    )

    stream.on('data', log => {
      if (log.msg.match(/New trace<[a-z0-9]+> was created/)) {
        matchCount += 1
      }
    })
  })
})

t.test('Test on ignoreMethods', t => {
  const stream = split(JSON.parse)
  const provider = new NodeTracerProvider()
  provider.addSpanProcessor(
    new SimpleSpanProcessor(
      new ZipkinExporter({
        serviceName: 'fastify'
      })
    )
  )

  const fastify = Fastify({
    logger: {
      level: 'info',
      stream
    }
  })

  fastify.register(fastifyOpentelemetry, {
    enabled: true,
    tracer,
    ignoreMethods: ['GET']
  })
  fastify.get('/user', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  let matchCount = 0
  fastify.listen(0, err => {
    t.plan(4)
    t.error(err)
    t.tearDown(() => fastify.close())

    request(
      {
        method: 'GET',
        url: `http://0.0.0.0:${fastify.server.address().port}/user`
      },
      (err, res) => {
        t.error(err)
        t.strictEqual(res.statusCode, 200)
        t.strictEqual(matchCount, 0)
      }
    )

    stream.on('data', log => {
      if (log.msg.match(/New trace<[a-z0-9]+> was created/)) {
        matchCount += 1
      }
    })
  })
})
