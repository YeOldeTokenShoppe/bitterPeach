import React, { useState, useEffect } from "react";
import GothicSceneContainer from "../components/GothicSceneContainer";
import Head from "next/head";

export default function GothicScenePage() {
  const [lightSettings, setLightSettings] = useState({
    intensity: 1.2,
    skyColor: "#7300ff",
    groundColor: "#ff0000",
  });

  // State for point lights with more properties
  const [pointLights, setPointLights] = useState([
    {
      position: [5, 5, 5],
      color: "#ff0000",
      intensity: 1.5,
      showHelper: true,
      distance: 50,
      decay: 2,
      name: "Red Light",
    },
    {
      position: [-5, 5, 5],
      color: "#0000ff",
      intensity: 1.0,
      showHelper: true,
      distance: 40,
      decay: 2,
      name: "Blue Light",
    },
    {
      position: [0, 5, -5],
      color: "#00ff00",
      intensity: 1.2,
      showHelper: true,
      distance: 45,
      decay: 2,
      name: "Green Light",
    },
    {
      position: [0, -5, 0],
      color: "#ffff00",
      intensity: 0.8,
      showHelper: true,
      distance: 35,
      decay: 2,
      name: "Yellow Light",
    },
  ]);

  const [showControls, setShowControls] = useState(false);
  const [activeTab, setActiveTab] = useState("main"); // 'main', 'pointLights'
  const [selectedLight, setSelectedLight] = useState(0);
  const [lightPresets, setLightPresets] = useState({
    saved: false,
    presets: [],
  });

  // Ensure selectedLight is always within bounds
  useEffect(() => {
    if (selectedLight >= pointLights.length) {
      setSelectedLight(0);
    }
  }, [pointLights, selectedLight]);

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const updateLightIntensity = (e) => {
    setLightSettings({
      ...lightSettings,
      intensity: parseFloat(e.target.value),
    });
  };

  const updateSkyColor = (e) => {
    setLightSettings({
      ...lightSettings,
      skyColor: e.target.value,
    });
  };

  const updateGroundColor = (e) => {
    setLightSettings({
      ...lightSettings,
      groundColor: e.target.value,
    });
  };

  // Point light update functions
  const updatePointLightPosition = (index, axis, value) => {
    if (index < 0 || index >= pointLights.length) return;

    const newLights = [...pointLights];
    const newPosition = [...newLights[index].position];
    newPosition[axis] = parseFloat(value);
    newLights[index].position = newPosition;
    setPointLights(newLights);
  };

  const updatePointLightColor = (index, color) => {
    if (index < 0 || index >= pointLights.length) return;

    const newLights = [...pointLights];
    newLights[index].color = color;
    setPointLights(newLights);
  };

  const updatePointLightIntensity = (index, intensity) => {
    if (index < 0 || index >= pointLights.length) return;

    const newLights = [...pointLights];
    newLights[index].intensity = parseFloat(intensity);
    setPointLights(newLights);
  };

  const updatePointLightDistance = (index, distance) => {
    if (index < 0 || index >= pointLights.length) return;

    const newLights = [...pointLights];
    newLights[index].distance = parseFloat(distance);
    setPointLights(newLights);
  };

  const updatePointLightDecay = (index, decay) => {
    if (index < 0 || index >= pointLights.length) return;

    const newLights = [...pointLights];
    newLights[index].decay = parseFloat(decay);
    setPointLights(newLights);
  };

  const updatePointLightName = (index, name) => {
    if (index < 0 || index >= pointLights.length) return;

    const newLights = [...pointLights];
    newLights[index].name = name;
    setPointLights(newLights);
  };

  const togglePointLightHelper = (index) => {
    if (index < 0 || index >= pointLights.length) return;

    const newLights = [...pointLights];
    newLights[index].showHelper = !newLights[index].showHelper;
    setPointLights(newLights);
  };

  // Save current light setup as a preset
  const savePreset = () => {
    const newPreset = {
      name: `Preset ${lightPresets.presets.length + 1}`,
      lights: JSON.parse(JSON.stringify(pointLights)),
      mainLights: { ...lightSettings },
    };

    setLightPresets({
      saved: true,
      presets: [...lightPresets.presets, newPreset],
    });

    // Show notification
    setTimeout(() => {
      setLightPresets((prev) => ({
        ...prev,
        saved: false,
      }));
    }, 2000);
  };

  // Load a preset
  const loadPreset = (presetIndex) => {
    const preset = lightPresets.presets[presetIndex];
    if (preset) {
      setPointLights(preset.lights);
      setLightSettings(preset.mainLights);
    }
  };

  // Reset all lights to default
  const resetLights = () => {
    setPointLights([
      {
        position: [5, 5, 5],
        color: "#ff0000",
        intensity: 1.5,
        showHelper: true,
        distance: 50,
        decay: 2,
        name: "Red Light",
      },
      {
        position: [-5, 5, 5],
        color: "#0000ff",
        intensity: 1.0,
        showHelper: true,
        distance: 40,
        decay: 2,
        name: "Blue Light",
      },
      {
        position: [0, 5, -5],
        color: "#00ff00",
        intensity: 1.2,
        showHelper: true,
        distance: 45,
        decay: 2,
        name: "Green Light",
      },
      {
        position: [0, -5, 0],
        color: "#ffff00",
        intensity: 0.8,
        showHelper: true,
        distance: 35,
        decay: 2,
        name: "Yellow Light",
      },
    ]);

    setLightSettings({
      intensity: 1.2,
      skyColor: "#7300ff",
      groundColor: "#ff0000",
    });
  };

  // Load presets from localStorage on component mount
  useEffect(() => {
    const savedPresets = localStorage.getItem("gothicLightPresets");
    if (savedPresets) {
      try {
        setLightPresets({
          saved: false,
          presets: JSON.parse(savedPresets),
        });
      } catch (e) {
        console.error("Error loading saved presets:", e);
      }
    }
  }, []);

  // Save presets to localStorage when they change
  useEffect(() => {
    if (lightPresets.presets.length > 0) {
      localStorage.setItem(
        "gothicLightPresets",
        JSON.stringify(lightPresets.presets)
      );
    }
  }, [lightPresets.presets]);

  // Get the current selected light safely
  const getCurrentLight = () => {
    if (selectedLight >= 0 && selectedLight < pointLights.length) {
      return pointLights[selectedLight];
    }
    return (
      pointLights[0] || {
        position: [0, 0, 0],
        color: "#ffffff",
        intensity: 1.0,
        showHelper: false,
        distance: 50,
        decay: 2,
        name: "Default Light",
      }
    );
  };

  const currentLight = getCurrentLight();

  return (
    <>
      <Head>
        <title>Gothic Scene | Coconut</title>
        <meta name="description" content="Explore the Gothic 3D scene" />
      </Head>

      <div style={{ position: "relative", width: "100%", height: "100vh" }}>
        <GothicSceneContainer
          showStats={true}
          cameraPosition={[0, 5, 10]}
          controlsEnabled={true}
          lightIntensity={lightSettings.intensity}
          skyColor={lightSettings.skyColor}
          groundColor={lightSettings.groundColor}
          pointLights={pointLights}
        />

        {/* Controls Panel */}
        <div style={{ position: "absolute", top: 20, right: 20, zIndex: 100 }}>
          <button
            onClick={toggleControls}
            style={{
              padding: "8px 16px",
              backgroundColor: "#333",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {showControls ? "Hide Controls" : "Show Controls"}
          </button>

          {showControls && (
            <div
              style={{
                marginTop: "10px",
                padding: "12px",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                borderRadius: "8px",
                color: "#fff",
                width: "280px",
                maxHeight: "80vh",
                overflowY: "auto",
              }}
            >
              {/* Tabs */}
              <div
                style={{
                  display: "flex",
                  marginBottom: "12px",
                  borderBottom: "1px solid #444",
                }}
              >
                <button
                  onClick={() => setActiveTab("main")}
                  style={{
                    flex: 1,
                    padding: "6px",
                    backgroundColor:
                      activeTab === "main" ? "#444" : "transparent",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px 4px 0 0",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Main Lights
                </button>
                <button
                  onClick={() => setActiveTab("pointLights")}
                  style={{
                    flex: 1,
                    padding: "6px",
                    backgroundColor:
                      activeTab === "pointLights" ? "#444" : "transparent",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px 4px 0 0",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Point Lights
                </button>
              </div>

              {/* Presets and Save buttons */}
              <div
                style={{ marginBottom: "12px", display: "flex", gap: "6px" }}
              >
                <button
                  onClick={savePreset}
                  style={{
                    flex: 1,
                    padding: "5px 8px",
                    backgroundColor: "#2a6e2a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                  }}
                >
                  Save Preset
                </button>
                <button
                  onClick={resetLights}
                  style={{
                    flex: 1,
                    padding: "5px 8px",
                    backgroundColor: "#6e2a2a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                  }}
                >
                  Reset
                </button>
              </div>

              {/* Saved notification */}
              {lightPresets.saved && (
                <div
                  style={{
                    marginBottom: "8px",
                    padding: "4px",
                    backgroundColor: "#2a6e2a",
                    borderRadius: "4px",
                    textAlign: "center",
                    fontSize: "11px",
                  }}
                >
                  Preset saved!
                </div>
              )}

              {/* Presets list */}
              {lightPresets.presets.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontSize: "12px",
                    }}
                  >
                    Load Preset:
                  </label>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}
                  >
                    {lightPresets.presets.map((preset, index) => (
                      <button
                        key={`preset-${index}`}
                        onClick={() => loadPreset(index)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "10px",
                        }}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "main" && (
                <>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
                    Main Light Settings
                  </h3>

                  <div style={{ marginBottom: "10px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontSize: "12px",
                      }}
                    >
                      Intensity: {lightSettings.intensity}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.1"
                      value={lightSettings.intensity}
                      onChange={updateLightIntensity}
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div style={{ marginBottom: "10px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontSize: "12px",
                      }}
                    >
                      Sky Color:
                    </label>
                    <input
                      type="color"
                      value={lightSettings.skyColor}
                      onChange={updateSkyColor}
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div style={{ marginBottom: "10px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontSize: "12px",
                      }}
                    >
                      Ground Color:
                    </label>
                    <input
                      type="color"
                      value={lightSettings.groundColor}
                      onChange={updateGroundColor}
                      style={{ width: "100%" }}
                    />
                  </div>
                </>
              )}

              {activeTab === "pointLights" && (
                <>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
                    Point Light Settings
                  </h3>

                  {/* Light selector */}
                  <div style={{ marginBottom: "15px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontSize: "12px",
                      }}
                    >
                      Select Light:
                    </label>
                    <div style={{ display: "flex", gap: "5px" }}>
                      {pointLights.map((light, index) => (
                        <button
                          key={`light-btn-${index}`}
                          onClick={() => setSelectedLight(index)}
                          style={{
                            flex: 1,
                            padding: "5px",
                            backgroundColor:
                              selectedLight === index ? light.color : "#333",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "11px",
                          }}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected light controls */}
                  <div
                    style={{
                      padding: "10px",
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderRadius: "4px",
                    }}
                  >
                    {/* Light name input */}
                    <div style={{ marginBottom: "15px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontSize: "12px",
                        }}
                      >
                        Name:
                      </label>
                      <input
                        type="text"
                        value={currentLight.name}
                        onChange={(e) =>
                          updatePointLightName(selectedLight, e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "5px",
                          backgroundColor: "#333",
                          color: "#fff",
                          border: "1px solid #555",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      />
                    </div>

                    <h4
                      style={{
                        margin: "0 0 10px 0",
                        color: currentLight.color,
                        fontSize: "13px",
                      }}
                    >
                      {currentLight.name}
                    </h4>

                    {/* Position controls */}
                    <div style={{ marginBottom: "10px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontSize: "12px",
                        }}
                      >
                        Position X: {currentLight.position[0]}
                      </label>
                      <input
                        type="range"
                        min="-20"
                        max="20"
                        step="0.1"
                        value={currentLight.position[0]}
                        onChange={(e) =>
                          updatePointLightPosition(
                            selectedLight,
                            0,
                            e.target.value
                          )
                        }
                        style={{ width: "100%" }}
                      />
                    </div>

                    <div style={{ marginBottom: "10px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontSize: "12px",
                        }}
                      >
                        Position Y: {currentLight.position[1]}
                      </label>
                      <input
                        type="range"
                        min="-20"
                        max="20"
                        step="0.1"
                        value={currentLight.position[1]}
                        onChange={(e) =>
                          updatePointLightPosition(
                            selectedLight,
                            1,
                            e.target.value
                          )
                        }
                        style={{ width: "100%" }}
                      />
                    </div>

                    <div style={{ marginBottom: "10px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontSize: "12px",
                        }}
                      >
                        Position Z: {currentLight.position[2]}
                      </label>
                      <input
                        type="range"
                        min="-20"
                        max="20"
                        step="0.1"
                        value={currentLight.position[2]}
                        onChange={(e) =>
                          updatePointLightPosition(
                            selectedLight,
                            2,
                            e.target.value
                          )
                        }
                        style={{ width: "100%" }}
                      />
                    </div>

                    {/* Color control */}
                    <div style={{ marginBottom: "15px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontSize: "12px",
                        }}
                      >
                        Color:
                      </label>
                      <input
                        type="color"
                        value={currentLight.color}
                        onChange={(e) =>
                          updatePointLightColor(selectedLight, e.target.value)
                        }
                        style={{ width: "100%" }}
                      />
                    </div>

                    {/* Intensity control */}
                    <div style={{ marginBottom: "15px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontSize: "12px",
                        }}
                      >
                        Intensity: {currentLight.intensity}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.1"
                        value={currentLight.intensity}
                        onChange={(e) =>
                          updatePointLightIntensity(
                            selectedLight,
                            e.target.value
                          )
                        }
                        style={{ width: "100%" }}
                      />
                    </div>

                    {/* Distance control */}
                    <div style={{ marginBottom: "15px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontSize: "12px",
                        }}
                      >
                        Distance: {currentLight.distance}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={currentLight.distance}
                        onChange={(e) =>
                          updatePointLightDistance(
                            selectedLight,
                            e.target.value
                          )
                        }
                        style={{ width: "100%" }}
                      />
                    </div>

                    {/* Decay control */}
                    <div style={{ marginBottom: "15px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "5px",
                          fontSize: "12px",
                        }}
                      >
                        Decay: {currentLight.decay}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={currentLight.decay}
                        onChange={(e) =>
                          updatePointLightDecay(selectedLight, e.target.value)
                        }
                        style={{ width: "100%" }}
                      />
                    </div>

                    {/* Helper toggle */}
                    <div style={{ marginBottom: "10px" }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={currentLight.showHelper}
                          onChange={() => togglePointLightHelper(selectedLight)}
                          style={{ marginRight: "8px" }}
                        />
                        Show Helper
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
