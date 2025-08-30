import { Stream } from "@soffinal/stream";

/**
 * Utility type that distributes Omit over union types
 * @template T - The type to omit from
 * @template K - The keys to omit
 */
type DistributedOmit<T, K extends PropertyKey> = T extends T ? Omit<T, K> : never;

/**
 * Configuration options for the ReactiveServer
 * @template T - WebSocket data type
 * @template R - Router types
 */
export type Options<
  T = unknown,
  R extends { [K in keyof R]: Bun.RouterTypes.RouteValue<K & string> } = {}
> = DistributedOmit<Bun.ServeFunctionOptions<T, R>, "fetch" | "websocket" | "unix"> & {
  /** Function to encode data (defaults to JSON.stringify) */
  encode?: Function;
  /** Function to decode data (defaults to JSON.parse) */
  decode?: Function;
  /** WebSocket handler options */
  websocketOptions?: Omit<Bun.WebSocketHandler<T>, "open" | "close" | "message" | "drain" | "ping" | "pong">;
};

/**
 * HTTP request event
 * @template T - WebSocket data type
 * @template R - Router types
 */
export type HttpEvent<T = unknown, R extends { [K in keyof R]: Bun.RouterTypes.RouteValue<K & string> } = {}> = {
  /** Event type identifier */
  type: "http-request";
  /** The incoming HTTP request */
  request: Request;
  /** The Bun server instance */
  server: Bun.Server;
  /** Function to send the HTTP response */
  respond: (response: Response) => void;
  /** Server options with encode/decode functions */
  options: Omit<Options<T, R>, "encode" | "decode"> & { encode: Function; decode: Function };
};
/**
 * Error event
 * @template T - WebSocket data type
 * @template R - Router types
 */
export type ErrorEvent<T = unknown, R extends { [K in keyof R]: Bun.RouterTypes.RouteValue<K & string> } = {}> = {
  /** Event type identifier */
  type: "error";
  /** The error that occurred */
  error: Bun.ErrorLike;
  /** The Bun server instance */
  server: Bun.Server;
  /** Server options with encode/decode functions */
  options: Omit<Options<T, R>, "encode" | "decode"> & { encode: Function; decode: Function };
};
/**
 * WebSocket events union type
 * @template T - WebSocket data type
 * @template R - Router types
 */
export type WebsocketEvent<T = unknown, R extends { [K in keyof R]: Bun.RouterTypes.RouteValue<K & string> } = {}> =
  | {
      /** WebSocket connection opened */
      type: "ws-open";
      /** The WebSocket connection */
      ws: Bun.ServerWebSocket<T>;
      /** The Bun server instance */
      server: Bun.Server;
      /** Server options with encode/decode functions */
      options: Omit<Options<T, R>, "encode" | "decode"> & { encode: Function; decode: Function };
    }
  | {
      /** WebSocket message received */
      type: "ws-message";
      /** The WebSocket connection */
      ws: Bun.ServerWebSocket<T>;
      /** The Bun server instance */
      server: Bun.Server;
      /** The received message */
      message: string | Buffer<ArrayBufferLike>;
      /** Server options with encode/decode functions */
      options: Omit<Options<T, R>, "encode" | "decode"> & { encode: Function; decode: Function };
    }
  | {
      /** WebSocket connection closed */
      type: "ws-close";
      /** The WebSocket connection */
      ws: Bun.ServerWebSocket<T>;
      /** The Bun server instance */
      server: Bun.Server;
      /** Close status code */
      code: number;
      /** Close reason */
      reason: string;
      /** Server options with encode/decode functions */
      options: Omit<Options<T, R>, "encode" | "decode"> & { encode: Function; decode: Function };
    }
  | {
      /** WebSocket ready to send more data */
      type: "ws-drain";
      /** The WebSocket connection */
      ws: Bun.ServerWebSocket<T>;
      /** The Bun server instance */
      server: Bun.Server;
      /** Server options with encode/decode functions */
      options: Omit<Options<T, R>, "encode" | "decode"> & { encode: Function; decode: Function };
    }
  | {
      /** WebSocket ping received */
      type: "ws-ping";
      /** The WebSocket connection */
      ws: Bun.ServerWebSocket<T>;
      /** The Bun server instance */
      server: Bun.Server;
      /** Ping data */
      data: Buffer<ArrayBufferLike>;
      /** Server options with encode/decode functions */
      options: Omit<Options<T, R>, "encode" | "decode"> & { encode: Function; decode: Function };
    }
  | {
      /** WebSocket pong received */
      type: "ws-pong";
      /** The WebSocket connection */
      ws: Bun.ServerWebSocket<T>;
      /** The Bun server instance */
      server: Bun.Server;
      /** Pong data */
      data: Buffer<ArrayBufferLike>;
      /** Server options with encode/decode functions */
      options: Omit<Options<T, R>, "encode" | "decode"> & { encode: Function; decode: Function };
    };
/**
 * Union of all possible server events
 * @template T - WebSocket data type
 * @template R - Router types
 */
export type Event<T = unknown, R extends { [K in keyof R]: Bun.RouterTypes.RouteValue<K & string> } = {}> =
  | HttpEvent<T, R>
  | WebsocketEvent<T, R>
  | ErrorEvent<T, R>;

/**
 * Reactive HTTP server that emits events as a stream
 * @template T - WebSocket data type
 * @template R - Router types
 */
export class Server<
  T = unknown,
  R extends { [K in keyof R]: Bun.RouterTypes.RouteValue<K & string> } = {}
> extends Stream<Event<T, R>> {
  protected options?: Options<T, R>;
  protected _server?: Bun.Server;

  /**
   * Creates a new Server instance
   * @param options - Server configuration options
   */
  constructor(options?: Options<T, R>) {
    super();
    this.options = options;
  }

  /**
   * Gets the underlying Bun server instance
   * @returns The server instance or undefined if not started
   */
  get server(): Bun.Server | undefined {
    return this._server;
  }

  /**
   * Starts the HTTP server and begins emitting events
   */
  start(): void {
    const self = this;
    const { encode = JSON.stringify, decode = JSON.parse, websocketOptions } = this.options ?? {};
    const options = { ...self.options, encode, decode };

    const server = Bun.serve<T, R>({
      ...this.options,
      async fetch(request, server): Promise<Response> {
        const { promise, resolve } = Promise.withResolvers<Response>();
        self.push({
          type: "http-request",
          request,
          server,
          respond(response) {
            resolve(response);
          },
          options,
        });
        return promise;
      },
      websocket: {
        ...websocketOptions,
        open(ws) {
          self.push({ type: "ws-open", ws, server, options });
        },
        message(ws, message) {
          self.push({ type: "ws-message", ws, server, message, options });
        },
        close(ws, code, reason) {
          self.push({ type: "ws-close", ws, server, code, reason, options });
        },
        drain(ws) {
          self.push({ type: "ws-drain", ws, server, options });
        },
        ping(ws, data) {
          self.push({ type: "ws-ping", ws, server, data, options });
        },
        pong(ws, data) {
          self.push({ type: "ws-pong", ws, server, data, options });
        },
      },
      error(error) {
        self.push({ type: "error", error: error, server, options });
      },
    });

    this._server = server;
  }

  /**
   * Stops the HTTP server
   * @param closeActiveConnections - Whether to close active connections
   */
  stop(closeActiveConnections?: boolean): void {
    this._server?.stop(closeActiveConnections);
  }
}
