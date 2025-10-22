import React, { useState } from 'react';
import Button from './Button';

interface CreateVotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string) => void;
}

const CreateVotingModal: React.FC<CreateVotingModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onSubmit(title, description);
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="modal-content p-4 rounded" style={{ 
        backgroundColor: 'var(--dark)', 
        width: '90%', 
        maxWidth: '500px',
        border: '1px solid var(--dark-lighter)'
      }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="fs-5 fw-bold mb-0">Criar Nova Votação</h3>
          <button 
            className="btn btn-link text-secondary p-0" 
            onClick={onClose}
            style={{ fontSize: '1.5rem', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="voting-title" className="form-label">
              Título da Votação
            </label>
            <input
              id="voting-title"
              className="form-control"
              placeholder="Digite o título da votação"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ backgroundColor: 'var(--dark-light)', borderColor: 'var(--dark-lighter)' }}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="voting-description" className="form-label">
              Descrição (opcional)
            </label>
            <textarea
              id="voting-description"
              className="form-control"
              placeholder="Digite uma descrição para a votação"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ backgroundColor: 'var(--dark-light)', borderColor: 'var(--dark-lighter)' }}
              rows={3}
            />
          </div>
          
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <button type="submit" className="btn btn-primary">
              Criar Votação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVotingModal;
