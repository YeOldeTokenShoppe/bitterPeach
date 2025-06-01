# Iframe Persistence Fix Summary

## Problem
The mission control iframe in SidePanelEnhanced was reloading whenever the 3D scene changed modes (e.g., toggling 80s mode, monster mode, or rocket visibility), causing a poor user experience with the interface resetting.

## Root Cause
The SidePanelEnhanced component was being conditionally rendered based on `currentView === "main" && showUI`, which caused it to unmount and remount when these conditions changed.

## Solution Implemented

### 1. **Prevented Conditional Unmounting in BurnGallery.jsx**
- Changed from conditional rendering to CSS visibility control
- Wrapped side panels in Box components with `display` prop controlled by state
- Added stable `key` props to prevent React from recreating components

### 2. **Added Component Memoization**
- Memoized `ThreeDVotiveStand` with custom prop comparison
- Memoized `SidePanelEnhanced` with custom prop comparison
- Added stable keys to all major components

### 3. **Created Isolated Iframe Component**
- Created `MissionControlIframe.jsx` that never re-renders
- Moved iframe rendering logic to isolated component
- Component uses `memo` with `() => true` comparison to prevent all re-renders

### 4. **Fixed Reference Updates**
- Replaced all `missionControlIframeRef` references with `document.querySelector`
- Ensures iframe can be found regardless of component state

## Files Modified
1. `/src/components/BurnGallery.jsx` - Changed conditional rendering to CSS visibility
2. `/src/components/SidePanelEnhanced.jsx` - Added memoization and fixed references
3. `/src/components/MissionControlIframe.jsx` - New isolated iframe component
4. `/src/pages/gallery.js` - Added stable key to BurnGalleryClient

## Testing
The iframe should now persist when:
- Toggling 80s mode
- Toggling monster mode
- Showing/hiding rocket model
- Toggling constellation visibility
- Any other state changes in the 3D scene

The mission control interface should maintain its state and not reload during these transitions.