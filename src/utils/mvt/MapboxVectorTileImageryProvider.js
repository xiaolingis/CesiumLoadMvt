import {
  UrlTemplateImageryProvider, DeveloperError, defined, Resource, Color,
  Cartesian3, ImageryProvider, DataSource, Entity, Request, Cartographic,
  Math as CesiumMath, PointPrimitiveCollection, LabelCollection, GroundPolylinePrimitive,
  GeometryInstance, GroundPolylineGeometry, ColorGeometryInstanceAttribute, DistanceDisplayConditionGeometryInstanceAttribute,
  PolylineColorAppearance, PolygonGeometry, PolygonHierarchy, EllipsoidSurfaceAppearance, MaterialAppearance, Material, GroundPrimitive,
  WebMercatorTilingScheme, Event, Credit, DefaultProxy, ImageryLayerFeatureInfo, Rectangle, BillboardCollection, Primitive, PointGeometry, Matrix4,
  CircleGeometry, PerInstanceColorAppearance, HorizontalOrigin, VerticalOrigin
} from 'cesium';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import * as turf from '@turf/turf';

const POINT_FEATURE = 1;
const LINESTRING_FEATURE = 2;
const POLYGON_FEATURE = 3;

// copied from UrlTemplateImageryProvider
const templateRegex = /{[^}]+}/g;
function buildImageResource (imageryProvider, x, y, level, request) {
  // @ts-ignore
  // eslint-disable-next-line no-underscore-dangle
  const resource = imageryProvider._resource;
  const url = resource.getUrlComponent(true);
  // @ts-ignore
  // eslint-disable-next-line no-underscore-dangle
  const allTags = imageryProvider._tags;
  const templateValues = {};

  const match = url.match(templateRegex);
  if (defined(match)) {
    // @ts-ignore
    match.forEach((tag) => {
      const key = tag.substring(1, tag.length - 1); // strip {}
      if (defined(allTags[key])) {
        // @ts-ignore
        templateValues[key] = allTags[key](imageryProvider, x, y, level);
      }
    });
  }

  return resource.getDerivedResource({
    request,
    templateValues,
  });
}

function createGridCanvas (x, y, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;

  canvas.setAttribute('data-x', x);
  canvas.setAttribute('data-y', y);
  canvas.setAttribute('data-z', z);

  return canvas;
}

function pointToCoordinate (point, xExtent, yExtent, west, north) {
  let degX = west + (xExtent * point.x);
  let degY = north - (yExtent * point.y);

  var pt = turf.point([degX, degY]);
  var converted = turf.toWgs84(pt);
  // console.log(converted);
  degX = converted.geometry.coordinates[0];
  degY = converted.geometry.coordinates[1];
  return Cartesian3.fromDegrees(degX, degY);
}


let loadEntities = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: [],
  7: [],
  8: [],
  9: [],
  10: [],
  11: [],
  12: [],
  13: [],
  14: [],
  15: [],
  16: [],
  17: [],
  18: [],
  19: [],
  20: [],
  21: [],
  22: [],
  23: [],
  24: [],
};
let fids = [];
let lastLevel = 0;
import * as mapbox from '@/utils/mvt-basic-render';

const baseCanv = document.createElement("canvas");
class MVTImageryProvider {
  /**
   * create a MVTImageryProvider Object
   * @param {MVTImageryProviderOptions} options MVTImageryProvider options as follow:
   * @param {Resource | string | StyleSpecification} options.style - mapbox style object or url Resource.
   * @param {string} options.accessToken - mapbox style accessToken.
   * @param {RequestTransformFunction} options.transformRequest - use transformRequest to modify tile requests.
   * @param {Number} [options.tileSize = 256] - can be 256 or 512. defaults to 256.
   * @param {Number} [options.maximumLevel = 18] - if cesium zoom level exceeds maximumLevel, layer will be invisible, defaults to 18.
   * @param {Number} [options.minimumLevel = 0] - if cesium zoom level belows minimumLevel, layer will be invisible, defaults to 0.
   * @param {Boolean} [options.showCanvas = false] - if show canvas for debug.
   * @param {Boolean} [options.enablePickFeatures = true] - enable pickFeatures or not, defaults to true.
   * @param {Function} options.sourceFilter - sourceFilter is used to filter which source participate in pickFeature process.
   * @param {WebMercatorTilingScheme | GeographicTilingScheme} [options.tilingScheme = WebMercatorTilingScheme] - Cesium tilingScheme, defaults to WebMercatorTilingScheme(EPSG: 3857).
   * @param {Credit} options.credit - A credit contains data pertaining to how to display attributions/credits for certain content on the screen.
   * @example
   * const imageryProvider = new MVTImageryProvider({
        style: 'https://demotiles.maplibre.org/style.json'
      });
   */
  constructor(options) {
    this._destroyed = false;
    this.ready = false;
    this.tilingScheme = options.tilingScheme ?? new WebMercatorTilingScheme();
    this.rectangle = this.tilingScheme.rectangle;
    this.tileSize = this.tileWidth = this.tileHeight = options.tileSize || 256;
    this.maximumLevel = options.maximumLevel ?? 18;
    this.minimumLevel = options.minimumLevel ?? 0;
    this.tileDiscardPolicy = false;
    this._error = new Event();
    this.credit = new Credit(options.credit || "", false);
    this.proxy = new DefaultProxy("");
    this.hasAlphaChannel = options.hasAlphaChannel ?? true;
    this.sourceFilter = options.sourceFilter;
    this._accessToken = options.accessToken;
    this._enablePickFeatures = options.enablePickFeatures ?? true;
    if (defined(options.style)) {
      this.readyPromise = this._build(options.style, options).then(() => {
        return true;
      });
    }
  }
  /**
   * get mapbox style json obj
   */
  get style () {
    return this._style;
  }
  get isDestroyed () {
    return this._destroyed;
  }
  /**
   * Gets an event that will be raised if an error is encountered during processing.
   * @memberof GeoJsonDataSource.prototype
   * @type {Event}
   */
  get errorEvent () {
    return this._error;
  }
  async _build (url, options = {}) {
    const style = await this._preLoad(url);
    this._style = style;
    this.mapboxRenderer = new mapbox.BasicRenderer({
      style,
      canvas: baseCanv,
      token: options.accessToken,
      transformRequest: options.transformRequest
    });
    if (options.showCanvas) {
      this.mapboxRenderer.showCanvasForDebug();
    }
    await this.mapboxRenderer._style.loadedPromise;
    this.readyPromise = Promise.resolve(true);
    this.ready = true;
  }
  static async fromUrl (url, options = {}) {
    const provider = new MVTImageryProvider(options);
    await provider._build(url, options);
    return provider;
  }
  _preLoad (data) {
    let promise = data;
    if (typeof data === "string") {
      data = new Resource({
        url: data
      });
    }
    if (data instanceof Resource) {
      const prefix = "https://api.mapbox.com/";
      if (data.url.startsWith("mapbox://"))
        data.url = data.url.replace("mapbox://", prefix);
      if (this._accessToken)
        data.appendQueryParameters({
          access_token: this._accessToken
        });
      promise = data.fetchJson();
    }
    return Promise.resolve(promise).catch((error) => {
      this._error.raiseEvent(error);
      throw error;
    });
  }
  _createTile () {
    const canv = document.createElement("canvas");
    canv.width = this.tileSize;
    canv.height = this.tileSize;
    canv.style.imageRendering = "pixelated";
    return canv;
  }
  /**
   * reset tile cache
   */
  _resetTileCache () {
    Object.values(this.mapboxRenderer._style.sourceCaches).forEach((cache) => cache._tileCache.reset());
  }
  _getTilesSpec (coord, source) {
    const { x, y, level } = coord;
    const TILE_SIZE = this.tileSize;
    const ret = [];
    const maxX = this.tilingScheme.getNumberOfXTilesAtLevel(level) - 1;
    const maxY = this.tilingScheme.getNumberOfYTilesAtLevel(level) - 1;
    for (let xx = -1; xx <= 1; xx++) {
      let newx = x + xx;
      if (newx < 0)
        newx = maxX;
      if (newx > maxX)
        newx = 0;
      for (let yy = -1; yy <= 1; yy++) {
        let newy = y + yy;
        if (newy < 0 || newy > maxY)
          continue;
        ret.push({
          source,
          z: level,
          x: newx,
          y: newy,
          left: 0 + xx * TILE_SIZE,
          top: 0 + yy * TILE_SIZE,
          size: TILE_SIZE
        });
      }
    }
    return ret;
  }
  requestImage (x, y, level, releaseTile = true) {
    if (level < this.minimumLevel || level > this.maximumLevel)
      return false;
    this.mapboxRenderer.filterForZoom(level);
    const tilesSpec = this.mapboxRenderer.getVisibleSources(level).reduce((a, s) => a.concat(this._getTilesSpec({ x, y, level }, s)), []);
    return new Promise((resolve, reject) => {
      const canv = this._createTile();
      const ctx = canv.getContext("2d");
      if (ctx)
        ctx.globalCompositeOperation = "copy";
      const renderRef = this.mapboxRenderer.renderTiles(
        ctx,
        {
          srcLeft: 0,
          srcTop: 0,
          width: this.tileSize,
          height: this.tileSize,
          destLeft: 0,
          destTop: 0
        },
        tilesSpec,
        (err) => {
          if (typeof err === "string" && !err.endsWith("tiles not available")) {
            reject(false);
          } else if (releaseTile) {
            renderRef.consumer.ctx = null;
            resolve(canv);
            this.mapboxRenderer.releaseRender(renderRef);
            this._resetTileCache();
          } else {
            resolve(renderRef);
          }
        }
      );
    });
  }
  pickFeatures (x, y, zoom, longitude, latitude) {
    var _a;
    if (!this._enablePickFeatures)
      return false;
    return (_a = this.requestImage(x, y, zoom, false)) == null ? false : _a.then((renderRef) => {
      let targetSources = this.mapboxRenderer.getVisibleSources(zoom);
      targetSources = this.sourceFilter ? this.sourceFilter(targetSources) : targetSources;
      const queryResult = [];
      const lng = Math.toDegrees(longitude);
      const lat = Math.toDegrees(latitude);
      targetSources.forEach((s) => {
        const featureInfo = new ImageryLayerFeatureInfo();
        featureInfo.data = this.mapboxRenderer.queryRenderedFeatures({
          source: s,
          renderedZoom: zoom,
          lng,
          lat,
          tileZ: zoom
        });
        const name = Object.keys(featureInfo.data)[0];
        featureInfo.name = name;
        const properties = featureInfo.data[name];
        if (properties) {
          featureInfo.configureDescriptionFromProperties((properties == null ? false : properties.length) === 1 ? properties[0] : properties);
          queryResult.push(featureInfo);
        }
      });
      renderRef.consumer.ctx = false;
      this.mapboxRenderer.releaseRender(renderRef);
      this._resetTileCache();
      return queryResult.length ? queryResult : false;
    });
  }
  destroy () {
    this.mapboxRenderer._cancelAllPendingRenders();
    this._resetTileCache();
    this._destroyed = true;
  }
}

export class MapboxVectorTileImageryProvider extends UrlTemplateImageryProvider {

  constructor(options, dataSource, entityFactory) {
    super(options);
    this.options = options;
    this.dataSource = dataSource;
    this.entityFactory = entityFactory;
    this.visibleTiles = {};
    this.loadType = '';
  }

  async requestImage (x, y, level, request) {
    const viewer = this.options.csEvents.getViewer();
    const p = Resource.fetchArrayBuffer(buildImageResource(this, x, y, level, request));
    if (!p) {
      return p;
    }
    const {
      west, south, east, north,
      // @ts-ignore
      // eslint-disable-next-line no-underscore-dangle
    } = this._tilingScheme.tileXYToNativeRectangle(x, y, level);

    const tileKey = `${x}_${y}_${level}`;

    // if (this.tileCache && this.tileCache[tileKey]) {
    //   return Promise.resolve(this.tileCache[tileKey]); // 直接返回缓存的图像
    // }
    if (lastLevel !== level) {
      fids = [];
    }
    lastLevel = level;
    let result;
    console.log(tileKey);
    // 打印结果列表console.log("取出的结果列表:resultList);
    result = await p.then((buffer) => {
      // this.loadType = 3;
      // if (tileKey != `209_99_8`) return;
      if (this.loadType !== POLYGON_FEATURE) {
        this.dataSource.entities.suspendEvents();
      }
      const mvt = new VectorTile(new Protobuf(buffer));
      // eslint-disable-next-line no-unused-vars
      const _points = viewer.scene.primitives.add(new PointPrimitiveCollection());
      // const _labels = viewer.scene.primitives.add(new LabelCollection());
      const _labels = viewer.scene.primitives.add(new BillboardCollection());
      // const _polygons = viewer.scene.primitives.add(new GroundPrimitive());
      const entities = [];
      Object.entries(mvt.layers).forEach(([layerName, layer]) => {
        const xExtent = Math.abs(east - west) / layer.extent;
        const yExtent = Math.abs(north - south) / layer.extent;
        // console.log(west, south, east, north);
        // // const o = {
        // //   west: 1.985278236912845,
        // //   south: 0.636597157976175,
        // //   east: 1.9962667736589552,
        // //   north: 0.6461415813657079,
        // // };
        // var pt1 = turf.point([west, south]);
        // var converted = turf.toWgs84(pt1);
        // // console.log(converted);
        // const pt1X = converted.geometry.coordinates[0];
        // const pt1Y = converted.geometry.coordinates[1];
        // var pt2 = turf.point([east, north]);
        // var converted2 = turf.toWgs84(pt2);
        // // console.log(converted);
        // const pt2X = converted2.geometry.coordinates[0];
        // const pt2Y = converted2.geometry.coordinates[1];
        // console.log(pt1X, pt1Y, pt2X, pt2Y);
        // console.log(xExtent, yExtent);
        // debugger;
        // console.log(Rectangle.fromDegrees(pt1X, pt1Y, pt2X, pt2Y));
        // const rectangle = new Entity({
        //   name: '矩形',
        //   rectangle: {
        //     coordinates: Rectangle.fromDegrees(pt1X, pt1Y, pt2X, pt2Y),
        //     // coordinates: Rectangle.fromDegrees(116, 39, 116.5, 39.3),
        //     // coordinates: o,
        //     material: Color.RED.withAlpha(0.5),
        //     outline: true,
        //     outlineColor: Color.BLACK,
        //     height: 0,
        //   }
        // });
        // viewer.entities.add(rectangle);
        // 要取出的值的数量
        // var numberOfValuesToTake = layer.length/2 ** (level-6);
        let _b = 0;
        if (level < 4) {
          _b = 4;
        } else {
          _b = level;
        }
        // 计算平均间隔
        // var interval = Math.floor(layer.length / numberOfValuesToTake);
        // var interval = Math.floor(layer.length / (_b / 4 * _b / 4 * 30));
        var interval = Math.floor(layer.length / 2 ** (_b - 4));
        // 创建一个新的列表来存储结果
        if (interval <= 1) interval = 1;
        for (let i = 0; i < layer.length; i += interval) {
          // for (let i = 0; i < layer.length; i += 1) {
          const feature = layer.feature(i);
          // console.log(feature.properties.fid);
          console.log(fids.find(i => i == feature.properties.fid));
          if (!fids.find(i => i == feature.properties.fid)) {
            fids.push(feature.properties.fid);
          } else {
            continue;
          }
          const geometry = feature.loadGeometry();
          this.loadType = feature.type;
          if (feature.type === POLYGON_FEATURE) break;
          if (feature.type === POINT_FEATURE) {
            const point = geometry[0][0];
            // debugger;
            const entityOptions = this.entityFactory.point(layer, feature, point);
            if (entityOptions) {
              entityOptions.position = pointToCoordinate(point, xExtent, yExtent, west, north);
              entityOptions.show = true;
              let options = {
                ...entityOptions,
                ...entityOptions.point,
              };
              delete options.point;
              _points.add(options);
              if (entityOptions.label) {
                //   const labelOptions = {
                //     ...entityOptions,
                //     ...entityOptions.label
                //   };
                //   _labels.add(labelOptions);
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                // 设置Canvas大小
                canvas.width = entityOptions.label.canvasWidth; // 根据需要调整大小
                canvas.height = entityOptions.label.canvasHeight;  // 根据需要调整大小
                ctx.save(); // 保存当前状态
                ctx.scale(1, -1); // 水平翻转Canvas
                ctx.translate(0, -canvas.height); // 因为进行了水平翻转，所以需要将原点平移到正确位置
                // 配置文字样式
                ctx.font = `bold ${entityOptions.label.font} SimHei`; // 字体样式
                ctx.fillStyle = entityOptions.label.fillColor;   // 文字颜色
                ctx.textAlign = 'center';    // 文字水平居中
                ctx.textBaseline = 'middle'; // 文字垂直居中
                if(entityOptions.label.outlineColor){
                  ctx.strokeStyle = entityOptions.label.outlineColor; // 描边颜色，这里设为红色
                  ctx.lineWidth = entityOptions.label.outlineWidth;           // 描边宽度
                }
                // 绘制文字
                ctx.fillText(entityOptions.label.text, canvas.width / 2, canvas.height / 2); // 文本内容及位置
                if(entityOptions.label.outlineColor){
                  ctx.strokeText(entityOptions.label.text, canvas.width / 2, canvas.height / 2);
                  ctx.restore();
                }

                createImageBitmap(canvas).then(function (imageBitmap) {
                  _labels.add({
                    image: imageBitmap,
                    position: entityOptions.position, // 设置Billboard的位置
                    width: canvas.width, // 可选，调整Billboard的显示宽度
                    height: canvas.height, // 可选，调整Billboard的显示高度
                    verticalOrigin: entityOptions.label.verticalOrigin,
                    horizontalOrigin: entityOptions.label.horizontalOrigin,
                    distanceDisplayCondition: entityOptions.label.distanceDisplayCondition,
                    pixelOffset: entityOptions.label.pixelOffset
                  });
                });
              }
              // const point = new CircleGeometry({
              //   // 设置点的半径
              //   radius: 1000.0,
              //   // 设置点的颜色
              //   color: Color.fromCssColorString("red"),
              //   center: entityOptions.position,
              // });
              // var pointGeometry = CircleGeometry.createGeometry(point);
              // const instance = new GeometryInstance({
              //   geometry: pointGeometry,
              //   attributes: {
              //     color: ColorGeometryInstanceAttribute.fromColor(
              //       Color.RED
              //     ),
              //   },
              // });
              // const appearance = new PerInstanceColorAppearance({
              //   flat: true,
              // });
              // const primitive = new Primitive({
              //   geometryInstances: instance,
              //   appearance: appearance,
              //   asynchronous: false,
              // });
              // viewer.scene.primitives.add(primitive);
            }
          } else if (feature.type === LINESTRING_FEATURE) {
            if (geometry.length) {
              geometry.forEach((lineString) => {
                // @ts-ignore
                const positions = lineString.map((point) => {
                  // @ts-ignore
                  const xCoord = point.x;
                  const yCoord = point.y;
                  let degX = west + (xExtent * xCoord);
                  let degY = north - (yExtent * yCoord);
                  var pt = turf.point([degX, degY]);
                  var converted = turf.toWgs84(pt);
                  // console.log(converted);
                  degX = converted.geometry.coordinates[0];
                  degY = converted.geometry.coordinates[1];
                  // @ts-ignore
                  return Cartesian3.fromDegrees(degX, degY);
                });
                if (positions && positions.length > 1) {
                  viewer.scene.primitives.add(new GroundPolylinePrimitive({
                    geometryInstances: this.entityFactory.lineString(positions),
                    appearance: new PolylineColorAppearance(),
                  }));
                }
              });
              // @ts-ignore
              // geometry.forEach((lineString) => {
              //   // @ts-ignore
              //   const entityOptions = this.entityFactory.lineString(layer, feature, lineString);
              //   if (entityOptions) {
              //     entityOptions.show = true;
              //     // @ts-ignore
              //     entityOptions.polyline.positions = lineString.map((point) => {
              //       // @ts-ignore
              //       const xCoord = point.x;
              //       const yCoord = point.y;
              //       let degX = west + (xExtent * xCoord);
              //       let degY = north - (yExtent * yCoord);
              //       var pt = turf.point([degX, degY]);
              //       var converted = turf.toWgs84(pt);
              //       // console.log(converted);
              //       degX = converted.geometry.coordinates[0];
              //       degY = converted.geometry.coordinates[1];
              //       // @ts-ignore
              //       return Cartesian3.fromDegrees(degX, degY);
              //     });
              //     // console.log(entityOptions.polyline.positions);
              //     // debugger;
              //     if (entityOptions.polyline?.positions && (entityOptions.polyline?.positions).length > 1) {
              //       const entity = this.dataSource.entities.add(entityOptions);
              //       entities.push(entity);
              //     }
              //   }
              // });
            }
          }
          //  else
          //  if (feature.type === POLYGON_FEATURE) {
          // break;
          // if (geometry.length) {
          //   geometry.forEach((polygon) => {
          //     // @ts-ignore
          //     const positions = polygon.map((point) => {
          //       // @ts-ignore
          //       const xCoord = point.x;
          //       const yCoord = point.y;
          //       let degX = west + (xExtent * xCoord);
          //       let degY = north - (yExtent * yCoord);
          //       var pt = turf.point([degX, degY]);
          //       var converted = turf.toWgs84(pt);
          //       degX = converted.geometry.coordinates[0];
          //       degY = converted.geometry.coordinates[1];
          //       // @ts-ignore
          //       return Cartesian3.fromDegrees(degX, degY);
          //     });
          //     if (positions && positions.length > 1) {
          //       const entity = viewer.scene.primitives.add(this.entityFactory.polygon(positions));
          //       // loadEntities.push(entity);
          //       // positions.pop();
          //       // const lineEntity = viewer.scene.primitives.add(new GroundPolylinePrimitive({
          //       //   geometryInstances: this.entityFactory.lineString(positions),
          //       //   appearance: new PolylineColorAppearance(),
          //       // }));
          //       // loadEntities.push(lineEntity);
          //       loadEntities[level].push(entity);
          //     }
          //   });
          // }
          // }
        }
        // Promise.all(loadEntities[level]).then(() => {
        //   setTimeout(() => {
        //     for (let key in loadEntities) {
        //       if (key != level) {
        //         loadEntities[key].forEach(i => viewer.scene.primitives.remove(i));
        //         loadEntities[key] = [];
        //       }
        //       // else {
        //       //   console.log(loadEntities[level]);
        //       //   debugger;
        //       // }
        //     }
        //   }, 3000);
        // });
      });
      if (this.loadType === POLYGON_FEATURE) return;
      // @ts-ignore
      this.visibleTiles[tileKey] = entities;

      this.dataSource.entities.resumeEvents();
      // @ts-ignore
      // eslint-disable-next-line no-underscore-dangle
      this.dataSource._changed.raiseEvent(this.dataSource);

      return createGridCanvas(`${x}`, `${y}`, `${level}`);
    });
    // if (this.loadType === POLYGON_FEATURE) {
    //   if (tileKey != `209_99_8`) return false;
    //   // debugger;
    //   this._destroyed = false;
    //   this.ready = false;
    //   this.readyPromise = this._build(this.options.layerStyle, this.options).then(() => {
    //     return true;
    //   });
    //   if (level < this.minimumLevel || level > this.maximumLevel)
    //     return false;
    //   this.mapboxRenderer.filterForZoom(level);
    //   const tilesSpec = this.mapboxRenderer.getVisibleSources(level).reduce((a, s) => a.concat(this._getTilesSpec({ x, y, level }, s)), []);
    //   result = new Promise((resolve, reject) => {
    //     const canv = this._createTile();
    //     const ctx = canv.getContext("2d");
    //     if (ctx)
    //       ctx.globalCompositeOperation = "copy";
    //     const renderRef = this.mapboxRenderer.renderTiles(
    //       ctx,
    //       {
    //         srcLeft: 0,
    //         srcTop: 0,
    //         width: 256,
    //         height: 256,
    //         destLeft: 0,
    //         destTop: 0
    //       },
    //       tilesSpec,
    //       (err) => {
    //         if (typeof err === "string" && !err.endsWith("tiles not available")) {
    //           reject(false);
    //         } else if (request) {
    //           renderRef.consumer.ctx = null;
    //           resolve(canv);
    //           this.mapboxRenderer.releaseRender(renderRef);
    //           this._resetTileCache();
    //         } else {
    //           resolve(renderRef);
    //         }
    //       }
    //     );
    //   });
    // }
    return result;
  }
  get errorEvent () {
    return this._error;
  }
  async _build (url, options = {}) {
    const style = await this._preLoad(url);
    this._style = style;
    this.mapboxRenderer = new mapbox.BasicRenderer({
      style,
      canvas: baseCanv,
      token: options.accessToken,
      transformRequest: options.transformRequest
    });
    if (options.showCanvas) {
      this.mapboxRenderer.showCanvasForDebug();
    }
    await this.mapboxRenderer._style.loadedPromise;
    this.readyPromise = Promise.resolve(true);
    this.ready = true;
  }
  static async fromUrl (url, options = {}) {
    const provider = new MVTImageryProvider(options);
    await provider._build(url, options);
    return provider;
  }
  _preLoad (data) {
    let promise = data;
    if (typeof data === "string") {
      data = new Resource({
        url: data
      });
    }
    if (data instanceof Resource) {
      const prefix = "https://api.mapbox.com/";
      if (data.url.startsWith("mapbox://"))
        data.url = data.url.replace("mapbox://", prefix);
      if (this._accessToken)
        data.appendQueryParameters({
          access_token: this._accessToken
        });
      promise = data.fetchJson();
    }
    return Promise.resolve(promise).catch((error) => {
      this._error.raiseEvent(error);
      throw error;
    });
  }
  _createTile () {
    const canv = document.createElement("canvas");
    canv.width = 256;
    canv.height = 256;
    canv.style.imageRendering = "pixelated";
    return canv;
  }
  /**
   * reset tile cache
   */
  _resetTileCache () {
    Object.values(this.mapboxRenderer._style.sourceCaches).forEach((cache) => cache._tileCache.reset());
  }
  _getTilesSpec (coord, source) {
    const { x, y, level } = coord;
    const TILE_SIZE = 256;
    const ret = [];
    const maxX = this.tilingScheme.getNumberOfXTilesAtLevel(level) - 1;
    const maxY = this.tilingScheme.getNumberOfYTilesAtLevel(level) - 1;
    for (let xx = -1; xx <= 1; xx++) {
      let newx = x + xx;
      if (newx < 0)
        newx = maxX;
      if (newx > maxX)
        newx = 0;
      for (let yy = -1; yy <= 1; yy++) {
        let newy = y + yy;
        if (newy < 0 || newy > maxY)
          continue;
        ret.push({
          source,
          z: level,
          x: newx,
          y: newy,
          left: 0 + xx * TILE_SIZE,
          top: 0 + yy * TILE_SIZE,
          size: TILE_SIZE
        });
      }
    }
    return ret;
  }
  pickFeatures (x, y, zoom, longitude, latitude) {
    var _a;
    if (!this._enablePickFeatures)
      return false;
    return (_a = this.requestImage(x, y, zoom, false)) == null ? false : _a.then((renderRef) => {
      let targetSources = this.mapboxRenderer.getVisibleSources(zoom);
      targetSources = this.sourceFilter ? this.sourceFilter(targetSources) : targetSources;
      const queryResult = [];
      const lng = Math.toDegrees(longitude);
      const lat = Math.toDegrees(latitude);
      targetSources.forEach((s) => {
        const featureInfo = new ImageryLayerFeatureInfo();
        featureInfo.data = this.mapboxRenderer.queryRenderedFeatures({
          source: s,
          renderedZoom: zoom,
          lng,
          lat,
          tileZ: zoom
        });
        const name = Object.keys(featureInfo.data)[0];
        featureInfo.name = name;
        const properties = featureInfo.data[name];
        if (properties) {
          featureInfo.configureDescriptionFromProperties((properties == null ? false : properties.length) === 1 ? properties[0] : properties);
          queryResult.push(featureInfo);
        }
      });
      renderRef.consumer.ctx = false;
      this.mapboxRenderer.releaseRender(renderRef);
      this._resetTileCache();
      return queryResult.length ? queryResult : false;
    });
  }
  destroy () {
    this.mapboxRenderer._cancelAllPendingRenders();
    this._resetTileCache();
    this._destroyed = true;
  }
}
