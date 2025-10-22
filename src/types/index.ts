// Tipos para o Planning Poker

export type UserRole = 'host' | 'player';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  isHost: boolean;
}

export interface Vote {
  userId: string;
  userName: string;
  value: string | null;
}

export interface Round {
  id: string;
  title: string;
  subtitle?: string;
  votes: Vote[];
  revealed: boolean;
  finalEstimate?: string;
  active?: boolean;
}

export interface Room {
  id: string;
  code: string; // Código de 4 letras para entrar na sala
  hostId: string;
  name: string;
  currentRound: Round | null;
  rounds: Round[];
  users: User[];
  activeVoting: boolean;
}

export type CardValue = '0' | '1' | '2' | '3' | '5' | '8' | '13' | '21' | '34' | '55' | '89' | '?';

export const CARD_VALUES: CardValue[] = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?'];

// Tipo para o contexto da sala
export interface RoomContextType {
  currentUser: User | null;
  currentRoom: Room | null;
  isConnected: boolean;
  createRoom: (roomName: string, userName: string) => void;
  joinRoom: (roomId: string, userName: string) => void;
  leaveRoom: () => void;
  submitVote: (value: CardValue) => void;
  revealCards: () => void;
  hideCards: () => void;
  startNewRound: (title: string, subtitle?: string) => void;
  setFinalEstimate: (value: string) => void;
  deleteRound: (roundId: string) => void;
  startVoting: (roundId: string) => void;
  endVoting: () => void;
  error: string | null;
}
