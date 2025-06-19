import React, { useState } from 'react';
import styled from '@emotion/styled';

const ButtonContainer = styled.div`
  position: relative;
  display: inline-block;
  font-size: inherit;
`;

const StyledButton = styled.button`
  all: unset;
  cursor: pointer;
  position: relative;
  display: inline-block;
  padding: 0.875em 1.5em;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 500;
  font-size: 1em;
  letter-spacing: -0.05em;
  color: rgba(255, 255, 255, 1);
  background: linear-gradient(
    -75deg,
    rgba(255, 255, 255, 0.05),
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0.05)
  );
  border-radius: 999px;
  box-shadow: 
    inset 0 2px 2px rgba(0, 0, 0, 0.05),
    inset 0 -2px 2px rgba(255, 255, 255, 0.5),
    0 4px 2px -2px rgba(0, 0, 0, 0.2),
    0 0 1.6px 4px inset rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  transition: all 400ms cubic-bezier(0.25, 1, 0.5, 1);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  &::before {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: 999px;
    padding: 1px;
    background: conic-gradient(
      from -75deg at 50% 50%,
      rgba(0, 0, 0, 0.5),
      rgba(0, 0, 0, 0) 5% 40%,
      rgba(0, 0, 0, 0.5) 50%,
      rgba(0, 0, 0, 0) 60% 95%,
      rgba(0, 0, 0, 0.5)
    );
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    -webkit-mask-composite: xor;
    transition: all 400ms cubic-bezier(0.25, 1, 0.5, 1);
  }
  
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: linear-gradient(
      -45deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.5) 40% 50%,
      rgba(255, 255, 255, 0) 55%
    );
    mix-blend-mode: screen;
    background-size: 200% 200%;
    background-position: 0% 50%;
    transition: all 500ms cubic-bezier(0.25, 1, 0.5, 1);
    pointer-events: none;
  }
  
  &:hover {
    transform: scale(0.975);
    box-shadow: 
      inset 0 2px 2px rgba(0, 0, 0, 0.05),
      inset 0 -2px 2px rgba(255, 255, 255, 0.5),
      0 2.4px 0.8px -1.6px rgba(0, 0, 0, 0.25),
      0 0 0.8px 1.6px inset rgba(255, 255, 255, 0.5);
    text-shadow: 0.4px 0.4px 0.4px rgba(0, 0, 0, 0.12);
    
    &::after {
      background-position: 25% 50%;
    }
  }
  
  &:active {
    transform: scale(0.975) rotate3d(1, 0, 0, 25deg);
    box-shadow: 
      inset 0 2px 2px rgba(0, 0, 0, 0.05),
      inset 0 -2px 2px rgba(255, 255, 255, 0.5),
      0 2px 2px -2px rgba(0, 0, 0, 0.2),
      0 0 1.6px 4px inset rgba(255, 255, 255, 0.2),
      0 3.6px 0.8px 0 rgba(0, 0, 0, 0.05),
      0 4px 0 0 rgba(255, 255, 255, 0.75),
      inset 0 4px 0.8px 0 rgba(0, 0, 0, 0.15);
    text-shadow: 0.4px 4px 0.8px rgba(0, 0, 0, 0.12);
    
    &::after {
      background-position: 50% 15%;
    }
  }
`;

const ButtonShadow = styled.div`
  position: absolute;
  width: calc(100% + 2em);
  height: calc(100% + 2em);
  top: -1em;
  left: -1em;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.1));
  filter: ${props => props.isHovered ? 'blur(2px)' : props.isActive ? 'blur(8px)' : 'blur(4px)'};
  -webkit-filter: ${props => props.isHovered ? 'blur(2px)' : props.isActive ? 'blur(8px)' : 'blur(4px)'};
  z-index: -1;
  transition: all 400ms cubic-bezier(0.25, 1, 0.5, 1);
  opacity: ${props => props.isActive ? 0.75 : 1};
`;

export default function GlassButton({ children, onClick, style, className }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  return (
    <ButtonContainer style={style} className={className}>
      <ButtonShadow isHovered={isHovered} isActive={isActive} />
      <StyledButton 
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsActive(false);
        }}
        onMouseDown={() => setIsActive(true)}
        onMouseUp={() => setIsActive(false)}
      >
        {children}
      </StyledButton>
    </ButtonContainer>
  );
}