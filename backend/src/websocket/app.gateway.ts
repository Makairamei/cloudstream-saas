import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection,
  OnGatewayDisconnect, SubscribeMessage, MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger } from '@nestjs/common'

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
  namespace: '/ws',
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(AppGateway.name)
  private connectedClients = new Map<string, Socket>()

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client)
    this.logger.log(`Client connected: ${client.id} (total: ${this.connectedClients.size})`)
    this.server.emit('stats:update', { onlineAdmins: this.connectedClients.size })
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id)
    this.logger.log(`Client disconnected: ${client.id}`)
    this.server.emit('stats:update', { onlineAdmins: this.connectedClients.size })
  }

  emitActivity(event: any) {
    this.server.emit('activity:new', event)
  }

  emitSecurityAlert(alert: any) {
    this.server.emit('security:alert', alert)
  }

  emitStatsUpdate(stats: any) {
    this.server.emit('stats:update', stats)
  }

  emitNotification(notification: any) {
    this.server.emit('notification:new', notification)
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: any) {
    return { event: 'pong', data: { timestamp: Date.now() } }
  }
}
