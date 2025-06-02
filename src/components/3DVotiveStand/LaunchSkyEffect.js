import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Static flag to ensure the effect only runs once per session
let hasRunOnce = false;
let lastActivationTime = 0;

function LaunchSkyEffect({ active, fadeProgress = 0 }) {
  console.log(`LaunchSkyEffect: active=${active}, fadeProgress=${fadeProgress}`);
  
  // Add a state to track when the effect was activated
  const [activationTime, setActivationTime] = useState(null);
  const [isReallyActive, setIsReallyActive] = useState(false);
  
  // Get camera and scene from useThree hook
  const { camera } = useThree();
  const planeRef = useRef();
  
  // Create refs for uniforms that will be updated in the animation frame
  const skyUniforms = useRef({
    time: { value: 0.0 },
    fadeOpacity: { value: 0.0 } // Start with 0 opacity regardless of active state
  });

  // When active state changes, set or clear activation time
  useEffect(() => {
    // Protection against multiple activations in a single session
    if (active && !activationTime) {
      // Check if effect has already run or if we're being triggered too quickly
      const now = performance.now() / 100;
      
      // If we've already run once or it's too soon after the last activation, ignore it
      if (hasRunOnce || (now - lastActivationTime < 20)) { // 2 second minimum between activations
        console.log(`🚫 Ignoring duplicate activation request. hasRunOnce=${hasRunOnce}, timeSinceLast=${now - lastActivationTime}`);
        return;
      }
      
      // Store when the effect was activated
      console.log(`🌈 Starting sky effect emergence at: ${now.toFixed(2)}`);
      setActivationTime(now);
      lastActivationTime = now;
      hasRunOnce = true; // Mark that we've run the effect
      
      // Don't set to active immediately - wait for the delay to create gradual appearance
      setIsReallyActive(false);
      
      // Set a timer to automatically deactivate after a short duration
      const totalDuration = 1200; // Increased from 800ms to 1200ms for longer overall effect
      setTimeout(() => {
        console.log(`🌑 Auto-deactivating sky effect after ${totalDuration}ms`);
        // Set a flag on window to prevent retriggering for a cooldown period
        window.skyEffectCooldown = true;
        window.skyEffectControls?.deactivate();
        
        // Clear cooldown after a suitable delay to prevent multiple iterations
        setTimeout(() => {
          window.skyEffectCooldown = false;
          
          // Optional: reset the hasRunOnce flag after a longer delay if you want to allow 
          // the effect to run again in the future (e.g. for testing)
          setTimeout(() => {
            console.log("Resetting hasRunOnce flag to allow effect to run again later");
            hasRunOnce = false;
          }, 5000); // 5 seconds before allowing another activation
          
        }, 1000); // 1 second cooldown after effect ends
      }, totalDuration);
    } else if (!active && (activationTime || isReallyActive)) {
      // Reset when deactivated
      console.log(`🌑 Clearing sky effect`);
      setActivationTime(null);
      setIsReallyActive(false);
      
      // Also reset the opacity immediately to prevent ghost images
      if (skyUniforms.current) {
        skyUniforms.current.fadeOpacity.value = 0;
      }
    }
  }, [active, activationTime, isReallyActive]);
  
  // Update uniforms when active or fadeProgress changes
  useEffect(() => {
    if (skyUniforms.current) {
      // We don't set opacity directly here anymore - it's handled in useFrame
      // This ensures all the growth factors work together
      console.log(`Sky effect update: active=${active}, isReallyActive=${isReallyActive}, fadeProgress=${fadeProgress}`);
    }
  }, [isReallyActive, fadeProgress, active]);
  
  // Add global functions for debugging and direct control
  useEffect(() => {
    // Base function to control opacity directly
    window.setSkyEffectOpacity = (opacity) => {
      console.log(`Setting sky effect opacity to ${opacity}`);
      if (skyUniforms.current) {
        skyUniforms.current.fadeOpacity.value = Math.max(0, Math.min(1, opacity));
        return true;
      }
      return false;
    };
    
    // Initialize cooldown flag if not set
    if (typeof window.skyEffectCooldown === 'undefined') {
      window.skyEffectCooldown = false;
    }
    
    // Add more controls for effect appearance with cooldown protection
    window.skyEffectControls = {
      // Control activation with cooldown check 
      activate: () => {
        // Prevent activation during cooldown period or if it has already run
        if (window.skyEffectCooldown || hasRunOnce) {
          console.log(`Sky effect blocked: cooldown=${window.skyEffectCooldown}, hasRunOnce=${hasRunOnce}`);
          return false;
        }
        
        console.log("Manually activating sky effect");
        const now = performance.now() / 100;
        setActivationTime(now);
        lastActivationTime = now;
        hasRunOnce = true;
        setTimeout(() => setIsReallyActive(true), 100);
        return true;
      },
      
      // Control deactivation
      deactivate: () => {
        console.log("Manually deactivating sky effect");
        setIsReallyActive(false);
        setActivationTime(null);
        if (skyUniforms.current) {
          skyUniforms.current.fadeOpacity.value = 0;
        }
        return true;
      },
      
      // Reset and restart with a fresh animation
      restart: () => {
        // Prevent restart during cooldown period
        if (window.skyEffectCooldown) {
          console.log("Sky effect in cooldown, ignoring restart request");
          return false;
        }
        
        // Force reset the hasRunOnce flag for a manual restart
        hasRunOnce = false;
        
        console.log("Restarting sky effect animation");
        // First reset
        setIsReallyActive(false);
        setActivationTime(null);
        if (skyUniforms.current) {
          skyUniforms.current.fadeOpacity.value = 0;
        }
        // Then after a brief delay, reactivate
        setTimeout(() => {
          const now = performance.now() / 100;
          setActivationTime(now);
          lastActivationTime = now;
          hasRunOnce = true;
          setTimeout(() => setIsReallyActive(true), 100);
        }, 200);
        return true;
      },
      
      // Add a manual reset function to force reset the flags
      reset: () => {
        console.log("Force resetting all sky effect flags");
        hasRunOnce = false;
        window.skyEffectCooldown = false;
        setIsReallyActive(false);
        setActivationTime(null);
        if (skyUniforms.current) {
          skyUniforms.current.fadeOpacity.value = 0;
        }
        return true;
      }
    };
    
    return () => {
      delete window.setSkyEffectOpacity;
      delete window.skyEffectControls;
    };
  }, []);
  
  // Animate the sky effect and position it in front of the camera
  useFrame((state) => {
    // Skip frame update if the static flag indicates we shouldn't run
    if (hasRunOnce === false && skyUniforms.current?.fadeOpacity?.value > 0) {
      console.log("🚫 Resetting fadeOpacity to 0 due to hasRunOnce=false");
      skyUniforms.current.fadeOpacity.value = 0;
      return;
    }
    
    // Safety check for current refs
    if (!skyUniforms.current) return;
    
    // Update time uniform for shader animation
    if (skyUniforms.current && skyUniforms.current.time) {
      skyUniforms.current.time.value = state.clock.elapsedTime * 4.5;
    }
    
    // Check if we need to activate the effect after the delay
    if (activationTime && !isReallyActive) {
      const now = performance.now() / 100;
      const elapsed = now - activationTime;
      const activationDelay = 0.5; // Nearly immediate activation
      
      // Double check the hasRunOnce flag before activating
      if (elapsed >= activationDelay && hasRunOnce) {
        console.log(`🌈🌈 ACTIVATING sky effect after ${elapsed.toFixed(2)}s delay`);
        setIsReallyActive(true);
      }
    }
    
    // Force deactivation if active for too long (prevents stuck effect)
    if (isReallyActive && activationTime) {
      const now = performance.now() / 100;
      const totalElapsed = now - activationTime;
      
      if (totalElapsed > 15) {  // 1.5 seconds is well beyond expected duration
        console.log(`🌑 Force deactivating sky effect after ${totalElapsed.toFixed(2)}s`);
        setIsReallyActive(false);
        setActivationTime(null);
        skyUniforms.current.fadeOpacity.value = 0;
        window.skyEffectCooldown = true;
        setTimeout(() => window.skyEffectCooldown = false, 1000);
        return;
      }
    }
    
    // Handle opacity transitions
    const currentOpacity = skyUniforms.current.fadeOpacity.value;
    let targetOpacity = 0;
    
    if (isReallyActive) {
      // Calculate elapsed time since activation
      const activationElapsed = ((performance.now() / 100) - activationTime - 0.1);
      
      if (activationElapsed > 0) {
        // Rapid growth, longer decay for opacity
        const growthProgress = 1 / (1 + Math.exp(-activationElapsed * 2.0 + 1.5));
        const maxOpacity = 0.25 * growthProgress;
        const amplifiedFadeProgress = Math.pow(fadeProgress * 0.5, 2.0);
        targetOpacity = Math.max(0, maxOpacity - (amplifiedFadeProgress * maxOpacity));
      }
    }
    
    // Apply opacity transition with variable speed
    if (Math.abs(currentOpacity - targetOpacity) > 0.0001) {
      const step = targetOpacity > currentOpacity
        ? 0.015 + (targetOpacity - currentOpacity) * 0.15 // Fast fade-in
        : 0.015 * Math.pow(currentOpacity, 1.3); // Slower fade-out
        
      const newOpacity = targetOpacity > currentOpacity 
        ? Math.min(targetOpacity, currentOpacity + step)
        : Math.max(targetOpacity, currentOpacity - step);
      
      if (skyUniforms.current && skyUniforms.current.fadeOpacity) {
        skyUniforms.current.fadeOpacity.value = newOpacity;
      }
    }
    
    // Position and scale the plane - with proper error handling
    if (!planeRef.current || !camera) return;
    
    try {
      // Position in front of camera
      const distance = 1.05;
      camera.getWorldDirection(planeRef.current.position);
      planeRef.current.position.multiplyScalar(distance).add(camera.position);
      
      // Add subtle movement
      const time = state.clock.elapsedTime;
      planeRef.current.position.x += Math.sin(time * 0.1) * 0.05;
      // planeRef.current.position.y += Math.cos(time * 0.1) * 0.05;
      planeRef.current.position.y = -1.5
      
      // Face camera with slight rotation
      planeRef.current.quaternion.copy(camera.quaternion);
      planeRef.current.rotateZ(Math.sin(time * 0.2) * 0.02);
      
      // Calculate dimensions
      const fov = camera.fov * (Math.PI / 180);
      const height = 2 * Math.tan(fov / 2) * distance;
      const width = height * camera.aspect;
      
      // Calculate size with growth factor
      let growthFactor = 0.4; // Default size
      
      if (isReallyActive) {
        const activationElapsed = ((performance.now() / 100) - activationTime - 0.1);
        
        if (activationElapsed > 0) {
          // Fast initial growth
          const sizeGrowth = Math.min(1.0, 1 - Math.exp(-activationElapsed * 2.5));
          growthFactor = 0.2 + (0.5 - 0.2) * sizeGrowth;
          
          // Gentle size decay
          const sizeFade = Math.max(1.0, 1.0 - Math.pow(fadeProgress * 0.4, 2.5));
          growthFactor *= sizeFade;
        } else {
          growthFactor = 0.1; // Initial size
        }
      }
      
      // Apply scale
      planeRef.current.scale.set(
        width * 1.1 * growthFactor,
        height * 1.1 * growthFactor,
        1
      );
    } catch (error) {
      console.error("Error updating plane:", error);
    }
  });
  
  // Update the material reference and set custom WebGL state before rendering
  const materialRef = useRef();
  
  // Setup special renderer state for optimal blending
  useEffect(() => {
    return () => {
      // Clean up any custom renderer settings when component unmounts
      if (materialRef.current && materialRef.current.program) {
        materialRef.current.dispose();
      }
    };
  }, []);
  
  // Skip rendering if effect is inactive
  if (!isReallyActive && skyUniforms.current.fadeOpacity.value < 0.01) {
    return null;
  }

  return (
    <mesh 
      ref={planeRef} 
      renderOrder={9999} 
    >
      <planeGeometry args={[3, 3, 1, 1]} /> {/* Keep plane geometry simple */}
      <shaderMaterial
        ref={materialRef}
        uniforms={skyUniforms.current}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float time;
          uniform float fadeOpacity;
          varying vec2 vUv;

          // Define colors with revised values for better blending
          vec3 colorA = vec3(1.0, 0.3, 0.8);  // Slightly softer pink/magenta color (outer)
          vec3 colorB = vec3(0.6, 0.6, 1.0);  // Light blue-purple (center)
          vec3 colorC = vec3(0.9, 0.8, 1.0);  // Very soft lavender (intermediate)

          // Improved noise function for billowing effect
          float noise(vec2 p, float freq) {
            float t = time * 0.5; // Slowed down time for gentler movement
            float x = sin(p.x * freq + t) * sin(p.y * freq * 0.5 + t * 1.4);
            float y = sin(p.x * freq * 0.7 + t * 1.3) * sin(p.y * freq + t * 0.8);
            return x * y * 0.5 + 0.5; // Normalize to 0-1 range
          }

          // Function to simulate smoke/fire turbulence
          float turbulence(vec2 p, float t) {
            float sum = 0.0;
            float freq = 1.0;
            float amp = 1.0;
            float maxAmp = 0.0;
            
            // Add swirling motion to create smoke-like movements
            vec2 swirl = vec2(
              p.x * cos(t * 0.1) - p.y * sin(t * 0.15),
              p.x * sin(t * 0.1) + p.y * cos(t * 0.15)
            );
            
            // Create more octaves for realistic smoke - use 6 instead of 4
            for(int i = 0; i < 6; i++) {
              // Add time-varying offset for flowing motion at each scale
              vec2 p2 = p * freq + vec2(t * 0.1 * (1.0 - amp), t * 0.15 * amp);
              
              // Rotate each octave differently for more irregular patterns
              float angle = t * 0.05 * (float(i) + 1.0) * 0.1;
              vec2 rotP = vec2(
                p2.x * cos(angle) - p2.y * sin(angle),
                p2.x * sin(angle) + p2.y * cos(angle)
              );
              
              // Add to sum with varying factors to create more natural smoke movement
              sum += noise(rotP + swirl * (amp * 0.5), freq) * amp;
              maxAmp += amp;
              
              // Scale up frequency and scale down amplitude faster for smokier look
              freq *= 2.2;
              amp *= 0.45;
            }
            
            // Normalize the result
            return sum / maxAmp;
          }

          void main() {
            // Calculate distance from center of UV coordinates with intentional distortion
            // Create an irregular base shape instead of a perfect circle
            vec2 centerOffset = vec2(0.5, 0.5);
            
            // Create irregular, organic distortion to the center point
            centerOffset.x += sin(vUv.y * 5.0 + time * 0.2) * 0.1;
            centerOffset.y += cos(vUv.x * 5.0 + time * 0.15) * 0.1;
            
            // Calculate distance with irregular offset
            float uvDist = length(vUv - centerOffset);
            
            // Apply extreme noise to create very irregular edges
            // Use multiple noise octaves for maximum irregularity
            float edgeNoise1 = noise(vUv * 3.0, 5.0) * 0.2; // Reduced from 0.25
            float edgeNoise2 = noise(vUv * 7.0, 10.0) * 0.12; // Reduced from 0.15
            float edgeNoise3 = noise(vUv * 15.0, 20.0) * 0.08; // Reduced from 0.1
            float turbEdge = turbulence(vUv * 4.0, time * 0.3) * 0.2; // Reduced from 0.25
            
            // Create very large shape distortions based on angle
            float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
            float angularDistortion = sin(angle * 3.0 + time * 0.3) * 0.1; // Reduced from 0.15
            
            // Combined extreme edge distortion - completely breaks the circular shape
            float totalDistortion = edgeNoise1 + edgeNoise2 + edgeNoise3 + turbEdge + angularDistortion;
            
            // Apply the distortion to the distance - this creates a wildly irregular shape
            float noisyDist = uvDist - totalDistortion;
            
            // Very gradual, ultra-soft edge fade with extreme randomness
            // Use a narrower transition zone to create a smaller overall effect with much softer edge
            float edgeMask = 1.0 - smoothstep(-0.2, 0.6 + turbEdge * 0.3, noisyDist); // Made starting point softer (-0.1 to -0.2)
            
            // Additional randomization to the mask based on angle and noise - make it much more irregular
            edgeMask *= 0.7 + noise(vec2(angle * 3.0, uvDist * 4.0), 5.0) * 0.6; // Increased noise influence (0.4 to 0.6)
            
            // Add angle-dependent edge variation to break any box-like appearance
            edgeMask *= 0.8 + sin(angle * 6.0 + time * 0.2) * 0.2 + cos(angle * 4.0 + time * 0.3) * 0.15;
            
            // Create various noise factors for additional edge irregularity
            float noiseAtEdge = noise(vec2(angle * 5.0, noisyDist * 8.0), 10.0);
            float radialNoise = noise(vec2(cos(angle * 2.0) * 5.0, sin(angle * 2.0) * 5.0), 8.0);
            
            // Create shorter tendrils and wisps that don't extend as far
            float longTendrils = max(0.0, noiseAtEdge - 0.75) * 1.5; // Increased threshold from 0.7 to 0.75, reduced multiplier from 2.0 to 1.5
            
            // Create random patches of color that don't extend as far
            float colorPatches = max(0.0, radialNoise - 0.65) * 1.2; // Increased threshold from 0.6 to 0.65, reduced multiplier from 1.5 to 1.2
            
            // Extremely soft edge handling - completely eliminate any hard edge
            if (edgeMask <= 0.0001) {
                discard; // Discard completely transparent pixels
            }
            
            // Complex noise for billowing effect - combine multiple frequencies
            float noise1 = noise(vUv, 3.0);
            float noise2 = noise(vUv * 2.0, 5.0) * 0.5;
            float combinedNoise = noise1 + noise2;
            
            // Add turbulence for more realistic smoke/fire look
            float turb = turbulence(vUv, time);
            
            // Apply more aggressive noise to UV coordinates for smoke-like distortion
            vec2 distortedUV = vUv;
            distortedUV.x += combinedNoise * 0.08 + turb * 0.05; // Increased distortion
            distortedUV.y += combinedNoise * 0.08 + turb * 0.07;
            
            // Add time-based flow for smoke-like movement
            vec2 flowDir = vec2(
              sin(time * 0.2 + vUv.x * 2.0) * 0.03,
              cos(time * 0.15 + vUv.y * 2.0) * 0.02
            );
            distortedUV += flowDir * turb;

            // Radial gradient with distortion and drifting center
            float distanceMultiplier = 1.8; // Controls the size of the inner area
            // Add subtle movement to the center point for drifting effect
            float centerX = 0.5 + sin(time * 0.2) * 0.03;
            float centerY = 0.3 + cos(time * 0.15) * 0.02;
            float dist = length(vec2(distortedUV.x - centerX, distortedUV.y - centerY)) * distanceMultiplier;
            
            // Create a central glow effect
            float centralGlow = 1.0 - smoothstep(0.0, 0.5, dist) * 0.4;
            
            // Modified radial gradient with turbulence for more irregular edge
            float radial = smoothstep(0.0, 1.0 + turb * 0.2, dist); // Increased turbulence impact
            
            // Create wisps and tendrils at the edges
            float wispFactor = noise(distortedUV * 8.0 + time * 0.1, 4.0) * turbulence(distortedUV * 3.0, time * 0.2);
            float tendrils = max(0.0, wispFactor - 0.4) * 0.8; // Create isolated wisps
            
            // Create a smoother gradient transition using a multi-step blend
            // We'll use three colors and blend them with smoothstep for a more natural transition
            vec3 color;
            
            // Apply noise to the transition boundaries for organic blending
            // Widen the middle transition zone and add more noise variation
            float innerBoundary = 0.4 + noise1 * 0.25; // Increased noise influence
            float outerBoundary = 0.7 + noise2 * 0.25;
            
            // Extra noise for color blending to make it more seamless
            float blendNoise = noise(vUv * 4.0 + turb, 3.0) * 0.2; // Increased blend noise
            
            // Add smoke-like structures to the blend boundaries
            innerBoundary += wispFactor * 0.1;
            outerBoundary += tendrils * 0.15;
            
            if (radial < innerBoundary) {
                // Inside - smooth blend from blue to intermediate color with curve easing
                float t = smoothstep(0.0, innerBoundary, radial) + blendNoise + wispFactor * 0.1;
                t = clamp(t, 0.0, 1.0); // Ensure we stay in 0-1 range
                color = mix(colorB, colorC, t);
                
                // Add extra brightness in the center
                color += vec3(centralGlow * 0.2, centralGlow * 0.2, centralGlow * 0.3);
            } else if (radial < outerBoundary) {
                // Middle - smooth blend from intermediate to outer color with curve easing
                float t = smoothstep(innerBoundary, outerBoundary, radial) + blendNoise + tendrils * 0.2;
                t = clamp(t, 0.0, 1.0); // Ensure we stay in 0-1 range
                color = mix(colorC, colorA, t);
            } else {
                // Outside - add wisps and tendrils for smoke-like edges
                color = colorA * (0.95 + blendNoise * 0.1);
                
                // Add isolated wisps at the edges for smoke-like effect
                if (tendrils > 0.05) {
                    // Create bright wisps at the periphery
                    color = mix(color, colorC, tendrils * 0.7);
                }
            }
            
            // Add noise-based color variation for more organic look - softer now
            float colorNoise = noise(vUv * 3.0, 2.0) * 0.12;
            color = mix(color, vec3(1.0, 0.9, 1.0), colorNoise); // Blend with a very soft light color
            
            // Multiple layered pulsing for billowing effect with time offset
            float fastPulse = sin(time * 0.7) * 0.03 + 0.97;
            float slowPulse = sin(time * 0.3 + dist) * 0.05 + 0.95; // Add dist for radial wave
            color *= fastPulse * slowPulse;
            
            // Add subtle color variation based on noise and turbulence
            color *= 0.85 + combinedNoise * 0.15 + turb * 0.05;

            // More dynamic edge falloff with turbulence for irregular edges
            // Varies the edge power based on turbulence for more natural look
            float edgePower = 1.5 + turb * 0.3; // Dynamic edge sharpness
            
            // Create wisps that extend beyond the main shape
            float wispIntensity = max(0.0, tendrils + wispFactor * 0.3 - 0.1);
            
            // Add wisps to the edge fade for smoky tendrils
            float edgeFade = pow(1.0 - radial, edgePower) * (0.9 + turb * 0.1);
            
            // Boost edge opacity where we have wisps for smoke-like detail
            edgeFade = mix(edgeFade, edgeFade * 1.5, wispIntensity);
            
            // Enhanced and extremely irregular edge fade with extended tendrils
            // This creates a very complex edge that will never look circular
            edgeFade = mix(edgeFade * (0.8 + noiseAtEdge * 0.4), 
                         edgeFade * 2.0, 
                         longTendrils + colorPatches);
            
            // Create isolated areas of color saturation at random spots
            float colorHighlight = noise(vUv * 12.0 + turbEdge, 15.0);
            
            // Boost colors in the wisps and tendrils
            if (longTendrils > 0.1 || colorPatches > 0.1) {
                color = mix(color, colorC * 1.2, (longTendrils + colorPatches) * 0.5);
            }
            
            // Add random color variations throughout
            color = mix(color, vec3(1.0, 0.5, 0.9) * color, colorHighlight * 0.3);
            
            // Final opacity combines everything with extremely varied edge handling
            float finalOpacity = fadeOpacity * 
                               edgeFade * 
                               (0.5 + combinedNoise * 0.4 + turb * 0.2) * 
                               edgeMask * 
                               (0.7 + wispIntensity * 0.6 + longTendrils * 0.8); 
                               
            // Create extremely faint, extended wisps that go far beyond the main mass
            // These will be barely visible but break any circular perception
            if (noisyDist > 0.5 && noisyDist < 1.2 && noiseAtEdge > 0.6) {
                float extremeWispFactor = noiseAtEdge * (1.0 - noisyDist * 0.7);
                finalOpacity = max(finalOpacity, extremeWispFactor * fadeOpacity * 0.15);
                
                // Use different colors for these extreme wisps
                color = mix(color, vec3(0.8, 0.6, 1.0), extremeWispFactor * 0.7);
            }
            
            // Add secondary micro-wisps in different directions to break box edges
            if (noisyDist > 0.4 && noisyDist < 0.9) {
                // Create angle-dependent edges to break symmetry
                float microDetail = noise(vec2(angle * 12.0, noisyDist * 15.0), 20.0);
                float angularMask = abs(sin(angle * 8.0 + time * 0.2));
                
                if (microDetail > 0.7 && angularMask > 0.6) {
                    // Create wispy tendrils in specific directions only
                    float microWisp = microDetail * angularMask * (0.9 - noisyDist) * 0.4;
                    finalOpacity = max(finalOpacity, microWisp * fadeOpacity * 0.12);
                    
                    // Add subtle color variation to these micro-wisps
                    color = mix(color, vec3(0.9, 0.5, 0.8), microWisp * 0.5);
                }
            }
            
            // Apply combined effects to final color
            gl_FragColor = vec4(color, finalOpacity);
          }
        `}
        transparent={true}
        depthWrite={false}
        blending={THREE.CustomBlending}
        blendSrc={THREE.SrcAlphaFactor}
        blendDst={THREE.OneMinusSrcAlphaFactor}
        blendEquation={THREE.AddEquation}
        side={THREE.DoubleSide}
        alphaTest={0.0001} // Even lower threshold
        premultipliedAlpha={true}
      />
    </mesh>
  );
}

export default LaunchSkyEffect;

