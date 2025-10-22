import { useContext } from 'react';
import { RoomContext } from '../context/RoomContext';
import type { RoomContextType } from '../types';

// Hook personalizado para usar o contexto
export const useRoom = (): RoomContextType => {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoom deve ser usado dentro de um RoomProvider');
  }
  return context;
};
