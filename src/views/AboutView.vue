<template>
  <div class="about">
    <cs-viewer :flyTo="flyTo">
      <template #dataSources="{ csEvents }">
        <cs-mvt-data-source
          :cs-events="csEvents"
          name="mvt"
          :index="0"
          :show="true"
        />
      </template>
      <template #globe="{ csEvents }">
        <cs-globe
          :cs-events="csEvents"
          :tile-cache-size="0"
          :preload-ancestors="false"
          :preload-siblings="false"
        >
          <template #imageryLayers="{ globeEvents }">
            <cs-mvt-imagery-layer
              :globeEvents="globeEvents"
              :show="true"
              :index="1"
              :csEvents="csEvents"
              dataSourceName="mvt"
            >
              <template #default="{ registerImageryProvider }">
                <cs-mvt-imagery-provider
                  :csEvents="csEvents"
                  dataSourceName="mvt"
                  :entityFactory="entityFactory"
                  :registerImageryProvider="registerImageryProvider"
                  :tilingScheme="tilingScheme"
                  :url="mvtUrl"
                  :layerStyle="layerStyle"
                  :custom-tags="customTags"
                  :maximumLevel="24"
                />
              </template>
            </cs-mvt-imagery-layer>
          </template>
        </cs-globe>
      </template>
    </cs-viewer>
  </div>
</template>
<script>
import CsGlobe from "@/utils/mvt/CsGlobe.vue";
import CsViewer from "@/utils/mvt/CsViewer.vue";
import CsMvtImageryLayer from "@/utils/mvt/CsMvtImageryLayer.vue";
import CsMvtImageryProvider from "@/utils/mvt/CsMvtImageryProvider.vue";
import CsMvtDataSource from "@/utils/mvt/CsMvtDataSource.vue";
import * as Cesium from "cesium";
import { SceneMode, ArcType } from "cesium";
window.CESIUM_BASE_URL = "./Cesium";
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxZjJiMTE2OS1lYzAwLTRlODEtYjAyYy01MTE2YTBmMTNjNGMiLCJpZCI6MTk1OTkxLCJpYXQiOjE3MDgxMzQ5NjR9.O4FIGMW_v4OxAm2GTsiwllrQ7DehNBLbodUk_eSZo-E";

class MvtEntityFactory {
  lineString(positions) {
    // return {
    //   polyline: {
    //     width: 3,
    //     material: Cesium.Color.fromCssColorString(
    //       colorMap[hashCode(layer.name) % colorMap.length]
    //     ),
    //     arcType: ArcType.GEODESIC,
    //   },
    //   properties: feature.properties,
    // };
    return new Cesium.GeometryInstance({
      geometry: new Cesium.GroundPolylineGeometry({
        positions,
        loop: true,
        width: 4.0,
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          Cesium.Color.YELLOW.withAlpha(0.7)
        ),
      },
    });
  }

  point(layer, feature, point) {
    // console.log(feature);
    // debugger;
    return {
      point: {
        pixelSize: 10,
        color: Cesium.Color.AQUA.withAlpha(0.5),
        outlineColor: Cesium.Color.YELLOW,
        outlineWidth: 2,
      },
      label: {
        canvasWidth:256, 
        canvasHeight:32, 
        font: "16px",
        fillColor: '#ffffff',
        text: feature.properties.name,
        // pixelOffset: new Cesium.Cartesian2(-15, -15),
        outlineColor: '#000000',
        outlineWidth: 0.0001,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
          0,
          500000
        ),
        pixelOffset: new Cesium.Cartesian2(0, 0),
      },
    };
  }

  polygon(positions) {
    // return undefined;
    const polygonGeometry = new Cesium.PolygonGeometry({
      polygonHierarchy: new Cesium.PolygonHierarchy(positions),
      perPositionHeight: true, // 是否每个顶点都有不同的高度，默认为false，如果地面不平坦，通常应设为true
      vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT, // 或其他适用的VertexFormat
    });

    // 创建 GeometryInstance
    const geometryInstances = new Cesium.GeometryInstance({
      geometry: polygonGeometry,
    });
    const appearance = new Cesium.MaterialAppearance({
      material: Cesium.Material.fromType("Color", {
        color: Cesium.Color.AQUA.withAlpha(0.5), // 明确指定颜色
      }),
      faceForward: false, // 由于是地面，通常不需要faceForward
      closed: true, // 多边形是否闭合，通常为true
    });
    return new Cesium.GroundPrimitive({
      // geometryInstances: this.entityFactory.polygon(positions),
      geometryInstances,
      appearance,
    });
  }
}
const layerStyle = {
  glyphs: `${location}/font/{fontstack}/{range}.pbf`,
  version: 8,
  sources: {
    layer: {
      // type: "vector",
      tiles: [
        // "http://27.188.73.109:2231/stservice/tile_vector/1790311285146046465/{z}/{x}/{y}?ak=c2f8c84366f20551e33b048709687598",
        "http://27.188.73.109:2231/stservice/tile_vector/1790310677236207618/{z}/{x}/{y}?ak=c2f8c84366f20551e33b048709687598",
      ],
      type: "vector",
    },
  },
  layers: [
    {
      id: "lineLayer",
      type: "line",
      paint: {
        "line-color": "#ffff00",
        "line-opacity": 1,
        "line-width": 2,
      },
      maxzoom: 24,
      source: "layer",
      // "source-layer": "t_1790311285146046465_xzq_xiang",
      "source-layer": "t_1790310677236207618_TDGHDL",
    },
    {
      id: "fillLayer",
      type: "fill",
      paint: {
        "fill-color": "#ffff00",
        "fill-opacity": 0.5,
      },
      maxzoom: 24,
      source: "layer",
      // "source-layer": "t_1790311285146046465_xzq_xiang",
      "source-layer": "t_1790310677236207618_TDGHDL",
    },
    {
      id: "symbolLayer",
      type: "circle",
      paint: {
        "circle-color": "#ffff00",
        "circle-opacity": 1,
        "circle-radius": 2,
      },
      maxzoom: 24,
      source: "layer",
      // "source-layer": "t_1790311285146046465_xzq_xiang",
      "source-layer": "t_1790310677236207618_TDGHDL",
      // "source-layer": 'poi',
    },
    // {
    //   id: "layer",
    //   type: "line",
    //   paint: {
    //     "line-color": "#ffff00",
    //     "line-opacity": 1,
    //     "line-width": 2,
    //   },
    //   maxzoom: 16,
    //   source: "layer",
    //   "source-layer": "road",
    // },
  ],
};

export default {
  data() {
    return {
      entityFactory: new MvtEntityFactory(),
      // tilingScheme: new Cesium.GeographicTilingScheme(), // 4326
      tilingScheme: new Cesium.WebMercatorTilingScheme(), // 3857
      mvtUrl:
        // "http://27.188.73.109:2231/stservice/tile_vector/1790330410828300289/{z}/{x}/{y}?ak=c2f8c84366f20551e33b048709687598", // 线
        "http://27.188.73.109:2231/stservice/tile_vector/1790317500257325058/{z}/{x}/{y}?ak=c2f8c84366f20551e33b048709687598", // 点
        // "http://27.188.73.109:2231/stservice/tile_vector/1790311285146046465/{z}/{x}/{y}?ak=c2f8c84366f20551e33b048709687598", // 面
        // "http://27.188.73.109:2231/stservice/tile_vector/1790310677236207618/{z}/{x}/{y}?ak=c2f8c84366f20551e33b048709687598", // 面
      // "https://noaa-wcsd-zarr-pds.s3.us-east-1.amazonaws.com/spatial/mvt/global/{z}/{x}/{y}.pbf?t={t}",
      customTags: {
        t: () => `${Date.now()}`,
      },
      layerStyle,
    };
  },
  components: {
    CsGlobe,
    CsViewer,
    CsMvtImageryLayer,
    CsMvtImageryProvider,
    CsMvtDataSource,
  },
};
</script>

<style>
.cesium-globe {
  width: 100vw;
  height: 100vh;
}
</style>
