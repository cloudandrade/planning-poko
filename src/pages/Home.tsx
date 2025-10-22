import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../hooks/useRoom';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { createRoom, joinRoom, error, currentRoom } = useRoom();
  
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  
  const [shouldNavigate, setShouldNavigate] = useState(false);
  
  useEffect(() => {
    if (shouldNavigate && currentRoom) {
      navigate('/room');
      setShouldNavigate(false);
    }
  }, [shouldNavigate, currentRoom, navigate]);
  
  const handleCreateRoom = () => {
    if (!roomName.trim() || !userName.trim()) return;
    
    createRoom(roomName, userName);
    setShouldNavigate(true);
  };
  
  const handleJoinRoom = () => {
    if (!roomId.trim() || !userName.trim()) return;
    
    joinRoom(roomId, userName);
    setShouldNavigate(true);
  };
  
  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: 'var(--dark)' }}>
      <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center p-4">
        <div className="w-100" style={{ maxWidth: '500px', backgroundColor: 'var(--dark-light)', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '1.5rem' }}>
          <h1 className="display-5 fw-bold text-center mb-4">Planning Poko</h1>
          
          <div className="d-flex mb-4">
            <button
              className={`flex-grow-1 py-2 text-center btn ${activeTab === 'create' ? 'text-white border-bottom border-3' : 'text-secondary'}`}
              style={{ borderColor: activeTab === 'create' ? 'var(--primary)' : 'transparent', backgroundColor: 'transparent' }}
              onClick={() => setActiveTab('create')}
            >
              Criar Sala
            </button>
            <button
              className={`flex-grow-1 py-2 text-center btn ${activeTab === 'join' ? 'text-white border-bottom border-3' : 'text-secondary'}`}
              style={{ borderColor: activeTab === 'join' ? 'var(--primary)' : 'transparent', backgroundColor: 'transparent' }}
              onClick={() => setActiveTab('join')}
            >
              Entrar em Sala
            </button>
          </div>
          
          {activeTab === 'create' ? (
            <div>
              <div className="mb-3">
                <label htmlFor="userName" className="form-label">Seu Nome</label>
                <input
                  type="text"
                  className="form-control"
                  id="userName"
                  placeholder="Digite seu nome"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="roomName" className="form-label">Nome da Sala</label>
                <input
                  type="text"
                  className="form-control"
                  id="roomName"
                  placeholder="Digite o nome da sala"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>
              <button 
                className="btn w-100 mt-3" 
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                onClick={handleCreateRoom}
              >
                Criar Sala
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-3">
                <label htmlFor="userNameJoin" className="form-label">Seu Nome</label>
                <input
                  type="text"
                  className="form-control"
                  id="userNameJoin"
                  placeholder="Digite seu nome"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="roomCode" className="form-label">Código da Sala</label>
                <input
                  type="text"
                  className="form-control"
                  id="roomCode"
                  placeholder="Digite o código de 4 letras"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  maxLength={4}
                  style={{ textTransform: 'uppercase' }}
                />
                <div className="form-text">O código tem 4 letras maiúsculas (ex: ABCD)</div>
              </div>
              <button 
                className="btn w-100 mt-3" 
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                onClick={handleJoinRoom}
              >
                Entrar na Sala
              </button>
            </div>
          )}
          
          {error && (
            <p className="mt-4 text-danger text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
