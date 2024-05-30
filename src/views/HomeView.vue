<template>
  <div class="home">
    <div class="btn-box">
      <button @click="exportImg">导出图片</button>
      <button @click="randomColorFill">随机颜色矩阵填充</button>
    </div>
    <div id="cesiumContainer" class="canvas"></div>
  </div>
</template>

<script>
import { Viewer } from 'cesium';
import * as Cesium from 'cesium';
// import * as turf from "@turf/turf";
// import UrlTemplateImageryProvider from "cesium/Source/Scene/UrlTemplateImageryProvider";
// import WebMercatorProjection from "cesium/Source/Core/WebMercatorProjection";
// import "cesium/Build/Cesium/Widgets/widgets.css";
import {NavigationClass, ExportImage, RandomColorRectFill} from '@/utils/utils';
let viewer = null;

export default {
  data() {
    return {
      defaultLayer: [
        {
          id: 1,
          label: '农田',
          layerName: 'ly_cropland',
          color: '#1BA683'
        }
      ],
      GeoJson: []
    };
  },
  mounted() {
    window.CESIUM_BASE_URL = './Cesium';
    viewer = new Viewer('cesiumContainer', {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false, // 全屏按钮
      // geocoder: false, // 地名查找
      timeline: true, //时间线是否显示
      sceneModePicker: false, //二维三维投影方式显示
      navigationHelpButton: false, //取消右上角的问号
      homeButton: false, //首页按钮
      infoBox: false, //信息框
      selectionIndicator: false
    });
    viewer._cesiumWidget._creditContainer.style.display = 'none';
    this.addLayer();
    this.addVectorLayer();
    // this.addClickHeight()
    this.addClickFn();
    const navgation = new NavigationClass(viewer);
    navgation.addCompass();
  },
  methods: {
    addLayer(){
      const imgMap = new Cesium.UrlTemplateImageryProvider({
        url: 'http://t0.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=1d109683f4d84198e37a38c442d68311',
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        maximumLevel: 18,
      });
      // 注记层
      const imgMapLabel = new Cesium.UrlTemplateImageryProvider({
        url: 'http://t0.tianditu.gov.cn/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=1d109683f4d84198e37a38c442d68311',
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        maximumLevel: 18,
      });
      viewer.imageryLayers.addImageryProvider(imgMap);
      viewer.imageryLayers.addImageryProvider(imgMapLabel);
      const filyToOpts = {
        destination : new Cesium.Cartesian3.fromDegrees(114.9393, 36.4762, 10),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-15),
          roll: 0,
        }
      };
      viewer.scene.camera.flyTo(filyToOpts);
    },
    addVectorLayer(){
      // eslint-disable-next-line no-unused-vars
      this.defaultLayer.forEach(item => {
        // function addVector(layer)
        // `http://36.137.159.43:8000/geoserver/gpServer/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=gpServer%3A${item.layer}&outputFormat=application%2Fjson`
        // const url = `http://36.137.159.43:8000/geoserver/gpServer/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=gpServer%3Aly_cropland&outputFormat=application%2Fjson`
        fetch(`http://36.137.159.43:8000/geoserver/gpServer/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=gpServer%3A${item.layerName}&outputFormat=application%2Fjson`)
          .then(res => res.json())
          .then(res => {
            this.GeoJson.push(...res.features);
            let res2 = Cesium.GeoJsonDataSource.load(res, {
              stroke: Cesium.Color.WHITE.withAlpha(0.3),
              fill: Cesium.Color.fromCssColorString(item.color).withAlpha(0.7),
              strokeWidth: 5,
            });
            res2.then(ly => {
              const entities = ly.entities.values;
              for(let i = 0; i < entities.length; i++){
                const entity = entities[i];
                entity.polygon.extrudedHeight = Math.random() * 100;
              // const polygon = turf.polygon(res.features[i].geometry.coordinates[0])
              }
              viewer.dataSources.add(ly);
            });
          });
      });
    },
    addClickHeight(){
      const self = this;
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((click)=>{
        const pickedObject = viewer.screen.pick(click.position);
        let feature = null;
        if(Cesium.defined(pickedObject)){
          feature = self.GeoJson.find(f => {
            return f.id === pickedObject.id.id;
          });
        }
        if(!feature) return;
        if(feature.geometry.type === 'MultiPolygon'){
          if(self.heightPolygon){
            self.heightPolygon.material = self.heightPolygon.material0;
          }
          pickedObject.id.polygon.material0 = pickedObject.id.polygon.material;
          pickedObject.id.polygon.material = Cesium.Color.YELLOW.withAlpha(0.6);
          self.heightPolygon = pickedObject.id.polygon;
        } else if (feature.geometry.type === 'Point') {
          console.log('point');
        }
      });
    },
    addClickFn() {
      const self = this;
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction(function (click) {
        const pickedObject = viewer.scene.pick(click.position);
        // 在添加图层时, 存储的GeoJson中, 根据id查找对应的json数据
        let feature = null;
        if (Cesium.defined(pickedObject)) {
          feature = self.GeoJson.find((f) => {
            return f.id === pickedObject.id.id;
          });
        }
        // eslint-disable-next-line no-debugger
        if (!feature) return;
        
        // 进一步筛选操作
        if (feature.geometry.type === 'MultiPolygon'){
          // 判断当前是否有选中的 要素
          if (self.heightPolygon) {
            // 有则, 清空, 赋值为原来的颜色
            self.heightPolygon.material = self.heightPolygon.material0;
          }
          // 存储一份原来的 材质颜色
          pickedObject.id.polygon.material0 = pickedObject.id.polygon.material;
          // 将材质颜色赋值为高亮的颜色
          pickedObject.id.polygon.material = Cesium.Color.YELLOW.withAlpha(0.2);
          // 存储当前高亮的 要素
          self.heightPolygon = pickedObject.id.polygon;
        } else if (feature.geometry.type === 'Point') {
          // self.clickPoint = feature.geometry.coordinates;
          console.log(feature.id);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    },
    exportImg(){
      const img = new ExportImage(viewer);
      img._init();
      // img._exportImg();
    },
    // 随机颜色矩阵填充
    randomColorFill(){
      const randomColor = new RandomColorRectFill(viewer);
      randomColor._init();
    }
  },
};
</script>
<style scoped>
.home {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
.time {
  font-size: 30px;
}
#cesiumContainer {
  width: 100vw;
  height: 100vh;
  background-color: antiquewhite;
}
.btn-box{
  display: flex;
  z-index: 999;
  position: fixed;
  top: 10px;
  right: 100px;
}
.btn-box button{
  padding: 2px 8px;
  margin: 0 5px;
}
</style>
