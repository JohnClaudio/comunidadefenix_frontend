import React from 'react';
import logoFull from '@/assets/logo-fenix.png';
import logoIcon from '@/assets/sf-icon.png';

interface LogoProps {
  variant?: 'full' | 'icon';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ variant = 'full', className = '' }) => {
  if (variant === 'icon') {
    return (
      <img
        src={logoIcon}
        alt="Fênix"
        className={`h-8 w-auto object-contain ${className}`}
      />
    );
  }

  return (
    <img
      src={logoFull}
      alt="Comunidade Afiliado Fênix"
      className={`h-auto object-contain ${className}`}
    />
  );
};

export default Logo;
