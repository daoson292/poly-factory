import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ path: '/ws/console' })
export class ConsoleLogGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('ConsoleLogGateway');

  @WebSocketServer()
  server: Server;

  handleConnection(client: WebSocket) {
    this.logger.log('Client connected to PolyFactory Console Log stream');
    if (client.readyState === 1 /* OPEN */) {
      client.send(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Connected to PolyFactory v2.2.0 Realtime Console Stream',
        }),
      );
    }
  }

  handleDisconnect(client: WebSocket) {
    this.logger.log('Client disconnected from Console Log stream');
  }

  broadcastLog(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, context?: string) {
    const payload = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      context: context || 'SYSTEM',
      message,
    });

    if (this.server && this.server.clients) {
      this.server.clients.forEach((client) => {
        if (client.readyState === 1 /* OPEN */) {
          client.send(payload);
        }
      });
    }
  }
}
