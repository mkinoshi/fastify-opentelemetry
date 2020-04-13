# fastify-opentelemetry

OpenTelemetry API Connector for Fastify

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/) [![Build Status](https://travis-ci.org/mkinoshi/fastify-opentelemetry.svg?branch=master)](https://travis-ci.org/mkinoshi/fastify-opentelemetry)


`fastify-opentelemetry` is a plugin that connects your application with OpenTelemetry API for [Fastify](https://github.com/fastify/fastify). It is built on top of the [OpenTelemetry API for Javascript](https://github.com/open-telemetry/opentelemetry-js) package.

If you want to connect to Stackdriver Trace API, please use [fastify-gcloud-trace](https://github.com/mkinoshi/fastify-gcloud-trace) instead.

This plugin automatically instruments OpenTelemetry Tracing, and generates trace results. You can configure exporters and OpenTelemetry API plugins as you want. Please check out the detail [here](https://github.com/open-telemetry/opentelemetry-js).

Here is an example of a trace result using `Zipkin` Trace Exporter:

![Screen Shot 2020-04-12 at 5.10.25 PM.png](https://user-images.githubusercontent.com/10353744/79150441-2a3af380-7d9f-11ea-9ddb-da13f3b3c136.png)

## Install

```js
npm i fastify-opentelemetry
```

or

```js
yarn add fastify-opentelemetry
```

## Usage

There are two steps in using this plugin. First, you need to initialize the trace provider before the application code. You can find more details about how to initializise Open Telemetry SDK [here](https://github.com/open-telemetry/opentelemetry-js/blob/master/getting-started/README.md).

`tracer.js`

```js
const api = require('@opentelemetry/api');
const {NodeTracerProvider} = require('@opentelemetry/node');
const {SimpleSpanProcessor} = require('@opentelemetry/tracing');
const {ZipkinExporter} = require('@opentelemetry/exporter-zipkin');

module.exports = serviceName => {
  const provider = new NodeTracerProvider();
  provider.addSpanProcessor(
    new SimpleSpanProcessor(
      new ZipkinExporter({
        serviceName
      })
    )
  );
  provider.register();
  return api.trace.getTracer(serviceName);
};
```

Second, you need to import the tracer in your application code, and use the `fastify-optentelemetry` plugin in the following way.

`server.js`

```js
const tracer = require('./preStart')('fastify');
const fastify = require('fastify');
fastify.register(fastifyOpentelemetry, {
  enabled: true,
  tracer
});
```

## Options

This is the list of available options.

- `enabled` - If it is `true`, it generates a trace. The default value is `true`.
- `tracer` - OpenTelemetry API `tracer` object. This is a required property in order to use this plugin.

## Limitations

This is not an official plugin by [OpenCensus](https://opencensus.io/exporters/supported-exporters/node.js/) for Fastify.

## License Licensed under [MIT](./LICENSE).
