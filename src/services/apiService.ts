// Serviço para fazer requisições HTTP para o backend
const API_URL = 'http://localhost:3000/api';

// Criar uma nova sala
export async function createRoom(name: string, userName: string, code?: string) {
  try {
    const response = await fetch(`${API_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, userName, code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao criar sala');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao criar sala:', error);
    throw error;
  }
}

// Buscar sala pelo código
export async function getRoomByCode(code: string) {
  try {
    const response = await fetch(`${API_URL}/rooms/${code}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao buscar sala');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar sala:', error);
    throw error;
  }
}

// Entrar em uma sala
export async function joinRoom(code: string, userName: string) {
  try {
    const response = await fetch(`${API_URL}/rooms/${code}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao entrar na sala');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao entrar na sala:', error);
    throw error;
  }
}
