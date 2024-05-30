<template>
  <!-- <render /> -->
  <div></div>
</template>

<script>
import * as Cesium from "cesium";
import { MapboxVectorTileImageryProvider } from "./MapboxVectorTileImageryProvider";

export default {
  data() {
    return {
      imageryProvider: null,
      viewer: null,
      dataSource: null,
      needNewProvider: false,
    };
  },
  props: {
    layerStyle: {
      type: Object,
      default: ()=>{}
    },
    csEvents: undefined,
    registerImageryProvider: undefined,
    dataSourceName: undefined,
    entityFactory: undefined,
    options: undefined,
    url: undefined,
    pickFeaturesUrl: undefined,
    urlSchemeZeroPadding: undefined,
    subdomains: {
      type: String,
      value: "abc",
      default: 'abc',
    },
    credit: {
      type: String,
      default: "",
    },
    minimumLevel: {
      type: Number,
      default: 0,
    },
    maximumLevel: undefined,
    rectangle: {
      type: Object,
      default: () => Cesium.Rectangle.MAX_VALUE,
    },
    tilingScheme: undefined,
    ellipsoid: undefined,
    tileWidth: {
      type: Number,
      default: 256,
    },
    tileHeight: {
      type: Number,
      default: 256,
    },
    hasAlphaChannel: {
      type: Boolean,
      default: true,
    },
    getFeatureInfoFormats: undefined,
    enablePickFeatures: {
      type: Boolean,
      default: false,
    },
    customTags: undefined,
  },
  computed: {
    // dataSourceName: () => this.dataSourceName,
    // entityFactory: () => this.entityFactory,
    // url: () => this.url,
    // options: () => this.options,
    // pickFeaturesUrl: () => this.pickFeaturesUrl,
    // urlSchemeZeroPadding: () => this.urlSchemeZeroPadding,
    // subdomains: () => this.subdomains,
    // credit: () => this.credit,
    // minimumLevel: () => this.minimumLevel,
    // maximumLevel: () => this.maximumLevel,
    // rectangle: () => this.rectangle,
    // tilingScheme: () => this.tilingScheme,
    // ellipsoid: () => this.ellipsoid,
    // tileWidth: () => this.tileWidth,
    // tileHeight: () => this.tileHeight,
    // hasAlphaChannel: () => this.hasAlphaChannel,
    // getFeatureInfoFormats: () => this.getFeatureInfoFormats,
    // enablePickFeatures: () => this.enablePickFeatures,
    // customTags: () => this.customTags,
  },
  mounted() {
    this.csEvents.onNewViewer((nextViewer) => {
      this.viewer = nextViewer;
      this.updateImageryProvider();
    });
    this.csEvents.onUpdateDatasource((nextDataSource) => {
      if (nextDataSource.name === this.dataSourceName) {
        this.dataSource = nextDataSource;
        this.updateImageryProvider();
      }
    });
  },
  methods: {
    updateImageryProvider() {
      if (this.viewer && this.dataSource) {
        const props = {
          csEvents: this.csEvents,
          registerImageryProvider: this.registerImageryProvider,
          dataSourceName: this.dataSourceName,
          entityFactory: this.entityFactory,
          options: this.options,
          url: this.url,
          pickFeaturesUrl: this.pickFeaturesUrl,
          urlSchemeZeroPadding: this.urlSchemeZeroPadding,
          subdomains: this.subdomains,
          credit: this.credit,
          minimumLevel: this.minimumLevel,
          maximumLevel: this.maximumLevel,
          rectangle: this.rectangle,
          tilingScheme: this.tilingScheme,
          ellipsoid: this.ellipsoid,
          tileWidth: this.tileWidth,
          tileHeight: this.tileHeight,
          hasAlphaChannel: this.hasAlphaChannel,
          getFeatureInfoFormats: this.getFeatureInfoFormats,
          enablePickFeatures: this.enablePickFeatures,
          customTags: this.customTags,
          layerStyle: this.layerStyle
        };
        this.imageryProvider = new MapboxVectorTileImageryProvider(
          props,
          this.dataSource,
          this.entityFactory
        );
        // console.log(this.imageryProvider);
        // debugger;
        props.registerImageryProvider(this.imageryProvider);
      }
      this.needNewProvider = false;
    },
  },
  // render: (h) => {
  //   return h();
  // },
  // render(h) {
  //   return h('div', [h('my-component')]);
  // },
  watch: {
    dataSourceName() {
      this.needNewProvider = true;
    },
    entityFactory() {
      this.needNewProvider = true;
    },
    options() {
      this.needNewProvider = true;
    },
    url() {
      this.needNewProvider = true;
    },
    pickFeaturesUrl() {
      this.needNewProvider = true;
    },
    urlSchemeZeroPadding() {
      this.needNewProvider = true;
    },
    subdomains() {
      this.needNewProvider = true;
    },
    credit() {
      this.needNewProvider = true;
    },
    minimumLevel() {
      this.needNewProvider = true;
    },
    maximumLevel() {
      this.needNewProvider = true;
    },
    rectangle() {
      this.needNewProvider = true;
    },
    tilingScheme() {
      this.needNewProvider = true;
    },
    ellipsoid() {
      this.needNewProvider = true;
    },
    tileWidth() {
      this.needNewProvider = true;
    },
    tileHeight() {
      this.needNewProvider = true;
    },
    hasAlphaChannel() {
      this.needNewProvider = true;
    },
    getFeatureInfoFormats() {
      this.needNewProvider = true;
    },
    enablePickFeatures() {
      this.needNewProvider = true;
    },
    customTags() {
      this.needNewProvider = true;
    },
    viewer() {
      this.needNewProvider = true;
    },
    dataSource() {
      this.needNewProvider = true;
    },
  },
};
</script>
