<template>
  <div>
    <slot :registerImageryProvider="registerImageryProvider" />
  </div>
</template>

<script>
import * as Cesium from "cesium";
import { MapboxVectorTileImageryLayer } from "./MapboxVectorTileImageryLayer";

export default {
  data() {
    return {
      layer: null,
      viewer: null,
      dataSource: null,
      needNewLayer: false,
      imageryProvider: null,
    };
  },
  props: {
    index: undefined,
    csEvents: undefined,
    dataSourceName: undefined,
    globeEvents: undefined,
    rectangle: undefined,
    alpha: {
      type: Number,
      value: 1.0,
    },
    nightAlpha: {
      type: Number,
      value: 1.0,
    },
    dayAlpha: {
      type: Number,
      value: 1.0,
    },
    brightness: {
      type: Number,
      value: 1.0,
    },
    contrast: {
      type: Number,
      value: 1.0,
    },
    hue: {
      type: Number,
      value: 0.0,
    },
    saturation: {
      type: Number,
      value: 1.0,
    },
    gamma: {
      type: Number,
      value: 1.0,
    },
    splitDirection: Cesium.SplitDirection.NONE,
    minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
    magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
    show: {
      type: Boolean,
      value: true,
    },
    maximumAnisotropy: undefined,
    minimumTerrainLevel: undefined,
    maximumTerrainLevel: undefined,
    cutoutRectangle: undefined,
    colorToAlpha: undefined,
    colorToAlphaThreshold: {
      type: Number,
      value: 0.004,
    },
  },
  computed: {
    // dataSourceName: () => this.dataSourceName,
    // show: () => this.show,
    // alpha: () => this.alpha,
    // rectangle: () => this.rectangle,
    // nightAlpha: () => this.nightAlpha,
    // dayAlpha: () => this.dayAlpha,
    // brightness: () => this.brightness,
    // contrast: () => this.contrast,
    // hue: () => this.hue,
    // saturation: () => this.saturation,
    // gamma: () => this.gamma,
    // splitDirection: () => this.splitDirection,
    // minificationFilter: () => this.minificationFilter,
    // magnificationFilter: () => this.magnificationFilter,
    // maximumAnisotropy: () => this.maximumAnisotropy,
    // minimumTerrainLevel: () => this.minimumTerrainLevel,
    // maximumTerrainLevel: () => this.maximumTerrainLevel,
    // cutoutRectangle: () => this.cutoutRectangle,
    // colorToAlpha: () => this.colorToAlpha,
    // colorToAlphaThreshold: () => this.colorToAlphaThreshold,
  },
  mounted() {
    this.csEvents.onNewViewer((nextViewer) => {
      this.viewer = nextViewer;
      this.needNewLayer = true;
    });
    this.csEvents.onUpdateDatasource((nextDataSource) => {
      if (nextDataSource.name === this.dataSourceName) {
        console.log(nextDataSource);
        this.dataSource = nextDataSource;
        this.needNewLayer = true;
      }
    });
  },
  methods: {
    updateImageryProvider(newValue) {
      if (this.viewer && this.dataSource) {
        const props = {
          index: this.index,
          csEvents: this.csEvents,
          dataSourceName: this.dataSourceName,
          globeEvents: this.globeEvents,
          rectangle: this.rectangle,
          alpha: this.alpha,
          nightAlpha: this.nightAlpha,
          dayAlpha: this.dayAlpha,
          brightness: this.brightness,
          contrast: this.contrast,
          hue: this.hue,
          saturation: this.saturation,
          gamma: this.gamma,
          splitDirection: this.splitDirection,
          minificationFilter: this.minificationFilter,
          magnificationFilter: this.magnificationFilter,
          show: this.show,
          maximumAnisotropy: this.maximumAnisotropy,
          minimumTerrainLevel: this.minimumTerrainLevel,
          maximumTerrainLevel: this.maximumTerrainLevel,
          cutoutRectangle: this.cutoutRectangle,
          colorToAlpha: this.colorToAlpha,
          colorToAlphaThreshold: this.colorToAlphaThreshold,
        };
        this.imageryProvider = newValue;
        const newLayer = new MapboxVectorTileImageryLayer(
          this.imageryProvider,
          this.dataSource,
          this.viewer.scene.globe,
          props
        );
        this.globeEvents.registerImageryLayer(newLayer, this.index);
        this.layer = newLayer;
      }
      this.needNewLayer = false;
    },
    registerImageryProvider(ip) {
      this.imageryProvider = ip;
      this.needNewLayer = true;
    },
    render() {},
  },
  watch: {
    show(newValue) {
      if (this.layer) {
        this.layer.show = newValue;
      }
    },
    alpha(newValue) {
      if (typeof newValue === "function") {
        this.needNewLayer = true;
      } else if (this.layer) {
        this.layer.alpha = newValue;
      }
    },
    brightness(newValue) {
      if (typeof newValue === "function") {
        this.needNewLayer = true;
      } else if (this.layer) {
        this.layer.brightness = newValue;
      }
    },
    colorToAlpha(newValue) {
      if (!newValue) {
        this.needNewLayer = true;
      } else if (this.layer) {
        this.layer.colorToAlpha = newValue;
      }
    },
    colorToAlphaThreshold(newValue) {
      if (this.layer) {
        this.layer.colorToAlphaThreshold = newValue;
      }
    },
    contrast(newValue) {
      if (typeof newValue === "function") {
        this.needNewLayer = true;
      } else if (this.layer) {
        this.layer.contrast = newValue;
      }
    },
    cutoutRectangle(newValue) {
      if (!newValue) {
        this.needNewLayer = true;
      } else if (this.layer) {
        this.layer.cutoutRectangle = newValue;
      }
    },
    dayAlpha(newValue) {
      if (typeof newValue === "function") {
        this.needNewLayer = true;
      } else if (this.layer) {
        this.layer.dayAlpha = newValue;
      }
    },
    gamma(newValue) {
      if (typeof newValue === "function") {
        this.needNewLayer = true;
      } else if (this.layer) {
        this.layer.gamma = newValue;
      }
    },
    hue(newValue) {
      if (typeof newValue === "function") {
        this.needNewLayer = true;
      } else if (this.layer) {
        this.layer.hue = newValue;
      }
    },
    magnificationFilter(newValue) {
      if (this.layer) {
        this.layer.magnificationFilter = newValue;
      }
    },
    minificationFilter(newValue) {
      if (this.layer) {
        this.layer.minificationFilter = newValue;
      }
    },
    nightAlpha(newValue) {
      if (typeof newValue === "function") {
        this.needNewLayer = true;
      } else if (this.layer) {
        this.layer.nightAlpha = newValue;
      }
    },
    saturation(newValue) {
      if (typeof newValue === "function") {
        this.needNewLayer = true;
      } else if (this.layer) {
        this.layer.saturation = newValue;
      }
    },
    splitDirection(newValue) {
      if (typeof newValue === "function") {
        this.needNewLayer = true;
      } else if (this.layer) {
        this.layer.splitDirection = newValue;
      }
    },
    rectangle(newValue) {
      this.needNewProvider = true;
    },
    maximumAnisotropy(newValue) {
      this.needNewProvider = true;
    },
    minimumTerrainLevel(newValue) {
      this.needNewProvider = true;
    },
    maximumTerrainLevel(newValue) {
      this.needNewProvider = true;
    },
    needNewLayer(newValue, oldValue) {
      if (this.imageryProvider && !oldValue && newValue) {
        this.updateImageryProvider(this.imageryProvider);
      }
    },
  },
};
</script>
