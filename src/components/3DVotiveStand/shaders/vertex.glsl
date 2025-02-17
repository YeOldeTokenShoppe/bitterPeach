varying vec2 vUv;
varying vec3 vPosition; // Declare vPosition to pass position to fragment shader

void main() {
    vUv = uv;             // Pass UV coordinates
    vPosition = position; // Pass position to fragment shader
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}