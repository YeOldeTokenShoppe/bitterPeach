export const AdditiveBlendingShader = {
  uniforms: {
    baseTexture: { value: null },
    bloomTexture: { value: null },
  },
  vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
  fragmentShader: `
      uniform sampler2D baseTexture;
      uniform sampler2D bloomTexture;
      varying vec2 vUv;
  
      void main() {
        vec4 baseColor = texture2D(baseTexture, vUv);
        vec4 bloomColor = texture2D(bloomTexture, vUv);
        gl_FragColor = baseColor + bloomColor;
      }
    `,
};
