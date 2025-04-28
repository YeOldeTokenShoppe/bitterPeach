// ---- Extracted Falling Water Code from shader.md ----

// Constants/Defines potentially needed (depending on context)
// #define WN_TEX iChannel1 // Sampler for Water Noise Texture
// uniform float iTime;   // Time uniform for animation

// --- Primitives Used by Falling Water ---

float cyl( vec3 p, vec2 h ) // h = <r,h>
{
    // Calculates distance to an infinite cylinder aligned with Y axis
    vec2 d = abs(vec2(length(p.xz),p.y)) - h;
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float roundCyl( vec3 p, vec2 h, in float r )
{
    // Calculates distance to a cylinder with rounded ends (radius r)
    vec2 d = abs(vec2(length(p.xz),p.y)) - h;
    return ( min(max(d.x,d.y),0.0) + length(max(d,0.0)) ) - r;
}

float box( vec3 p, vec3 b )
{
    // Calculates distance to a box centered at origin with dimensions 2*b
    vec3 d = abs(p) - b;
    return min(max(d.x,max(d.y,d.z)),0.0) +
        length(max(d,0.0));
}

// --- Noise Function for Surface Detail ---

float waterNoise( in vec2 p )
{
    // Generates surface ripples/noise based on position and time
    // Assumes a sampler 'WN_TEX' and uniform 'iTime' are available
    float r = sin((length(p)*40.0)-iTime*20.0)*.0003;
    r += cos((length(p)*25.0)+iTime*20.0)*.0003;
    // Requires sampler WN_TEX (typically bound to iChannel1 or similar)
    r += texture(WN_TEX,p+iTime*.25).r*.00125;
    return r + texture(WN_TEX,(p*2.0)-iTime*.125).r*.0025;
}

// --- Function for Water Cohesion/Breaking Effect ---

float waterCohesor( in vec3 p )
{
    // Creates dynamic "cut-outs" in the water column using polar coords
    // Convert to polar coordinates.
    p = vec3(length(p.xz),p.y,atan(p.x/p.z));
    // Move the cutting blocks out to the radius of the falling water.
    p.x -= .7; // Offset radius for the effect
    // Create a coordinate for a second pair of cutters.
    vec3 q = p;
    // Generate time-based noise values
    #define t iTime // Assumes iTime uniform is available
    q.z = mod(q.z, 3.14)-1.57;
    float n1 = sin(t+cos(t*2.0+sin(t*3.0)));
    float n2 = sin(t+cos(t*2.5+cos(t*4.1)));
    #undef t
    // Apply noise to angular position
    p.z += n1;
    q.z -= n2;
    // Create a factor by which to modify the width of the block
    // based on height (makes cuts wider near bottom)
    float cohesion = pow(p.y*.33333,2.0);

    // Wrap angles
    p.z = mod(p.z, 3.14)-1.57;
    q.z = mod(q.z, 3.14)-1.57;
    // Return the minimum distance to two rotating/morphing boxes
    // These effectively subtract from the main water column
    return min( box(p,vec3(.2,2.95,.25-cohesion*.5+n2*.25)),
                box(q,vec3(.2,2.95,.25-cohesion*.5+n1*.25)));
}


// --- Main Falling Water Distance Function ---

float fallingWater( in vec3 p )
{
    // float y = p.y; // Store the actual Y position if needed elsewhere
    p.y -= 1.400; // Offset the coordinate system for the cylinder definition

    // Define the main water column shape using rounded cylinders (creates thick tube)
    // Outer cylinder subtracted from inner cylinder -> max(-inner, outer)
    float water = max( roundCyl(p,vec2(.475, 1.475),0.1),      // Outer surface
                      -roundCyl(p,vec2(.475, 1.475),0.08)); // Inner surface (slightly smaller rounding)

    // Add surface noise if close to the surface
    if( water < .005 ) // Check if near the calculated surface
    {
        // float wSpeed = 2.875-p.y; // Original comment, maybe for speed effect? Not used here.
        // Add noise based on XZ position and also based on angle/height + time
        water += waterNoise(p.xz) + // General surface noise
                 waterNoise(vec2(atan(p.z/p.x),p.y+iTime*2.0))*3.0; // Vertical flow noise
    }

    // Subtract the cohesion effect (cut-outs) from the main column shape
    return max(water, -waterCohesor(p)); // max(A, -B) is A subtract B
}

// ---- End Extracted Code ----






