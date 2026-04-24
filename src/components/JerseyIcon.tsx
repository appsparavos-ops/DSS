import React from 'react';

interface JerseyIconProps {
  color: string;
  numberColor: string;
  number: string;
  size?: number;
}

const JerseyIcon: React.FC<JerseyIconProps> = ({ color, numberColor, number, size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.1))' }}
    >
      {/* Contorno y relleno de la camiseta */}
      <path
        d="M20 5 L25 5 Q50 18 75 5 L80 5 L98 12 L90 35 Q86 40 86 45 L86 95 L14 95 L14 45 Q14 40 10 35 L2 12 Z"
        fill={color}
        stroke="rgba(0, 2, 9, 0.98)"
        strokeWidth="2"
      />
      {/* Refuerzo del cuello (línea sutil) */}
      <path
        d="M25 5 Q50 18 75 5"
        fill="none"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="3"
      />
      {/* Número del jugador */}
      <text
        x="50"
        y="65"
        textAnchor="middle"
        fill={numberColor}
        style={{
          fontSize: '45px',
          fontWeight: 900,
          fontFamily: 'Arial, sans-serif'
        }}
      >
        {number}
      </text>
    </svg>
  );
};

export default JerseyIcon;
