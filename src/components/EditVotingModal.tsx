'use client';

import React, { useState, useEffect } from 'react';
import Button from './Button';
import type { Round } from '../types';
import './styles/modal.css';

interface EditVotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: Round | null;
  onSubmit: (roundId: string, title: string, description: string) => void;
}

const EditVotingModal: React.FC<EditVotingModalProps> = ({
  isOpen,
  onClose,
  round,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (round && isOpen) {
      setTitle(round.title);
      setDescription(round.subtitle ?? '');
    }
  }, [round, isOpen]);

  if (!isOpen || !round) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(round.id, title, description);
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="modal-content p-4 rounded"
        style={{
          backgroundColor: 'var(--dark)',
          width: '90%',
          maxWidth: '500px',
          border: '1px solid var(--dark-lighter)',
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="fs-5 fw-bold mb-0">Editar tarefa</h3>
          <button
            type="button"
            className="btn btn-link text-secondary p-0"
            onClick={onClose}
            style={{ fontSize: '1.5rem', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="edit-voting-title" className="form-label">
              Título
            </label>
            <input
              id="edit-voting-title"
              className="form-control"
              placeholder="Título da tarefa"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                backgroundColor: 'var(--dark-light)',
                borderColor: 'var(--dark-lighter)',
                color: 'white',
              }}
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="edit-voting-description" className="form-label">
              Descrição (opcional)
            </label>
            <textarea
              id="edit-voting-description"
              className="form-control"
              placeholder="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                backgroundColor: 'var(--dark-light)',
                borderColor: 'var(--dark-lighter)',
                color: 'white',
              }}
              rows={3}
            />
          </div>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <button type="submit" className="btn btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVotingModal;
