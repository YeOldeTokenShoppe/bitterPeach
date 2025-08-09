import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MatrixInfinityShader = ({ width = 16, height = 9, ...props }) => {
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
      
      const float zoomSpeed = 1.0;
      const float zoomScale = 0.1;
      const int recursionCount = 5;
      const float recursionFadeDepth = 3.0;
      const int glyphSize = 5;
      const int glyphCount = 2;
      const float glyphMargin = 0.5;
      const int glyphs[10] = int[](
        0x01110, 0x01110, 
        0x11011, 0x11110,
        0x11011, 0x01110, 
        0x11011, 0x01110,
        0x01110, 0x11111
      );
      
      const float glyphSizeF = float(glyphSize) + 2.0*glyphMargin;
      const float glyphSizeLog = log(glyphSizeF);
      const int powTableCount = 10;
      const float gsfi = 1.0 / glyphSizeF;
      const float powTable[10] = float[](
        1.0, gsfi, pow(gsfi,2.0), pow(gsfi,3.0), pow(gsfi,4.0), 
        pow(gsfi,5.0), pow(gsfi,6.0), pow(gsfi,7.0), pow(gsfi,8.0), pow(gsfi,9.0)
      );
      const float e = 2.718281828459;
      const float pi = 3.14159265359;
      
      float RandFloat(int i) { 
        return fract(sin(float(i)) * 43758.5453); 
      }
      
      int RandInt(int i) { 
        return int(100000.0 * RandFloat(i)); 
      }
      
      float GetRecursionFade(int r, float timePercent) {
        if (r > recursionCount)
          return timePercent;
        
        float rt = max(float(r) - timePercent - recursionFadeDepth, 0.0);
        float rc = float(recursionCount) - recursionFadeDepth;
        return rt / rc;
      }
      
      vec3 InitPixelColor() { 
        return vec3(0.0); 
      }
      
      vec3 CombinePixelColor(vec3 color, float timePercent, int i, int r, vec2 pos, ivec2 glyphPos, ivec2 glyphPosLast) {
        vec3 myColor = vec3(0.6);
        
        myColor.r *= mix(0.0, 0.7, RandFloat(i + r + 11*glyphPosLast.x + 13*glyphPosLast.y));
        myColor.b *= mix(0.0, 0.7, RandFloat(i + r + 17*glyphPosLast.x + 19*glyphPosLast.y));
        myColor *= mix(0.3, 1.0, RandFloat(i + r + 31*glyphPosLast.x + 37*glyphPosLast.y));
        
        float f = GetRecursionFade(r, timePercent);
        color += myColor * f;
        return color;
      }
      
      vec3 FinishPixel(vec3 color, vec2 uv) {
        // brighten
        color += vec3(0.07);
        
        // Simple noise simulation without texture
        vec3 noise = vec3(1.0);
        float n1 = sin(uv.x * 111.0 + iTime * 23.3) * sin(uv.y * 97.0 - iTime * 37.5);
        float n2 = sin(uv.x * 182.0 - iTime * 13.1) * sin(uv.y * 143.0 + iTime * 20.1);
        noise += mix(-0.2, 0.4, fract(n1));
        noise += mix(-0.2, 0.4, fract(n2));
        color *= noise;
        
        // make green
        color *= vec3(0.8, 1.0, 0.8);
        return color;
      }
      
      vec2 InitUV(vec2 uv) {
        // wave
        uv.x += 0.1 * sin(2.0 * uv.y + 1.0 * iTime);
        uv.y += 0.1 * sin(2.0 * uv.x + 0.8 * iTime);
        return uv;
      }
      
      int GetFocusGlyph(int i) { 
        return RandInt(i) % glyphCount; 
      }
      
      int GetGlyphPixelRow(int y, int g) { 
        return glyphs[g + (glyphSize - 1 - y) * glyphCount]; 
      }
      
      int GetGlyphPixel(ivec2 pos, int g) {
        if (pos.x >= glyphSize || pos.y >= glyphSize)
          return 0;
        
        int glyphRow = GetGlyphPixelRow(pos.y, g);
        return 1 & (glyphRow >> ((glyphSize - 1 - pos.x) * 4));
      }
      
      ivec2 focusList[12]; // max(powTableCount, recursionCount) + 2
      
      ivec2 GetFocusPos(int i) { 
        return focusList[i + 2]; 
      }
      
      ivec2 CalculateFocusPos(int iterations) {
        int g = GetFocusGlyph(iterations - 1);
        int c = 18; // Both glyphs have 18 pixels
        
        c -= RandInt(iterations) % c;
        for (int y = glyphCount * (glyphSize - 1); y >= 0; y -= glyphCount) {
          int glyphRow = glyphs[g + y];
          for (int x = 0; x < glyphSize; ++x) {
            c -= (1 & (glyphRow >> (4 * x)));
            if (c == 0)
              return ivec2(glyphSize - 1 - x, glyphSize - 1 - y / glyphCount);
          }
        }
        return ivec2(0);
      }
      
      int GetGlyph(int iterations, ivec2 glyphPos, int glyphLast, ivec2 glyphPosLast, ivec2 focusPos) {
        if (glyphPos == focusPos)
          return GetFocusGlyph(iterations);
        
        int seed = iterations + glyphPos.x * 313 + glyphPos.y * 411 + glyphPosLast.x * 557 + glyphPosLast.y * 121;
        return RandInt(seed) % glyphCount;
      }
      
      vec3 GetPixelFractal(vec2 pos, int iterations, float timePercent) {
        int glyphLast = GetFocusGlyph(iterations - 1);
        ivec2 glyphPosLast = GetFocusPos(-2);
        ivec2 glyphPos = GetFocusPos(-1);
        
        bool isFocus = true;
        ivec2 focusPos = glyphPos;
        
        vec3 color = InitPixelColor();
        for (int r = 0; r <= recursionCount + 1; ++r) {
          color = CombinePixelColor(color, timePercent, iterations, r, pos, glyphPos, glyphPosLast);
          
          if (r > recursionCount)
            return color;
          
          pos -= vec2(glyphMargin * gsfi);
          pos *= glyphSizeF;
          
          glyphPosLast = glyphPos;
          glyphPos = ivec2(pos);
          
          int glyphValue = GetGlyphPixel(glyphPos, glyphLast);
          if (glyphValue == 0 || pos.x < 0.0 || pos.y < 0.0)
            return color;
          
          pos -= vec2(floor(pos));
          focusPos = isFocus ? GetFocusPos(r) : ivec2(-10);
          glyphLast = GetGlyph(iterations + r, glyphPos, glyphLast, glyphPosLast, focusPos);
          isFocus = isFocus && (glyphPos == focusPos);
        }
        return color;
      }
      
      void main() {
        vec2 uv = vUv - 0.5;
        uv.x *= iResolution.x / iResolution.y;
        uv = InitUV(uv);
        
        float timePercent = iTime * zoomSpeed;
        int iterations = int(floor(timePercent));
        timePercent -= float(iterations);
        
        float zoom = pow(e, -glyphSizeLog * timePercent);
        zoom *= zoomScale;
        
        for(int i = 0; i < powTableCount + 2; ++i)
          focusList[i] = CalculateFocusPos(iterations + i - 2);
        
        vec2 offset = vec2(0.0);
        for (int i = 0; i < powTableCount; ++i)
          offset += ((vec2(GetFocusPos(i)) + vec2(glyphMargin)) * gsfi) * powTable[i];
        
        vec2 uvFractal = uv * zoom + offset;
        
        vec3 pixelFractalColor = GetPixelFractal(uvFractal, iterations, timePercent);
        pixelFractalColor = FinishPixel(pixelFractalColor, uv);
        
        // Apply blur for glow effect
        float blurSize = 1.0 / 512.0;
        float blurIntensity = 0.2;
        vec3 blurColor = pixelFractalColor * blurIntensity;
        
        gl_FragColor = vec4(pixelFractalColor + blurColor * 0.5, opacity);
      }
    `
  }), [width, height]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      timeRef.current += delta * 0.5; // Control animation speed
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

export default MatrixInfinityShader;