import * as THREE from "three";

export const moonShader = {
  uniforms: {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(512, 512) },
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
      uniform vec2 resolution;
      varying vec2 vUv;
  
      #define in_inner 0.2
      #define in_outer 0.2
      #define out_inner 0.2 
      #define out_outer 0.4
  
float noise3D(vec3 p)
{
	return fract(sin(dot(p ,vec3(12.9898,78.233,128.852))) * 43758.5453)*2.0-1.0;
}

float simplex3D(vec3 p)
{
	float f3 = 1.0/3.0;
	float s = (p.x+p.y+p.z)*f3;
	int i = int(floor(p.x+s));
	int j = int(floor(p.y+s));
	int k = int(floor(p.z+s));
	
	float g3 = 1.0/6.0;
	float t = float((i+j+k))*g3;
	float x0 = float(i)-t;
	float y0 = float(j)-t;
	float z0 = float(k)-t;
	x0 = p.x-x0;
	y0 = p.y-y0;
	z0 = p.z-z0;
	int i1,j1,k1;
	int i2,j2,k2;
	if(x0>=y0)
	{
		if		(y0>=z0){ i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; } // X Y Z order
		else if	(x0>=z0){ i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; } // X Z Y order
		else 			{ i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; } // Z X Z order
	}
	else 
	{ 
		if		(y0<z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; } // Z Y X order
		else if	(x0<z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; } // Y Z X order
		else 			{ i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; } // Y X Z order
	}
	float x1 = x0 - float(i1) + g3; 
	float y1 = y0 - float(j1) + g3;
	float z1 = z0 - float(k1) + g3;
	float x2 = x0 - float(i2) + 2.0*g3; 
	float y2 = y0 - float(j2) + 2.0*g3;
	float z2 = z0 - float(k2) + 2.0*g3;
	float x3 = x0 - 1.0 + 3.0*g3; 
	float y3 = y0 - 1.0 + 3.0*g3;
	float z3 = z0 - 1.0 + 3.0*g3;			 
	vec3 ijk0 = vec3(i,j,k);
	vec3 ijk1 = vec3(i+i1,j+j1,k+k1);	
	vec3 ijk2 = vec3(i+i2,j+j2,k+k2);
	vec3 ijk3 = vec3(i+1,j+1,k+1);	     
	vec3 gr0 = normalize(vec3(noise3D(ijk0),noise3D(ijk0*2.01),noise3D(ijk0*2.02)));
	vec3 gr1 = normalize(vec3(noise3D(ijk1),noise3D(ijk1*2.01),noise3D(ijk1*2.02)));
	vec3 gr2 = normalize(vec3(noise3D(ijk2),noise3D(ijk2*2.01),noise3D(ijk2*2.02)));
	vec3 gr3 = normalize(vec3(noise3D(ijk3),noise3D(ijk3*2.01),noise3D(ijk3*2.02)));
	float n0 = 0.0;
	float n1 = 0.0;
	float n2 = 0.0;
	float n3 = 0.0;
	float t0 = 0.5 - x0*x0 - y0*y0 - z0*z0;
	if(t0>=0.0)
	{
		t0*=t0;
		n0 = t0 * t0 * dot(gr0, vec3(x0, y0, z0));
	}
	float t1 = 0.5 - x1*x1 - y1*y1 - z1*z1;
	if(t1>=0.0)
	{
		t1*=t1;
		n1 = t1 * t1 * dot(gr1, vec3(x1, y1, z1));
	}
	float t2 = 0.5 - x2*x2 - y2*y2 - z2*z2;
	if(t2>=0.0)
	{
		t2 *= t2;
		n2 = t2 * t2 * dot(gr2, vec3(x2, y2, z2));
	}
	float t3 = 0.5 - x3*x3 - y3*y3 - z3*z3;
	if(t3>=0.0)
	{
		t3 *= t3;
		n3 = t3 * t3 * dot(gr3, vec3(x3, y3, z3));
	}
	return 96.0*(n0+n1+n2+n3);
}

float fbm(vec3 p)
{
	float f;
    f  = 0.50000*(simplex3D( p )); p = p*2.01;
    f += 0.25000*(simplex3D( p )); p = p*2.02;
    f += 0.12500*(simplex3D( p )); p = p*2.03;
    f += 0.06250*(simplex3D( p )); p = p*2.04;
    f += 0.03125*(simplex3D( p )); p = p*2.05;
    f += 0.015625*(simplex3D( p ));
	return f;
}

  
      void main() {
        // Convert UV to centered coordinates
        vec2 fragCoord = vUv * resolution;
        vec3 pos = vec3(fragCoord - resolution.xy/2.0, 0.0);
        
// LIGHT
   vec3 l = normalize(vec3(sin(time), sin(time*-1.0), (cos(time))));
        
        // PLANET
        float r = resolution.y/4.0;
        float z_in = sqrt(r*r - pos.x*pos.x - pos.y*pos.y);
        float z_out = sqrt(-r*r + pos.x*pos.x + pos.y*pos.y);
        
        // Rest of your code stays mostly the same ...
        vec3 norm = normalize(vec3(pos.x, pos.y, z_in));
        vec3 norm_out = normalize(vec3(pos.x, pos.y, z_out));
        
   float e = 0.05; // planet rugosity
    float nx = fbm(vec3(norm.x+e, norm.y,   norm.z  ))*0.5+0.5; // x normal displacement
    float ny = fbm(vec3(norm.x,   norm.y+e, norm.z  ))*0.5+0.5; // y normal displacement
    float nz = fbm(vec3(norm.x,   norm.y,   norm.z+e))*0.5+0.5; // z normal displacement
    norm = normalize(vec3(norm.x*nx, norm.y*ny, norm.z*nz));
    //norm = (norm+1.)/2.; // for normals visualization
	
    // TEXTURE
    float n = 1.0-(fbm(vec3(norm.x, norm.y, norm.z))*0.5+0.5); // noise for every pixel in planet
    
    // ATMOS
    float z_in_atm  = (r * in_outer)  / z_in - in_inner;   // inner atmos
    float z_out_atm = (r * out_inner) / z_out - out_outer; // outer atmos
    z_in_atm = max(0.0, z_in_atm);
    z_out_atm = max(0.0, z_out_atm);
    
    // DIFFUSE LIGHT
    float diffuse = max(0.0, dot(norm, l));
    float diffuse_out = max(0.0, dot(norm_out, l)+0.3); // +0.3 because outer atmosphere stills when inner doesn't
    
	//fragColor = vec4(vec3(n * diffuse),1.0);
    //fragColor = vec4(vec3(z_in_atm * diffuse),1.0);
    //fragColor = vec4(vec3(z_out_atm * diffuse_out),1.0);*/
        gl_FragColor = vec4(vec3(n * diffuse + z_in_atm * diffuse + z_out_atm * diffuse_out), 1.0);
      }
    `,
};

export const flowingPatternShader = {
  uniforms: {
    time: { value: 0 },
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
        varying vec2 vUv;
        
        float map(vec2 p) {
          return length(p) - 0.2;
        }
        
        void main() {
          vec2 uv = (vUv * 4.0 - 0.5) * 2.0;
          vec3 col = vec3(0.0);
          float animTime = time * 0.25;
          float frequency = 1.0;

          for(float j = 0.0; j < 3.0; j++) {
            for(float i = 1.0; i < 8.0; i++) {
              uv.x += (0.2 / (i + j) * sin(i * atan(time) * 2.0 * uv.y + (time * 0.1) + i * j));
              uv.y += (1.0 / (i + j) * cos(i * 0.6 * uv.x + (time * 0.25) + i * j));
              float angle = time * 0.1;
              mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
              uv = rotation * uv;
            }
            vec3 newColor = vec3(
              0.5 * sin(frequency * uv.x + animTime) + 0.5,
              0.5 * sin(frequency * uv.y + animTime + 2.0) + 0.5,
              sin(frequency * (uv.x + uv.y) + animTime + 4.0)
            );
            newColor = pow(newColor, vec3(2.0));
            col += newColor;
          }
          col /= 3.0;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
};

export const glitchyPlaid = {
  uniforms: {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(512, 512) },
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
      uniform vec2 resolution;
      varying vec2 vUv;
  
      // Hash without Sine
      float hash11(float p) {
        p = fract(p * .1031);
        p *= p + 33.33;
        p *= p + p;
        return fract(p);
      }
  
      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * .1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }
  
      float noise11(float f) {
        float i = floor(f);
        f -= i;
        float u = f*f*(3.-2.*f);
        return mix(hash11(i), hash11(i + 1.), u);
      }
  
      float noise12(vec2 f) {
        vec2 i = floor(f);
        f -= i;
        vec2 u = f*f*(3.-2.*f);
        return mix(mix(hash12(i + vec2(0,0)), 
                      hash12(i + vec2(1,0)), u.x),
                  mix(hash12(i + vec2(0,1)), 
                      hash12(i + vec2(1,1)), u.x), u.y);
      }
  
      vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
        return a + b*cos(6.28318*(c*t+d));
      }
  
      void main() {
        vec2 uv = vUv * 2.0 - 1.0;  // Center UVs
        
        float xs = noise11(floor(uv.y*20.))*sin(floor(uv.y*.5)+time);
        xs *= xs*xs;
        
        float x = (uv.x+xs*.05)*20.;
        float cl = floor(x);
        x -= cl;
        
        float h = hash11(cl-1.);
        h = mix(hash11(cl),h,step(x,sin(time+h*10.)*.4+.4));
        h = sin(h*.7-noise11(uv.x-time*1.2)*2.)*.5+.5;
        
        vec3 color = pal(h,vec3(.8,.5,.3),vec3(.4,1.,.7),vec3(1.,.2,.6),vec3(.9,.07,.7))*.5-.45;
        
        color = color * (.5 + sin(uv.y*600.)*.5);
        
        cl = noise11(floor((uv.x+xs*.05)*200.)+time)*noise12(vec2(uv.x*5.,time));
        color = mix(color, vec3(0,1,1),cl*cl*cl*.6);
        
        cl = noise11(floor(uv.y*200.)+time)*noise12(vec2(uv.y*10.,0)+time);
        cl *= cl*cl;
        color = mix(color, vec3(1.,.7,0),cl);
        
        color *= (.9 + sin(uv.y*600.)*.2);
        
        gl_FragColor = vec4(color,1.0);
      }
    `,
};

export const spiralPatternShader = {
  uniforms: {
    time: { value: 0 },
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
    varying vec2 vUv;
    
    void main() {
      float aspect = 1.0;  // Since we're using a square plane
      float t = time * 0.2;
      
      // Convert vUv from [0,1] range to [-1,1] range
      vec2 uv = vUv * 2.0 - 1.0;
      uv.x *= aspect;
      
      float polar = atan(uv.x, uv.y);
      float d = length(uv * 3.141592);
      float x = sin(time + d);
      
      vec3 col = sin(t + polar - d + vec3(0.0, 2.0, 4.0));
      col = smoothstep(-1.0, 1.0, col);
      
      col = fract(col * d * x);
      
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
export const starShader = {
  uniforms: {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(512, 512) },
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
uniform vec2 resolution;
const float pi = 3.14159265359;
   varying vec2 vUv;

float vDrop(vec2 uv, float t) {
    uv.x = uv.x * 128.0; // H-Count
    float dx = fract(uv.x);
    uv.x = floor(uv.x);
    uv.y *= 0.05; // stretch
    float o = sin(uv.x * 215.4); // offset
    float s = cos(uv.x * 33.1) * 0.2 + 0.7; // speed
    float trail = mix(55.0, 35.0, s); // trail length
    float yv = fract(uv.y + t * s + o) * trail;
    yv = 1.0/yv;
    yv = smoothstep(0.0, 1.0, yv * yv);
    yv = sin(yv * pi) * (s * 5.0);
    float d2 = sin(dx * pi);
    return yv * (d2 * d2);
}

vec3 drawStarField(vec2 uv) {
    vec2 p = uv;
    float d = length(p);
    p = vec2(atan(p.x, p.y) / pi, 2.5 / d);
    float t = time * 0.4;
    vec3 col = vec3(vDrop(p, t));
    return col * (pow(d, 1.5));
}

void main() {
    // Convert UV coordinates to centered coordinates
    vec2 p = (2.0 * vUv - 1.0) * vec2(resolution.x/resolution.y, 1.0);
    
    vec3 col = drawStarField(p);
    
    gl_FragColor = vec4(col, 1.0);
}
        `,
};
