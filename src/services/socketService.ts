import { io, Socket } from 'socket.io-client';

// Serviço para comunicação em tempo real com o backend
class SocketService {
  private socket: Socket | null = null;
  private readonly listeners: Map<string, Array<(data: unknown) => void>> = new Map();

  // Conectar ao servidor Socket.IO
  connect(): void {
    console.log('Conectando ao servidor Socket.IO...');
    
    this.socket = io('http://localhost:3000');
    
    // Configurar listeners padrão
    this.setupListeners();
  }

  // Desconectar do servidor
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Limpar listeners
    this.listeners.clear();
  }
  
  // Configurar listeners padrão
  private setupListeners(): void {
    if (!this.socket) return;
    
    // Eventos do servidor
    this.socket.on('room-updated', (data) => {
      this.notifyListeners('room-updated', data);
    });
    
    this.socket.on('user-joined', (data) => {
      this.notifyListeners('user-joined', data);
    });
    
    this.socket.on('user-left', (data) => {
      this.notifyListeners('user-left', data);
    });
    
    this.socket.on('vote-submitted', (data) => {
      this.notifyListeners('vote-submitted', data);
    });
    
    this.socket.on('cards-revealed', (data) => {
      this.notifyListeners('cards-revealed', data);
    });
    
    this.socket.on('cards-hidden', (data) => {
      this.notifyListeners('cards-hidden', data);
    });
    
    this.socket.on('new-round-started', (data) => {
      this.notifyListeners('new-round-started', data);
    });
    
    this.socket.on('final-estimate-set', (data) => {
      this.notifyListeners('final-estimate-set', data);
    });
    
    // Novos eventos para gerenciamento de votações
    this.socket.on('round-deleted', (data) => {
      this.notifyListeners('round-deleted', data);
    });
    
    this.socket.on('voting-started', (data) => {
      this.notifyListeners('voting-started', data);
    });
    
    this.socket.on('voting-ended', (data) => {
      this.notifyListeners('voting-ended', data);
    });
    
    this.socket.on('error', (data) => {
      this.notifyListeners('error', data);
      console.error('Erro do servidor:', data);
    });
  }

  // Emitir evento
  emit(event: string, data: unknown): void {
    console.log(`Emitindo evento: ${event}`, data);
    
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // Ouvir evento
  on(event: string, callback: (data: unknown) => void): void {
    // Adicionar listener à lista
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.push(callback);
    }
  }

  // Remover listener
  off(event: string, callback?: (data: unknown) => void): void {
    if (callback && this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    } else if (this.listeners.has(event)) {
      this.listeners.delete(event);
    }
  }

  // Notificar listeners
  private notifyListeners(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erro ao executar callback para evento ${event}:`, error);
        }
      }
    }
  }
}

// Exportar instância única
export const socketService = new SocketService();
