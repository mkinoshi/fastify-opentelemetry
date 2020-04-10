const t = require('tap')
const split = require('split2')
const request = require('request')
const Fastify = require('fastify')
const { SimpleSpanProcessor } = require('@opentelemetry/tracing')
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin')
const { NodeTracerProvider } = require('@opentelemetry/node')
const fastifyOpentelemetry = require('../')

t.test('When you use http for GET method', t => {
  const stream = split(JSON.parse)
  const provider = new NodeTracerProvider()
  provider.addSpanProcessor(new SimpleSpanProcessor(
    new ZipkinExporter({
      serviceName: 'fastify'
    })
  ))

  const fastify = Fastify({
    logger: {
      level: 'info',
      stream
    }
  })

  fastify.register(fastifyOpentelemetry, {
    enabled: true,
    provider
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

t.test('When you use http for GET method', t => {
  const stream = split(JSON.parse)
  const provider = new NodeTracerProvider()
  provider.addSpanProcessor(new SimpleSpanProcessor(
    new ZipkinExporter({
      serviceName: 'fastify'
    })
  ))

  const fastify = Fastify({
    logger: {
      level: 'info',
      stream
    }
  })

  fastify.register(fastifyOpentelemetry, {
    enabled: true,
    provider
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
