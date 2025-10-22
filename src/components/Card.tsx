import React from 'react';
import type { CardValue } from '../types';

interface CardProps {
  value: CardValue;
  selected?: boolean;
  revealed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ value, selected = false, revealed = true, disabled = false, onClick }) => {
  // Determinar a cor de fundo com base no estado do card
  let backgroundColor = 'var(--dark)';
  if (selected) {
    backgroundColor = 'var(--primary)';
  } else if (revealed) {
    backgroundColor = 'var(--dark-light)';
  }

  return (
    <button 
      className={`card d-flex align-items-center justify-content-center fs-1 fw-bold ${selected ? 'selected' : ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: '6rem',
        height: '8rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        backgroundColor,
        borderColor: selected ? 'var(--primary-light)' : 'var(--dark-lighter)',
        borderWidth: selected ? '2px' : '1px',
        color: 'white',
        boxShadow: selected ? '0 0 10px 2px rgba(139, 92, 246, 0.6), inset 0 0 5px rgba(139, 92, 246, 0.3)' : 'none',
        opacity: disabled ? 0.6 : 1
      }}
    >
      {revealed ? value : ''}
    </button>
  );
};

export default Card;
