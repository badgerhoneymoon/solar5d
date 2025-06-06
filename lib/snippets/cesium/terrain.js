const viewer = new Cesium.Viewer("cesiumContainer", {
    terrain: Cesium.Terrain.fromWorldTerrain({
      requestWaterMask: true,
      requestVertexNormals: true,
    }),
  });
  
  // set lighting to true
  viewer.scene.globe.enableLighting = true;
  
  // adjust time so scene is lit by sun
  viewer.clock.currentTime = Cesium.JulianDate.fromIso8601("2023-01-01T00:00:00");
  
  // setup alternative terrain providers
  const ellipsoidProvider = new Cesium.EllipsoidTerrainProvider();
  
  // Sine wave
  const customHeightmapWidth = 32;
  const customHeightmapHeight = 32;
  const customHeightmapProvider = new Cesium.CustomHeightmapTerrainProvider({
    width: customHeightmapWidth,
    height: customHeightmapHeight,
    callback: function (x, y, level) {
      const width = customHeightmapWidth;
      const height = customHeightmapHeight;
      const buffer = new Float32Array(width * height);
  
            for (let yy = 0; yy < height; yy++) {
        for (let xx = 0; xx < width; xx++) {
          const v = (y + yy / (height - 1)) / Math.pow(2, level);

          const heightValue = 4000 * (Math.sin(8000 * v) * 0.5 + 0.5);
  
          const index = yy * width + xx;
          buffer[index] = heightValue;
        }
      }
  
      return buffer;
    },
  });
  
  Sandcastle.addToolbarMenu(
    [
      {
        text: "CesiumTerrainProvider - Cesium World Terrain",
        onselect: function () {
          viewer.scene.setTerrain(
            Cesium.Terrain.fromWorldTerrain({
              requestWaterMask: true,
              requestVertexNormals: true,
            }),
          );
          viewer.scene.globe.enableLighting = true;
        },
      },
      {
        text: "CesiumTerrainProvider - Cesium World Terrain - no effects",
        onselect: function () {
          viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain());
        },
      },
      {
        text: "CesiumTerrainProvider - Cesium World Terrain w/ Lighting",
        onselect: function () {
          viewer.scene.setTerrain(
            Cesium.Terrain.fromWorldTerrain({
              requestVertexNormals: true,
            }),
          );
          viewer.scene.globe.enableLighting = true;
        },
      },
      {
        text: "CesiumTerrainProvider - Cesium World Terrain w/ Water",
        onselect: function () {
          viewer.scene.setTerrain(
            Cesium.Terrain.fromWorldTerrain({
              requestWaterMask: true,
            }),
          );
        },
      },
      {
        text: "EllipsoidTerrainProvider",
        onselect: function () {
          viewer.terrainProvider = ellipsoidProvider;
        },
      },
      {
        text: "CustomHeightmapTerrainProvider",
        onselect: function () {
          viewer.terrainProvider = customHeightmapProvider;
        },
      },
      {
        text: "VRTheWorldTerrainProvider",
        onselect: function () {
          viewer.scene.setTerrain(
            new Cesium.Terrain(
              Cesium.VRTheWorldTerrainProvider.fromUrl(
                "http://www.vr-theworld.com/vr-theworld/tiles1.0.0/73/",
                {
                  credit: "Terrain data courtesy VT MÄK",
                },
              ),
            ),
          );
        },
      },
      {
        text: "ArcGISTerrainProvider",
        onselect: function () {
          viewer.scene.setTerrain(
            new Cesium.Terrain(
              Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
                "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer",
              ),
            ),
          );
        },
      },
    ],
    "terrainMenu",
  );
  
  Sandcastle.addDefaultToolbarMenu(
    [
      {
        text: "Mount Everest",
        onselect: function () {
          lookAtMtEverest();
        },
      },
      {
        text: "Half Dome",
        onselect: function () {
          const target = new Cesium.Cartesian3(
            -2489625.0836225147,
            -4393941.44443024,
            3882535.9454173897,
          );
          const offset = new Cesium.Cartesian3(
            -6857.40902037546,
            412.3284835694358,
            2147.5545426812023,
          );
          viewer.camera.lookAt(target, offset);
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        },
      },
      {
        text: "San Francisco Bay",
        onselect: function () {
          const target = new Cesium.Cartesian3(
            -2708814.85583248,
            -4254159.450845907,
            3891403.9457429945,
          );
          const offset = new Cesium.Cartesian3(
            70642.66030209465,
            -31661.517948317807,
            35505.179997143336,
          );
          viewer.camera.lookAt(target, offset);
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        },
      },
    ],
    "zoomButtons",
  );
  
  function lookAtMtEverest() {
    const target = new Cesium.Cartesian3(
      300770.50872389384,
      5634912.131394585,
      2978152.2865545116,
    );
    const offset = new Cesium.Cartesian3(
      6344.974098678562,
      -793.3419798081741,
      2499.9508860763162,
    );
    viewer.camera.lookAt(target, offset);
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  }
  
  function sampleTerrainSuccess(terrainSamplePositions) {
    const ellipsoid = Cesium.Ellipsoid.WGS84;
  
    //By default, Cesium does not obsure geometry
    //behind terrain. Setting this flag enables that.
    viewer.scene.globe.depthTestAgainstTerrain = true;
  
    viewer.entities.suspendEvents();
    viewer.entities.removeAll();
  
    for (let i = 0; i < terrainSamplePositions.length; ++i) {
      const position = terrainSamplePositions[i];
  
      viewer.entities.add({
        name: position.height.toFixed(1),
        position: ellipsoid.cartographicToCartesian(position),
        billboard: {
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          scale: 0.7,
          image: "../images/facility.gif",
        },
        label: {
          text: position.height.toFixed(1),
          font: "10pt monospace",
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          pixelOffset: new Cesium.Cartesian2(0, -14),
          fillColor: Cesium.Color.BLACK,
          outlineColor: Cesium.Color.BLACK,
          showBackground: true,
          backgroundColor: new Cesium.Color(0.9, 0.9, 0.9, 0.7),
          backgroundPadding: new Cesium.Cartesian2(4, 3),
        },
      });
    }
    viewer.entities.resumeEvents();
  }
  
  function createGrid(rectangleHalfSize) {
    const gridWidth = 41;
    const gridHeight = 41;
    const everestLatitude = Cesium.Math.toRadians(27.988257);
    const everestLongitude = Cesium.Math.toRadians(86.925145);
    const e = new Cesium.Rectangle(
      everestLongitude - rectangleHalfSize,
      everestLatitude - rectangleHalfSize,
      everestLongitude + rectangleHalfSize,
      everestLatitude + rectangleHalfSize,
    );
    const terrainSamplePositions = [];
    for (let y = 0; y < gridHeight; ++y) {
      for (let x = 0; x < gridWidth; ++x) {
        const longitude = Cesium.Math.lerp(e.west, e.east, x / (gridWidth - 1));
        const latitude = Cesium.Math.lerp(e.south, e.north, y / (gridHeight - 1));
        const position = new Cesium.Cartographic(longitude, latitude);
        terrainSamplePositions.push(position);
      }
    }
    return terrainSamplePositions;
  }
  
  Sandcastle.addToggleButton(
    "Enable Lighting",
    viewer.scene.globe.enableLighting,
    function (checked) {
      viewer.scene.globe.enableLighting = checked;
    },
  );
  
  Sandcastle.addToggleButton(
    "Enable fog",
    viewer.scene.fog.enabled,
    function (checked) {
      viewer.scene.fog.enabled = checked;
    },
  );
  
  Sandcastle.addToolbarButton(
    "Sample Everest Terrain at Level 9",
    function () {
      const terrainSamplePositions = createGrid(0.005);
      Promise.resolve(
        Cesium.sampleTerrain(viewer.terrainProvider, 9, terrainSamplePositions),
      ).then(sampleTerrainSuccess);
      lookAtMtEverest();
    },
    "sampleButtons",
  );
  
  Sandcastle.addToolbarButton(
    "Sample Most Detailed Everest Terrain",
    function () {
      if (!Cesium.defined(viewer.terrainProvider.availability)) {
        window.alert(
          "sampleTerrainMostDetailed is not supported for the selected terrain provider",
        );
        return;
      }
      const terrainSamplePositions = createGrid(0.0005);
      Promise.resolve(
        Cesium.sampleTerrainMostDetailed(
          viewer.terrainProvider,
          terrainSamplePositions,
        ),
      ).then(sampleTerrainSuccess);
      lookAtMtEverest();
    },
    "sampleButtons",
  );
  