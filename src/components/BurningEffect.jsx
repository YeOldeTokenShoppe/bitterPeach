import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function BurningEffect() {
  const vertexShaderSource = `
  precision mediump float;
  varying vec2 vUv;
  attribute vec2 a_position;

  void main() {
      vUv = a_position;
      gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

  const fragmentShaderSource = `
  precision mediump float;

  varying vec2 vUv;
  uniform vec2 u_resolution;
  uniform float u_progress;
  uniform float u_time;

  float rand(vec2 n) {
      return fract(cos(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
  }
  float noise(vec2 n) {
      const vec2 d = vec2(0., 1.);
      vec2 b = floor(n), f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
      return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
  }
  float fbm(vec2 n) {
      float total = 0.0, amplitude = .4;
      for (int i = 0; i < 4; i++) {
          total += noise(n) * amplitude;
          n += n;
          amplitude *= 0.6;
      }
      return total;
  }

  void main() {
      vec2 uv = vUv;
      uv.x *= min(1., u_resolution.x / u_resolution.y);
      uv.y *= min(1., u_resolution.y / u_resolution.x);

      float t = u_progress;
      vec3 color = vec3(1., 1., .95);

      float main_noise = 1. - fbm(.75 * uv + 10. - vec2(.3, .9 * t));

      float paper_darkness = smoothstep(main_noise - .1, main_noise, t);
      color -= vec3(.99, .95, .99) * paper_darkness;

      vec3 fire_color = fbm(6. * uv - vec2(0., .005 * u_time)) * vec3(6., 1.4, .0);
      float show_fire = smoothstep(.4, .9, fbm(10. * uv + 2. - vec2(0., .005 * u_time)));
      show_fire += smoothstep(.7, .8, fbm(.5 * uv + 5. - vec2(0., .001 * u_time)));

      float fire_border = .02 * show_fire;
      float fire_edge = smoothstep(main_noise - fire_border, main_noise - .5 * fire_border, t);
      fire_edge *= (1. - smoothstep(main_noise - .5 * fire_border, main_noise, t));
      color += fire_color * fire_edge;

      float opacity = 1. - smoothstep(main_noise - .0005, main_noise, t);

      gl_FragColor = vec4(color, opacity);
  }
`;
  useEffect(() => {
    const canvasEl = document.querySelector("#fire-overlay");
    const scrollMsgEl = document.querySelector(".scroll-msg");

    const devicePixelRatio = Math.min(window.devicePixelRatio, 2);

    const params = {
      fireTime: 0.35,
      fireTimeAddition: 0,
    };

    let uniforms;
    const gl = initShader();

    const st = gsap
      .timeline({
        scrollTrigger: {
          trigger: ".page",
          start: "0% 0%",
          end: "100% 100%",
          scrub: true,
        },
      })
      .to(
        scrollMsgEl,
        {
          duration: 0.1,
          opacity: 0,
        },
        0
      )
      .to(
        params,
        {
          fireTime: 0.63,
        },
        0
      );

    if (typeof window !== "undefined") {
      window.addEventListener("resize", resizeCanvas);
      resizeCanvas();
    }

    gsap.set(".page", {
      opacity: 1,
    });

    function initShader() {
      const gl =
        canvasEl.getContext("webgl") ||
        canvasEl.getContext("experimental-webgl");

      if (!gl) {
        alert("WebGL is not supported by your browser.");
        return null;
      }

      function createShader(gl, sourceCode, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, sourceCode);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error(
            "An error occurred compiling the shaders: " +
              gl.getShaderInfoLog(shader)
          );
          gl.deleteShader(shader);
          return null;
        }

        return shader;
      }

      const vertexShader = createShader(
        gl,
        vertexShaderSource,
        gl.VERTEX_SHADER
      );
      const fragmentShader = createShader(
        gl,
        fragmentShaderSource,
        gl.FRAGMENT_SHADER
      );

      function createShaderProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          console.error(
            "Unable to initialize the shader program: " +
              gl.getProgramInfoLog(program)
          );
          return null;
        }

        return program;
      }

      const shaderProgram = createShaderProgram(
        gl,
        vertexShader,
        fragmentShader
      );
      uniforms = getUniforms(shaderProgram);

      function getUniforms(program) {
        let uniforms = [];
        let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
          let uniformName = gl.getActiveUniform(program, i).name;
          uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
        }
        return uniforms;
      }

      const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

      const vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      gl.useProgram(shaderProgram);

      const positionLocation = gl.getAttribLocation(
        shaderProgram,
        "a_position"
      );
      gl.enableVertexAttribArray(positionLocation);

      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      return gl;
    }

    function render() {
      const currentTime = performance.now();
      gl.uniform1f(uniforms.u_time, currentTime);

      gl.uniform1f(
        uniforms.u_progress,
        params.fireTime + params.fireTimeAddition
      );
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      requestAnimationFrame(render);
    }

    function resizeCanvas() {
      canvasEl.width = window.innerWidth * devicePixelRatio;
      canvasEl.height = window.innerHeight * devicePixelRatio;
      gl.viewport(0, 0, canvasEl.width, canvasEl.height);
      gl.uniform2f(uniforms.u_resolution, canvasEl.width, canvasEl.height);
      render();
    }
  }, []);

  return (
    <>
      <canvas id="fire-overlay"></canvas>
      <div className="scroll-msg"></div>

      <style jsx>{`
        body,
        html {
          margin: 0;
          padding: 0;
          font-family: sans-serif;
          font-size: 20px;
          color: #3d3d3d;
        }

        .page {
          width: 100%;
          min-height: 180vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: 0;
        }

        .scroll-msg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          padding-top: 2em;
        }

        .arrow-animated {
          font-size: 1em;
          animation: arrow-float 1s infinite;
        }

        @keyframes arrow-float {
          0% {
            transform: translateY(0);
            animation-timing-function: ease-out;
          }
          60% {
            transform: translateY(50%);
            animation-timing-function: ease-in-out;
          }
          100% {
            transform: translateY(0);
            animation-timing-function: ease-out;
          }
        }
      `}</style>
    </>
  );
}
