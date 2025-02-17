import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const DigitalDisplay = ({
  targetMesh,
  content,
  currentBatch = 80,
  type = "default",
  scale = 1,
}) => {
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      baseColor: {
        value: new THREE.Color(type === "counter" ? 0x00ff00 : 0x00ffff),
      },
    }),
    [type]
  );
  const displayBatch = Math.ceil(currentBatch / 40);
  // Create canvas for text
  const textCanvas = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    // Clear canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.fillStyle = type === "counter" ? "#00ff00" : "#00ffff";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Add outline
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.strokeText(content, canvas.width / 2, canvas.height / 2);

    // Fill text
    ctx.fillText(content, canvas.width / 2, canvas.height / 2);

    return canvas;
  }, [content, type]);

  // Create text texture
  const textTexture = useMemo(() => {
    const texture = new THREE.CanvasTexture(textCanvas);
    texture.needsUpdate = true;
    return texture;
  }, [textCanvas]);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...uniforms,
          textTexture: { value: textTexture },
        },
        vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        
      }
    `,
        fragmentShader: `
      uniform float time;
      uniform vec3 baseColor;
      uniform sampler2D textTexture;
      varying vec2 vUv;
      
      void main() {
        // Center UVs around origin, rotate 180 degrees, then shift back
        vec2 centeredUv = vUv - 0.5;
        vec2 rotatedUv = vec2(-centeredUv.x, centeredUv.y);
        vec2 finalUv = rotatedUv + 0.5;
        
        // Keep the vertical flip from before
        finalUv.y = 1.0 - finalUv.y;
        
        // Sample text texture with transformed coordinates
        vec4 textColor = texture2D(textTexture, finalUv);
        
        // Grid effect
        float grid = sin(vUv.x * 30.0) * sin(vUv.y * 30.0) * 0.5 + 0.5;
        
        // Scanning line
        float scan = smoothstep(0.0, 0.1, sin(vUv.y * 5.0 - time * 1.5));
        
        // Edge glow
        float edge = (1.0 - smoothstep(0.0, 0.1, vUv.x)) + 
                    (1.0 - smoothstep(0.9, 1.0, vUv.x));
        
        // Combine effects
        vec3 color = baseColor;
        float alpha = 0.8 + grid * 0.3 + scan * 0.2 + edge * 0.4;
        
        // Mix with text
        color = mix(color, textColor.rgb, textColor.a);
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [uniforms, textTexture]
  );

  useFrame((state) => {
    if (uniforms) {
      uniforms.time.value = state.clock.elapsedTime;
    }
  });

  useEffect(() => {
    if (targetMesh && targetMesh.material) {
      const originalMaterial = targetMesh.material;
      targetMesh.material = shaderMaterial;

      return () => {
        if (textTexture) {
          textTexture.dispose();
        }
        if (shaderMaterial) {
          shaderMaterial.dispose();
        }
        targetMesh.material = originalMaterial;
      };
    }
  }, [targetMesh, shaderMaterial, textTexture]);

  return null; // We're modifying the existing mesh directly
};

const StandUI = ({
  modelRef,
  results = [],
  currentBatch = 80,
  scale = 1,
  onSearch = () => {},
}) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const displayBatch = Math.ceil(currentBatch / 40);
  const totalUsers = results.length;
  useEffect(() => {
    if (!modelRef.current) return;

    const ui4 = modelRef.current.getObjectByName("UI4");
    if (ui4) {
      ui4.userData.clickHandler = () => {
        setIsSearchActive(true);
        onSearch(); // This should trigger handleSearch in parent
      };
    }
  }, [modelRef.current]);

  const ui1 = modelRef.current?.getObjectByName("UI1");
  const ui2 = modelRef.current?.getObjectByName("UI2");
  const ui3 = modelRef.current?.getObjectByName("UI3");
  const ui4 = modelRef.current?.getObjectByName("UI4");

  if (!ui1 || !ui2 || !ui3 || !ui4) return null;

  return (
    <>
      <DigitalDisplay
        targetMesh={ui1}
        type="counter"
        content={`${displayBatch}/${totalUsers}`}
        scale={scale}
      />

      <DigitalDisplay
        targetMesh={ui2}
        type="slots"
        content={`${40 - (totalUsers % 40)} SLOTS`}
        scale={scale}
      />

      <DigitalDisplay
        targetMesh={ui3}
        type="info"
        content="PRESS TO ROTATE"
        scale={scale}
      />

      <DigitalDisplay
        targetMesh={ui4}
        type="search"
        content={isSearchActive ? "SEARCHING..." : "SEARCH CANDLES"}
        scale={scale}
        searchActive={isSearchActive}
      />
    </>
  );
};

export default StandUI;
