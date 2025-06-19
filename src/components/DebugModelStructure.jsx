import { useEffect } from 'react';

export default function DebugModelStructure({ modelRef }) {
  useEffect(() => {
    if (!modelRef?.current) return;
    
    console.log('=== MODEL STRUCTURE DEBUG ===');
    const objects = [];
    
    modelRef.current.traverse((child) => {
      if (child.name) {
        objects.push({
          name: child.name,
          type: child.type,
          hasGeometry: !!child.geometry,
          hasMaterial: !!child.material,
          children: child.children?.length || 0
        });
      }
    });
    
    // Log all objects
    console.log('All named objects:', objects);
    
    // Look for potential candle objects
    const potentialCandles = objects.filter(obj => 
      obj.name.toLowerCase().includes('candle') ||
      obj.name.toLowerCase().includes('votive') ||
      obj.name.toLowerCase().includes('flame') ||
      obj.name.toLowerCase().includes('light')
    );
    
    console.log('Potential candle objects:', potentialCandles);
    
    // If no VCANDLE objects, look for other patterns
    if (!objects.some(obj => obj.name.startsWith('VCANDLE'))) {
      console.log('No VCANDLE objects found. Looking for alternative patterns...');
      
      // Group objects by common prefixes
      const prefixes = {};
      objects.forEach(obj => {
        const prefix = obj.name.split(/[0-9_]/)[0];
        if (prefix) {
          if (!prefixes[prefix]) prefixes[prefix] = [];
          prefixes[prefix].push(obj.name);
        }
      });
      
      console.log('Object prefixes found:', Object.keys(prefixes));
      Object.entries(prefixes).forEach(([prefix, names]) => {
        if (names.length > 3) {
          console.log(`${prefix}: ${names.length} objects (${names.slice(0, 3).join(', ')}...)`);
        }
      });
    }
    
    console.log('=== END DEBUG ===');
  }, [modelRef]);
  
  return null;
}