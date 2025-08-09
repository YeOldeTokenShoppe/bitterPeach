import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const VolumetricCloudShader = ({ width = 16, height = 9, ...props }) => {
  const meshRef = useRef();
  const timeRef = useRef(0);

  const shader = useMemo(() => ({
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2(width * 100, height * 100) },
      iMouse: { value: new THREE.Vector2(0.5, 0.5) },
      opacity: { value: 1.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec2 iResolution;
      uniform float iTime;
      uniform vec2 iMouse;
      uniform float opacity;
      
      varying vec2 vUv;
      
      float hash(float n) {
        return fract(sin(n) * 43758.5453);
      }
      
      float noise(vec3 x) {
        vec3 p = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        float n = p.x + p.y * 57.0 + 113.0 * p.z;
        return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                       mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
                   mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                       mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
      }
      
      vec4 map(vec3 p) {
        float d = 0.2 - p.y;
        vec3 q = p - vec3(1.0, 0.1, 0.0) * iTime;
        float f;
        f = 0.5000 * noise(q); q = q * 2.02;
        f += 0.2500 * noise(q); q = q * 2.03;
        f += 0.1250 * noise(q); q = q * 2.01;
        f += 0.0625 * noise(q);
        d += 3.0 * f;
        d = clamp(d, 0.0, 1.0);
        vec4 res = vec4(d);
        res.xyz = mix(1.15 * vec3(1.0, 0.95, 0.8), vec3(0.7, 0.7, 0.7), res.x);
        return res;
      }
      
      vec3 sundir = vec3(-1.0, 0.0, 0.0);
      
      vec4 raymarch(vec3 ro, vec3 rd) {
        vec4 sum = vec4(0.0);
        float t = 0.0;
        
        for(int i = 0; i < 64; i++) {
          if(sum.a > 0.99) continue;
          
          vec3 pos = ro + t * rd;
          vec4 col = map(pos);
          
          float dif = clamp((col.w - map(pos + 0.3 * sundir).w) / 0.6, 0.0, 1.0);
          vec3 lin = vec3(0.65, 0.68, 0.7) * 1.35 + 0.45 * vec3(0.7, 0.5, 0.3) * dif;
          col.xyz *= lin;
          
          col.a *= 0.35;
          col.rgb *= col.a;
          sum = sum + col * (1.0 - sum.a);
          
          t += max(0.1, 0.025 * t);
        }
        
        sum.xyz /= (0.001 + sum.w);
        return clamp(sum, 0.0, 1.0);
      }
      
      void main() {
        vec2 p = -1.0 + 2.0 * vUv;
        p.x *= iResolution.x / iResolution.y;
        vec2 mo = -1.0 + 2.0 * iMouse;
        
        // Camera
        vec3 ro = 4.0 * normalize(vec3(cos(2.75 - 3.0 * mo.x), 0.7 + (mo.y + 1.0), sin(2.75 - 3.0 * mo.x)));
        vec3 ta = vec3(0.0, 1.0, 0.0);
        vec3 ww = normalize(ta - ro);
        vec3 uu = normalize(cross(vec3(0.0, 1.0, 0.0), ww));
        vec3 vv = normalize(cross(ww, uu));
        vec3 rd = normalize(p.x * uu + p.y * vv + 1.5 * ww);
        
        vec4 res = raymarch(ro, rd);
        
        float sun = clamp(dot(sundir, rd), 0.0, 1.0);
        vec3 col = vec3(0.6, 0.71, 0.75) - rd.y * 0.2 * vec3(1.0, 0.5, 1.0) + 0.15 * 0.5;
        col += 0.2 * vec3(1.0, 0.6, 0.1) * pow(sun, 8.0);
        col *= 0.95;
        col = mix(col, res.xyz, res.w);
        col += 0.1 * vec3(1.0, 0.4, 0.2) * pow(sun, 3.0);
        
        gl_FragColor = vec4(col, opacity);
      }
    `
  }), [width, height]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      timeRef.current += delta * 0.5; // Slow down animation
      meshRef.current.material.uniforms.iTime.value = timeRef.current;
      
      // Optional: react to mouse position
      const mouse = state.mouse;
      meshRef.current.material.uniforms.iMouse.value.set(
        (mouse.x + 1) * 0.5,
        (mouse.y + 1) * 0.5
      );
    }
  });

  return (
    <mesh ref={meshRef} {...props}>
      <planeGeometry args={[width, height, 1, 1]} />
      <shaderMaterial
        uniforms={shader.uniforms}
        vertexShader={shader.vertexShader}
        fragmentShader={shader.fragmentShader}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default VolumetricCloudShader;