// Sort results by burnedAmount (descending) to get top burners
const sortedByBurnedAmount = [...results].sort(
  (a, b) => b.burnedAmount - a.burnedAmount
);

// Sort results by createdAt (descending) to get most recent
const sortedByCreatedAt = [...results].sort((a, b) => {
  // Handle different possible date formats
  const getDate = (timestamp) => {
    if (!timestamp) return new Date(0);
    if (timestamp.toDate) return timestamp.toDate(); // Firestore Timestamp
    if (timestamp instanceof Date) return timestamp; // JavaScript Date
    if (typeof timestamp === "number") return new Date(timestamp); // Unix timestamp
    if (typeof timestamp === "string") return new Date(timestamp); // ISO string
    return new Date(0); // fallback
  };

  const dateA = getDate(a.createdAt);
  const dateB = getDate(b.createdAt);
  return dateB - dateA;
});

// Get top 4 burners
const topBurners = sortedByBurnedAmount.slice(0, 4);

// Get next 4 most recent users, excluding those already in topBurners
const recentUsers = sortedByCreatedAt
  .filter((user) => !topBurners.some((topUser) => topUser.id === user.id))
  .slice(0, 4);

// Combine assignments for special positions
const specialAssignments = new Map();

// Assign top burners to VCANDLE001-004
topBurners.forEach((user, index) => {
  const position = String(index + 1).padStart(3, "0");
  specialAssignments.set(`VCANDLE${position}`, user);
});

// Assign recent users to VCANDLE005-008
recentUsers.forEach((user, index) => {
  const position = String(index + 5).padStart(3, "0");
  specialAssignments.set(`VCANDLE${position}`, user);
});

const applyUserImageToLabels = (candle, imageUrl) => {
  if (!imageUrl) return;

  // Find both labels
  const labels = candle.children.filter(
    (child) => child.name.includes("Label1") || child.name.includes("Label2")
  );

  if (labels.length === 0) return;

  const textureLoader = new THREE.TextureLoader();

  // textureLoader.load("preview2.jpeg", function (texture) {
  //   texture.mapping = THREE.EquirectangularReflectionMapping;
  //   scene.background = texture;
  // });

  textureLoader.load(
    imageUrl,
    (texture) => {
      texture.encoding = THREE.sRGBEncoding;
      texture.flipY = false;
      texture.needsUpdate = true;

      // Apply to all found labels
      labels.forEach((label) => {
        if (label.material) {
          // Dispose of any existing materials/textures
          if (label.material.map) {
            label.material.map.dispose();
          }
          label.material.dispose();

          // Create new material with the texture
          label.material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
          });
          label.material.needsUpdate = true;
        }
      });
    },
    undefined,
    (error) => console.warn("🚨 Texture load error:", error)
  );
};

/** 🔥 Reset candle state (for unassigned candles) */
const resetCandle = (candle) => {
  candle.userData = { hasUser: false };

  // Make all children invisible and clean up materials
  candle.children.forEach((child) => {
    console.log(`Resetting visibility for ${child.name} to false`);
    child.visible = false;

    // Handle material cleanup for labels
    if (child.name.startsWith("Label")) {
      if (child.material) {
        child.material.map?.dispose();
        child.material.dispose();
        child.material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          side: THREE.DoubleSide,
        });
      }
    }
  });
};
// Handle click events
const handleClick = (event) => {
  event.stopPropagation();

  // Check if we clicked on an annotation
  if (
    event.object &&
    event.object.userData &&
    event.object.userData.isAnnotation
  ) {
    // Let the annotation handle its own click
    return;
  }

  if (showFloatingViewer) return;

  const mouse = new THREE.Vector2(
    (event.nativeEvent.offsetX / event.nativeEvent.target.clientWidth) * 2 - 1,
    -(event.nativeEvent.offsetY / event.nativeEvent.target.clientHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // Check for Boombox intersection first
  if (boomboxRef.current && is80sMode) {
    const boomboxIntersects = raycaster.intersectObject(
      boomboxRef.current,
      true
    );
    if (boomboxIntersects.length > 0) {
      if (onBoomboxClick) {
        // Call the onBoomboxClick handler from props
        onBoomboxClick();
        return;
      }
    }
  }

  // Check for XCandle intersections
  const xCandleIntersects = [];
  // Also track which VCANDLEs have XCandles (to prevent double-handling)
  const vCandlesWithXCandles = new Set();

  xCandleInstances.current.forEach((xCandle) => {
    // Skip objects with isAnnotation flag
    if (xCandle.userData && xCandle.userData.isAnnotation) {
      return;
    }

    const intersects = raycaster.intersectObject(xCandle, true);
    if (intersects.length > 0) {
      // Filter out annotation objects from intersections
      const nonAnnotationIntersects = intersects.filter(
        (hit) => !(hit.object.userData && hit.object.userData.isAnnotation)
      );

      if (nonAnnotationIntersects.length > 0) {
        xCandleIntersects.push({
          distance: nonAnnotationIntersects[0].distance,
          object: xCandle,
        });
      }
    }

    // Track the original VCANDLE name for each XCandle
    if (xCandle.userData && xCandle.userData.originalVCandleName) {
      vCandlesWithXCandles.add(xCandle.userData.originalVCandleName);
    }
  });

  // If we hit an XCandle, handle it differently
  if (xCandleIntersects.length > 0) {
    // Sort by distance (closest first)
    xCandleIntersects.sort((a, b) => a.distance - b.distance);
    const closestXCandle = xCandleIntersects[0].object;

    // For XCandles, we'll highlight the annotation
    if (closestXCandle.userData) {
      console.log("XCandle clicked:", closestXCandle.name);

      if (!hasHandledFirstClick) {
        console.log("First click detected - preventing state update");
        setHasHandledFirstClick(true);
        return;
      }

      // If we click the same candle again, toggle off the highlight
      if (highlightedXCandle && highlightedXCandle.id === closestXCandle.name) {
        setHighlightedXCandle(null);
      } else {
        setHighlightedXCandle({
          id: closestXCandle.name,
          userData: { ...closestXCandle.userData },
        });
      }
      return;
    }
  }

  // Original candle click logic for VCANDLEs
  const intersectableObjects = [];
  if (modelRef && modelRef.current) {
    modelRef.current.traverse((object) => {
      // Skip annotation objects
      if (object.userData && object.userData.isAnnotation) {
        return;
      }

      // Skip VCANDLEs that have corresponding XCandles
      if (
        object.name.startsWith("VCANDLE") &&
        vCandlesWithXCandles.has(object.name)
      ) {
        return;
      }

      if (object.name.startsWith("VCANDLE")) {
        intersectableObjects.push(object);
        object.children.forEach((child) => {
          if (
            child.name.includes("wax") ||
            child.name.includes("glass") ||
            child.name.startsWith("FLAME")
          ) {
            intersectableObjects.push(child);
          }
        });
      }
    });
  }

  const intersects = raycaster.intersectObjects(intersectableObjects, true);
  if (intersects.length > 0) {
    let candleParent = intersects[0].object;
    while (candleParent && !candleParent.name.startsWith("VCANDLE")) {
      candleParent = candleParent.parent;
    }

    // Check if the candle has user data (userName is a good indicator)
    if (candleParent?.userData?.userName) {
      console.log("VCANDLE clicked with user data:", candleParent.userData);
      onCandleSelect({
        ...candleParent.userData,
        candleId: candleParent.name,
        candleTimestamp: Date.now(),
      });

      // Set showFloatingViewer to true
      if (setShowFloatingViewer) {
        setShowFloatingViewer(true);
      }
    } else {
      console.log(
        "VCANDLE clicked but no user data found:",
        candleParent?.userData
      );
    }
  }
};
