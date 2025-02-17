import React, { useRef } from "react";
import styled, { keyframes } from "styled-components";

// Define keyframes for spin and text animations
const spin = keyframes`
  0% { --mask: 0deg; }
  100% { --mask: 360deg; }
`;

const textShine = keyframes`
  0% { background-position: 100% center; }
  100% { background-position: -100% center; }
`;

// Root CSS variables and animations for shimmer and spin effects
const Button = styled.button`
  --shimmer-hue-1: 213deg;
  --shimmer-sat-1: 95%;
  --shimmer-lit-1: 91%;
  --shimmer-hue-2: 248deg;
  --shimmer-sat-2: 100%;
  --shimmer-lit-2: 86%;
  --shimmer-hue-3: 293deg;
  --shimmer-sat-3: 78%;
  --shimmer-lit-3: 89%;
  --glow-hue: 222deg;
  --spring-duration: 1.33s;
  --spring-easing: ease;

  color: var(--bg);
  font-weight: 600;
  font-size: 1.2em;
  background-image: linear-gradient(
    315deg,
    hsl(var(--shimmer-hue-1), var(--shimmer-sat-1), var(--shimmer-lit-1)) 0%,
    hsl(var(--shimmer-hue-2), var(--shimmer-sat-2), var(--shimmer-lit-2)) 47%,
    hsl(var(--shimmer-hue-3), var(--shimmer-sat-3), var(--shimmer-lit-3)) 100%
  );
  padding: 0.8em 1.4em;
  position: relative;
  border: none;
  outline: none;
  border-radius: 0.66em;
  isolation: isolate;
  box-shadow: 0 2px 3px 1px hsl(var(--glow-hue) 50% 20% / 50%);
  scale: 1;
  transition: all var(--spring-duration) var(--spring-easing);

  &:hover .shimmer::before,
  &:hover .shimmer::after {
    opacity: 1;
  }
`;

const Shimmer = styled.span`
  position: absolute;
  inset: -40px;
  border-radius: inherit;
  mix-blend-mode: color-dodge;
  pointer-events: none;
  mask-image: conic-gradient(
    from var(--mask, 0deg),
    transparent 0%,
    transparent 10%,
    black 36%,
    black 45%,
    transparent 50%,
    transparent 60%,
    black 85%,
    black 95%,
    transparent 100%
  );
  mask-size: cover;
  animation: ${spin} 3s linear infinite both;

  &::before,
  &::after {
    opacity: 0;
    content: "";
    position: absolute;
    inset: 40px;
    border-radius: inherit;
    transition: all 0.5s ease;
  }

  &::before {
    box-shadow: 0 0 3px 2px hsl(var(--shimmer-hue-1) 20% 95%),
      0 0 7px 4px hsl(var(--shimmer-hue-1) 20% 80%),
      0 0 13px 8px hsl(var(--shimmer-hue-2) 40% 60%),
      0 0 22px 6px hsl(var(--shimmer-hue-2) 20% 40%);
    z-index: -1;
  }

  &::after {
    box-shadow: inset 0 0 0 1px hsl(var(--shimmer-hue-2) 70% 95%),
      inset 0 0 3px 1px hsl(var(--shimmer-hue-2) 100% 80%),
      inset 0 0 9px 1px hsl(var(--shimmer-hue-2) 100% 70%);
    z-index: 2;
  }
`;

const Text = styled.span`
  color: transparent;
  background-clip: text;
  background-color: var(--bg);
  background-image: linear-gradient(
    120deg,
    transparent,
    hsla(var(--shimmer-hue-1), 100%, 80%, 0.66) 40%,
    hsla(var(--shimmer-hue-2), 100%, 90%, 0.9) 50%,
    transparent 52%
  );
  background-repeat: no-repeat;
  background-size: 300% 300%;
  background-position: center 200%;

  &.textShine {
    animation: ${textShine} 0.66s ease-in-out 1;
  }
`;

const EffectButton = () => {
  const buttonRef = useRef(null);

  const handleMouseEnter = () => {
    const button = buttonRef.current;
    if (button) {
      button.classList.remove("textShine");
      void button.offsetWidth; // Trigger reflow
      button.classList.add("textShine");
    }
  };

  return (
    <Button ref={buttonRef} onMouseEnter={handleMouseEnter}>
      <Text className="textShine">Hover over me!</Text>
      <Shimmer className="shimmer" />
    </Button>
  );
};

export default EffectButton;
