# Reactive HTTP Server

A reactive HTTP server built on Bun that emits events as a stream for HTTP requests, WebSocket connections, and errors. Built on top of [@soffinal/stream](https://www.npmjs.com/package/@soffinal/stream), it provides a functional, composable approach to handling server events with powerful stream transformations.

## Features

- **Event-Driven Architecture** - All server interactions (HTTP, WebSocket, errors) are emitted as stream events
- **Reactive Streams** - Built on @soffinal/stream for powerful async iteration and transformations
- **WebSocket Support** - Full WebSocket lifecycle management with upgrade, messaging, and connection handling
- **Functional Composition** - Chain transformations using `pipe()` for clean, composable event processing
- **Promise Integration** - Await server events directly with promise-like interface
- **Type Safety** - Full TypeScript support with generic types for WebSocket data and routing
- **Bun Optimized** - Leverages Bun's high-performance HTTP server and WebSocket implementation
- **Stream Transformers** - Access to filter, map, merge, throttling, rate limiting, and other powerful stream operators

## Why Reactive?

Traditional HTTP servers handle requests imperatively. This reactive approach treats all server events as a unified stream, enabling:

- **Unified Event Handling** - Process HTTP requests, WebSocket messages, and errors through the same stream interface
- **Powerful Filtering** - Easily filter events by type, content, or custom conditions
- **Event Composition** - Combine multiple event streams and transform them functionally
- **Backpressure Management** - Built-in flow control for high-throughput scenarios
- **Clean Separation** - Separate event generation from event processing for better architecture
- **Advanced Control Flow** - Access to throttling, debouncing, rate limiting, and backpressure handling through copy-paste transformers

## Installation

```bash
npm install @soffinal/http-server
```

## Usage

```typescript
import { Server } from "@soffinal/http-server";

const server = new Server({
  port: 3000,
  hostname: "localhost",
});

// Multiple independent listeners - each handles what it cares about
server.listen((event) => {
  if (event.type === "http-request") {
    event.respond(new Response("Hello World"));
  }
});

server.listen((event) => {
  if (event.type === "ws-open") {
    console.log("WebSocket connected");
  }
});

server.listen((event) => {
  if (event.type === "error") {
    console.error("Server error:", event.error);
  }
});

server.start();
```

### Advanced Usage

#### Async Iteration

```typescript
const server = new Server({ port: 3000 });

// Process events with async iteration
(async () => {
  for await (const event of server) {
    if (event.type === "http-request") {
      event.respond(new Response("Hello from async iterator"));
    }
  }
})();

server.start();
```

#### Stream Transformations

```typescript
const server = new Server({ port: 3000 });

// Filter only HTTP requests
const httpRequests = server.pipe(
  (stream) =>
    new Stream(async function* () {
      for await (const event of stream) {
        if (event.type === "http-request") yield event;
      }
    })
);

httpRequests.listen((event) => {
  event.respond(new Response("Filtered HTTP response"));
});

server.start();
```

#### Promise-like Interface

```typescript
const server = new Server({ port: 3000 });
server.start();

// Wait for the first event
const firstEvent = await server;
console.log("First event:", firstEvent.type);
```

#### WebSocket Upgrade and Messaging

```typescript
const server = new Server({
  port: 3000,
  websocketOptions: {
    maxCompressedSize: 64 * 1024,
    maxBackpressure: 64 * 1024,
  },
});

// Listener 1: Handle WebSocket upgrades
server.listen((event) => {
  if (event.type === "http-request" && event.request.headers.get("upgrade") === "websocket") {
    event.server.upgrade(event.request);
  }
});

// Listener 2: Handle HTTP requests
server.listen((event) => {
  if (event.type === "http-request") {
    event.respond(new Response("HTTP Server"));
  }
});

// Listener 3: Handle WebSocket connections
server.listen((event) => {
  if (event.type === "ws-open") {
    console.log("WebSocket connected");
    event.ws.send("Welcome!");
  }
});

// Listener 4: Echo messages
server.listen((event) => {
  if (event.type === "ws-message") {
    console.log("Received:", event.message);
    event.ws.send(`Echo: ${event.message}`);
  }
});

server.start();
```

#### Chat Server Example

```typescript
const server = new Server({ port: 3000 });
const clients = new Set<any>();

// Listener 1: Handle WebSocket upgrades (can be in upgrade.ts)
server.listen((event) => {
  if (event.type === "http-request" && event.request.headers.get("upgrade") === "websocket") {
    event.server.upgrade(event.request);
  }
});

// Listener 2: Serve HTTP requests (can be in http.ts)
server.listen((event) => {
  if (event.type === "http-request") {
    event.respond(new Response("Chat Server"));
  }
});

// Listener 3: Handle new connections (can be in connections.ts)
server.listen((event) => {
  if (event.type === "ws-open") {
    clients.add(event.ws);
    clients.forEach((client) => {
      if (client !== event.ws) {
        client.send("User joined");
      }
    });
  }
});

// Listener 4: Broadcast messages (can be in messaging.ts)
server.listen((event) => {
  if (event.type === "ws-message") {
    clients.forEach((client) => {
      client.send(event.message);
    });
  }
});

// Listener 5: Handle disconnections (can be in cleanup.ts)
server.listen((event) => {
  if (event.type === "ws-close") {
    clients.delete(event.ws);
    clients.forEach((client) => {
      client.send("User left");
    });
  }
});

server.start();
```

#### Event Filtering and Processing

```typescript
const server = new Server({ port: 3000 });

// Problem: Traditional servers mix concerns in single handlers
// Solution: Separate listeners for different responsibilities

// WebSocket monitoring (can be in monitoring.ts)
const wsEvents = server.pipe(
  (stream) =>
    new Stream(async function* () {
      for await (const event of stream) {
        if (event.type.startsWith("ws-")) yield event;
      }
    })
);

wsEvents.listen((event) => {
  console.log("WebSocket event:", event.type);
});

// API routes handler (can be in api-routes.ts)
server.listen((event) => {
  if (event.type === "http-request" && event.request.url.includes("/api/")) {
    const url = new URL(event.request.url);
    if (url.pathname === "/api/users") {
      event.respond(new Response(JSON.stringify({ users: [] })));
    }
  }
});

// Static files handler (can be in static-handler.ts)
server.listen((event) => {
  if (event.type === "http-request" && event.request.url.includes("/static/")) {
    event.respond(new Response("Static file content"));
  }
});

// Default handler (can be in default-routes.ts)
server.listen((event) => {
  if (event.type === "http-request") {
    event.respond(new Response("Hello World"));
  }
});

// Error logging (can be in logger.ts)
server.listen((event) => {
  if (event.type === "error") {
    console.error("Server error:", event.error);
  }
});

server.start();
```

#### Error Handling and Monitoring

```typescript
const server = new Server({ port: 3000 });

// Problem: Monolithic error handling makes code hard to maintain
// Solution: Separate listeners for different monitoring concerns

// Database error handler (can be in db-error-handler.ts)
server.listen((event) => {
  if (event.type === "error" && event.error.message?.includes("database")) {
    console.error("Database error:", event.error);
    // Reconnect to database
  }
});

// Network error handler (can be in network-error-handler.ts)
server.listen((event) => {
  if (event.type === "error" && event.error.code === "ECONNRESET") {
    console.error("Connection reset:", event.error);
    // Handle connection issues
  }
});

// General error logger (can be in error-logger.ts)
server.listen((event) => {
  if (event.type === "error") {
    console.error("Server error:", event.error);
    // Log to monitoring service
  }
});

// Health monitoring (can be in health-monitor.ts)
server.listen((event) => {
  if (event.type === "ws-ping") {
    console.log("Ping received");
  }
});

// Performance monitoring (can be in perf-monitor.ts)
server.listen((event) => {
  if (event.type === "ws-drain") {
    console.log("WebSocket ready for more data");
  }
});

// Analytics (can be in analytics.ts)
server.listen((event) => {
  if (event.type === "ws-pong") {
    console.log("Pong received");
  }
});

server.start();
```

## Stream Features

Since ReactiveServer extends [@soffinal/stream](https://www.npmjs.com/package/@soffinal/stream), you get all stream capabilities:

- **Async Iteration** - Use `for await` loops
- **Promise Interface** - Await the next event with `await server`
- **Transformations** - Use `pipe()` for functional composition
- **Listener Management** - Automatic cleanup with AbortSignal
- **And more...**

## Stream Transformers

When you install `@soffinal/stream`, you get access to core transformers `filter`, `map`, `merge`, `flat` and more in `JSDoc`:

```bash
npm install @soffinal/stream
```

```typescript
import { Server } from "@soffinal/http-server";
import { filter, map, merge } from "@soffinal/stream";

const server = new Server({ port: 3000 });

// Chain transformers to create responses
const responses = server
  .pipe(filter({}, (_, event) => [event.type === "http-request", {}]))
  .pipe(map({}, (_, event) => [new Response("Transformed response"), {}]));

// Handle the transformed responses
responses.listen((response) => {
  console.log("Generated response:", response);
});

// Or respond directly in the chain
server.pipe(filter({}, (_, event) => [event.type === "http-request", {}])).listen((event) => {
  event.respond(new Response("Chained response"));
});

// Merge multiple event streams
const wsEvents = server.pipe(filter({}, (_, event) => [event.type.startsWith("ws-"), {}]));
const allEvents = merge(responses, wsEvents);

server.start();
```

### Core Transformers

- **filter** - Filter events based on conditions
- **map** - Transform events to new values
- **merge** - Combine multiple streams
- **flat** - Flatten nested streams

### Copy-Paste Transformers (JSDoc Examples)

The stream library provides additional transformers as copy-paste examples in JSDoc:

- **take** - Take only first N events
- **distinct** - Remove duplicate events
- **delay** - Add delays between events
- **scan** - Accumulate values over time
- **tap** - Side effects without changing the stream
- **throttle** - Limit event frequency (rate limiting)
- **debounce** - Delay events until activity stops
- **buffer** - Collect events into batches
- **retry** - Retry failed operations
- **withIndex** - Add index to each event
- **simpleFilter** - Simple predicate-based filtering
- **simpleMap** - Simple transformation mapping
- **toState** - Convert stream to state container

And many more transformers available as JSDoc examples for immediate copy-paste use.

### Rate Limiting and Advanced Processing

```typescript
import { Server } from "@soffinal/http-server";
import { filter } from "@soffinal/stream";

// Copy-paste throttle transformer from JSDoc
const throttle =
  <T>(ms: number) =>
  (stream: Stream<T>) =>
    new Stream<T>(async function* () {
      let lastEmit = 0;
      for await (const value of stream) {
        const now = Date.now();
        if (now - lastEmit >= ms) {
          yield value;
          lastEmit = now;
        }
      }
    });

const server = new Server({ port: 3000 });

// Rate limit HTTP requests (max 10 per second)
const rateLimitedRequests = server
  .pipe(filter({}, (_, event) => [event.type === "http-request", {}]))
  .pipe(throttle(100)); // 100ms between events = 10/sec

server.start();
```

See [@soffinal/stream documentation](https://www.npmjs.com/package/@soffinal/stream) for complete transformer library.

## WebSocket Client Example

### Basic WebSocket Client

```javascript
// Client-side WebSocket connection
const ws = new WebSocket("ws://localhost:3000");

ws.onopen = () => {
  console.log("Connected to server");
  ws.send("Hello Server!");
};

ws.onmessage = (event) => {
  console.log("Received:", event.data);
};

ws.onclose = () => {
  console.log("Disconnected from server");
};
```

### Reactive WebSocket Client with Auto-Reconnect

For a more robust client experience, use [@soffinal/websocket](https://www.npmjs.com/package/@soffinal/websocket) which extends Stream with automatic reconnection, message queuing, and stream-based event handling:

```bash
npm install @soffinal/websocket
```

```typescript
import { WebSocket } from "@soffinal/websocket";

const ws = new WebSocket("ws://localhost:3000", {
  connectionTimeout: 5000,
  maxMessageQueued: 100,
  useExponentialBackoff: true,
  retryDelay: 1000,
});

// Listen to connection events
ws.listen((event) => {
  switch (event.type) {
    case "connected":
      console.log("Connected to server");
      ws.send("Hello Server!");
      break;
    case "connecting":
      console.log("Connecting...");
      break;
    case "message":
      console.log("Received:", event.data);
      break;
    case "disconnected":
      console.log("Disconnected from server");
      break;
  }
});

// Auto-reconnect is built-in
ws.connect();
```

## API

### `Server<T, R>`

#### Constructor

- `new Server(options?)` - Creates a new server instance

#### Methods

- `start()` - Starts the server
- `stop(closeActiveConnections?)` - Stops the server
- `listen(callback, signal?)` - Listen to server events
- `push(event)` - Emit an event (internal use)
- `pipe(transformer)` - Transform the event stream

#### Properties

- `server` - Gets the underlying Bun server instance
- `hasListeners` - Returns true if the stream has active listeners
- `listenerAdded` - Stream that emits when a listener is added
- `listenerRemoved` - Stream that emits when a listener is removed

#### Properties

- `hasListeners` - Returns true if the stream has active listeners
- `listenerAdded` - Stream that emits when a listener is added
- `listenerRemoved` - Stream that emits when a listener is removed

#### Options

Extends Bun.ServeFunctionOptions with additional options:

- `encode?: Function` - Data encoding function (default: JSON.stringify)
- `decode?: Function` - Data decoding function (default: JSON.parse)
- `websocketOptions?` - WebSocket handler options
- Plus all Bun server options: `port`, `hostname`, `development`, `error`, `tls`, `maxRequestBodySize`, etc.

## Events

### HTTP Events

- `http-request` - Incoming HTTP request

### WebSocket Events

- `ws-open` - WebSocket connection opened
- `ws-message` - WebSocket message received
- `ws-close` - WebSocket connection closed
- `ws-drain` - WebSocket ready for more data
- `ws-ping` - WebSocket ping received
- `ws-pong` - WebSocket pong received

### Error Events

- `error` - Server error occurred

## License

MIT

## Contact

- **Author**: Soffinal
- **Email**: smari.sofiane@gmail.com
- **GitHub**: [@soffinal](https://github.com/soffinal)
- **Repository**: [reactive-http-server](https://github.com/soffinal/http-server)
