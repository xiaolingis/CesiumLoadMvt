<template>
  <div>
    <slot name="imageryLayers" :globeEvents="globeEvents" />
  </div>
</template>

<script>
import * as Cesium from "cesium";

class IndexedImageryLayer {
  constructor(index, imageryLayer) {
    this.index = index;
    this.imageryLayer = imageryLayer;
  }
}

export default {
  data() {
    return {
      aglobe: null,
      layers: [],
      needNewGlobe: false,
      globeEvents: {
        registerImageryLayer: null,
      },
    };
  },
  beforeMount() {
    this.globeEvents.registerImageryLayer = this.registerImageryLayer;
  },
  mounted() {
    this.initializeGlobe();
  },
  props: {
    csEvents: undefined,
    ellipsoid: undefined,
    atmosphereBrightnessShift: undefined, // 0.0
    atmosphereHueShift: undefined, // 0.0
    atmosphereLightIntensity: undefined, // 10.0
    atmosphereMieAnisotropy: undefined, // 0.9
    atmosphereMieCoefficient: undefined,
    atmosphereMieScaleHeight: undefined, // 3200.0
    atmosphereRayleighCoefficient: undefined,
    atmosphereRayleighScaleHeight: undefined, // 10000.0
    atmosphereSaturationShift: undefined, // 0.0
    backFaceCulling: undefined, // true
    baseColor: undefined,
    cartographicLimitRectangle: undefined, // Rectangle.MAX_VALUE
    clippingPlanes: undefined,
    depthTestAgainstTerrain: undefined, // false
    dynamicAtmosphereLighting: undefined, // true
    dynamicAtmosphereLightingFromSun: undefined, // false;
    enableLighting: undefined, // false;
    fillHighlightColor: undefined,
    lambertDiffuseMultiplier: undefined, // 0.9
    lightingFadeInDistance: undefined, // 20000000.0
    lightingFadeOutDistance: undefined, // 10000000.0
    loadingDescendantLimit: undefined, // 20
    material: undefined,
    maximumScreenSpaceError: undefined, // 2
    nightFadeInDistance: undefined, // 50000000.0
    nightFadeOutDistance: undefined, // 10000000.0
    oceanNormalMapUrl: undefined,
    preloadAncestors: undefined, // true
    preloadSiblings: undefined, // false
    shadows: undefined, // ShadowMode.RECEIVE_ONLY
    show: undefined, // true
    showGroundAtmosphere: undefined, // true
    showSkirts: undefined, // true
    showWaterEffect: undefined, // true
    terrainExaggeration: undefined, // 1.0
    terrainExaggerationRelativeHeight: undefined, // 0.0
    terrainProvider: undefined,
    tileCacheSize: undefined, // 100
    translucency: undefined,
    undergroundColor: undefined, // Color.BLACK
    undergroundColorAlphaByDistance: undefined,
    vertexShadowDarkness: undefined, // 0.3
  },
  methods: {
    initializeLayers() {
      if (this.globe) {
        // this.globe.imageryLayers.removeAll(false);
        this.layers.forEach((layer) => {
          this.globe.imageryLayers.add(layer.imageryLayer); // 添加图层
        });
      }
    },
    initializeGlobe() {
      this.needNewGlobe = false;
      this.globe = new Cesium.Globe(this.ellipsoid || Cesium.Ellipsoid.WGS84);
      if (this.atmosphereBrightnessShift !== undefined)
        this.globe.atmosphereBrightnessShift = this.atmosphereBrightnessShift;
      if (this.atmosphereHueShift !== undefined)
        this.globe.atmosphereHueShift = this.atmosphereHueShift;
      if (this.atmosphereLightIntensity !== undefined)
        this.globe.atmosphereLightIntensity = this.atmosphereLightIntensity;
      if (this.atmosphereMieAnisotropy !== undefined)
        this.globe.atmosphereMieAnisotropy = this.atmosphereMieAnisotropy;
      if (this.atmosphereMieCoefficient !== undefined)
        this.globe.atmosphereMieCoefficient = this.atmosphereMieCoefficient;
      if (this.atmosphereMieScaleHeight !== undefined)
        this.globe.atmosphereMieScaleHeight = this.atmosphereMieScaleHeight;
      if (this.atmosphereRayleighCoefficient !== undefined)
        this.globe.atmosphereRayleighCoefficient =
          this.atmosphereRayleighCoefficient;
      if (this.atmosphereRayleighScaleHeight !== undefined)
        this.globe.atmosphereRayleighScaleHeight =
          this.atmosphereRayleighScaleHeight;
      if (this.atmosphereSaturationShift !== undefined)
        this.globe.atmosphereSaturationShift = this.atmosphereSaturationShift;
      if (this.backFaceCulling !== undefined)
        this.globe.backFaceCulling = this.backFaceCulling;
      if (this.baseColor !== undefined) this.globe.baseColor = this.baseColor;
      if (this.cartographicLimitRectangle !== undefined)
        this.globe.cartographicLimitRectangle = this.cartographicLimitRectangle;
      if (this.clippingPlanes !== undefined)
        this.globe.clippingPlanes = this.clippingPlanes;
      if (this.depthTestAgainstTerrain !== undefined)
        this.globe.depthTestAgainstTerrain = this.depthTestAgainstTerrain;
      if (this.dynamicAtmosphereLighting !== undefined)
        this.globe.dynamicAtmosphereLighting = this.dynamicAtmosphereLighting;
      if (this.dynamicAtmosphereLightingFromSun !== undefined)
        this.globe.dynamicAtmosphereLightingFromSun =
          this.dynamicAtmosphereLightingFromSun;
      if (this.enableLighting !== undefined)
        this.globe.enableLighting = this.enableLighting;
      if (this.fillHighlightColor !== undefined)
        this.globe.fillHighlightColor = this.fillHighlightColor;
      if (this.lambertDiffuseMultiplier !== undefined)
        this.globe.lambertDiffuseMultiplier = this.lambertDiffuseMultiplier;
      if (this.lightingFadeInDistance !== undefined)
        this.globe.lightingFadeInDistance = this.lightingFadeInDistance;
      if (this.lightingFadeOutDistance !== undefined)
        this.globe.lightingFadeOutDistance = this.lightingFadeOutDistance;
      if (this.loadingDescendantLimit !== undefined)
        this.globe.loadingDescendantLimit = this.loadingDescendantLimit;
      if (this.material !== undefined) this.globe.material = this.material;
      if (this.maximumScreenSpaceError !== undefined)
        this.globe.maximumScreenSpaceError = this.maximumScreenSpaceError;
      if (this.nightFadeInDistance !== undefined)
        this.globe.nightFadeInDistance = this.nightFadeInDistance;
      if (this.nightFadeOutDistance !== undefined)
        this.globe.nightFadeOutDistance = this.nightFadeOutDistance;
      if (this.oceanNormalMapUrl !== undefined)
        this.globe.oceanNormalMapUrl = this.oceanNormalMapUrl;
      if (this.preloadAncestors !== undefined)
        this.globe.preloadAncestors = this.preloadAncestors;
      if (this.preloadSiblings !== undefined)
        this.globe.preloadSiblings = this.preloadSiblings;
      if (this.shadows !== undefined) this.globe.shadows = this.shadows;
      if (this.show !== undefined) this.globe.show = this.show;
      if (this.showGroundAtmosphere !== undefined)
        this.globe.showGroundAtmosphere = this.showGroundAtmosphere;
      if (this.showSkirts !== undefined)
        this.globe.showSkirts = this.showSkirts;
      if (this.showWaterEffect !== undefined)
        this.globe.showWaterEffect = this.showWaterEffect;
      if (this.terrainExaggeration !== undefined)
        this.globe.terrainExaggeration = this.terrainExaggeration;
      if (this.terrainExaggerationRelativeHeight !== undefined)
        this.globe.terrainExaggerationRelativeHeight =
          this.terrainExaggerationRelativeHeight;
      if (this.terrainProvider !== undefined)
        this.globe.terrainProvider = this.terrainProvider;
      if (this.tileCacheSize !== undefined)
        this.globe.tileCacheSize = this.tileCacheSize;
      if (this.translucency !== undefined)
        this.globe.translucency = this.translucency;
      if (this.undergroundColor !== undefined)
        this.globe.undergroundColor = this.undergroundColor;
      if (this.undergroundColorAlphaByDistance !== undefined)
        this.globe.undergroundColorAlphaByDistance =
          this.undergroundColorAlphaByDistance;
      if (this.vertexShadowDarkness !== undefined)
        this.globe.vertexShadowDarkness = this.vertexShadowDarkness;
      this.initializeLayers();
      this.csEvents.updateGlobe(this.globe);
    },
    registerImageryLayer(imageryLayer, index) {
      const tempLayers = [];
      let added = false;
      this.layers.forEach((layer) => {
        if (layer.index < index) {
          tempLayers.push(layer);
        } else if (layer.index === index) {
          tempLayers.push(new IndexedImageryLayer(index, imageryLayer));
          added = true;
        } else if (layer.index > index) {
          if (added) {
            tempLayers.push(layer);
          } else {
            tempLayers.push(new IndexedImageryLayer(index, imageryLayer));
            added = true;
          }
        }
      });
      if (!added) {
        tempLayers.push(new IndexedImageryLayer(index, imageryLayer));
      }
      this.layers = tempLayers;
      this.initializeLayers();
    },
  },
  watch: {
    needNewGlobe(newValue, oldValue) {
      if (newValue && !oldValue) {
        this.initializeGlobe();
      }
    },
    ellipsoid() {
      this.needNewGlobe.value = true;
    },
    atmosphereBrightnessShift(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.atmosphereBrightnessShift = newValue;
      }
    },
    atmosphereHueShift(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.atmosphereHueShift = newValue;
      }
    },
    atmosphereLightIntensity(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.atmosphereLightIntensity = newValue;
      }
    },
    atmosphereMieAnisotropy(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.atmosphereMieAnisotropy = newValue;
      }
    },
    atmosphereMieCoefficient(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.atmosphereMieCoefficient = newValue;
      }
    },
    atmosphereMieScaleHeight(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.atmosphereMieScaleHeight = newValue;
      }
    },
    atmosphereRayleighCoefficient(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.atmosphereRayleighCoefficient = newValue;
      }
    },
    atmosphereRayleighScaleHeight(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.atmosphereRayleighScaleHeight = newValue;
      }
    },
    atmosphereSaturationShift(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.atmosphereSaturationShift = newValue;
      }
    },
    backFaceCulling(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.backFaceCulling = newValue;
      }
    },
    baseColor(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.baseColor = newValue;
      }
    },
    cartographicLimitRectangle(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.cartographicLimitRectangle = newValue;
      }
    },
    clippingPlanes(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.clippingPlanes = newValue;
      }
    },
    depthTestAgainstTerrain(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.depthTestAgainstTerrain = newValue;
      }
    },
    dynamicAtmosphereLighting(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.dynamicAtmosphereLighting = newValue;
      }
    },
    dynamicAtmosphereLightingFromSun(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.dynamicAtmosphereLightingFromSun = newValue;
      }
    },
    enableLighting(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.enableLighting = newValue;
      }
    },
    fillHighlightColor(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.fillHighlightColor = newValue;
      }
    },
    lambertDiffuseMultiplier(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.lambertDiffuseMultiplier = newValue;
      }
    },
    lightingFadeInDistance(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.lightingFadeInDistance = newValue;
      }
    },
    lightingFadeOutDistance(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.lightingFadeOutDistance = newValue;
      }
    },
    loadingDescendantLimit(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.loadingDescendantLimit = newValue;
      }
    },
    material(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.material = newValue;
      }
    },
    maximumScreenSpaceError(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.maximumScreenSpaceError = newValue;
      }
    },
    nightFadeInDistance(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.nightFadeInDistance = newValue;
      }
    },
    nightFadeOutDistance(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.nightFadeOutDistance = newValue;
      }
    },
    oceanNormalMapUrl(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.oceanNormalMapUrl = newValue;
      }
    },
    preloadAncestors(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.preloadAncestors = newValue;
      }
    },
    preloadSiblings(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.preloadSiblings = newValue;
      }
    },
    shadows(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.shadows = newValue;
      }
    },
    show(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.show = newValue;
      }
    },
    showGroundAtmosphere(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.showGroundAtmosphere = newValue;
      }
    },
    showSkirts(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.showSkirts = newValue;
      }
    },
    showWaterEffect(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.showWaterEffect = newValue;
      }
    },
    terrainExaggeration(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.terrainExaggeration = newValue;
      }
    },
    terrainExaggerationRelativeHeight(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.terrainExaggerationRelativeHeight = newValue;
      }
    },
    terrainProvider(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.terrainProvider = newValue;
      }
    },
    tileCacheSize(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.tileCacheSize = newValue;
      }
    },
    translucency(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.translucency = newValue;
      }
    },
    undergroundColor(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.undergroundColor = newValue;
      }
    },
    undergroundColorAlphaByDistance(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.undergroundColorAlphaByDistance = newValue;
      }
    },
    vertexShadowDarkness(newValue) {
      if (newValue === undefined) {
        this.needNewGlobe = true;
      } else if (this.globe) {
        this.globe.vertexShadowDarkness = newValue;
      }
    },
  },
};
</script>
