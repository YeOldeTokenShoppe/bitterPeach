// Collection of shaders for music visualization on cathedral walls
import * as THREE from 'three';

export const createShaderMaterial = (shaderType = 'matrix') => {
  console.log('🎨 createShaderMaterial called with type:', shaderType);
  
  const shaders = {
    // Matrix Infinity Shader
    matrix: {
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(1920, 1080) },
        iMouse: { value: new THREE.Vector2(0.5, 0.5) },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          // Rotate UV coordinates 180 degrees (90 + 90)
          vUv = vec2(1.0 - uv.x, 1.0 - uv.y);
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
          // Simple noise simulation without texture
          vec3 noise = vec3(1.0);
          float n1 = sin(uv.x * 111.0 + iTime * 23.3) * sin(uv.y * 97.0 - iTime * 37.5);
          float n2 = sin(uv.x * 182.0 - iTime * 13.1) * sin(uv.y * 143.0 + iTime * 20.1);
          noise += mix(-0.2, 0.4, fract(n1));
          noise += mix(-0.2, 0.4, fract(n2));
          color *= noise;
          
          // make green but keep darker
          color *= vec3(0.4, 0.6, 0.4);
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
        
        ivec2 focusList[12];
        
        ivec2 GetFocusPos(int i) { 
          return focusList[i + 2]; 
        }
        
        ivec2 CalculateFocusPos(int iterations) {
          int g = GetFocusGlyph(iterations - 1);
          int c = 18;
          
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
          
          float blurSize = 1.0 / 512.0;
          float blurIntensity = 0.2;
          vec3 blurColor = pixelFractalColor * blurIntensity;
          
          gl_FragColor = vec4(pixelFractalColor + blurColor * 0.5, opacity);
        }
      `
    },

    // Colorful Dots Shader (converted from CSS)
    colorfulDots: {
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(1920, 1080) },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          // Rotate UV coordinates 180 degrees (90 + 90)
          vUv = vec2(1.0 - uv.x, 1.0 - uv.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec2 iResolution;
        uniform float iTime;
        uniform float opacity;
        varying vec2 vUv;
        
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        void main() {
          vec2 uv = vUv - 0.5;
          vec3 color = vec3(0.067, 0.137, 0.188); // Dark blue background like #123
          
          // Create 4 layers of dots (like the 4 pseudo-elements)
          for(int layer = 0; layer < 4; layer++) {
            float layerTime = iTime * (0.023 + float(layer) * 0.001);
            float delay = -19.0 - float(layer) * 4.0;
            float t = layerTime + delay;
            
            // Rotation and scale animation
            float rotation = t * 6.28318;
            float scale = 12.0 + 6.0 * sin(t * 0.5);
            
            mat2 rot = mat2(cos(rotation), -sin(rotation), sin(rotation), cos(rotation));
            vec2 rotatedUV = rot * uv * scale;
            
            // Create 40 dots per layer
            for(int i = 0; i < 40; i++) {
              float fi = float(i);
              vec2 seed = vec2(fi * 1.1, float(layer) * 2.3);
              
              // Random position for each dot
              vec2 dotPos = vec2(
                (random(seed) - 0.5) * 3.0,
                (random(seed + 1.0) - 0.5) * 3.0
              );
              
              // Apply transformation
              dotPos = rot * dotPos + rotatedUV;
              
              // Calculate distance from current pixel to dot
              float dist = length(uv - dotPos / scale);
              
              // Create dot with soft edges
              float dot = smoothstep(0.02, 0.0, dist);
              
              // Random color for each dot
              float hue = random(seed + 2.0);
              vec3 dotColor = hsv2rgb(vec3(hue, 1.0, 0.9));
              
              // Mix blend mode: screen
              color = max(color, dotColor * dot * 0.5);
            }
          }
          
          gl_FragColor = vec4(color, opacity);
        }
      `
    },

    // Wave Pattern Shader
    wavePattern: {
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(1920, 1080) },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          // Rotate UV coordinates 180 degrees (90 + 90)
          vUv = vec2(1.0 - uv.x, 1.0 - uv.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec2 iResolution;
        uniform float iTime;
        uniform float opacity;
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv * 2.0 - 1.0;
          uv.x *= iResolution.x / iResolution.y;
          
          vec3 color = vec3(0.0);
          
          // Create multiple wave layers
          for(float i = 0.0; i < 5.0; i++) {
            float t = iTime * (0.5 + i * 0.1);
            
            // Wave equation
            float wave = sin(uv.x * 10.0 + t) * cos(uv.y * 8.0 - t * 0.8);
            wave *= sin(uv.x * 7.0 - t * 1.3) * cos(uv.y * 12.0 + t * 0.6);
            
            // Color based on wave and layer
            vec3 waveColor = vec3(
              0.5 + 0.5 * sin(t + i),
              0.5 + 0.5 * sin(t + i + 2.094),
              0.5 + 0.5 * sin(t + i + 4.188)
            );
            
            color += waveColor * abs(wave) * 0.2;
          }
          
          // Add glow
          color = pow(color, vec3(0.8));
          
          gl_FragColor = vec4(color, opacity);
        }
      `
    },

    // Plasma Effect Shader
    plasma: {
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(1920, 1080) },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          // Rotate UV coordinates 180 degrees (90 + 90)
          vUv = vec2(1.0 - uv.x, 1.0 - uv.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec2 iResolution;
        uniform float iTime;
        uniform float opacity;
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv - 0.5;
          uv.x *= iResolution.x / iResolution.y;
          
          float t = iTime * 0.5;
          
          // Plasma effect
          float plasma = 0.0;
          plasma += sin((uv.x + t) * 10.0);
          plasma += sin((uv.y + t) * 10.0);
          plasma += sin((uv.x + uv.y + t) * 10.0);
          plasma += cos(length(uv + vec2(sin(t), cos(t))) * 20.0);
          plasma *= 0.25;
          
          // Color mapping
          vec3 color = vec3(
            0.5 + 0.5 * cos(plasma * 3.14159 + t),
            0.5 + 0.5 * sin(plasma * 3.14159 + t * 1.3),
            0.5 + 0.5 * sin(plasma * 3.14159 + t * 1.7)
          );
          
          // Darken background
          color *= 0.7;
          
          gl_FragColor = vec4(color, opacity);
        }
      `
    },

    // Swirling Pattern Shader
    swirlPattern: {
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(1920, 1080) },
        iMouse: { value: new THREE.Vector2(0.5, 0.5) },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          // Rotate UV coordinates 180 degrees (90 + 90)
          vUv = vec2(1.0 - uv.x, 1.0 - uv.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec2 iResolution;
        uniform float iTime;
        uniform vec2 iMouse;
        uniform float opacity;
        varying vec2 vUv;
        
        void main() {
          // Normalize coordinates to [0,1] then remap to [-1,1]
          vec2 uv = vUv * 2.0 - 1.0;
          uv.x *= iResolution.x / iResolution.y;  // preserve aspect ratio

          // Apply a slow rotation for gentle motion
          float angle = iTime * 0.1;
          float s = sin(angle), c = cos(angle);
          uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);

          // Convert to polar coordinates for a swirling effect
          float r = length(uv);
          float a = atan(uv.y, uv.x);
          
          // Introduce a soft, dynamic twist based on radius and time
          a += 0.5 * sin(3.0 * r - iTime * 0.5);
          
          // Build a dynamic pattern using polar coordinates
          float pattern = sin(10.0 * a + iTime) * cos(10.0 * r - iTime);

          // Define a darker, more muted color palette
          vec3 darkBlue      = vec3(0.15, 0.25, 0.4);  // deep blue
          vec3 darkLavender  = vec3(0.3, 0.25, 0.35);  // muted lavender
          vec3 darkMint      = vec3(0.2, 0.35, 0.3);   // dark mint

          // Mix two base colors using the dynamic pattern as a factor
          vec3 baseColor = mix(darkBlue, darkLavender, smoothstep(-1.0, 1.0, pattern));
          // Further blend in a third color using a secondary modulation
          vec3 finalColor = mix(baseColor, darkMint, smoothstep(-0.5, 0.5, sin(a * 5.0)));

          // Darken the output by reducing overall brightness
          finalColor *= 0.5;  // Reduce brightness by 50%

          // Output the final color
          gl_FragColor = vec4(finalColor, opacity);
        }
      `
    },

    // Synthwave Sunset Shader
    synthwaveSunset: {
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(1920, 1080) },
        iMouse: { value: new THREE.Vector2(0.5, 0.5) },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          // Rotate UV coordinates 180 degrees (90 + 90)
          vUv = vec2(1.0 - uv.x, 1.0 - uv.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec2 iResolution;
        uniform float iTime;
        uniform vec2 iMouse;
        uniform float opacity;
        varying vec2 vUv;
        
        #define speed 10.0
        #define wave_thing
        #define audio_vibration_amplitude 0.125
        
        float jTime;
        
        float amp(vec2 p){
          return smoothstep(1.0, 8.0, abs(p.x));   
        }
        
        float pow512(float a){
          a*=a; a*=a; a*=a; a*=a; a*=a; a*=a; a*=a; a*=a;
          return a*a;
        }
        
        float pow1d5(float a){
          return a*sqrt(a);
        }
        
        float hash21(vec2 co){
          return fract(sin(dot(co.xy, vec2(1.9898, 7.233))) * 45758.5433);
        }
        
        float hash(vec2 uv){
          float a = amp(uv);
          #ifdef wave_thing
          float w = a > 0.0 ? (1.0 - 0.4 * pow512(0.51 + 0.49 * sin((0.02 * (uv.y + 0.5 * uv.x) - jTime) * 2.0))) : 0.0;
          #else
          float w = 1.0;
          #endif
          return (a > 0.0 ? a * pow1d5(hash21(uv)) * w : 0.0) - 0.0;
        }
        
        float edgeMin(float dx, vec2 da, vec2 db, vec2 uv){
          uv.x += 5.0;
          vec3 c = fract((round(vec3(uv, uv.x + uv.y))) * (vec3(0, 1, 2) + 0.61803398875));
          float a1 = 1.0;
          float a2 = 1.0;
          float a3 = 1.0;
          return min(min((1.0 - dx) * db.y * a3, da.x * a2), da.y * a1);
        }
        
        vec2 trinoise(vec2 uv){
          const float sq = sqrt(3.0/2.0);
          uv.x *= sq;
          uv.y -= 0.5 * uv.x;
          vec2 d = fract(uv);
          uv -= d;
          
          bool c = dot(d, vec2(1)) > 1.0;
          
          vec2 dd = 1.0 - d;
          vec2 da = c ? dd : d;
          vec2 db = c ? d : dd;
          
          float nn = hash(uv + float(c));
          float n2 = hash(uv + vec2(1, 0));
          float n3 = hash(uv + vec2(0, 1));
          
          float nmid = mix(n2, n3, d.y);
          float ns = mix(nn, c ? n2 : n3, da.y);
          float dx = da.x / db.y;
          return vec2(mix(ns, nmid, dx), edgeMin(dx, da, db, uv + d));
        }
        
        vec2 map(vec3 p){
          vec2 n = trinoise(p.xz);
          return vec2(p.y - 2.0 * n.x, n.y);
        }
        
        vec3 grad(vec3 p){
          const vec2 e = vec2(0.005, 0);
          float a = map(p).x;
          return vec3(
            map(p + e.xyy).x - a,
            map(p + e.yxy).x - a,
            map(p + e.yyx).x - a
          ) / e.x;
        }
        
        vec2 intersect(vec3 ro, vec3 rd){
          float d = 0.0, h = 0.0;
          for(int i = 0; i < 100; i++){ // Reduced iterations for performance
            vec3 p = ro + d * rd;
            vec2 s = map(p);
            h = s.x;
            d += h * 0.5;
            if(abs(h) < 0.003 * d)
              return vec2(d, s.y);
            if(d > 150.0 || p.y > 2.0) break;
          }
          return vec2(-1);
        }
        
        void addsun(vec3 rd, vec3 ld, inout vec3 col){
          float sun = smoothstep(0.21, 0.2, distance(rd, ld));
          if(sun > 0.0){
            float yd = (rd.y - ld.y);
            float a = sin(3.1 * exp(-(yd) * 14.0)); 
            sun *= smoothstep(-0.8, 0.0, a);
            col = mix(col, vec3(1.0, 0.8, 0.4) * 0.75, sun);
          }
        }
        
        float starnoise(vec3 rd){
          float c = 0.0;
          vec3 p = normalize(rd) * 300.0;
          for (float i = 0.0; i < 4.0; i++){
            vec3 q = fract(p) - 0.5;
            vec3 id = floor(p);
            float c2 = smoothstep(0.5, 0.0, length(q));
            c2 *= step(hash21(id.xz / id.y), 0.06 - i * i * 0.005);
            c += c2;
            p = p * 0.6 + 0.5 * p * mat3(3./5., 0, 4./5., 0, 1, 0, -4./5., 0, 3./5.);
          }
          c *= c;
          float g = dot(sin(rd * 10.512), cos(rd.yzx * 10.512));
          c *= smoothstep(-3.14, -0.9, g) * 0.5 + 0.5 * smoothstep(-0.3, 1.0, g);
          return c * c;
        }
        
        vec3 gsky(vec3 rd, vec3 ld, bool mask){
          float haze = exp2(-5.0 * (abs(rd.y) - 0.2 * dot(rd, ld)));
          float st = mask ? (starnoise(rd)) * (1.0 - min(haze, 1.0)) : 0.0;
          vec3 back = vec3(0.4, 0.1, 0.7) * (1.0 - 0.5 * 
            exp2(-0.1 * abs(length(rd.xz) / rd.y)) * 
            max(sign(rd.y), 0.0));
          
          vec3 col = clamp(mix(back, vec3(0.7, 0.1, 0.4), haze) + st, 0.0, 1.0);
          if(mask) addsun(rd, ld, col);
          return col;  
        }
        
        void main() {
          vec2 uv = (vUv - 0.5) * 2.0;
          uv.x *= iResolution.x / iResolution.y;
          
          jTime = mod(iTime, 4000.0);
          vec3 ro = vec3(0.0, 1.0, (-20000.0 + jTime * speed));
          vec3 rd = normalize(vec3(uv, 4.0/3.0));
          
          vec2 i = intersect(ro, rd);
          float d = i.x;
          
          vec3 ld = normalize(vec3(0.0, 0.125 + 0.05 * sin(0.1 * jTime), 1.0));
          
          vec3 fog = d > 0.0 ? exp2(-d * vec3(0.14, 0.1, 0.28)) : vec3(0.0);
          vec3 sky = gsky(rd, ld, d < 0.0);
          
          vec3 col = sky;
          
          if(d > 0.0) {
            vec3 p = ro + d * rd;
            vec3 n = normalize(grad(p));
            
            float diff = dot(n, ld) + 0.1 * n.y;
            col = vec3(0.1, 0.11, 0.18) * diff;
            
            vec3 rfd = reflect(rd, n); 
            vec3 rfcol = gsky(rfd, ld, true);
            
            col = mix(col, rfcol, 0.05 + 0.95 * pow(max(1.0 + dot(rd, n), 0.0), 5.0));
            col = mix(col, vec3(0.8, 0.1, 0.92), smoothstep(0.05, 0.0, i.y));
            col = mix(sky, col, fog);
          }
          
          gl_FragColor = vec4(clamp(col, 0.0, 1.0), opacity);
        }
      `
    },

    // Cyberpunk Grid Shader
    cyberpunkGrid: {
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(1920, 1080) },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          // Rotate UV coordinates 180 degrees (90 + 90)
     vUv = vec2(1.0 - uv.y, 1.0 - uv.x);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec2 iResolution;
        uniform float iTime;
        uniform float opacity;
        varying vec2 vUv;
        
        float grid(vec2 uv, float battery) {
          vec2 size = vec2(battery * 0.01 + 0.05, battery * 0.01 + 0.02);
          vec2 g = smoothstep(size, vec2(0.0), abs(mod(uv, vec2(0.1)) - vec2(0.05)));
          return g.x * g.y;
        }
        
        void main() {
          vec2 uv = vUv - 0.5;
          uv.x *= iResolution.x / iResolution.y;
          
          // Perspective transform
          float perspective = 1.0 / (1.0 + uv.y * 0.5);
          uv.x *= perspective;
          
          // Scrolling
          uv.y += iTime * 0.2;
          
          // Grid lines
          float battery = 1.0 + sin(iTime * 2.0) * 0.02;
          float g = grid(uv, battery);
          
          // Glow lines
          float glow = grid(uv * 2.0, battery) * 0.5;
          
          // Color - cyan and magenta
          vec3 color = vec3(0.0);
          color += vec3(0.0, 1.0, 1.0) * g;
          color += vec3(1.0, 0.0, 1.0) * glow;
          
          // Fade to black at edges
          float fade = 1.0 - abs(uv.y * 0.5);
          color *= fade;
          
          gl_FragColor = vec4(color * 0.8, opacity);
        }
      `
    }
  };

  console.log('📋 Available shaders:', Object.keys(shaders));
  console.log('🔍 Looking for shader:', shaderType);
  
  const selectedShader = shaders[shaderType] || shaders.matrix;
  
  if (!selectedShader) {
    console.error('❌ No shader found for type:', shaderType);
    return null;
  }
  
  console.log('🎨 Creating THREE.ShaderMaterial with shader:', shaderType);
  
  const material = new THREE.ShaderMaterial({
    uniforms: selectedShader.uniforms,
    vertexShader: selectedShader.vertexShader,
    fragmentShader: selectedShader.fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5
  });
  
  console.log('✅ ShaderMaterial created successfully:', material);
  return material;
};

// Shader names for cycling through
export const shaderNames = ['matrix', 'colorfulDots', 'wavePattern', 'plasma', 'swirlPattern', 'synthwaveSunset', 'cyberpunkGrid'];

// Get shader by index (for cycling based on track)
export const getShaderByIndex = (index) => {
  const shaderName = shaderNames[index % shaderNames.length];
  console.log(`🎭 Track ${index} → Shader: ${shaderName} (index ${index % shaderNames.length} of ${shaderNames.length} total)`);
  return shaderName;
};