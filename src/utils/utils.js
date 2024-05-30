import CesiumNavigation from "cesium-navigation-es6";
import * as turf from "@turf/turf";
import {
  Rectangle,
  Viewer,
  Color,
  UrlTemplateImageryProvider,
  // 旋转动画
  Matrix4,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  // 随机色填充
  GeometryInstance,
  RectangleGeometry,
  PerInstanceColorAppearance,
  ColorGeometryInstanceAttribute,
  Primitive,
  // 雪天
  defaultValue,
  PostProcessStage,
  Cartesian3,
  SceneMode,
  Transforms,
  // 反选遮罩
  Entity,
  // 天空盒
  SkyBox,
  Cartographic,
  // primitive渲染GeoJson
  PolygonGeometry,
  PolygonHierarchy,
  CallbackProperty,
  // 点击查看要素
  defined,
  InfoBox,
  Cartesian2,
  // 道路穿梭
  GeoJsonDataSource,
  createPropertyDescriptor,
  Material,
  Event,
  // 道路闪烁
  Property,
  // 动态水面
  EllipsoidSurfaceAppearance,
  // 墙体
  WallGeometry,
  // 旋转圆材质
  ImageMaterialProperty,
  // 圆扩散
  Cartesian4,
  // 雷达扫描
  Quaternion,
  Matrix3,
  HeightReference,
  // 自定义广告牌
  LabelStyle,
  HorizontalOrigin,
  VerticalOrigin,
  // 3D Tiles
  Cesium3DTileset,
  ClippingPlaneCollection,
  ClippingPlane,
  HeadingPitchRange,
  // glb模型
  HeadingPitchRoll,
  Model,
  SampledPositionProperty,
  PolylineGlowMaterialProperty,
  JulianDate,
  Ellipsoid,
  Resource,
  // 加载wms
  WebMapServiceImageryProvider,
  // 加载wmts
  WebMapTileServiceImageryProvider,
} from "cesium";

/**
 * 罗盘,  比例尺, 缩放
 * @param {*} viewer 视图 - 地图viewer
 */
export class NavigationClass {
  constructor(viewer) {
    this._viewer = viewer;
  }

  addCompass() {
    const options = {
      // 用于在使用重置导航重置地图视图时设置默认视图控制。接受的值是Cartographic 和Rectangle.
      defaultResetView: Rectangle.fromDegrees(80, 22, 130, 50),
      // 用于启用或禁用罗盘。true是启用罗盘，false是禁用罗盘。默认值为true。如果将选项设置为false，则罗盘将不会添加到地图中。
      enableCompass: true,
      // 用于启用或禁用缩放控件。true是启用，false是禁用。默认值为true。如果将选项设置为false，则缩放控件将不会添加到地图中。
      enableZoomControls: true,
      // 用于启用或禁用距离图例。true是启用，false是禁用。默认值为true。如果将选项设置为false，距离图例将不会添加到地图中。
      enableDistanceLegend: true,
      // 用于启用或禁用指南针外环。true是启用，false是禁用。默认值为true。如果将选项设置为false，则该环将可见但无效。
      enableCompassOuterRing: true,
      orientation: {
        roll: 0,
      },
    };
    new CesiumNavigation(this._viewer, options);
  }
}

/**
 * 鹰眼图
 * @param {*} viewer 视图 - 地图viewer
 */
export class HawkEyeMap {
  constructor(viewer) {
    this._viewer = viewer;
  }
  _init() {
    this._hawkEyeMap = new Viewer("hawkEyeMap", {
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
    });
    this._hawkEyeMap.cesiumWidget.creditContainer.style.display = "none";
    this._hawkEyeMap.scene.backgroundColor = Color.TRANSPARENT;
    this._hawkEyeMap.imageryLayers.removeAll();

    // 鹰眼图中添加高德路网中文注记图
    this._hawkEyeMap.imageryLayers.addImageryProvider(
      new UrlTemplateImageryProvider({
        url: "http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
        minimumLevel: 3,
        maximumLevel: 18,
      })
    );

    // 引起事件监听的相机变化幅度
    this._viewer.camera.percentageChanged = 0.01;
    this._bindEvent();
    this._syncMap();
    return this._hawkEyeMap;
  }

  // 绑定事件
  _bindEvent() {
    this._viewer.camera.changed.addEventListener(this._syncMap, this);
    this._viewer.scene.preRender.addEventListener(this._syncEyeMap, this);
  }
  // 同步主图与鹰眼图
  _syncMap() {
    this._hawkEyeMap.camera.flyTo({
      destination: this._viewer.camera.position,
      orientation: {
        heading: this._viewer.camera.heading,
        pitch: this._viewer.camera.pitch,
        roll: this._viewer.camera.roll,
      },
      duration: 0,
    });
  }
  _syncEyeMap() {
    this._viewer.camera.flyTo({
      destination: this._hawkEyeMap.camera.position,
      orientation: {
        heading: this._hawkEyeMap.camera.heading,
        pitch: this._hawkEyeMap.camera.pitch,
        roll: this._hawkEyeMap.camera.roll,
      },
      duration: 0,
    });
  }
}

/**
 * 键盘控制场景漫游
 * @param {*} viewer 视图 - 地图viewer
 * @param {*} hawkEyeViewer 鹰眼图viewer - 鹰眼图viewer 有鹰眼图, 要同步鹰眼图的视角
 */
export class KeyboardControl {
  constructor(viewer, hawkEyeViewer = null) {
    this._viewer = viewer;
    this._hawkEyeViewer = hawkEyeViewer;
    this.flags = {
      // 相机位置
      moveForward: false,
      moveBackward: false,
      moveUp: false,
      moveDown: false,
      moveLeft: false,
      moveRight: false,
      // 相机方向
      lookUp: false,
      lookDown: false,
      lookLeft: false,
      lookRight: false,
      twistLeft: false,
      twistRight: false,
      // 缩放
      zoomIn: false,
      zoomOut: false,
    };
  }
  _init() {
    document.addEventListener("keydown", this._keyDown.bind(this), false);
    document.addEventListener("keyup", this._keyUp.bind(this), false);

    this._viewer.clock.onTick.addEventListener(
      function () {
        this._keyboardMapRoamingRender(this._viewer, this._hawkEyeViewer);
      }.bind(this)
    );
  }

  _getFlagForKeyCode(key) {
    switch (key) {
      case "W":
        return "moveForward";
      case "S":
        return "moveBackward";
      case "D":
        return "moveRight";
      case "A":
        return "moveLeft";
      case "Q":
        return "moveUp";
      case "E":
        return "moveDown";
      case "ARROWUP":
        return "lookUp";
      case "ARROWDOWN":
        return "lookDown";
      case "ARROWLEFT":
        return "lookLeft";
      case "ARROWRIGHT":
        return "lookRight";
      case ",":
        return "twistLeft";
      case ".":
        return "twistRight";
      case "=":
      case "+":
        return "zoomIn";
      case "-":
      case "_":
        return "zoomOut";
      default:
        return undefined;
    }
  }

  _keyDown(event) {
    // console.log(event);
    const flagName = this._getFlagForKeyCode(event.key.toUpperCase());
    console.log(flagName);
    if (typeof flagName !== "undefined") {
      this.flags[flagName] = true;
    }
  }
  _keyUp(event) {
    const flagName = this._getFlagForKeyCode(event.key.toUpperCase());
    console.log(flagName);
    if (typeof flagName !== "undefined") {
      this.flags[flagName] = false;
    }
  }

  _keyboardMapRoamingRender(_viewer, _hawkEyeViewer) {
    const camera = _viewer.camera;
    const hawkEyeCamera = _hawkEyeViewer ? _hawkEyeViewer.camera : null;
    const ellipsoid = _viewer.scene.globe.ellipsoid;
    const cameraHeight = ellipsoid.cartesianToCartographic(
      camera.position
    ).height;

    // 根据相机高度设置移动距离, 比默认距离移动效果更好
    const moveRate = cameraHeight / 200.0;

    if (this.flags.moveForward) {
      camera.moveForward(moveRate);
      hawkEyeCamera && hawkEyeCamera.moveForward(moveRate);
    }
    if (this.flags.moveBackward) {
      camera.moveBackward(moveRate);
      hawkEyeCamera && hawkEyeCamera.moveBackward(moveRate);
    }
    if (this.flags.moveLeft) {
      camera.moveLeft(moveRate);
      hawkEyeCamera && hawkEyeCamera.moveLeft(moveRate);
    }
    if (this.flags.moveRight) {
      camera.moveRight(moveRate);
      hawkEyeCamera && hawkEyeCamera.moveRight(moveRate);
    }
    if (this.flags.moveUp) {
      camera.moveUp(moveRate);
      hawkEyeCamera && hawkEyeCamera.moveUp(moveRate);
    }
    if (this.flags.moveDown) {
      camera.moveDown(moveRate);
      hawkEyeCamera && hawkEyeCamera.moveDown(moveRate);
    }
    if (this.flags.lookUp) {
      camera.lookUp();
      hawkEyeCamera && hawkEyeCamera.lookUp();
    }
    if (this.flags.lookDown) {
      camera.lookDown();
      hawkEyeCamera && hawkEyeCamera.lookDown();
    }
    if (this.flags.lookLeft) {
      camera.lookLeft();
      hawkEyeCamera && hawkEyeCamera.lookLeft();
    }
    if (this.flags.lookRight) {
      camera.lookRight();
      hawkEyeCamera && hawkEyeCamera.lookRight();
    }
    if (this.flags.twistLeft) {
      camera.twistLeft();
      hawkEyeCamera && hawkEyeCamera.twistLeft();
    }
    if (this.flags.twistRight) {
      camera.twistRight();
      hawkEyeCamera && hawkEyeCamera.twistRight();
    }
    // 根据相机高度设置缩放参数
    if (this.flags.zoomIn) {
      camera.zoomIn(cameraHeight / 2);
      hawkEyeCamera && hawkEyeCamera.zoomIn(cameraHeight / 2);
    }
    if (this.flags.zoomOut) {
      camera.zoomOut(cameraHeight / 2);
      hawkEyeCamera && hawkEyeCamera.zoomOut(cameraHeight / 2);
    }
  }
}

/**
 * 导出图片
 * @param {*} viewer 视图 - 地图viewer
 */
export class ExportImage {
  constructor(viewer) {
    this._viewer = viewer;
  }
  _init() {
    this._viewer.render();
    let canvas = this._viewer.scene.canvas;
    const image = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    let link = document.createElement("a");
    let blob = this._dataURLtoBlob(image);
    let objurl = URL.createObjectURL(blob);
    link.download = "cesium.png";
    link.href = objurl;
    link.click();
  }
  _dataURLtoBlob(dataurl) {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}

/**
 * 相机旋转
 * @param {*} viewer 视图 - 地图viewer
 * @param {Number} amount 旋转角度
 * @param {*} hawkEyeViewer 鹰眼viewer - 鹰眼图viewer 有鹰眼图, 要同步鹰眼图的视角
 */
export class CameraAroundEarth {
  constructor(viewer, amount, hawkEyeViewer = null) {
    this._viewer = viewer;
    this._amount = amount;
    this._hawkEyeViewer = hawkEyeViewer;
  }

  // 绑定事件
  _bindEvent() {
    this._viewer.clock.onTick.addEventListener(this._aroundView, this);
  }
  // 解除绑定
  _unbindEvent() {
    this._viewer.camera.lookAtTransform(Matrix4.IDENTITY);
    this._viewer.clock.onTick.removeEventListener(this._aroundView, this);
  }
  start() {
    this._viewer.clock.shouldAnimate = true;
    this._unbindEvent();
    this._bindEvent();
    const handler = new ScreenSpaceEventHandler(this._viewer.scene.canvas);
    handler.setInputAction(
      function (event) {
        this.stop();
      }.bind(this),
      ScreenSpaceEventType.LEFT_CLICK
    );
    return this;
  }
  stop() {
    this._unbindEvent();
    return this;
  }
  _aroundView() {
    let heading = this._viewer.camera.heading;
    let pitch = this._viewer.camera.pitch;
    let roll = this._viewer.camera.roll;
    // console.log(CesiumMath.toRadians(this._amount));
    // console.log(Math.PI * 2);
    if (heading >= Math.PI * 2 || heading <= -Math.PI * 2) {
      heading = 0;
    }
    heading += CesiumMath.toRadians(this._amount);
    this._viewer.camera.setView({
      orientation: {
        heading: heading,
        pitch: pitch,
        roll: roll,
      },
    });
    if (this._hawkEyeViewer) {
      this._hawkEyeViewer.camera.setView({
        orientation: {
          heading: heading,
          pitch: pitch,
          roll: roll,
        },
      });
    }
  }
}

/**
 * 随机颜色矩阵填充
 * @param {*} viewer 视图 - 地图viewer
 */
export class RandomColorRectFill {
  constructor(viewer) {
    this._viewer = viewer;
  }

  _init() {
    let instances = [];
    for (let lon = -180.0; lon < 180.0; lon += 5.0) {
      for (let lat = -90.0; lat < 90.0; lat += 5.0) {
        instances.push(
          new GeometryInstance({
            geometry: new RectangleGeometry({
              rectangle: Rectangle.fromDegrees(lon, lat, lon + 5.0, lat + 5.0),
            }),
            attributes: {
              color: ColorGeometryInstanceAttribute.fromColor(
                Color.fromRandom({
                  alpha: 0.5,
                })
              ),
            },
          })
        );
      }
    }
    this._viewer.scene.primitives.add(
      new Primitive({
        geometryInstances: instances,
        appearance: new PerInstanceColorAppearance({
          flat: true,
          // translucent: false,
        }),
      })
    );
  }
}

/**
 * 雪天效果
 * @param {*} viewer 视图 - 地图viewer
 * @param {Object} options options.snowSize 雪花大小
 * @param {Object} options options.snowSpeed 雪花速度
 */
export class Snow {
  constructor(viewer, options = {}) {
    this._viewer = viewer;
    this.snowSize = options.snowSize || 0.02;
    this.snowSpeed = options.snowSpeed || 60.0;
    this.snowStage = null;
    this._init();
  }
  _init() {
    this.snowStage = new PostProcessStage({
      name: "czm_snow",
      fragmentShader: this.snow(),
      uniforms: {
        snowSize: () => {
          return this.snowSize;
        },
        snowSpeed: () => {
          return this.snowSpeed;
        },
      },
    });
    this._viewer.scene.postProcessStages.add(this.snowStage);
  }

  destroy() {
    if (!this._viewer || !this.snowStage) return;
    this._viewer.scene.postProcessStages.remove(this.snowStage);
    this.snowStage.destroy();
  }

  show(visible) {
    this.snowStage.enabled = visible;
  }

  snow() {
    return "uniform sampler2D colorTexture;\n\
            in vec2 v_textureCoordinates;\n\
            uniform float snowSpeed;\n\
                    uniform float snowSize;\n\
            float snow(vec2 uv,float scale)\n\
            {\n\
                float time=czm_frameNumber/snowSpeed;\n\
                float w=smoothstep(1.,0.,-uv.y*(scale/10.));if(w<.1)return 0.;\n\
                uv+=time/scale;uv.y+=time*2./scale;uv.x+=sin(uv.y+time*.5)/scale;\n\
                uv*=scale;vec2 s=floor(uv),f=fract(uv),p;float k=3.,d;\n\
                p=.5+.35*sin(11.*fract(sin((s+p+scale)*mat2(7,3,6,5))*5.))-f;d=length(p);k=min(d,k);\n\
                k=smoothstep(0.,k,sin(f.x+f.y)*snowSize);\n\
                return k*w;\n\
            }\n\
            out vec4 vFragColor;\n\
            void main(void){\n\
                vec2 resolution=czm_viewport.zw;\n\
                vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y);\n\
                vec3 finalColor=vec3(0);\n\
                //float c=smoothstep(1.,0.3,clamp(uv.y*.3+.8,0.,.75));\n\
                float c=0.;\n\
                c+=snow(uv,30.)*.0;\n\
                c+=snow(uv,20.)*.0;\n\
                c+=snow(uv,15.)*.0;\n\
                c+=snow(uv,10.);\n\
                c+=snow(uv,8.);\n\
                c+=snow(uv,6.);\n\
                c+=snow(uv,5.);\n\
                finalColor=(vec3(c));\n\
                vFragColor=mix(texture(colorTexture,v_textureCoordinates),vec4(finalColor,1),.5);\n\
                }\n\
                ";
  }
}

/**
 * 雨天效果
 * @param {*} viewer 视图 - 地图viewer
 * @param {Object} options options.tiltAngle 下雨角度
 * @param {Object} options options.rainSize 雨滴大小
 * @param {Object} options options.rainSpeed 雨滴速度
 */
export class Rain {
  constructor(viewer, options = {}) {
    this._viewer = viewer;
    this.tiltAngle = options.tiltAngle || -0.6;
    this.rainSize = options.rainSize || 0.3;
    this.rainSpeed = options.rainSpeed || 60.0;
    this._init();
  }

  _init() {
    this.ranStage = new PostProcessStage({
      name: "czm_rain",
      fragmentShader: this.rain(),
      uniforms: {
        tiltAngle: () => {
          return this.tiltAngle;
        },
        rainSize: () => {
          return this.rainSize;
        },
        rainSpeed: () => {
          return this.rainSpeed;
        },
      },
    });
    this._viewer.scene.postProcessStages.add(this.ranStage);
  }

  destroy() {
    if (!this._viewer || !this.ranStage) return;
    this._viewer.scene.postProcessStages.remove(this.ranStage);
    this.ranStage.destroy();
  }

  show(visible) {
    this.ranStage.enabled = visible;
  }

  rain() {
    return "uniform sampler2D colorTexture;\n\
    in vec2 v_textureCoordinates;\n\
    uniform float tiltAngle;\n\
    uniform float rainSize;\n\
    uniform float rainSpeed;\n\
    float hash(float x) {\n\
        return fract(sin(x * 133.3) * 13.13);\n\
    }\n\
    out vec4 vFragColor;\n\
    void main(void) {\n\
        float time = czm_frameNumber / rainSpeed;\n\
        vec2 resolution = czm_viewport.zw;\n\
        vec2 uv = (gl_FragCoord.xy * 2. - resolution.xy) / min(resolution.x, resolution.y);\n\
        vec3 c = vec3(.6, .7, .8);\n\
        float a = tiltAngle;\n\
        float si = sin(a), co = cos(a);\n\
        uv *= mat2(co, -si, si, co);\n\
        uv *= length(uv + vec2(0, 4.9)) * rainSize + 1.;\n\
        float v = 1. - sin(hash(floor(uv.x * 100.)) * 2.);\n\
        float b = clamp(abs(sin(20. * time * v + uv.y * (5. / (2. + v)))) - .95, 0., 1.) * 20.;\n\
        c *= v * b;\n\
        vFragColor = mix(texture(colorTexture, v_textureCoordinates), vec4(c, 1), .5);\n\
    }\n\
    ";
  }
}

/**
 * 雾天效果
 * @param {*} viewer 视图 - 地图viewer
 * @param {Object} options options.visibility 透明度
 * @param {Object} options options.color 颜色
 * @param {Object} options options.show 显示/隐藏
 */
export class Fog {
  constructor(viewer, options = {}) {
    this._viewer = viewer;
    this.visibility = options.visibility || 0.2;
    this.color = options.color || new Color(0.8, 0.8, 0.8, 0.5);
    this._show = options.show || true;
    this._init();
  }

  _init() {
    this.fogStage = new PostProcessStage({
      name: "czm_fog",
      fragmentShader: this.fog(),
      uniforms: {
        visibility: () => {
          return this.visibility;
        },
        fogColor: () => {
          return this.color;
        },
      },
    });
    this._viewer.scene.postProcessStages.add(this.fogStage);
  }

  destroy() {
    if (!this._viewer || !this.fogStage) return;
    this._viewer.scene.postProcessStages.remove(this.fogStage);
    this.fogStage.destroy();
  }

  show(visible) {
    this._show = visible;
    this.fogStage.enabled = visible;
  }

  fog() {
    return "uniform sampler2D colorTexture;\n\
    uniform sampler2D depthTexture;\n\
    uniform float visibility;\n\
    uniform vec4 fogColor;\n\
    in vec2 v_textureCoordinates; \n\
    out vec4 vFragColor; \n\
    void main(void) \n\
    { \n\
       vec4 origcolor = texture(colorTexture, v_textureCoordinates); \n\
       float depth = czm_readDepth(depthTexture, v_textureCoordinates); \n\
       vec4 depthcolor = texture(depthTexture, v_textureCoordinates); \n\
       float f = visibility * (depthcolor.r - 0.3) / 0.2; \n\
       if (f < 0.0) f = 0.0; \n\
       else if (f > 1.0) f = 1.0; \n\
       vFragColor = mix(origcolor, fogColor, f); \n\
    }\n";
  }
}

/**
 * 颜色反转
 * @param {*} viewer 视图 - 地图viewer
 * @param {Object} options options.invertColor 反转色
 * @param {Object} options options.filterRGB 滤镜值(填充色?)
 * ...
 */
export function modifyMap(viewer, options) {
  const baseLayer = viewer.imageryLayers.get(0);
  //以下几个参数根据实际情况修改,目前我是参照火星科技的参数,个人感觉效果还不错
  baseLayer.brightness = options.brightness || 0.6;
  baseLayer.contrast = options.contrast || 1.8;
  baseLayer.gamma = options.gamma || 0.3;
  baseLayer.hue = options.hue || 1;
  baseLayer.saturation = options.saturation || 0;
  const baseFragShader =
    viewer.scene.globe._surfaceShaderSet.baseFragmentShaderSource.sources;
  for (let i = 0; i < baseFragShader.length; i++) {
    const strS = "color = czm_saturation(color, textureSaturation);\n#endif\n";
    let strT = "color = czm_saturation(color, textureSaturation);\n#endif\n";
    if (options.invertColor) {
      strT += `
    color.r = 1.0 - color.r;
    color.g = 1.0 - color.g;
    color.b = 1.0 - color.b;
    `;
    }
    if (options.filterRGB.length > 0) {
      strT += `
    color.r = color.r * ${options.filterRGB[0]}.0/255.0;
    color.g = color.g * ${options.filterRGB[1]}.0/255.0;
    color.b = color.b * ${options.filterRGB[2]}.0/255.0;
    `;
    }
    baseFragShader[i] = baseFragShader[i].replace(strS, strT);
  }
}

/**
 * 地球自转
 * @param {*} viewer 视图 - 地图viewer
 * @param {Number} speed 自转速度
 * 鹰眼图会导致地球自转有问题 - 未解决
 */
export class EarthRotate {
  constructor(viewer, speed, hawkEyeViewer = null) {
    this._viewer = viewer;
    this.speed = speed || 15;
    this._hawkEyeViewer = hawkEyeViewer;
  }
  // 根据国际天体参考系计算旋转矩阵
  _icrf() {
    if (this._viewer.scene.mode !== SceneMode.SCENE3D) {
      return true;
    }
    const icrfToFixed = Transforms.computeIcrfToFixedMatrix(
      this._viewer.clock.currentTime
    );
    if (icrfToFixed) {
      const camera = this._viewer.camera;
      const offset = Cartesian3.clone(camera.position);
      const transform = Matrix4.fromRotationTranslation(icrfToFixed);
      // 偏移相机, 否则场景会旋转, 而地球不转
      camera.lookAtTransform(transform, offset);
      // if(this._hawkEyeViewer){
      //     const hawkEyeCamera = this._hawkEyeViewer.camera;
      //     hawkEyeCamera.lookAtTransform(transform);
      // }
    }
  }

  // 绑定事件
  _bindEvent() {
    // 转动的速度设置
    this._viewer.clock.multiplier = this.speed * 100;
    // 初始化为单位矩阵
    this._viewer.camera.lookAtTransform(Matrix4.IDENTITY);
    this._viewer.scene.postRender.addEventListener(this._icrf, this);
    // this._hawkEyeViewer && (this._hawkEyeViewer.clock.multiplier = 15);
    // this._hawkEyeViewer && this._hawkEyeViewer.camera.lookAtTransform(Matrix4.IDENTITY);
    // this._hawkEyeViewer && this._hawkEyeViewer.scene.postRender.addEventListener(this._icrf, this);
  }
  start() {
    this._viewer.clock.shouldAnimate = true;
    this._hawkEyeViewer && (this._hawkEyeViewer.clock.shouldAnimate = true);
    this._unbindEvent();
    this._bindEvent();
    return this;
  }
  _unbindEvent() {
    this._viewer.clock.multiplier = 0;
    this._viewer.camera.lookAtTransform(Matrix4.IDENTITY);
    this._viewer.scene.postRender.removeEventListener(this._icrf, this);
    // this._hawkEyeViewer && (this._hawkEyeViewer.clock.multiplier = 0);
    // this._hawkEyeViewer && this._hawkEyeViewer.camera.lookAtTransform(Matrix4.IDENTITY);
    // this._hawkEyeViewer && this._hawkEyeViewer.scene.postRender.removeEventListener(this._icrf, this);
  }

  // 停止旋转
  stop() {
    this._unbindEvent();
    return this;
  }
}

/**
 * 开场动画
 * @param {*} viewer 视图 - 地图viewer
 * @param {Array} position 位置
 * @param {Number} duration 动画时长
 */
export function flyToPosition(viewer, position, duration, hawkEyeMap = null) {
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(
      position.lon,
      position.lat,
      position.height
    ),
    duration: duration,
  });
  if (hawkEyeMap) {
    hawkEyeMap.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        position.lon,
        position.lat,
        position.height
      ),
      duration: duration,
    });
  }
}

/**
 * 昼夜交替
 * @_viewer 视图 - 地图viewer
 */
export function updateLighting(_viewer) {
  // OSM标准风格地图
  const dayLayer = _viewer.imageryLayers.addImageryProvider(
    new UrlTemplateImageryProvider({
      url: "https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      subdomains: ["a", "b", "c", "d"],
    })
  );

  // OSM暗色系地图
  const nightLayer = _viewer.imageryLayers.addImageryProvider(
    new UrlTemplateImageryProvider({
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      subdomains: ["a", "b", "c", "d"],
    })
  );
  // 启用光照
  _viewer.scene.globe.enableLighting = true;
  _viewer.clock.shouldAnimate = true;
  _viewer.clock.multiplier = 5000;
  nightLayer.dayAlpha = 0.0;
}

/**
 * 分屏显示
 * @param {*} viewer 视图 - 地图viewer
 * 有问题 - 未解决
 */
export function splitFn(viewer) {
  // const leftLayer = viewer.imageryLayers.addImageryProvider(
  //     new UrlTemplateImageryProvider({
  //         url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  //         subdomains: ["a", "b", "c", "d"],
  //     })
  // );
  // console.log(leftLayer);
  // leftLayer.splitDirection = 1;
  // console.log(leftLayer);
  // const split = document.getElementById("split");
  // //   viewer.scene.imagerySplitPosition =
  // //     split.offsetLeft / split.parentElement.offsetWidth;
  // //     console.log(viewer.scene.imagerySplitPosition);
  // viewer.scene.imagerySplitPosition = 0.5;
  // const layerLeft = viewer.imageryLayers.addImageryProvider(
  //     new UrlTemplateImageryProvider({
  //         url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  //         subdomains: ["a", "b", "c", "d"],
  //     })
  // );
  // layerLeft.splitDirection = 0.5;
  // viewer.scene.imagerySplitPosition = 1
  //   // 创建左侧图像图层
  //   const layerLeft = viewer.imageryLayers.addImageryProvider(
  //     new UrlTemplateImageryProvider({
  //       url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  //       subdomains: ["a", "b", "c", "d"],
  //     })
  //   );
  //   // 创建右侧图像图层
  //   const layerRight = viewer.imageryLayers.addImageryProvider(
  //     new UrlTemplateImageryProvider({
  //         url : 'https://programs.communications.gov.au/geoserver/ows?tiled=true&' +
  //          'transparent=true&format=image%2Fpng&exceptions=application%2Fvnd.ogc.se_xml&' +
  //          'styles=&service=WMS&version=1.1.1&request=GetMap&' +
  //          'layers=public%3AMyBroadband_Availability&srs=EPSG%3A3857&' +
  //          'bbox={westProjected}%2C{southProjected}%2C{eastProjected}%2C{northProjected}&' +
  //          'width=256&height=256',
  //    rectangle : Rectangle.fromDegrees(96.799393, -43.598214999057824, 153.63925700000001, -9.2159219997013)
  //     })
  //   );
  //   // 设置视图的图像分割位置为右侧（0.5），即图层分割线位于屏幕中央
  //   viewer.scene.imagerySplitPosition = 0.5;
}

/**
 * 地图反选遮罩
 * @param {*} viewer 视图 - 地图viewer
 * @param {Object} GeoJSON 单面GeoJSON数据
 */
export function addPolygonMark(viewer, GeoJSON) {
  const positionArray = [];
  const features = GeoJSON.features;
  features.forEach((feature) => {
    feature.geometry.coordinates.forEach((coordinate) => {
      coordinate.forEach((point) => {
        positionArray.push(point[0], point[1]);
      });
    });
  });
  //   console.log(positionArray);
  let polygonEntity = new Entity({
    polygon: {
      hierarchy: {
        // 添加外部区域为1/4半圆，设置为180会报错
        positions: Cartesian3.fromDegreesArray([
          0.1, 89.64, 0.1, -89.64, 179.64, 0.1, -179.64, -0.1, -0.1, -89.64,
          -0.1, 89.64, -179.64, -0.1, 179.64, 0.1,
        ]),
        // 1, 89,
        // 1, -89,
        // 179, -1,
        // 179, -1,
        // -1, -89,
        // -1, 89,
        // -179, 1,
        // -179, 1,
        // 中心挖空的“洞”
        holes: [
          {
            positions: Cartesian3.fromDegreesArray(positionArray),
          },
        ],
      },
      material: new Color(15 / 255.0, 38 / 255.0, 84 / 255.0, 0.7),
    },
  });

  let lineEntity = new Entity({
    polyline: {
      positions: Cartesian3.fromDegreesArray(positionArray),
      width: 5,
      material: Color.YELLOW,
    },
  });

  viewer.entities.add(polygonEntity);
  viewer.entities.add(lineEntity);
  viewer.flyTo(lineEntity);
}

/**
 * 自定义天空盒
 * @param {*} viewer 视图 - 地图viewer
 */
export function addSkyBox(viewer, image) {
  const groundSkyBox = new SkyBox({
    sources: {
      negativeX: image.negativeX,
      positiveX: image.positiveX,
      negativeY: image.negativeY,
      positiveY: image.positiveY,
      negativeZ: image.negativeZ,
      positiveZ: image.positiveZ,
    },
  });
  const defaultSkyBox = viewer.scene.skyBox;

  viewer.scene.preUpdate.addEventListener(() => {
    const position = viewer.scene.camera.position;
    const cameraHeight = Cartographic.fromCartesian(position).height;
    if (cameraHeight < 2400000) {
      viewer.scene.skyBox = groundSkyBox;
      viewer.scene.skyAtmosphere.show = false;
    } else {
      viewer.scene.skyBox = defaultSkyBox;
      viewer.scene.skyAtmosphere.show = true;
    }
  });
}

/**
 * primitive方式加载GeoJSON
 * @param {*} viewer 视图 - 地图viewer
 * @param {Object} GeoJSON 单面GeoJSON数据
 */
export function addGeoJSON(viewer, GeoJSON) {
  const instances = [];
  const features = GeoJSON.features;
  features.forEach((feature) => {
    feature.geometry.coordinates.forEach((coordinate) => {
      const pointArr = [];
      coordinate.forEach((point) => {
        pointArr.push(point[0], point[1]);
      });
      const polygon = new PolygonGeometry({
        polygonHierarchy: new PolygonHierarchy(
          Cartesian3.fromDegreesArray(pointArr)
        ),
        extrudedHeight: 35000,
      });
      const geometry = PolygonGeometry.createGeometry(polygon);
      instances.push(
        new GeometryInstance({
          geometry: geometry,
          attributes: {
            color: ColorGeometryInstanceAttribute.fromColor(Color.GREEN),
          },
        })
      );
    });
  });
  // 合并单个geometry
  const primitive = new Primitive({
    geometryInstances: instances,
    appearance: new PerInstanceColorAppearance(),
    asynchronous: false,
  });
  viewer.scene.primitives.add(primitive);
}

/**
 * 旋转圆盘
 * @param {*} viewer 视图 - 地图viewer
 * @returns {Function} 返回清除函数
 */
export function rotateCircle(viewer) {
  const ellipseRotate = viewer.entities.add({
    position: Cartesian3.fromDegrees(116.46, 39.92),
    id: "ellipseRotate",
    ellipse: {
      semiMinorAxis: 100000.0,
      semiMajorAxis: 200000.0,
      material: Color.RED.withAlpha(0.5),
      // rotation: Math.PI / 4.0,
      // stRotation: Math.PI / 4.0,
    },
  });

  function rotateEntity(instance, _rotation, _amount) {
    instance.rotation = new CallbackProperty(function () {
      _rotation += _amount;
      if (_rotation >= 360 || _rotation <= -360) {
        _rotation = 0;
      }
      return CesiumMath.toRadians(_rotation);
    }, false);
  }

  rotateEntity(ellipseRotate.ellipse, 0, 1);
  return () => {
    viewer.entities.remove(ellipseRotate);
  };
}

/**
 * 点击查看信息
 */
// export function clickSearch(_viewer) {
//   let handler = new ScreenSpaceEventHandler(_viewer.scene.canvas);
//   handler.setInputAction((event) => {
//     let pick = _viewer.scene.pick(event.position);
//     if (defined(pick)) {
//       const infobox = new InfoBox("info-box");
//       var entity = _viewer.entities.add({
//         position: Cartesian3.fromDegrees(116, 39, 0),
//         name: "My Entity",
//         description: "This is my entity description.",
//       });
//       entity.description = '<h3>Custom Infobox</h3><p>This is a custom infobox.</p>';
//         // infobox.viewModel.infoBox = entity;
//         _viewer.selectedEntity = entity;
//     }
//   }, ScreenSpaceEventType.LEFT_CLICK);
// }

/**
 * 道路穿梭
 * @param {*} viewer 视图 - 地图viewer
 * @param {Object} roadData 道路数据
 * @param {*} lineImage 线路图片
 */
export function roadShuttle(viewer, roadData, lineImage) {
  // 道路穿梭线
  GeoJsonDataSource.load(roadData).then(function (dataSource) {
    viewer.dataSources.add(dataSource);
    const entities = dataSource.entities.values;
    for (let i = 0; i < entities.length; i++) {
      let entity = entities[i];
      entity.polyline.width = 5;
      entity.polyline.material = new Spriteline1MaterialProperty(
        1000,
        lineImage
      );
    }
  });
  /**
   *  精灵穿梭路光效果，
   *  参考gitee开源
   *  entity的材质使用MaterialProperty,而primitive使用的是material。
   *  @Data：2022-01-11
   */

  function Spriteline1MaterialProperty(duration, image) {
    this._definitionChanged = new Event();
    this.duration = duration;
    this.image = image;
    this._time = performance.now();
  }
  Object.defineProperties(Spriteline1MaterialProperty.prototype, {
    isConstant: {
      get: function () {
        return false;
      },
    },
    definitionChanged: {
      get: function () {
        return this._definitionChanged;
      },
    },
    color: createPropertyDescriptor("color"),
    duration: createPropertyDescriptor("duration"),
  });
  Spriteline1MaterialProperty.prototype.getType = function (time) {
    return "Spriteline1";
  };
  Spriteline1MaterialProperty.prototype.getValue = function (time, result) {
    if (!defined(result)) {
      result = {};
    }
    result.image = this.image;
    result.time =
      ((performance.now() - this._time) % this.duration) / this.duration;
    return result;
  };
  Spriteline1MaterialProperty.prototype.equals = function (e) {
    return (
      this === e ||
      (e instanceof Spriteline1MaterialProperty && this.duration === e.duration)
    );
  };
  Material.Spriteline1Type = "Spriteline1";
  Material.Spriteline1Source = `
czm_material czm_getMaterial(czm_materialInput materialInput)
{
czm_material material = czm_getDefaultMaterial(materialInput);
vec2 st = materialInput.st;
vec4 colorImage = texture(image, vec2(fract(st.s - time), st.t));
material.alpha = colorImage.a;
material.diffuse = colorImage.rgb * 1.5 ;
return material;
}
`;
  // st :二维纹理坐标
  // czm_material：保存可用于照明的材质信息
  Material._materialCache.addMaterial(Material.Spriteline1Type, {
    fabric: {
      type: Material.Spriteline1Type,
      uniforms: {
        color: new Color(1, 0, 0, 0.5),
        image: "",
        transparent: true,
        time: 20,
      },
      source: Material.Spriteline1Source,
    },
    translucent: function (material) {
      return true;
    },
  });
}

/**
 * 道路闪烁
 * @param {*} viewer 视图 - 地图viewer
 * @param {Object} roadData 道路数据
 * @param {Object} options options.color 闪烁颜色
 * @param {Object} options options.speed 闪烁速度 数值越大, 闪烁越快
 */
export function roadFlicker(viewer, roadData, options = {}) {
  /*
   * @Description: 闪烁线材质
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-03-30 16:40:09
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-30 17:22:04
   */
  class LineFlickerMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this._speed = undefined;
      this.color = options.color;
      this.speed = options.speed;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.LineFlickerMaterialType;
    }

    getValue(time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      result.speed = Property.getValueOrDefault(
        this._speed,
        time,
        5.0,
        result.speed
      );
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof LineFlickerMaterialProperty &&
          Property.equals(this._color, other._color) &&
          Property.equals(this._speed, other._speed))
      );
    }
  }

  Object.defineProperties(LineFlickerMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
    speed: createPropertyDescriptor("speed"),
  });

  //   LineFlickerMaterialProperty = LineFlickerMaterialProperty;
  Material.LineFlickerMaterialProperty = "LineFlickerMaterialProperty";
  Material.LineFlickerMaterialType = "LineFlickerMaterialType";
  Material.LineFlickerMaterialSource = `
uniform vec4 color;
uniform float speed;
czm_material czm_getMaterial(czm_materialInput materialInput){
  czm_material material = czm_getDefaultMaterial(materialInput);
  float time = fract( czm_frameNumber  *  speed / 1000.0);
  vec2 st = materialInput.st;
  float scalar = smoothstep(0.0,1.0,time);
  material.diffuse = color.rgb * scalar;
  material.alpha = color.a * scalar ;
  return material;
}
`;

  Material._materialCache.addMaterial(Material.LineFlickerMaterialType, {
    fabric: {
      type: Material.LineFlickerMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
        speed: 5.0,
      },
      source: Material.LineFlickerMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });
  GeoJsonDataSource.load(roadData).then(function (dataSource) {
    viewer.dataSources.add(dataSource);
    const entities = dataSource.entities.values;
    // 聚焦
    viewer.zoomTo(entities);
    for (let i = 0; i < entities.length; i++) {
      let entity = entities[i];
      entity.polyline.width = 3.0;
      // 设置材质
      entity.polyline.material = new LineFlickerMaterialProperty({
        color: options.color || Color.YELLOW,
        // 设置随机变化速度
        speed: options.speed || 20 * Math.random(),
      });
    }
  });
}

/*
 * @Description: 飞线效果（参考开源代码）
 * @Version: 1.0
 * @Author: Julian
 * @Date: 2022-03-05 16:13:21
 * @LastEditors: Julian
 * @LastEditTime: 2022-03-05 17:39:38
 */
class LineFlowMaterialProperty {
  constructor(options) {
    this._definitionChanged = new Event();
    this._color = undefined;
    this._speed = undefined;
    this._percent = undefined;
    this._gradient = undefined;
    this.color = options.color;
    this.speed = options.speed;
    this.percent = options.percent;
    this.gradient = options.gradient;
  }

  get isConstant() {
    return false;
  }

  get definitionChanged() {
    return this._definitionChanged;
  }

  getType(time) {
    return Material.LineFlowMaterialType;
  }

  getValue(time, result) {
    if (!defined(result)) {
      result = {};
    }

    result.color = Property.getValueOrDefault(
      this._color,
      time,
      Color.RED,
      result.color
    );
    result.speed = Property.getValueOrDefault(
      this._speed,
      time,
      5.0,
      result.speed
    );
    result.percent = Property.getValueOrDefault(
      this._percent,
      time,
      0.1,
      result.percent
    );
    result.gradient = Property.getValueOrDefault(
      this._gradient,
      time,
      0.01,
      result.gradient
    );
    return result;
  }

  equals(other) {
    return (
      this === other ||
      (other instanceof LineFlowMaterialProperty &&
        Property.equals(this._color, other._color) &&
        Property.equals(this._speed, other._speed) &&
        Property.equals(this._percent, other._percent) &&
        Property.equals(this._gradient, other._gradient))
    );
  }
}

Object.defineProperties(LineFlowMaterialProperty.prototype, {
  color: createPropertyDescriptor("color"),
  speed: createPropertyDescriptor("speed"),
  percent: createPropertyDescriptor("percent"),
  gradient: createPropertyDescriptor("gradient"),
});

// LineFlowMaterialProperty = LineFlowMaterialProperty;
Material.LineFlowMaterialProperty = "LineFlowMaterialProperty";
Material.LineFlowMaterialType = "LineFlowMaterialType";
Material.LineFlowMaterialSource = `
    uniform vec4 color;
    uniform float speed;
    uniform float percent;
    uniform float gradient;
    
    czm_material czm_getMaterial(czm_materialInput materialInput){
      czm_material material = czm_getDefaultMaterial(materialInput);
      vec2 st = materialInput.st;
      float t =fract(czm_frameNumber * speed / 1000.0);
      t *= (1.0 + percent);
      float alpha = smoothstep(t- percent, t, st.s) * step(-t, -st.s);
      alpha += gradient;
      material.diffuse = color.rgb;
      material.alpha = alpha;
      return material;
    }
    `;

Material._materialCache.addMaterial(Material.LineFlowMaterialType, {
  fabric: {
    type: Material.LineFlowMaterialType,
    uniforms: {
      color: new Color(1.0, 0.0, 0.0, 1.0),
      speed: 10.0,
      percent: 0.1,
      gradient: 0.01,
    },
    source: Material.LineFlowMaterialSource,
  },
  translucent: function (material) {
    return true;
  },
});

/**
 * 竖直随机飞线
 * @param {*} viewer 视图 - 地图viewer
 * @param {Array} center 飞线中心点
 * @param {Number} num 飞线数量
 * @param {Object} options options.color 飞线颜色
 * @param {Object} options options.speed 飞线速度
 * @param {Object} options options.width 飞线宽度
 * @param {Object} options options.range 飞线范围
 * @returns {Function} 返回清除函数
 */
export function verticalRandomFlyLine(viewer, center, num, options = {}) {
  const range = options.range || 0.06;
  // 随机点  位置
  function generateRandomPosition(position, num) {
    const list = [];
    for (let i = 0; i < num; i++) {
      const lon = position[0] + Math.random() * range;
      const lat = position[1] + Math.random() * range;
      list.push([lon, lat]);
    }
    return list;
  }
  const flyList = [];
  let _positions = generateRandomPosition(center, num);
  _positions.forEach((item) => {
    let start_lon = item[0];
    let start_lat = item[1];
    let startPoint = new Cartesian3.fromDegrees(start_lon, start_lat, 0);

    // 随机高度
    const height = 5000 * Math.random();
    const endPoint = new Cartesian3.fromDegrees(start_lon, start_lat, height);
    const linePositions = [];
    linePositions.push(startPoint);
    linePositions.push(endPoint);
    const flyItem = viewer.entities.add({
      polyline: {
        positions: linePositions,
        material: new LineFlowMaterialProperty({
          color: options.color || Color.RED,
          speed: 15 * Math.random(),
          percent: 1,
          gradient: 0.01,
        }),
        width: options.width || 2,
        // material: Color.RED,
      },
    });
    flyList.push(flyItem);
  });
  return () => {
    flyList.forEach((item) => {
      viewer.entities.remove(item);
    });
  };
}

/**
 * 抛物流动飞线
 * @param {*} viewer 视图 - 地图viewer
 * @param {Number} num 每条线上的飞线数量
 * @param {Object} options options.center 飞线中心点
 * @param {Object} options options.points { Array[[lng, lat], ...] } 其他集合
 * @param {Object} options options.flyLineColor 飞线颜色
 * @param {Object} options options.lineColor 轨迹线颜色  要加透明度
 * @returns {Function} 返回清除函数
 */
export function parabolaFlowInit(viewer, num, options = {}) {
  function parabola(startPosition, endPosition, height = 0, count = 50) {
    //方程 y=-(4h/L^2)*x^2+h h:顶点高度 L：横纵间距较大者
    let result = [];
    height = Math.max(+height, 100);
    count = Math.max(+count, 50);
    let diffLon = Math.abs(startPosition[0] - endPosition[0]);
    let diffLat = Math.abs(startPosition[1] - endPosition[1]);
    let L = Math.max(diffLon, diffLat);
    let dlt = L / count;
    if (diffLon > diffLat) {
      //base on lon
      let delLat = (endPosition[1] - startPosition[1]) / count;
      if (startPosition[0] - endPosition[0] > 0) {
        dlt = -dlt;
      }
      for (let i = 0; i < count; i++) {
        let h =
          height -
          (Math.pow(-0.5 * L + Math.abs(dlt) * i, 2) * 4 * height) /
            Math.pow(L, 2);
        let lon = startPosition[0] + dlt * i;
        let lat = startPosition[1] + delLat * i;
        let point = new Cartesian3.fromDegrees(lon, lat, h);
        result.push(point);
      }
    } else {
      //base on lat
      let delLon = (endPosition[0] - startPosition[0]) / count;
      if (startPosition[1] - endPosition[1] > 0) {
        dlt = -dlt;
      }
      for (let i = 0; i < count; i++) {
        let h =
          height -
          (Math.pow(-0.5 * L + Math.abs(dlt) * i, 2) * 4 * height) /
            Math.pow(L, 2);
        let lon = startPosition[0] + delLon * i;
        let lat = startPosition[1] + dlt * i;
        let point = new Cartesian3.fromDegrees(lon, lat, h * 2);
        result.push(point);
      }
    }
    return result;
  }

  let _center = options.center || [113.9236839, 22.528061];
  let _positions = options.points || [
    [113.8236839, 22.528061],
    [114.0236839, 22.528061],
    [113.9236839, 22.428061],
    [113.9236839, 22.628061],
    [113.8236839, 22.428061],
    [114.0236839, 22.628061],
    [113.8236839, 22.628061],
    [114.0236839, 22.428061],
  ];
  const list = [];
  _positions.forEach((item) => {
    let _siglePositions = parabola(_center, item, 5000);
    // 创建飞线
    for (let i = 0; i < num; i++) {
      const line = viewer.entities.add({
        polyline: {
          positions: _siglePositions,
          material: new LineFlowMaterialProperty({
            color: options.flyLineColor || new Color(1.0, 1.0, 0.0, 0.8),
            speed: 15 * Math.random(),
            percent: 0.1,
            gradient: 0.01,
          }),
        },
      });
      list.push(line);
    }
    // 创建轨迹线
    const trackLine = viewer.entities.add({
      polyline: {
        positions: _siglePositions,
        material: options.lineColor || new Color(1.0, 1.0, 0.0, 0.2),
      },
    });
    list.push(trackLine);
  });
  return () => {
    list.forEach((item) => {
      viewer.entities.remove(item);
    });
  };
}

/**
 * GeoJSON立体拉伸
 * @param {*} viewer 视图 - 地图viewer
 * @param {Object} GeoJSON GeoJSON数据
 * @param { Number } height 拉伸高度
 */
export function polygonStretch(viewer, GeoJSON, height) {
  GeoJsonDataSource.load(GeoJSON).then(function (dataSource) {
    viewer.dataSources.add(dataSource);
    let entities = dataSource.entities.values;
    for (let i = 0; i < entities.length; i++) {
      let entity = entities[i];
      entity.polygon.material = new Color(204 / 255, 247 / 255, 217 / 255, 0.6);
      entity.polygon.outline = false;
      // 将高度拉伸至35米
      entity.polygon.extrudedHeight = height || 35000;
    }
  });
}

/**
 * 六边形
 * @param {*} viewer 视图 - 地图viewer
 * @param {String} id { String } 六边形id
 * HexagonSpread.add(position, color, maxRadius, duration, isedit = false) 添加六边形
 * @param {Array} position { Array } 六边形中心点坐标
 * @param {String} color { String } 六边形颜色
 * @param { Number } maxRadius 六边形最大半径
 * @param { Number } duration 六边形动画时间
 * @param { Boolean } isedit 是否可编辑
 *
 * 未完成, 不显示
 */
export function hexagon(viewer, id) {
  class Effect {
    constructor(viewer, id) {
      this.viewer = viewer;
      this.id = id;
      this.duration = 1000;
      this.maxRadius = 1000;
      this.pointDraged = null;
      this.leftDownFlag = false;
    }
    change_duration(d) {
      this.duration = d;
    }
    change_color(val) {
      const curEntity = this.viewer.entities.getById(this.id);
      curEntity._ellipse._material.color = new Color.fromCssColorString(val);
    }
    change_position(p) {
      const cartesian3 = Cartesian3.fromDegrees(
        parseFloat(p[0]),
        parseFloat(p[1]),
        parseFloat(p[2])
      );
      const curEntity = this.viewer.entities.getById(this.id);
      curEntity.position = cartesian3;
    }
    del() {
      this.viewer.entities.removeById(this.id);
    }
    add(position, color, maxRadius, duration, isEdit = false) {
      const _this = this;
      this.duration = duration;
      this.maxRadius = maxRadius;
      if (!isEdit) {
        return;
      }

      function leftDownAction(e) {
        _this.pointDraged = _this.viewer.scene.pick(e.position); // 选取当前的entity
        if (
          _this.pointDraged &&
          _this.pointDraged.id &&
          _this.pointDraged.id.id === _this.id
        ) {
          _this.leftDownFlag = true;
          _this.viewer.scene.screenSpaceCameraController.enableRotate = false; // 锁定相机
        }
      }

      function leftUpAction(e) {
        _this.leftDownFlag = false;
        _this.pointDraged = null;
        _this.viewer.scene.screenSpaceCameraController.enableRotate = true; // 解锁相机
      }

      function mouseMoveAction(e) {
        if (
          _this.leftDownFlag === true &&
          _this.pointDraged !== null &&
          _this.pointDraged !== undefined
        ) {
          const ray = _this.viewer.camera.getPickRay(e.endPosition);
          const cartesian = _this.viewer.scene.globe.pick(
            ray,
            _this.viewer.scene
          );
          _this.pointDraged.id.position = cartesian; // 此处根据具体entity来处理，也可能是pointDraged.id.position=cartesian;
          // 这里笛卡尔坐标转 经纬度
          const ellipsoid = _this.viewer.scene.globe.ellipsoid;
          const cartographic = ellipsoid.cartesianToCartographic(cartesian);
          const lat = CesiumMath.toDegrees(cartographic.latitude);
          const lng = CesiumMath.toDegrees(cartographic.longitude);
          let alt = cartographic.height;
          alt = alt < 0 ? 0 : alt;
          if (_this.update_position) {
            _this.update_position([lng.toFixed(8), lat.toFixed(8), alt]);
          }
        }
      }
      this.viewer.screenSpaceEventHandler.setInputAction(
        leftDownAction,
        ScreenSpaceEventType.LEFT_DOWN
      );
      this.viewer.screenSpaceEventHandler.setInputAction(
        leftUpAction,
        ScreenSpaceEventType.LEFT_UP
      );
      this.viewer.screenSpaceEventHandler.setInputAction(
        mouseMoveAction,
        ScreenSpaceEventType.MOUSE_MOVE
      );
    }
  }

  /**
   * 六边形扩散材质
   * @date:2022-01-12
   */
  function HexagonSpreadMaterialProperty(color) {
    this._definitionChanged = new Event();
    this._color = undefined;
    this._colorSubscription = undefined;
    this.color = color;
    this._time = new Date().getTime();
  }
  Object.defineProperties(HexagonSpreadMaterialProperty.prototype, {
    isConstant: {
      get: function () {
        return false;
      },
    },
    definitionChanged: {
      get: function () {
        return this._definitionChanged;
      },
    },
    color: createPropertyDescriptor("color"),
  });
  HexagonSpreadMaterialProperty.prototype.getType = function (_time) {
    return Material.HexagonSpreadMaterialType;
  };
  HexagonSpreadMaterialProperty.prototype.getValue = function (time, result) {
    if (!defined(result)) {
      result = {};
    }
    result.color = Property.getValueOrClonedDefault(
      this._color,
      time,
      Color.WHITE,
      result.color
    );
    result.image = Material.HexagonSpreadMaterialImage;
    return result;
  };
  HexagonSpreadMaterialProperty.prototype.equals = function (other) {
    const reData =
      this === other ||
      (other instanceof HexagonSpreadMaterialProperty &&
        Property.equals(this._color, other._color));
    return reData;
  };
  //   HexagonSpreadMaterialProperty = HexagonSpreadMaterialProperty;
  Material.HexagonSpreadMaterialType = "HexagonSpreadMaterial";
  // 缺少图片
  Material.HexagonSpreadMaterialImage = "img/OIP.jpg";
  Material.HexagonSpreadSource = `
  czm_material czm_getMaterial(czm_materialInput materialInput)
  {
       czm_material material = czm_getDefaultMaterial(materialInput);
       vec2 st = materialInput.st;
       vec4 colorImage = texture(image,  vec2(st));
       material.alpha = colorImage.a * color.a * 0.5;
       material.diffuse =  1.8 * color.rgb  ;
       return material;
   }
   `;
  Material._materialCache.addMaterial(Material.HexagonSpreadMaterialType, {
    fabric: {
      type: Material.HexagonSpreadMaterialType,
      uniforms: {
        color: new Color(1, 0, 0, 0.5),
        image: Material.HexagonSpreadMaterialImage,
      },
      source: Material.HexagonSpreadSource,
    },
    translucent: function (material) {
      return true;
    },
  });

  // 六边形扩散效果
  class HexagonSpread extends Effect {
    constructor(viewer, id) {
      super(viewer, id);
    }
    add(position, color, maxRadius, duration, isedit = false) {
      super.add(position, color, maxRadius, duration, isedit);
      const _this = this;
      let currentRadius = 1;
      this.viewer.entities.add({
        id: _this.id,
        position: Cartesian3.fromDegrees(position[0], position[1], position[2]),
        ellipse: {
          semiMajorAxis: new CallbackProperty(function (n) {
            currentRadius += (1000 / _this.duration) * 50;
            if (currentRadius > _this.maxRadius) {
              currentRadius = 1;
            }
            return currentRadius;
          }, false),
          semiMinorAxis: new CallbackProperty(function (n) {
            return currentRadius;
          }, false),
          material: new HexagonSpreadMaterialProperty(
            new Color.fromCssColorString(color)
          ),
        },
      });
    }
  }

  return new HexagonSpread(viewer, id);
}

/**
 * 动态水面
 * 只能加载单面, 不包含挖洞
 * @param {*} viewer 视图 - 地图viewer
 * @param {Array} GeoJSON 面数据
 * @param {*} image 水面图片
 * @returns {Function} 返回清除函数
 */
export function dynamicWaterSurface(viewer, GeoJSON, image) {
  const positions = [];
  GeoJSON.features.forEach((feature) => {
    feature.geometry.coordinates.forEach((coordinate) => {
      coordinate.forEach((point) => {
        if (point[0] instanceof Array) {
          point.forEach((p) => {
            positions.push(Cartesian3.fromDegrees(...p));
          });
        } else {
          positions.push(Cartesian3.fromDegrees(...point));
        }
      });
    });
  });
  // 创建多边形的几何体
  var polygonGeometry = new PolygonGeometry({
    polygonHierarchy: new PolygonHierarchy(positions),
    // 其他几何属性的配置...
  });
  // 流动水面效果
  const water = viewer.scene.primitives.add(
    new Primitive({
      geometryInstances: new GeometryInstance({
        // geometry: new RectangleGeometry({
        //   rectangle: Rectangle.fromDegrees(...pointArr),
        //   vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
        // }),
        geometry: polygonGeometry,
      }),
      appearance: new EllipsoidSurfaceAppearance({
        material: new Material({
          fabric: {
            type: "Water",
            uniforms: {
              baseWaterColor: new Color(
                64 / 255.0,
                157 / 255.0,
                253 / 255.0,
                0.5
              ),
              normalMap: image,
              frequency: 1000.0,
              animationSpeed: 0.1,
              amplitude: 10,
              specularIntensity: 10,
            },
          },
        }),
      }),
    })
  );
  return () => {
    viewer.scene.primitives.remove(water);
  };
}

/**
 * 绘制墙体
 * @param {*} viewer 视图 - 地图viewer
 * @param {String} id 墙体id
 * @param {Object} GeoJSON GeoJSON数据
 * @returns {Function} 返回清除函数
 */
export function drawWall(viewer, GeoJSON, id) {
  const instances = [];
  GeoJSON.features.forEach((feature) => {
    feature.geometry.coordinates.forEach((coordinate) => {
      const polygon = [];
      coordinate.forEach((point) => {
        if (point[0] instanceof Array) {
          point.forEach((p) => {
            polygon.push(...p);
          });
        } else {
          polygon.push(...point);
        }
      });
      const geometry = new WallGeometry({
        positions: Cartesian3.fromDegreesArray(polygon),
        maximumHeights: new Array(polygon.length / 2).fill(50000),
        minimumHeights: new Array(polygon.length / 2).fill(0),
      });
      instances.push(
        new GeometryInstance({
          id: id,
          geometry: geometry,
          attributes: {
            color: ColorGeometryInstanceAttribute.fromColor(Color.GREEN),
          },
        })
      );
    });
  });

  const primitive = new Primitive({
    geometryInstances: instances,
    appearance: new PerInstanceColorAppearance(),
    asynchronous: false,
  });
  const wall = viewer.scene.primitives.add(primitive);
  return () => {
    viewer.scene.primitives.remove(wall);
  };
}

// Polygon面转points数组
function polygonToPoints(GeoJSON) {
  const instances = [];
  GeoJSON.features.forEach((feature) => {
    feature.geometry.coordinates.forEach((coordinate) => {
      coordinate.forEach((point) => {
        if (point[0] instanceof Array) {
          point.forEach((p) => {
            instances.push(...p);
          });
        } else {
          instances.push(...point);
        }
      });
    });
  });
  return instances;
}
/**
 * 动态立体墙
 * @param {*} viewer 视图 - 地图viewer
 * @param {Object} GeoJSON GeoJSON数据
 * @param {Object} options 配置项
 * @returns {Function} 返回清除函数
 */
export function dynamicWall(viewer, GeoJSON, options) {
  const instances = polygonToPoints(GeoJSON);
  const materialObj = {
    color: Color.fromBytes(55, 96, 56).withAlpha(0.5),
    duration: 3000,
  };
  options = Object.assign(materialObj, options);
  const wall = viewer.entities.add({
    name: "立体墙效果",
    wall: {
      // positions: instances,
      positions: Cartesian3.fromDegreesArray(instances),
      // 设置高度
      maximumHeights: new Array(instances.length / 2).fill(50000),
      minimumHeights: new Array(instances.length / 2).fill(0),

      material: wallDiyMaterial(options),
    },
  });
  return () => {
    viewer.entities.remove(wall);
  };
}
//动态墙材质
function wallDiyMaterial(options) {
  /**
   * @description:动态立体墙材质
   * @date: 2022-02-11
   */

  //动态墙材质
  function DynamicWallMaterialProperty(options) {
    // 默认参数设置
    this._definitionChanged = new Event();
    this._color = undefined;
    this._colorSubscription = undefined;
    this.color = options.color;
    this.duration = options.duration;
    this.trailImage = options.trailImage;
    this._time = new Date().getTime();
  }
  Object.defineProperties(DynamicWallMaterialProperty.prototype, {
    isConstant: {
      get: function () {
        return false;
      },
    },
    definitionChanged: {
      get: function () {
        return this._definitionChanged;
      },
    },
    color: createPropertyDescriptor("color"),
  });
  DynamicWallMaterialProperty.prototype.getType = function (time) {
    return "DynamicWall";
  };
  DynamicWallMaterialProperty.prototype.getValue = function (time, result) {
    if (!defined(result)) {
      result = {};
    }
    result.color = Property.getValueOrClonedDefault(
      this._color,
      time,
      Color.WHITE,
      result.color
    );
    if (this.trailImage) {
      result.image = this.trailImage;
    } else {
      result.image = Material.DynamicWallImage;
    }

    if (this.duration) {
      result.time =
        ((new Date().getTime() - this._time) % this.duration) / this.duration;
    }
    this.viewer.scene.requestRender();
    return result;
  };
  DynamicWallMaterialProperty.prototype.equals = function (other) {
    return (
      this === other ||
      (other instanceof DynamicWallMaterialProperty &&
        Property.equals(this._color, other._color))
    );
  };
  Material.DynamicWallType = "DynamicWall";
  Material.DynamicWallImage = "img/wall.png";
  Material.DynamicWallSource =
    "czm_material czm_getMaterial(czm_materialInput materialInput)\n\
                                                {\n\
                                                czm_material material = czm_getDefaultMaterial(materialInput);\n\
                                                vec2 st = materialInput.st;\n\
                                                vec4 colorImage = texture(image, vec2(fract(st.t - time), st.t));\n\
                                                vec4 fragColor;\n\
                                                fragColor.rgb = color.rgb / 1.0;\n\
                                                fragColor = czm_gammaCorrect(fragColor);\n\
                                                material.alpha = colorImage.a * color.a;\n\
                                                material.diffuse = color.rgb;\n\
                                                material.emission = fragColor.rgb;\n\
                                                return material;\n\
                                                }";
  Material._materialCache.addMaterial(Material.DynamicWallType, {
    fabric: {
      type: Material.DynamicWallType,
      uniforms: {
        color: new Color(1.0, 1.0, 1.0, 1),
        image: Material.DynamicWallImage,
        time: 0,
      },
      source: Material.DynamicWallSource,
    },
    translucent: function (material) {
      return true;
    },
  });

  return new DynamicWallMaterialProperty(options);
}

/**
 * 动态流动墙
 * @param {*} viewer 视图 - 地图viewer
 * @param {Object} GeoJSON GeoJSON数据
 * @returns {Function} 返回清除函数
 * @param {Object} options 配置项
 */
export function trailLineWall(viewer, GeoJSON, options) {
  const instances = polygonToPoints(GeoJSON);

  const materialObj = {
    color: Color.fromBytes(55, 96, 56).withAlpha(0.5),
    duration: 3000,
  };
  options = Object.assign(materialObj, options);
  const wall = viewer.entities.add({
    name: "流动墙效果",
    wall: {
      positions: Cartesian3.fromDegreesArray(instances),
      // 设置高度
      maximumHeights: new Array(instances.length / 2).fill(50000),
      minimumHeights: new Array(instances.length / 2).fill(0),
      material: TrailLineMaterial(options),
    },
  });
  return () => {
    viewer.entities.remove(wall);
  };
}
// 动态流动墙材质
function TrailLineMaterial(options) {
  //流动墙材质
  function TrailLineMaterialProperty(options) {
    // 默认参数设置
    this._definitionChanged = new Event();
    this._color = undefined;
    this._colorSubscription = undefined;
    this.color = options.color;
    this.duration = options.duration;
    this._time = new Date().getTime();
  }
  Object.defineProperties(TrailLineMaterialProperty.prototype, {
    isConstant: {
      get: function () {
        return false;
      },
    },
    definitionChanged: {
      get: function () {
        return this._definitionChanged;
      },
    },
    color: createPropertyDescriptor("color"),
  });
  TrailLineMaterialProperty.prototype.getType = function (time) {
    return "TrailLine";
  };
  TrailLineMaterialProperty.prototype.getValue = function (time, result) {
    if (!defined(result)) {
      result = {};
    }
    result.color = Property.getValueOrClonedDefault(
      this._color,
      time,
      Color.WHITE,
      result.color
    );

    if (this.duration) {
      result.time =
        ((new Date().getTime() - this._time) % this.duration) / this.duration;
    }
    this.viewer.scene.requestRender();
    return result;
  };
  TrailLineMaterialProperty.prototype.equals = function (other) {
    return (
      this === other ||
      (other instanceof TrailLineMaterialProperty &&
        Property.equals(this._color, other._color))
    );
  };
  Material.TrailLineType = "TrailLine";
  Material.TrailLineImage = "img/wall.png";
  Material.TrailLineSource =
    "czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
     czm_material material = czm_getDefaultMaterial(materialInput);\n\
     vec2 st = materialInput.st;\n\
     vec4 colorImage = texture(image, vec2(fract(st.s - time), st.t));\n\
     material.alpha = colorImage.a * color.a;\n\
     material.diffuse = (colorImage.rgb+color.rgb)/2.0;\n\
     return material;\n\
 }";
  Material._materialCache.addMaterial(Material.TrailLineType, {
    fabric: {
      type: Material.TrailLineType,
      uniforms: {
        color: new Color(1.0, 1.0, 1.0, 1),
        image: Material.TrailLineImage,
        time: 0,
      },
      source: Material.TrailLineSource,
    },
    translucent: function (material) {
      return true;
    },
  });

  return new TrailLineMaterialProperty(options);
}

/**
 * 动态扩散墙
 * @param {*} viewer 视图 - 地图viewer
 * @param {Array} _points 面数组(二维数组)
 * @param {Number} _scale 扩散倍数 正常大小是1倍 不会扩散
 * @param {Number} _height 高度
 * @param {Object} _material 材质
 * @returns {Function} 返回清除函数
 */
export function dynamicDiffusionWall(
  viewer,
  _points,
  _scale,
  _height,
  _material
) {
  let scale = 1;
  const wall = viewer.entities.add({
    name: "扩散墙",
    wall: {
      positions: new CallbackProperty(() => {
        if (_scale >= -1) {
          scale += _scale / 200.0;
          if (scale >= _scale) {
            scale = 1;
          }
        } else {
          scale -= _scale / 200.0;
          if (scale <= _scale) {
            scale = 1;
          }
        }

        let polygon = turf.polygon(_points);
        let scaledPolygon = turf.transformScale(polygon, scale);
        const newPositions = [];
        scaledPolygon.geometry.coordinates.forEach((coordinate) => {
          coordinate.forEach((point) => {
            if (point[0] instanceof Array) {
              point.forEach((p) => {
                newPositions.push(...p);
              });
            } else {
              newPositions.push(...point);
            }
            newPositions.push(_height);
          });
        });
        return Cartesian3.fromDegreesArrayHeights(newPositions);
      }, false),
      material: _material,
    },
  });
  return () => {
    viewer.entities.remove(wall);
  };
}

/**
 * 正多边形动态扩散墙
 * @param {*} viewer 视图 - 地图viewer
 * @param {Array} center 中心点
 * @param {Object} options 配置项
 * @param {Number} options.radius 扩散半径
 * @param {Number} options.edge 扩散正多边形的边数
 * @param {Number} options.speed 扩散速度
 * @param {Number} options.height 高度
 * @returns {Function} 返回清除函数
 */
export function dynamicDiffusionPolygon(viewer, center, options = {}) {
  // 扩散半径
  const radius = options.radius || 1000;
  // 扩散正多边形的边数
  const edge = options.edge || 64;
  // 扩散速度
  const speed = options.speed || 5.0;
  // 高度
  const height = options.height || 1000;
  // 实时高度
  let currentHeight = height;
  // 最小半径
  const minRadius = options.minRadius || 10;
  // 实时半径
  let currentRadius = minRadius;

  if (edge < 3) {
    return false;
  }

  function getPositions(_center, _edge, _currentRadius, _currentHeight) {
    const positions = [];
    const modelMatrix = Transforms.eastNorthUpToFixedFrame(
      Cartesian3.fromDegrees(_center[0], _center[1], 0)
    );
    for (let i = 0; i < _edge; i++) {
      const angle = (i / _edge) * CesiumMath.TWO_PI;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      const point = new Cartesian3(
        x * _currentRadius,
        y * _currentRadius,
        _currentHeight
      );
      positions.push(
        Matrix4.multiplyByPoint(modelMatrix, point, new Cartesian3())
      );
    }
    positions.push(positions[0]);
    return positions;
  }

  const wall = viewer.entities.add({
    wall: {
      positions: new CallbackProperty(() => {
        let positions = [];
        if (currentRadius >= radius) {
          currentRadius = minRadius;
          // currentHeight = height;
        }
        currentRadius += speed;
        // currentHeight += 100.0;
        // 判断扩散的是极半径和高度是否超出范围
        positions = getPositions(center, edge, currentRadius, currentHeight);
        return positions;
      }, false),
      material: WallDiffuseMaterial({
        color: new Color(1, 1, 0, 1),
      }),
    },
  });
  return () => {
    viewer.entities.remove(wall);
  };
}
// 正多边形材质
/**
 * @param {Object} options 墙体材质
 * @param {*} options.color 墙体颜色
 * @param {*} options.direction 墙体渐变方向
 * @returns {Class} WallDiffuseMaterialProperty 材质类
 */
function WallDiffuseMaterial(options) {
  /*
   * @Description: 动态扩散墙的墙体效果（参考开源代码）（不同高度透明度不同）
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-03-07 19:50:46
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-07 19:56:30
   */
  class WallDiffuseMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this.color = options.color;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.WallDiffuseMaterialType;
    }

    getValue(time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof WallDiffuseMaterialProperty &&
          Property.equals(this._color, other._color))
      );
    }
  }

  Object.defineProperties(WallDiffuseMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
  });

  // 墙体渐变方向

  let direction = options.direction || "up";
  let dir_result = "";
  switch (direction) {
    case "up":
      dir_result = "material.alpha = color.a * (1.0-fract(st.t)) * 0.8;";
      break;
    case "down":
      dir_result = "material.alpha = color.a * fract(st.t) * 0.8;";
      break;
    case "right":
      dir_result = "material.alpha = color.a * fract(st.s) * 0.8;";
      break;
    case "left":
      dir_result = "material.alpha = color.a * (1.0 - fract(st.s)) * 0.8;";
      break;
  }

  // 立体向上渐变
  //   // 立体向下渐变
  //   material.alpha = color.a * fract(st.t) * 0.8;
  //   // 水平逆时针渐变
  //   material.alpha = color.a * fract(st.s) * 0.8;
  //   // 水平顺时针渐变
  //   material.alpha = color.a * (1.0 - fract(st.s)) * 0.8;

  Material.WallDiffuseMaterialProperty = "WallDiffuseMaterialProperty";
  Material.WallDiffuseMaterialType = "WallDiffuseMaterialType";
  Material.WallDiffuseMaterialSource = `
    uniform vec4 color;
    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    material.diffuse = color.rgb * 2.0;
    ${dir_result}
    return material;
    }                                         
    `;

  Material._materialCache.addMaterial(Material.WallDiffuseMaterialType, {
    fabric: {
      type: Material.WallDiffuseMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
      },
      source: Material.WallDiffuseMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });

  return new WallDiffuseMaterialProperty(options);
}

/**
 * 立体墙
 * @param {*} viewer 视图 - 地图viewer
 * @param {GeoJSON} GeoJSON 墙体坐标
 * @param {Object} options 墙体材质
 * @param {*} options.color 墙体颜色
 * @param {*} options.direction 墙体渐变方向
 * @returns {Function} 返回清除函数
 */
export function createWall(viewer, GeoJSON, options) {
  const instances = polygonToPoints(GeoJSON);
  options = Object.assign(
    {
      color: new Color(1.0, 1.0, 0.0, 1.0),
    },
    options
  );
  const wall = viewer.entities.add({
    name: "立体墙效果",
    wall: {
      positions: Cartesian3.fromDegreesArray(instances),
      // 设置高度
      maximumHeights: new Array(instances.length / 2).fill(50000),
      minimunHeights: new Array(instances.length / 2).fill(0),
      // 扩散墙材质
      material: WallDiffuseMaterial(options),
    },
  });
  return () => {
    viewer.entities.remove(wall);
  };
}

/**
 * 旋转圆
 * @param {*} viewer 视图 - 地图viewer
 * @param {*} center 圆心
 * @param {*} image 图片
 * @param {Object} options 圆的参数
 * @param {Number} options._amount 每次动画的旋转速度
 * @param {Number} options.semiMinorAxis 圆的半短轴
 * @param {Number} options.semiMajorAxis 圆的半长轴
 * @returns {Function} 返回清除函数
 */
export function rotateCircleMaterial(viewer, center, image, options = {}) {
  const circle = viewer.entities.add({
    position: Cartesian3.fromDegrees(...center),
    id: "circle",
    ellipse: {
      semiMinorAxis: options.semiMinorAxis || 100000.0,
      semiMajorAxis: options.semiMajorAxis || 100000.0,
      material: new ImageMaterialProperty({
        image: image,
      }),
      zIndex: 2,
    },
  });
  let _stRotation = 0;
  circle.ellipse.stRotation = new CallbackProperty(function () {
    if (_stRotation >= 360 || _stRotation <= -360) {
      _stRotation = 0;
    }
    _stRotation += options._amount || 1;
    return CesiumMath.toRadians(_stRotation);
  }, false);
  return () => {
    viewer.entities.remove(circle);
  };
}

/**
 * 扫描圈
 * @param {*} viewer 视图 - 地图viewer
 * @param {Array} center 圆心
 * @param {Object} options 扫描圈的参数
 * @param {Color} options.color 扫描圈的颜色
 * @param {Number} options.speed 扫描圈的速度
 * @returns {Function} 返回清除函数
 */
export function scanCircle(viewer, center, options) {
  options = Object.assign(
    {
      color: new Color(1.0, 0.0, 0.0, 0.5),
      speed: 2,
    },
    options
  );
  const circle = viewer.entities.add({
    position: Cartesian3.fromDegrees(...center),
    name: "扫描圈",
    ellipse: {
      semiMinorAxis: 100000.0,
      semiMajorAxis: 100000.0,
      material: scanCircleMaterial(options),
    },
  });
  return () => {
    viewer.entities.remove(circle);
  };
}
// 扫描圈材质
function scanCircleMaterial(options) {
  /*
   * @Description: 扫描圆效果（参考开源代码）
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-03-04 17:22:05
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-04 17:23:52
   */
  class CircleScanMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this._speed = undefined;
      this.color = options.color;
      this.speed = options.speed;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.CircleScanMaterialType;
    }

    getValue(time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      result.speed = Property.getValueOrDefault(
        this._speed,
        time,
        10,
        result.speed
      );
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof CircleScanMaterialProperty &&
          Property.equals(this._color, other._color) &&
          Property.equals(this._speed, other._speed))
      );
    }
  }

  Object.defineProperties(CircleScanMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
    speed: createPropertyDescriptor("speed"),
  });

  Material.CircleScanMaterialProperty = "CircleScanMaterialProperty";
  Material.CircleScanMaterialType = "CircleScanMaterialType";
  Material.CircleScanMaterialSource = `
    uniform vec4 color;
    uniform float speed;

    float circle(vec2 uv, float r, float blur) {
    float d = length(uv) * 2.0;
    float c = smoothstep(r+blur, r, d);
    return c;
    }

    czm_material czm_getMaterial(czm_materialInput materialInput)
    {
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st - .5;
    material.diffuse = color.rgb;
    material.emission = vec3(0);
    float t =fract(czm_frameNumber * speed / 1000.0);
    float s = 0.3;
    float radius1 = smoothstep(.0, s, t) * 0.5;
    float alpha1 = circle(st, radius1, 0.01) * circle(st, radius1, -0.01);
    float alpha2 = circle(st, radius1, 0.01 - radius1) * circle(st, radius1, 0.01);
    float radius2 = 0.5 + smoothstep(s, 1.0, t) * 0.5;
    float alpha3 = circle(st, radius1, radius2 + 0.01 - radius1) * circle(st, radius1, -0.01);
    material.alpha = smoothstep(1.0, s, t) * (alpha1 + alpha2*0.1 + alpha3*0.1);
    material.alpha *= color.a;
    return material;
    }

    `;

  Material._materialCache.addMaterial(Material.CircleScanMaterialType, {
    fabric: {
      type: Material.CircleScanMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
        speed: 10.0,
      },
      source: Material.CircleScanMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });
  return new CircleScanMaterialProperty(options);
}

/**
 * 波纹圈
 * @param {*} viewer 视图 - 地图viewer
 * @param {Array} center 圆心
 * @param {Object} options 波纹圈的参数
 * @param {Color} options.color 波纹圈的颜色
 * @param {Number} options.speed 波纹圈的速度
 * @param {Number} options.count 波纹圈的数量
 * @param {Number} options.gradient 波纹圈的渐变范围
 * @param {Number} options.semiMinorAxis 波纹圈的短半轴
 * @param {Number} options.semiMajorAxis 波纹圈的长半轴
 * @returns {Function} 返回清除函数
 */
export function rippleCircle(viewer, center, options) {
  options = Object.assign(
    {
      color: new Color(1.0, 0.0, 0.0, 0.5),
      speed: 2,
      count: 4,
      gradient: 0.2,
    },
    options
  );
  const circle = viewer.entities.add({
    position: Cartesian3.fromDegrees(...center),
    name: "波纹圈",
    ellipse: {
      semiMinorAxis: options.semiMinorAxis || 100000.0,
      semiMajorAxis: options.semiMajorAxis || 100000.0,
      material: rippleCircleMaterial(options),
    },
  });
  return () => {
    viewer.entities.remove(circle);
  };
}
// 波纹圆材质
function rippleCircleMaterial(options) {
  /*
   * @Description: 波纹圆效果（和水波纹扩散类似，参考开源代码）
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-03-03 21:59:17
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-03 23:09:02
   */
  class CircleRippleMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this._speed = undefined;
      this.color = options.color;
      this.speed = options.speed;
      this.count = options.count;
      this.gradient = options.gradient;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.CircleRippleMaterialType;
    }

    getValue(time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      result.speed = Property.getValueOrDefault(
        this._speed,
        time,
        10,
        result.speed
      );
      result.count = this.count;
      result.gradient = this.gradient;
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof CircleRippleMaterialProperty &&
          Property.equals(this._color, other._color) &&
          Property.equals(this._speed, other._speed) &&
          Property.equals(this.count, other.count) &&
          Property.equals(this.gradient, other.gradient))
      );
    }
  }

  Object.defineProperties(CircleRippleMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
    speed: createPropertyDescriptor("speed"),
    count: createPropertyDescriptor("count"),
    gradient: createPropertyDescriptor("gradient"),
  });

  // CircleRippleMaterialProperty = CircleRippleMaterialProperty;
  Material.CircleRippleMaterialProperty = "CircleRippleMaterialProperty";
  Material.CircleRippleMaterialType = "CircleRippleMaterialType";
  Material.CircleRippleMaterialSource = `
                                            uniform vec4 color;
                                            uniform float speed;
                                            uniform float count;
                                            uniform float gradient;

                                            czm_material czm_getMaterial(czm_materialInput materialInput)
                                            {
                                            czm_material material = czm_getDefaultMaterial(materialInput);
                                            material.diffuse = 1.5 * color.rgb;
                                            vec2 st = materialInput.st;
                                            float dis = distance(st, vec2(0.5, 0.5));
                                            float per = fract(czm_frameNumber * speed / 1000.0);
                                            if(count == 1.0){
                                                if(dis > per * 0.5){
                                                discard;
                                                }else {
                                                material.alpha = color.a  * dis / per / 2.0;
                                                }
                                            } else {
                                                vec3 str = materialInput.str;
                                                if(abs(str.z)  > 0.001){
                                                discard;
                                                }
                                                if(dis > 0.5){
                                                discard;
                                                } else {
                                                float perDis = 0.5 / count;
                                                float disNum;
                                                float bl = 0.0;
                                                for(int i = 0; i <= 999; i++){
                                                    if(float(i) <= count){
                                                    disNum = perDis * float(i) - dis + per / count;
                                                    if(disNum > 0.0){
                                                        if(disNum < perDis){
                                                        bl = 1.0 - disNum / perDis;
                                                        }
                                                        else if(disNum - perDis < perDis){
                                                        bl = 1.0 - abs(1.0 - disNum / perDis);
                                                        }
                                                        material.alpha = pow(bl,(1.0 + 10.0 * (1.0 - gradient)));
                                                    }
                                                    }
                                                }
                                                }
                                            }
                                            return material;
                                            }
                                            `;

  Material._materialCache.addMaterial(Material.CircleRippleMaterialType, {
    fabric: {
      type: Material.CircleRippleMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
        speed: 3.0,
        count: 4,
        gradient: 0.2,
      },
      source: Material.CircleRippleMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });

  return new CircleRippleMaterialProperty(options);
}

/**
 * 消散圈
 * @param {*} viewer 视图 - 地图viewer
 * @param {*} center 中心点 - [lon, lat]
 * @param {Object} options 参数 - {color: 颜色, speed: 速度}
 * @returns {Function} 返回清除函数
 */
export function dissolveCircle(viewer, center, options) {
  options = Object.assign(
    {
      color: Color.YELLOW.withAlpha(0.5),
      speed: 3.0,
    },
    options
  );
  const circle = viewer.entities.add({
    position: Cartesian3.fromDegrees(...center),
    name: "消散圈",
    ellipse: {
      semiMinorAxis: options.semiMinorAxis || 100000.0,
      semiMajorAxis: options.semiMajorAxis || 100000.0,
      material: dissolveCircleMaterial(options),
    },
  });
  return () => {
    viewer.entities.remove(circle);
  };
}
function dissolveCircleMaterial(options) {
  /*
   * @Description: 扩散圆效果（参考开源代码）
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-03-03 21:51:28
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-04 10:19:33
   */
  class CircleDiffuseMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this._speed = undefined;
      this.color = options.color;
      this.speed = options.speed;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.CircleDiffuseMaterialType;
    }

    getValue(time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      result.speed = Property.getValueOrDefault(
        this._speed,
        time,
        10,
        result.speed
      );
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof CircleDiffuseMaterialProperty &&
          Property.equals(this._color, other._color) &&
          Property.equals(this._speed, other._speed))
      );
    }
  }

  Object.defineProperties(CircleDiffuseMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
    speed: createPropertyDescriptor("speed"),
  });

  // CircleDiffuseMaterialProperty = CircleDiffuseMaterialProperty;
  Material.CircleDiffuseMaterialProperty = "CircleDiffuseMaterialProperty";
  Material.CircleDiffuseMaterialType = "CircleDiffuseMaterialType";
  Material.CircleDiffuseMaterialSource = `
                                            uniform vec4 color;
                                            uniform float speed;

                                            vec3 circlePing(float r, float innerTail,  float frontierBorder, float timeResetSeconds,  float radarPingSpeed,  float fadeDistance){
                                            float t = fract(czm_frameNumber * speed / 1000.0);
                                            float time = mod(t, timeResetSeconds) * radarPingSpeed;
                                            float circle;
                                            circle += smoothstep(time - innerTail, time, r) * smoothstep(time + frontierBorder,time, r);
                                            circle *= smoothstep(fadeDistance, 0.0, r);
                                            return vec3(circle);
                                            }

                                            czm_material czm_getMaterial(czm_materialInput materialInput){
                                            czm_material material = czm_getDefaultMaterial(materialInput);
                                            vec2 st = materialInput.st * 2.0  - 1.0 ;
                                            vec2 center = vec2(0.);
                                            float time = fract(czm_frameNumber * speed / 1000.0);
                                            vec3 flagColor;
                                            float r = length(st - center) / 4.;
                                            flagColor += circlePing(r, 0.25, 0.025, 4.0, 0.3, 1.0) * color.rgb;
                                            material.alpha = length(flagColor);
                                            material.diffuse = flagColor.rgb;
                                            return material;
                                            }

                                            `;

  Material._materialCache.addMaterial(Material.CircleDiffuseMaterialType, {
    fabric: {
      type: Material.CircleDiffuseMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
        speed: 10.0,
      },
      source: Material.CircleDiffuseMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });

  return new CircleDiffuseMaterialProperty(options);
}

/**
 * 消隐圆
 * @param {*} viewer 视图 - 地图viewer
 * @param {*} center 中心点 - [lon, lat]
 * @param {Object} options 参数 - {color: 颜色, speed: 速度}
 * @returns {Function} 返回清除函数
 */
export function hideCircle(viewer, center, options) {
  options = Object.assign(
    {
      color: Color.YELLOW.withAlpha(0.5),
      speed: 3.0,
    },
    options
  );
  const circle = viewer.entities.add({
    position: Cartesian3.fromDegrees(...center),
    name: "消隐圆",
    ellipse: {
      semiMinorAxis: options.semiMinorAxis || 100000.0,
      semiMajorAxis: options.semiMajorAxis || 100000.0,
      material: hideCircleMaterial(options),
    },
  });
  return () => {
    viewer.entities.remove(circle);
  };
}
// 消隐圈材质
function hideCircleMaterial(options) {
  /*
   * @Description: 消隐圆效果（参考开源代码）
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-03-03 23:07:47
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-03 23:10:18
   */
  class CircleFadeMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this._speed = undefined;
      this.color = options.color;
      this.speed = options.speed;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.CircleFadeMaterialType;
    }

    getValue(time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      result.speed = Property.getValueOrDefault(
        this._speed,
        time,
        10,
        result.speed
      );
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof CircleFadeMaterialProperty &&
          Property.equals(this._color, other._color) &&
          Property.equals(this._speed, other._speed))
      );
    }
  }

  Object.defineProperties(CircleFadeMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
    speed: createPropertyDescriptor("speed"),
  });

  // CircleFadeMaterialProperty = CircleFadeMaterialProperty;
  Material.CircleFadeMaterialProperty = "CircleFadeMaterialProperty";
  Material.CircleFadeMaterialType = "CircleFadeMaterialType";
  Material.CircleFadeMaterialSource = `
                                            uniform vec4 color;
                                            uniform float speed;

                                            czm_material czm_getMaterial(czm_materialInput materialInput){
                                            czm_material material = czm_getDefaultMaterial(materialInput);
                                            material.diffuse = 1.5 * color.rgb;
                                            vec2 st = materialInput.st;
                                            float dis = distance(st, vec2(0.5, 0.5));
                                            float per = fract(czm_frameNumber * speed / 1000.0);
                                            if(dis > per * 0.5){
                                                material.alpha = color.a;
                                            }else {
                                                discard;
                                            }
                                            return material;
                                            }
                                            `;

  Material._materialCache.addMaterial(Material.CircleFadeMaterialType, {
    fabric: {
      type: Material.CircleFadeMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
        speed: 10.0,
      },
      source: Material.CircleFadeMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });

  return new CircleFadeMaterialProperty(options);
}

/**
 * 模糊圈
 * @param {*} viewer 视图 - 地图viewer
 * @param {*} center 中心点 - [lon, lat]
 * @param {Object} options 参数 - {color: 颜色, speed: 速度, semiMinorAxis: 短半轴, semiMajorAxis: 长半轴}
 * @returns {Function} 返回清除函数
 */
export function indistinctCircle(viewer, center, options) {
  options = Object.assign(
    {
      color: Color.YELLOW.withAlpha(0.1),
      speed: 3.0,
    },
    options
  );
  const circle = viewer.entities.add({
    position: Cartesian3.fromDegrees(...center),
    name: "模糊圆",
    ellipse: {
      semiMinorAxis: options.semiMinorAxis || 100000.0,
      semiMajorAxis: options.semiMajorAxis || 100000.0,
      material: indistinctCircleMaterial(options),
    },
  });
  return () => {
    viewer.entities.remove(circle);
  };
}
function indistinctCircleMaterial(options) {
  /*
   * @Description: 模糊圆效果（参考开源代码）
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-03-03 21:34:50
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-03 21:45:42
   */
  class CircleBlurMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this._speed = undefined;
      this.color = options.color;
      this.speed = options.speed;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.CircleBlurMaterialType;
    }

    getValue(time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      result.speed = Property.getValueOrDefault(
        this._speed,
        time,
        10,
        result.speed
      );
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof CircleBlurMaterialProperty &&
          Property.equals(this._color, other._color) &&
          Property.equals(this._speed, other._speed))
      );
    }
  }

  Object.defineProperties(CircleBlurMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
    speed: createPropertyDescriptor("speed"),
  });

  Material.CircleBlurMaterialProperty = "CircleBlurMaterialProperty";
  Material.CircleBlurMaterialType = "CircleBlurMaterialType";
  Material.CircleBlurMaterialSource = `
                                            uniform vec4 color;
                                            uniform float speed;
                                            czm_material czm_getMaterial(czm_materialInput materialInput){
                                            czm_material material = czm_getDefaultMaterial(materialInput);
                                            vec2 st = materialInput.st ;
                                            vec2 center = vec2(0.5);
                                            float time = fract(czm_frameNumber * speed / 1000.0);
                                            float r = 0.5 + sin(time) / 3.0;
                                            float dis = distance(st, center);
                                            float a = 0.0;
                                            if(dis < r) {
                                                a = 1.0 - smoothstep(0.0, r, dis);
                                            }
                                            material.alpha = pow(a,10.0) ;
                                            material.diffuse = color.rgb * a * 3.0;
                                            return material;
                                            }
                                            `;

  Material._materialCache.addMaterial(Material.CircleBlurMaterialType, {
    fabric: {
      type: Material.CircleBlurMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
        speed: 10.0,
      },
      source: Material.CircleBlurMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });
  return new CircleBlurMaterialProperty(options);
}

/**
 * 螺旋圈
 * @param {*} viewer 视图 - 地图viewer
 * @param {*} center 中心点 - [lon, lat]
 * @param {Object} options 参数 - {color: 颜色, speed: 速度, semiMinorAxis: 短半轴, semiMajorAxis: 长半轴}
 * @returns {Function} 返回清除函数
 */
export function spiralCircle(viewer, center, options) {
  options = Object.assign(
    {
      color: Color.YELLOW.withAlpha(0.5),
      speed: 5,
    },
    options
  );
  const circle = viewer.entities.add({
    position: Cartesian3.fromDegrees(...center),
    name: "螺旋圈",
    ellipse: {
      semiMinorAxis: options.semiMinorAxis || 100000.0,
      semiMajorAxis: options.semiMajorAxis || 100000.0,
      material: spiralCircleMaterial(options),
    },
  });
  return () => {
    viewer.entities.remove(circle);
  };
}
function spiralCircleMaterial(options) {
  /*
   * @Description: 螺旋圆效果（参考开源代码）
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-03-03 18:38:39
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-03 18:50:00
   */
  class CircleSpiralMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this._speed = undefined;
      this.color = options.color;
      this.speed = options.speed;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.CircleSpiralMaterialType;
    }

    getValue(time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      result.speed = Property.getValueOrDefault(
        this._speed,
        time,
        10,
        result.speed
      );
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof CircleSpiralMaterialProperty &&
          Property.equals(this._color, other._color) &&
          Property.equals(this._speed, other._speed))
      );
    }
  }

  Object.defineProperties(CircleSpiralMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
    speed: createPropertyDescriptor("speed"),
  });

  Material.CircleSpiralMaterialProperty = "CircleSpiralMaterialProperty";
  Material.CircleSpiralMaterialType = "CircleSpiralMaterialType";
  Material.CircleSpiralMaterialSource = `
                                            uniform vec4 color;
                                            uniform float speed;
                                            #define PI 3.14159265359

                                            vec2 rotate2D (vec2 _st, float _angle) {
                                            _st =  mat2(cos(_angle),-sin(_angle),  sin(_angle),cos(_angle)) * _st;
                                            return _st;
                                            }
                                            czm_material czm_getMaterial(czm_materialInput materialInput){
                                            czm_material material = czm_getDefaultMaterial(materialInput);
                                            vec2 st = materialInput.st * 2.0 - 1.0;
                                            st *= 1.6;
                                            float time = czm_frameNumber * speed / 1000.0;
                                            float r = length(st);
                                            float w = .3;
                                            st = rotate2D(st,(r*PI*6.-time*2.));
                                            float a = smoothstep(-w,.2,st.x) * smoothstep(w,.2,st.x);
                                            float b = abs(1./(sin(pow(r,2.)*2.-time*1.3)*6.))*.4;
                                            material.alpha = a * b ;
                                            material.diffuse = color.rgb * a * b  * 3.0;
                                            return material;
                                            }
                                            `;

  Material._materialCache.addMaterial(Material.CircleSpiralMaterialType, {
    fabric: {
      type: Material.CircleSpiralMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
        speed: 10.0,
      },
      source: Material.CircleSpiralMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });

  return new CircleSpiralMaterialProperty(options);
}

/**
 * 多彩圆
 * @param {*} viewer 视图 - 地图viewer
 * @param {*} center 中心点 - [lon, lat]
 * @param {Object} options 参数 - {color: 颜色, speed: 速度, semiMinorAxis: 短半轴, semiMajorAxis: 长半轴}
 * @returns {Function} 返回清除函数
 */
export function colorfulCircle(viewer, center, options) {
  options = Object.assign(
    {
      color: Color.YELLOW.withAlpha(0.5),
      speed: 5,
    },
    options
  );
  const circle = viewer.entities.add({
    position: Cartesian3.fromDegrees(...center),
    name: "多彩圆",
    ellipse: {
      semiMinorAxis: options.semiMinorAxis || 100000.0,
      semiMajorAxis: options.semiMajorAxis || 100000.0,
      material: colorfulCircleMaterial(options),
    },
  });
  return () => {
    viewer.entities.remove(circle);
  };
}
function colorfulCircleMaterial(options) {
  /*
   * @Description: 多彩圆效果（参考开源代码）
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-03-03 18:09:33
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-03 18:32:18
   */

  class CircleColorfulMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this._speed = undefined;
      this.color = options.color;
      this.speed = options.speed;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.CircleColorfulMaterialType;
    }

    getValue(time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      result.speed = Property.getValueOrDefault(
        this._speed,
        time,
        10,
        result.speed
      );
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof CircleColorfulMaterialProperty &&
          Property.equals(this._color, other._color) &&
          Property.equals(this._speed, other._speed))
      );
    }
  }

  Object.defineProperties(CircleColorfulMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
    speed: createPropertyDescriptor("speed"),
  });

  Material.CircleColorfulMaterialProperty = "CircleColorfulMaterialProperty";
  Material.CircleColorfulMaterialType = "CircleColorfulMaterialType";
  Material.CircleColorfulMaterialSource = `
                                                uniform vec4 color;
                                                uniform float speed;

                                                czm_material czm_getMaterial(czm_materialInput materialInput){
                                                czm_material material = czm_getDefaultMaterial(materialInput);
                                                vec2 st = materialInput.st  * 2.0 - 1.0;
                                                float time =czm_frameNumber * speed / 1000.0;
                                                float radius = length(st);
                                                float angle = atan(st.y/st.x);
                                                float radius1 = sin(time * 2.0) + sin(40.0*angle+time)*0.01;
                                                float radius2 = cos(time * 3.0);
                                                vec3 fragColor = 0.2 + 0.5 * cos( time + color.rgb + vec3(0,2,4));
                                                float inten1 = 1.0 - sqrt(abs(radius1 - radius));
                                                float inten2 = 1.0 - sqrt(abs(radius2 - radius));
                                                material.alpha = pow(inten1 + inten2 , 5.0) ;
                                                material.diffuse = fragColor * (inten1 + inten2);
                                                return material;
                                                }`;

  Material._materialCache.addMaterial(Material.CircleColorfulMaterialType, {
    fabric: {
      type: Material.CircleColorfulMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
        speed: 10.0,
      },
      source: Material.CircleColorfulMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });

  return new CircleColorfulMaterialProperty(options);
}

/**
 * 脉冲圆
 * @param {*} viewer 视图 - 地图viewer
 * @param {*} center 中心点 - [lon, lat]
 * @param {Object} options 参数 - {color: 颜色, speed: 速度, semiMinorAxis: 短半轴, semiMajorAxis: 长半轴}
 * @returns {Function} 返回清除函数
 */
export function pulseCircle(viewer, center, options) {
  options = Object.assign(
    {
      color: Color.YELLOW.withAlpha(0.5),
      speed: 5,
    },
    options
  );
  const circle = viewer.entities.add({
    position: Cartesian3.fromDegrees(...center),
    name: "脉冲圆",
    ellipse: {
      semiMinorAxis: options.semiMinorAxis || 100000.0,
      semiMajorAxis: options.semiMajorAxis || 100000.0,
      material: pulseCircleMaterial(options),
    },
  });
  return () => {
    viewer.entities.remove(circle);
  };
}
function pulseCircleMaterial(options) {
  /*
   * @Description: 脉冲圆扩展效果（参考开源代码）
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-02-28 19:28:52
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-03 18:17:09
   */
  class CirclePulseMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this._speed = undefined;
      this.color = options.color;
      this.speed = options.speed;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.CirclePulseMaterialType;
    }

    getValue(time, result) {
      result = defaultValue(result, {});
      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      result.speed = Property.getValueOrDefault(
        this._speed,
        time,
        10,
        result.speed
      );
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof CirclePulseMaterialProperty &&
          Property.equals(this._color, other._color) &&
          Property.equals(this._speed, other._speed))
      );
    }
  }

  // 设置属性
  Object.defineProperties(CirclePulseMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
    speed: createPropertyDescriptor("speed"),
  });

  // CirclePulseMaterialProperty = CirclePulseMaterialProperty;
  Material.CirclePulseMaterialProperty = "CirclePulseMaterialProperty";
  Material.CirclePulseMaterialType = "CirclePulseMaterialType";
  Material.CirclePulseMaterialSource = `
                                            uniform vec4 color;
                                            uniform float speed;
                                            czm_material czm_getMaterial(czm_materialInput materialInput) {
                                                czm_material material = czm_getDefaultMaterial(materialInput);
                                                vec2 st = materialInput.st * 2.0 - 1.0;
                                                float time = fract(czm_frameNumber * speed / 1000.0);
                                                float r = length(st) * 1.2;
                                                float a = pow(r, 2.0);
                                                float b = sin(r * 0.8 - 1.6);
                                                float c = sin(r - 0.010);
                                                float s = sin(a - time * 2.0 + b) * c;
                                                float d = abs(1.0 / (s * 10.8)) - 0.01;
                                                material.alpha = pow(d, 10.0);
                                                material.diffuse = color.rgb * d;
                                                return material;
                                            }
                                            `;
  Material._materialCache.addMaterial(Material.CirclePulseMaterialType, {
    fabric: {
      type: Material.CirclePulseMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
        speed: 10.0,
      },
      source: Material.CirclePulseMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });

  return new CirclePulseMaterialProperty(options);
}

/**
 * 圆形扩散
 * *** 有问题, 坐标转换可能有问题, 圈位置不固定
 */
export class DiffusionCircle {
  constructor(viewer) {
    this.viewer = viewer;
    this.lastStageList = [];
  }
  /**
   * 圆扩散
   * @param {*} position  扫描中心 如[117.270739,31.84309,32]
   * @param {*} scanColor 扫描颜色 如"rgba(0,255,0,1)"
   * @param {*} maxRadius 扫描半径，单位米 如1000米
   * @param {*} duration 持续时间，单位毫秒 如4000
   */
  add(position, scanColor, maxRadius, duration) {
    this.lastStageList.push(
      this.showCircleScan(position, scanColor, maxRadius, duration)
    );
  }
  clear() {
    this.lastStageList.forEach((item) => {
      this.clearScanEffects(item);
    });
    this.lastStageList = [];
  }
  showCircleScan(position, scanColor, maxRadius, duration) {
    const cartographicCenter = new Cartographic(
      CesiumMath.toRadians(position[0]),
      CesiumMath.toRadians(position[1]),
      position[2] || 0
    );
    scanColor = Color.fromCssColorString(scanColor);
    const lastStage = this._addCircleScanPostStage(
      cartographicCenter,
      maxRadius,
      scanColor,
      duration
    );
    return lastStage;
  }
  _addCircleScanPostStage(cartographicCenter, maxRadius, scanColor, duration) {
    // 1.创建圆形扫描遮罩
    const _Cartesian3Center = Cartographic.toCartesian(cartographicCenter);
    //
    const _Cartesian4Center = new Cartesian4(
      _Cartesian3Center.x,
      _Cartesian3Center.y,
      _Cartesian3Center.z,
      1
    );
    const _CartographicCenter1 = new Cartographic(
      cartographicCenter.longitude,
      cartographicCenter.latitude,
      cartographicCenter.height + 500
    );
    const _Cartesian3Center1 = Cartographic.toCartesian(_CartographicCenter1);
    const _Cartesian4Center1 = new Cartesian4(
      _Cartesian3Center1.x,
      _Cartesian3Center1.y,
      _Cartesian3Center1.z,
      1
    );
    const _time = new Date().getTime();
    const _scratchCartesian4Center = new Cartesian4();
    const _scratchCartesian4Center1 = new Cartesian4();
    const _scratchCartesian3Normal = new Cartesian3();
    const _this = this;
    const ScanPostStage = new PostProcessStage({
      fragmentShader: _this._getScanSegmentShader(),
      uniforms: {
        u_scanCenterEC: function () {
          const temp = Matrix4.multiplyByVector(
            _this.viewer.camera._viewMatrix,
            _Cartesian4Center,
            _scratchCartesian4Center
          );
          return temp;
        },
        u_scanPlaneNormalEC: function () {
          const temp = Matrix4.multiplyByVector(
            _this.viewer.camera._viewMatrix,
            _Cartesian4Center,
            _scratchCartesian4Center
          );
          const temp1 = Matrix4.multiplyByVector(
            _this.viewer.camera._viewMatrix,
            _Cartesian4Center1,
            _scratchCartesian4Center1
          );
          _scratchCartesian3Normal.x = temp1.x - temp.x;
          _scratchCartesian3Normal.y = temp1.y - temp.y;
          _scratchCartesian3Normal.z = temp1.z - temp.z;
          Cartesian3.normalize(
            _scratchCartesian3Normal,
            _scratchCartesian3Normal
          );
          return _scratchCartesian3Normal;
        },
        u_radius: function () {
          return (
            (maxRadius * ((new Date().getTime() - _time) % duration)) / duration
          );
        },
        u_scanColor: scanColor,
      },
    });
    this.viewer.scene.postProcessStages.add(ScanPostStage);
    return ScanPostStage;
  }
  _getScanSegmentShader() {
    const inpram = 18;
    const scanSegmentShader =
      ` uniform sampler2D colorTexture;
      uniform sampler2D depthTexture;
      in vec2 v_textureCoordinates;
      uniform vec4 u_scanCenterEC;
      uniform vec3 u_scanPlaneNormalEC;
      uniform float u_radius;
      uniform vec4 u_scanColor;
      out vec4 vFragColor;
      vec4 toEye(in vec2 uv, in float depth){
        vec2 xy = vec2((uv.x * 2.0 - 1.0),(uv.y * 2.0 - 1.0));
        vec4 posInCamera = czm_inverseProjection * vec4(xy, depth, 1.0);
        posInCamera =posInCamera / posInCamera.w;
        return posInCamera;
      }
      vec3 pointProjectOnPlane(in vec3 planeNormal, in vec3 planeOrigin, in vec3 point){
          vec3 v01 = point - planeOrigin;
          float d = dot(planeNormal, v01) ;
          return (point - planeNormal * d);
      }
      float getDepth(in vec4 depth){
          float z_window = czm_unpackDepth(depth);
          z_window = czm_reverseLogDepth(z_window);
          float n_range = czm_depthRange.near;
          float f_range = czm_depthRange.far;
          return (2.0 * z_window - n_range - f_range) / (f_range - n_range);
      }
      void main(){
          vFragColor = texture(colorTexture, v_textureCoordinates);
          float depth = getDepth(texture(depthTexture, v_textureCoordinates));
          vec4 viewPos = toEye(v_textureCoordinates, depth);
          vec3 prjOnPlane = pointProjectOnPlane(u_scanPlaneNormalEC.xyz, u_scanCenterEC.xyz, viewPos.xyz);
          float dis = length(prjOnPlane.xyz - u_scanCenterEC.xyz);
          if(dis < u_radius){
            float f = 1.0 - abs(u_radius - dis) / u_radius;
            f = pow(f, float(` +
      inpram +
      `));
            vFragColor = mix(vFragColor,u_scanColor,f);
          }
          vFragColor.a = vFragColor.a / 2.0;
      }
    `;
    return scanSegmentShader;
  }
  /**
   * 清除特效对象
   * @param {*} lastStage 特效对象
   */
  clearScanEffects(lastStage) {
    this.viewer.scene.postProcessStages.remove(lastStage);
  }
}

/**
 * 雷达扫描圈
 * *** 有问题, 坐标转换可能有问题, 圈位置不固定
 */
export class RadarScan {
  constructor(viewer) {
    this.viewer = viewer;
    this.lastStageList = [];
  }
  add(position, scanColor, maxRadius, duration) {
    this.lastStageList.push(
      this.showRadarScan(position, scanColor, maxRadius, duration)
    );
  }
  clear() {
    this.lastStageList.forEach((item) => {
      this.clearScanEffects(item);
    });
    this.lastStageList = [];
  }
  showRadarScan(position, scanColor, maxRadius, duration) {
    const cartographicCenter = new Cartographic(
      CesiumMath.toRadians(position[0]),
      CesiumMath.toRadians(position[1]),
      position[2]
    );
    scanColor = new Color.fromCssColorString(scanColor);
    const lastStage = this._addRadarScanPostStage(
      cartographicCenter,
      maxRadius,
      scanColor,
      duration
    );
    return lastStage;
  }
  _addRadarScanPostStage(cartographicCenter, radius, scanColor, duration) {
    const _Cartesian3Center = Cartographic.toCartesian(cartographicCenter);
    const _Cartesian4Center = new Cartesian4(
      _Cartesian3Center.x,
      _Cartesian3Center.y,
      _Cartesian3Center.z,
      1
    );

    const _CartographicCenter1 = new Cartographic(
      cartographicCenter.longitude,
      cartographicCenter.latitude,
      cartographicCenter.height + 500
    );
    const _Cartesian3Center1 = Cartographic.toCartesian(_CartographicCenter1);
    const _Cartesian4Center1 = new Cartesian4(
      _Cartesian3Center1.x,
      _Cartesian3Center1.y,
      _Cartesian3Center1.z,
      1
    );

    const _CartographicCenter2 = new Cartographic(
      cartographicCenter.longitude + CesiumMath.toRadians(0.001),
      cartographicCenter.latitude,
      cartographicCenter.height
    );
    const _Cartesian3Center2 = Cartographic.toCartesian(_CartographicCenter2);
    const _Cartesian4Center2 = new Cartesian4(
      _Cartesian3Center2.x,
      _Cartesian3Center2.y,
      _Cartesian3Center2.z,
      1
    );
    const _RotateQ = new Quaternion();
    const _RotateM = new Matrix3();

    const _time = new Date().getTime();

    const _scratchCartesian4Center = new Cartesian4();
    const _scratchCartesian4Center1 = new Cartesian4();
    const _scratchCartesian4Center2 = new Cartesian4();
    const _scratchCartesian3Normal = new Cartesian3();
    const _scratchCartesian3Normal1 = new Cartesian3();

    const _this = this;
    const ScanPostStage = new PostProcessStage({
      fragmentShader: this._getRadarScanShader(),
      uniforms: {
        u_scanCenterEC: function () {
          return Matrix4.multiplyByVector(
            _this.viewer.camera._viewMatrix,
            _Cartesian4Center,
            _scratchCartesian4Center
          );
        },
        u_scanPlaneNormalEC: function () {
          const temp = Matrix4.multiplyByVector(
            _this.viewer.camera._viewMatrix,
            _Cartesian4Center,
            _scratchCartesian4Center
          );
          const temp1 = Matrix4.multiplyByVector(
            _this.viewer.camera._viewMatrix,
            _Cartesian4Center1,
            _scratchCartesian4Center1
          );
          _scratchCartesian3Normal.x = temp1.x - temp.x;
          _scratchCartesian3Normal.y = temp1.y - temp.y;
          _scratchCartesian3Normal.z = temp1.z - temp.z;

          Cartesian3.normalize(
            _scratchCartesian3Normal,
            _scratchCartesian3Normal
          );
          return _scratchCartesian3Normal;
        },
        u_radius: radius,
        u_scanLineNormalEC: function () {
          const temp = Matrix4.multiplyByVector(
            _this.viewer.camera._viewMatrix,
            _Cartesian4Center,
            _scratchCartesian4Center
          );
          const temp1 = Matrix4.multiplyByVector(
            _this.viewer.camera._viewMatrix,
            _Cartesian4Center1,
            _scratchCartesian4Center1
          );
          const temp2 = Matrix4.multiplyByVector(
            _this.viewer.camera._viewMatrix,
            _Cartesian4Center2,
            _scratchCartesian4Center2
          );

          _scratchCartesian3Normal.x = temp1.x - temp.x;
          _scratchCartesian3Normal.y = temp1.y - temp.y;
          _scratchCartesian3Normal.z = temp1.z - temp.z;

          Cartesian3.normalize(
            _scratchCartesian3Normal,
            _scratchCartesian3Normal
          );

          _scratchCartesian3Normal1.x = temp2.x - temp.x;
          _scratchCartesian3Normal1.y = temp2.y - temp.y;
          _scratchCartesian3Normal1.z = temp2.z - temp.z;

          const tempTime =
            ((new Date().getTime() - _time) % duration) / duration;
          Quaternion.fromAxisAngle(
            _scratchCartesian3Normal,
            tempTime * Math.PI * 2,
            _RotateQ
          );
          Matrix3.fromQuaternion(_RotateQ, _RotateM);
          Matrix3.multiplyByVector(
            _RotateM,
            _scratchCartesian3Normal1,
            _scratchCartesian3Normal1
          );
          Cartesian3.normalize(
            _scratchCartesian3Normal1,
            _scratchCartesian3Normal1
          );
          return _scratchCartesian3Normal1;
        },
        u_scanColor: scanColor,
      },
    });
    this.viewer.scene.postProcessStages.add(ScanPostStage);

    return ScanPostStage;
  }
  _getRadarScanShader() {
    const scanSegmentShader =
      "uniform sampler2D colorTexture;\n" +
      "uniform sampler2D depthTexture;\n" +
      "in vec2 v_textureCoordinates;\n" +
      "uniform vec4 u_scanCenterEC;\n" +
      "uniform vec3 u_scanPlaneNormalEC;\n" +
      "uniform vec3 u_scanLineNormalEC;\n" +
      "uniform float u_radius;\n" +
      "uniform vec4 u_scanColor;\n" +
      "out vec4 vFragColor;\n" +
      "vec4 toEye(in vec2 uv, in float depth)\n" +
      " {\n" +
      " vec2 xy = vec2((uv.x * 2.0 - 1.0),(uv.y * 2.0 - 1.0));\n" +
      " vec4 posInCamera =czm_inverseProjection * vec4(xy, depth, 1.0);\n" +
      " posInCamera =posInCamera / posInCamera.w;\n" +
      " return posInCamera;\n" +
      " }\n" +
      "bool isPointOnLineRight(in vec3 ptOnLine, in vec3 lineNormal, in vec3 testPt)\n" +
      "{\n" +
      "vec3 v01 = testPt - ptOnLine;\n" +
      "normalize(v01);\n" +
      "vec3 temp = cross(v01, lineNormal);\n" +
      "float d = dot(temp, u_scanPlaneNormalEC);\n" +
      "return d > 0.5;\n" +
      "}\n" +
      "vec3 pointProjectOnPlane(in vec3 planeNormal, in vec3 planeOrigin, in vec3 point)\n" +
      "{\n" +
      "vec3 v01 = point -planeOrigin;\n" +
      "float d = dot(planeNormal, v01) ;\n" +
      "return (point - planeNormal * d);\n" +
      "}\n" +
      "float distancePointToLine(in vec3 ptOnLine, in vec3 lineNormal, in vec3 testPt)\n" +
      "{\n" +
      "vec3 tempPt = pointProjectOnPlane(lineNormal, ptOnLine, testPt);\n" +
      "return length(tempPt - ptOnLine);\n" +
      "}\n" +
      "float getDepth(in vec4 depth)\n" +
      "{\n" +
      "float z_window = czm_unpackDepth(depth);\n" +
      "z_window = czm_reverseLogDepth(z_window);\n" +
      "float n_range = czm_depthRange.near;\n" +
      "float f_range = czm_depthRange.far;\n" +
      "return (2.0 * z_window - n_range - f_range) / (f_range - n_range);\n" +
      "}\n" +
      "void main()\n" +
      "{\n" +
      "vFragColor = texture(colorTexture, v_textureCoordinates);\n" +
      "float depth = getDepth( texture(depthTexture, v_textureCoordinates));\n" +
      "vec4 viewPos = toEye(v_textureCoordinates, depth);\n" +
      "vec3 prjOnPlane = pointProjectOnPlane(u_scanPlaneNormalEC.xyz, u_scanCenterEC.xyz, viewPos.xyz);\n" +
      "float dis = length(prjOnPlane.xyz - u_scanCenterEC.xyz);\n" +
      "float twou_radius = u_radius * 2.0;\n" +
      "if(dis < u_radius)\n" +
      "{\n" +
      "float f0 = 1.0 -abs(u_radius - dis) / u_radius;\n" +
      "f0 = pow(f0, 64.0);\n" +
      "vec3 lineEndPt = vec3(u_scanCenterEC.xyz) + u_scanLineNormalEC * u_radius;\n" +
      "float f = 0.0;\n" +
      "if(isPointOnLineRight(u_scanCenterEC.xyz, u_scanLineNormalEC.xyz, prjOnPlane.xyz))\n" +
      "{\n" +
      "float dis1= length(prjOnPlane.xyz - lineEndPt);\n" +
      "f = abs(twou_radius -dis1) / twou_radius;\n" +
      "f = pow(f, 3.0);\n" +
      "}\n" +
      "vFragColor = mix(vFragColor, u_scanColor, f + f0);\n" +
      "}\n" +
      "}\n";
    return scanSegmentShader;
  }
  /**
   * 清除特效对象
   * @param {*} lastStage 特效对象
   */
  clearScanEffects(lastStage) {
    this.viewer.scene.postProcessStages.remove(lastStage);
  }
}

/**
 * 雷达扫描线
 * @param {*} viewer 视图 - 地图viewer
 */
export class RadarScanLine {
  constructor(viewer) {
    this.viewer = viewer;
    this.lastStageList = [];
  }
  /**
   * 添加雷达扫描线
   * @param {*} center 中心点 - [lon, lat]
   * @param {Object} options 参数 - {color: 颜色, speed: 速度, semiMinorAxis: 短半轴, semiMajorAxis: 长半轴}
   */
  add(center, options) {
    options = Object.assign(
      {
        color: new Color(1.0, 1.0, 0.0, 0.7),
        speed: 20.0,
      },
      options
    );
    // 雷达线
    const circle = this.viewer.entities.add({
      position: Cartesian3.fromDegrees(...center),
      name: "雷达线",
      ellipse: {
        semiMinorAxis: options.semiMinorAxis || 100000.0,
        semiMajorAxis: options.semiMajorAxis || 100000.0,
        material: radarScanLineMaterial(options),
      },
    });
    this.lastStageList.push(circle);
  }
  clear() {
    this.lastStageList.forEach((item) => {
      this.viewer.entities.remove(item);
    });
  }
}
function radarScanLineMaterial(options) {
  /*
   * @Description: 雷达线效果（参考开源代码）
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-03-04 19:27:08
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-04 19:29:58
   */
  class RadarLineMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this._speed = undefined;
      this.color = options.color;
      this.speed = options.speed;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.RadarLineMaterialType;
    }

    getValue(time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      result.speed = Property.getValueOrDefault(
        this._speed,
        time,
        10,
        result.speed
      );
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof RadarLineMaterialProperty &&
          Property.equals(this._color, other._color) &&
          Property.equals(this._speed, other._speed))
      );
    }
  }

  Object.defineProperties(RadarLineMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
    speed: createPropertyDescriptor("speed"),
  });

  Material.RadarLineMaterialProperty = "RadarLineMaterialProperty";
  Material.RadarLineMaterialType = "RadarLineMaterialType";
  Material.RadarLineMaterialSource = `
    uniform vec4 color;
    uniform float speed;

    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st * 2.0 - 1.0;
    float t = czm_frameNumber * speed / 1000.0 ;
    vec3 col = vec3(0.0);
    vec2 p = vec2(sin(t), cos(t));
    float d = length(st - dot(p, st) * p);
    if (dot(st, p) < 0.) {
        d = length(st);
    }

    col = .006 / d * color.rgb;

    if(distance(st,vec2(0)) >  0.99 ){
        col =color.rgb;
    }

    material.alpha  = pow(length(col),2.0);
    material.diffuse = col * 3.0 ;
    return material;
    }
     `;

  Material._materialCache.addMaterial(Material.RadarLineMaterialType, {
    fabric: {
      type: Material.RadarLineMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
        speed: 10.0,
      },
      source: Material.RadarLineMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });
  return new RadarLineMaterialProperty(options);
}

/**
 * 波纹雷达
 * @param {*} viewer 视图 - 地图viewer
 */
export class RadarWave {
  constructor(viewer) {
    this.viewer = viewer;
    this.lastStageList = [];
  }
  /**
   * 添加波纹雷达
   * @param {*} center 中心点 - [lon, lat]
   * @param {Object} options 参数 - {color: 颜色, speed: 速度, semiMinorAxis: 短半轴, semiMajorAxis: 长半轴}
   */
  add(center, options) {
    options = Object.assign(
      {
        color: new Color(1.0, 1.0, 0.0, 0.7),
        speed: 20.0,
      },
      options
    );
    const circle = this.viewer.entities.add({
      position: Cartesian3.fromDegrees(...center),
      name: "波纹雷达",
      ellipse: {
        semiMinorAxis: options.semiMinorAxis || 100000.0,
        semiMajorAxis: options.semiMajorAxis || 100000.0,
        material: radarWaveMaterial(options),
      },
    });
    this.lastStageList.push(circle);
  }
  clear() {
    this.lastStageList.forEach((item) => {
      this.viewer.entities.remove(item);
    });
  }
}
function radarWaveMaterial(options) {
  /*
   * @Description: 波纹雷达效果（参考开源代码）
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-03-04 19:41:00
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-04 19:42:58
   */
  class RadarWaveMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this._speed = undefined;
      this.color = options.color;
      this.speed = options.speed;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.RadarWaveMaterialType;
    }

    getValue(time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      result.speed = Property.getValueOrDefault(
        this._speed,
        time,
        10,
        result.speed
      );
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof RadarWaveMaterialProperty &&
          Property.equals(this._color, other._color) &&
          Property.equals(this._speed, other._speed))
      );
    }
  }

  Object.defineProperties(RadarWaveMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
    speed: createPropertyDescriptor("speed"),
  });

  // RadarWaveMaterialProperty = RadarWaveMaterialProperty;
  Material.RadarWaveMaterialProperty = "RadarWaveMaterialProperty";
  Material.RadarWaveMaterialType = "RadarWaveMaterialType";
  Material.RadarWaveMaterialSource = `
    uniform vec4 color;
    uniform float speed;

    #define PI 3.14159265359

    float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    vec2 pos = st - vec2(0.5);
    float time = czm_frameNumber * speed / 1000.0 ;
    float r = length(pos);
    float t = atan(pos.y, pos.x) - time * 2.5;
    float a = (atan(sin(t), cos(t)) + PI)/(2.0*PI);
    float ta = 0.5;
    float v = smoothstep(ta-0.05,ta+0.05,a) * smoothstep(ta+0.05,ta-0.05,a);
    vec3 flagColor = color.rgb * v;
    float blink = pow(sin(time*1.5)*0.5+0.5, 0.8);
    flagColor = color.rgb *  pow(a, 8.0*(.2+blink))*(sin(r*500.0)*.5+.5) ;
    flagColor = flagColor * pow(r, 0.4);
    material.alpha = length(flagColor) * 1.3;
    material.diffuse = flagColor * 3.0;
    return material;
    }
     `;

  Material._materialCache.addMaterial(Material.RadarWaveMaterialType, {
    fabric: {
      type: Material.RadarWaveMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
        speed: 10.0,
      },
      source: Material.RadarWaveMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });
  return new RadarWaveMaterialProperty(options);
}

/**
 * 图片雷达
 * @param {*} viewer 视图 - 地图viewer
 */
export class RadarImage {
  constructor(viewer) {
    this.viewer = viewer;
    this.lastStageList = [];
  }
  _createRadar(center, options = {}) {
    let radar = this.viewer.entities.add({
      position: Cartesian3.fromDegrees(...center),
      name: "图片雷达",
      ellipse: {
        semiMajorAxis: options.semiMajorAxis || 100000.0,
        semiMinorAxis: options.semiMinorAxis || 100000.0,
        material: new ImageMaterialProperty({
          image: "img/OIP.jpg",
          color: options.groundColor || new Color(0, 0, 1.0, 0.7),
        }),
        // 不设置高度则无法渲染外框线
        height: 20.0,
        heightReference: HeightReference.RELATIVE_TO_GROUND,
        outline: true,
        outlineColor: options.outlineColor || new Color(1.0, 1.0, 0.0, 1.0),
      },
    });
    this.lastStageList.push(radar);
    return radar.ellipse;
  }
  /**
   *
   * @param {Array} center 中心点坐标
   * @param {*} options { amount: 旋转角度, semiMajorAxis: 长半轴, semiMinorAxis: 短半轴, groundColor: 地面颜色, outlineColor: 外框线颜色 }
   */
  add(center, options = {}) {
    const radar = this._createRadar(center, options);
    let _stRotation = 0;
    radar.stRotation = new CallbackProperty(function () {
      _stRotation += options.amount || 1;
      if (_stRotation >= 360 || _stRotation <= -360) {
        _stRotation = 0;
      }
      return CesiumMath.toRadians(_stRotation);
    }, false);
  }
  clear() {
    this.lastStageList.forEach((item) => {
      this.viewer.entities.remove(item);
    });
  }
}

/**
 * 雷达扫描2
 * @param {*} viewer 视图 - 地图viewer
 */
export class RadarScan2 {
  constructor(viewer) {
    this.viewer = viewer;
    this.lastStageList = [];
  }
  /**
   *
   * @param {Array} center 中心点坐标
   * @param {*} options { color: 颜色, speed: 扫描速度, semiMajorAxis: 长半轴, semiMinorAxis: 短半轴 }
   */
  add(center, options) {
    options = Object.assign(
      {
        color: new Color(1.0, 1.0, 0.0, 1),
        speed: 10.0,
      },
      options
    );
    const radar = this.viewer.entities.add({
      position: Cartesian3.fromDegrees(...center),
      name: "雷达扫描2",
      ellipse: {
        semiMinorAxis: options.semiMinorAxis || 100000.0,
        semiMajorAxis: options.semiMajorAxis || 100000.0,
        material: radarScan2Material(options),
      },
    });
    this.lastStageList.push(radar);
  }
  clear() {
    this.lastStageList.forEach((item) => {
      this.viewer.entities.remove(item);
    });
  }
}
function radarScan2Material(options) {
  /*
   * @Description: 雷达扫描效果（参考开源代码）
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-03-04 20:02:48
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-05 15:26:47
   */
  class RadarScanMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this._speed = undefined;
      this.color = options.color;
      this.speed = options.speed;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.RadarScanMaterialType;
    }

    getValue(time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      result.speed = Property.getValueOrDefault(
        this._speed,
        time,
        10,
        result.speed
      );
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof RadarScanMaterialProperty &&
          Property.equals(this._color, other._color) &&
          Property.equals(this._speed, other._speed))
      );
    }
  }

  Object.defineProperties(RadarScanMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
    speed: createPropertyDescriptor("speed"),
  });

  Material.RadarScanMaterialProperty = "RadarScanMaterialProperty";
  Material.RadarScanMaterialType = "RadarScanMaterialType";
  Material.RadarScanMaterialSource = `
    uniform vec4 color;
    uniform float speed;

    #define PI 3.14159265359

    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    vec2 scrPt = st * 2.0 - 1.0;
    float time = czm_frameNumber * speed / 1000.0 ;
    vec3 col = vec3(0.0);
    mat2 rot;
    float theta = -time * 1.0 * PI - 2.2;
    float cosTheta, sinTheta;
    cosTheta = cos(theta);
    sinTheta = sin(theta);
    rot[0][0] = cosTheta;
    rot[0][1] = -sinTheta;
    rot[1][0] = sinTheta;
    rot[1][1] = cosTheta;
    vec2 scrPtRot = rot * scrPt;
    float angle = 1.0 - (atan(scrPtRot.y, scrPtRot.x) / 6.2831 + 0.5);
    float falloff = length(scrPtRot);
    material.alpha = pow(length(col + vec3(.5)),5.0);
    material.diffuse =  (0.5 +  pow(angle, 2.0) * falloff ) *   color.rgb    ;
    return material;
    }

     `;

  Material._materialCache.addMaterial(Material.RadarScanMaterialType, {
    fabric: {
      type: Material.RadarScanMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
        speed: 10.0,
      },
      source: Material.RadarScanMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });
  return new RadarScanMaterialProperty(options);
}

/**
 * 立体雷达扫描
 * @param {*} viewer 视图 - 地图viewer
 * ** 有偏移
 * 动画效果不显示
 */
export class RadarScanThree {
  constructor(viewer) {
    this.viewer = viewer;
    this.lastStageList = [];
  }
  add(center, options) {
    const _radius = options.radius;
    // 扫描扇形颜色
    const _color = options.color;
    // 扫描速度
    const _speed = options.speed;
    // 中心点坐标经纬度
    const _cenLon = center[0];
    const _cenLat = center[1];
    this._createEllipsoid(_radius, _color, _cenLon, _cenLat);

    let positionArr;
    let heading = 0;
    // 每一帧刷新时调用
    this.viewer.clock.onTick.addEventListener(() => {
      heading += _speed;
      positionArr = this._calculatePane(
        113.9236839,
        22.528061,
        1000.0,
        heading
      );
    });

    // 创建1/4圆形立体墙
    let radarWall = this.viewer.entities.add({
      wall: {
        positions: new CallbackProperty(() => {
          return Cartesian3.fromDegreesArrayHeights(positionArr);
        }, false),
        material: _color,
      },
    });
  }
  _createEllipsoid(_radius, _color, _cenLon, _cenLat) {
    this.viewer.entities.add({
      position: Cartesian3.fromDegrees(_cenLon, _cenLat),
      name: "立体雷达扫描",
      ellipsoid: {
        radii: new Cartesian3(_radius, _radius, _radius),
        material: _color || Color.YELLOW.withAlpha(0.5),
        outline: true,
        outlineColor: _color || Color.YELLOW,
        outlineWidth: 1,
      },
    });
  }

  _calculatePane(x1, y1, radius, heading) {
    var m = Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(x1, y1));
    var rx = radius * Math.cos((heading * Math.PI) / 180.0);
    var ry = radius * Math.sin((heading * Math.PI) / 180.0);
    var translation = Cartesian3.fromElements(rx, ry, 0);
    var d = Matrix4.multiplyByPoint(m, translation, new Cartesian3());
    var c = Cartographic.fromCartesian(d);
    var x2 = CesiumMath.toDegrees(c.longitude);
    var y2 = CesiumMath.toDegrees(c.latitude);
    return this._calculateSector(x1, y1, x2, y2);
  }

  // 计算竖直扇形
  _calculateSector(x1, y1, x2, y2) {
    let positionArr = [];
    positionArr.push(x1);
    positionArr.push(y1);
    positionArr.push(0);
    var radius = Cartesian3.distance(
      Cartesian3.fromDegrees(x1, y1),
      Cartesian3.fromDegrees(x2, y2)
    );
    // 扇形是1/4圆，因此角度设置为0-90
    for (let i = 0; i <= 90; i++) {
      let h = radius * Math.sin((i * Math.PI) / 180.0);
      let r = Math.cos((i * Math.PI) / 180.0);
      let x = (x2 - x1) * r + x1;
      let y = (y2 - y1) * r + y1;
      positionArr.push(x);
      positionArr.push(y);
      positionArr.push(h);
    }
    return positionArr;
  }
}

/**
 * 轨迹球体
 * @param {*} viewer 视图 - 地图viewer
 * ** 有偏移, 材质问题
 */
export class TrackBall {
  constructor(viewer) {
    this.viewer = viewer;
    this.lastStageList = [];
  }
  add(center, options) {
    options = Object.assign(
      {
        color: Color.YELLOW,
        speed: 10.0,
      },
      options
    );
    const track = this.viewer.entities.add({
      position: Cartesian3.fromDegrees(...center),
      name: "电弧球体",
      ellipsoid: {
        radii: new Cartesian3(1000.0, 1000.0, 1000.0),
        material: trackBallMaterial(options),
      },
    });
    this.lastStageList.push(track);
  }
  clear() {
    this.viewer.entities.removeAll();
  }
}
// 轨迹球体材质
function trackBallMaterial(options) {
  /*
   * @Description: 轨迹球体效果（参考开源代码）
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-03-04 16:50:58
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-04 17:06:56
   */
  class EllipsoidTrailMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this._speed = undefined;
      this.color = options.color;
      this.speed = options.speed;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.EllipsoidTrailMaterialType;
    }

    getValue(time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      result.speed = Property.getValueOrDefault(
        this._speed,
        time,
        10,
        result.speed
      );
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof EllipsoidTrailMaterialProperty &&
          Property.equals(this._color, other._color) &&
          Property.equals(this._speed, other._speed))
      );
    }
  }

  Object.defineProperties(EllipsoidTrailMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
    speed: createPropertyDescriptor("speed"),
  });

  Material.EllipsoidTrailMaterialProperty = "EllipsoidTrailMaterialProperty";
  Material.EllipsoidTrailMaterialType = "EllipsoidTrailMaterialType";
  Material.EllipsoidTrailMaterialSource = `
    uniform vec4 color;
    uniform float speed;
    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    float time = fract(czm_frameNumber * speed / 1000.0);
    float alpha = abs(smoothstep(0.5,1.,fract( -st.t - time)));
    alpha += .1;
    material.alpha = alpha;
    material.diffuse = color.rgb;
    return material;
}
`;

  Material._materialCache.addMaterial(Material.EllipsoidTrailMaterialType, {
    fabric: {
      type: Material.EllipsoidTrailMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
        speed: 10.0,
      },
      source: Material.EllipsoidTrailMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });
  return new EllipsoidTrailMaterialProperty(options);
}

/**
 * 电弧球体
 * @param {*} viewer 视图 - 地图viewer
 */
export class ArcBall {
  constructor(viewer) {
    this.viewer = viewer;
    this.lastStageList = [];
  }
  /**
   *
   * @param {*} center 中心点
   * @param {*} options { color: 颜色, speed: 速度, radius } 配置项
   */
  add(center, options) {
    options = Object.assign(
      {
        color: Color.YELLOW,
        speed: 10.0,
        radius: 10000.0,
      },
      options
    );
    const track = this.viewer.entities.add({
      position: Cartesian3.fromDegrees(...center),
      name: "电弧球体",
      ellipsoid: {
        radii: new Cartesian3(options.radius, options.radius, options.radius),
        material: arcBallMaterial(options),
      },
    });
    this.lastStageList.push(track);
  }
  clear() {
    this.viewer.entities.removeAll();
  }
}
function arcBallMaterial(options) {
  /*
   * @Description: 电弧球体效果（参考开源代码）
   * @Version: 1.0
   * @Author: Julian
   * @Date: 2022-03-04 15:57:40
   * @LastEditors: Julian
   * @LastEditTime: 2022-03-04 16:20:31
   */
  class EllipsoidElectricMaterialProperty {
    constructor(options) {
      this._definitionChanged = new Event();
      this._color = undefined;
      this._speed = undefined;
      this.color = options.color;
      this.speed = options.speed;
    }

    get isConstant() {
      return false;
    }

    get definitionChanged() {
      return this._definitionChanged;
    }

    getType(time) {
      return Material.EllipsoidElectricMaterialType;
    }

    getValue(time, result) {
      if (!defined(result)) {
        result = {};
      }

      result.color = Property.getValueOrDefault(
        this._color,
        time,
        Color.RED,
        result.color
      );
      result.speed = Property.getValueOrDefault(
        this._speed,
        time,
        10,
        result.speed
      );
      return result;
    }

    equals(other) {
      return (
        this === other ||
        (other instanceof EllipsoidElectricMaterialProperty &&
          Property.equals(this._color, other._color) &&
          Property.equals(this._speed, other._speed))
      );
    }
  }

  Object.defineProperties(EllipsoidElectricMaterialProperty.prototype, {
    color: createPropertyDescriptor("color"),
    speed: createPropertyDescriptor("speed"),
  });

  Material.EllipsoidElectricMaterialProperty =
    "EllipsoidElectricMaterialProperty";
  Material.EllipsoidElectricMaterialType = "EllipsoidElectricMaterialType";
  Material.EllipsoidElectricMaterialSource = `
   uniform vec4 color;
   uniform float speed;
   
   #define pi 3.1415926535
   #define PI2RAD 0.01745329252
   #define TWO_PI (2. * PI)
   
   float rands(float p){
   return fract(sin(p) * 10000.0);
   }
   
   float noise(vec2 p){
   float time = fract( czm_frameNumber * speed / 1000.0);
   float t = time / 20000.0;
   if(t > 1.0) t -= floor(t);
   return rands(p.x * 14. + p.y * sin(t) * 0.5);
   }
   
   vec2 sw(vec2 p){
   return vec2(floor(p.x), floor(p.y));
   }
   
   vec2 se(vec2 p){
   return vec2(ceil(p.x), floor(p.y));
   }
   
   vec2 nw(vec2 p){
   return vec2(floor(p.x), ceil(p.y));
   }
   
   vec2 ne(vec2 p){
   return vec2(ceil(p.x), ceil(p.y));
   }
   
   float smoothNoise(vec2 p){
   vec2 inter = smoothstep(0.0, 1.0, fract(p));
   float s = mix(noise(sw(p)), noise(se(p)), inter.x);
   float n = mix(noise(nw(p)), noise(ne(p)), inter.x);
   return mix(s, n, inter.y);
   }
   
   float fbm(vec2 p){
   float z = 2.0;
   float rz = 0.0;
   vec2 bp = p;
   for(float i = 1.0; i < 6.0; i++){
       rz += abs((smoothNoise(p) - 0.5)* 2.0) / z;
       z *= 2.0;
       p *= 2.0;
   }
   return rz;
   }
   
   czm_material czm_getMaterial(czm_materialInput materialInput)
   {
   czm_material material = czm_getDefaultMaterial(materialInput);
   vec2 st = materialInput.st;
   vec2 st2 = materialInput.st;
   float time = fract( czm_frameNumber * speed / 1000.0);
   if (st.t < 0.5) {
       discard;
   }
   st *= 4.;
   float rz = fbm(st);
   st /= exp(mod( time * 2.0, pi));
   rz *= pow(15., 0.9);
   vec4 temp = vec4(0);
   temp = mix( color / rz, vec4(color.rgb, 0.1), 0.2);
   if (st2.s < 0.05) {
       temp = mix(vec4(color.rgb, 0.1), temp, st2.s / 0.05);
   }
   if (st2.s > 0.95){
       temp = mix(temp, vec4(color.rgb, 0.1), (st2.s - 0.95) / 0.05);
   }
   material.diffuse = temp.rgb;
   material.alpha = temp.a * 2.0;
   return material;
   }
   `;

  Material._materialCache.addMaterial(Material.EllipsoidElectricMaterialType, {
    fabric: {
      type: Material.EllipsoidElectricMaterialType,
      uniforms: {
        color: new Color(1.0, 0.0, 0.0, 1.0),
        speed: 10.0,
      },
      source: Material.EllipsoidElectricMaterialSource,
    },
    translucent: function (material) {
      return true;
    },
  });
  return new EllipsoidElectricMaterialProperty(options);
}

/**
 * 自定义广告牌
 * @param {*} viewer 视图 - 地图viewer
 */
export class PoiIconLabel {
  constructor(viewer) {
    this.viewer = viewer;
    this.lastStageList = [];
  }
  /**
   * 自定义广告牌
   * @param {Array} center ：中心点
   * @param {Object} options  { text: 内容, color: 颜色, url: 图标地址 } 配置项
   */
  add(center, options) {
    const [lon, lat] = center;
    const text = options.text;
    const color = options.color;
    const url = options.url;
    this._createLine(lon, lat, color);
    this._createPoint(lon, lat, color);

    const table = this.viewer.entities.add({
      name: text,
      position: Cartesian3.fromDegrees(lon, lat, 300),
      // 图标
      billboard: {
        image: url,
        width: 50,
        height: 50,
      },
      label: {
        //文字标签
        text: text,
        font: "20px sans-serif",
        style: LabelStyle.FILL,
        // 对齐方式(水平和竖直)
        horizontalOrigin: HorizontalOrigin.LEFT,
        verticalOrigin: VerticalOrigin.CENTER,
        pixelOffset: new Cartesian2(20, -2),
        showBackground: true,
        backgroundColor: new Color.fromBytes(0, 70, 24),
      },
    });
  }
  _createLine(lon, lat, color) {
    // 先画线后画点，防止线压盖点
    let linePositions = [];
    linePositions.push(new Cartesian3.fromDegrees(lon, lat, 5));
    linePositions.push(new Cartesian3.fromDegrees(lon, lat, 300));
    this.viewer.entities.add({
      polyline: {
        positions: linePositions,
        width: 1.5,
        material: color,
      },
    });
  }
  _createPoint(lon, lat, color) {
    this.viewer.entities.add({
      // 给初始点位设置一定的离地高度，否者会被压盖
      position: Cartesian3.fromDegrees(lon, lat, 5),
      point: {
        color: color,
        pixelSize: 15,
      },
    });
  }
}

/**
 * 加载3DTiles
 * @param {*} viewer 视图 - 地图viewer
 * @param {*} url 模型地址
 */
export async function load3D(viewer, url) {
  const tileset = await Cesium3DTileset.fromUrl(url);
  viewer.scene.primitives.add(tileset);
  viewer.zoomTo(tileset);
}
// export async function load3D(viewer, url, modelMatrix) {
//   // const currentExampleType = viewModel.currentExampleType;

//   const clippingPlanes = new ClippingPlaneCollection({
//     planes: [
//       new ClippingPlane(
//         new Cartesian3(0.0, 0.0, -1.0),
//         0.0
//       ),
//     ],
//     edgeWidth: 0.0,
//   });

//   try {
//     // const url = await Promise.resolve(resource);
//     const tileset = await Cesium3DTileset.fromUrl( url, {
//       clippingPlanes: clippingPlanes,
//     });

//     if (defined(modelMatrix)) {
//       tileset.modelMatrix = modelMatrix;
//     }

//     viewer.scene.primitives.add(tileset);

//     const boundingSphere = tileset.boundingSphere;
//     const radius = boundingSphere.radius;

//     viewer.zoomTo(
//       tileset,
//       new HeadingPitchRange(0.5, -0.2, radius * 4.0)
//     );

//     if (
//       !Matrix4.equals(
//         tileset.root.transform,
//         Matrix4.IDENTITY
//       )
//     ) {
//       // The clipping plane is initially positioned at the tileset's root transform.
//       // Apply an additional matrix to center the clipping plane on the bounding sphere center.
//       const transformCenter = Matrix4.getTranslation(
//         tileset.root.transform,
//         new Cartesian3()
//       );
//       const transformCartographic = Cartographic.fromCartesian(
//         transformCenter
//       );
//       const boundingSphereCartographic = Cartographic.fromCartesian(
//         tileset.boundingSphere.center
//       );
//       const height =
//         boundingSphereCartographic.height -
//         transformCartographic.height;
//       clippingPlanes.modelMatrix = Matrix4.fromTranslation(
//         new Cartesian3(0.0, 0.0, height)
//       );
//     }
//     return tileset;
//   } catch (error) {
//     console.log(`Error loading  tileset: ${error}`);
//   }
// }
/**
 * 点击tiles高亮
 * @param {*} viewer 视图 - 地图viewer
 */
export function click3D(viewer) {
  const hightLighted = {
    feautre: undefined,
    originalColor: new Color(),
  };

  viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(event) {
    // 清除之前的高亮元素
    if (defined(hightLighted.feature)) {
      hightLighted.feature.color = hightLighted.originalColor;
      hightLighted.feature = undefined;
    }

    // 选择新要素
    const pickedFeature = viewer.scene.pick(event.position);
    if (!defined(pickedFeature)) {
      return;
    }

    // 存储选中要素的信息
    hightLighted.feature = pickedFeature;
    Color.clone(pickedFeature.color, hightLighted.originalColor);
    // 高亮选中元素
    pickedFeature.color = Color.YELLOW;
  }, ScreenSpaceEventType.LEFT_CLICK);
}

/**
 * 加载glb模型
 * @param {*} viewer 视图 - 地图viewer
 * @param {*} center 中心点
 * @param {*} uri 模型地址
 */
export class LoadModel {
  constructor(viewer) {
    this.viewer = viewer;
    this.model = null;
  }
  add(center, uri) {
    const modelEntity = this.viewer.entities.add({
      name: "glb模型",
      position: Cartesian3.fromDegrees(...center),
      model: {
        uri,
        minimumPixelSize: 128,
        maximumScale: 2000,
      },
    });
    this.model = modelEntity;
  }

  // viewer.trackedEntity = modelEntity;
  activeModel({ start, end }) {
    let startPosition = new Cartesian3.fromDegrees(...start);
    let endPosition = new Cartesian3.fromDegrees(...end);
    let factor = 0;
    this.model.position = new CallbackProperty(function () {
      if (factor > 5000) {
        factor = 5000;
      }
      factor += 1;
      return Cartesian3.lerp(
        startPosition,
        endPosition,
        factor / 5000,
        new Cartesian3()
      );
    }, false);
    this.viewer.trackedEntity = this.model;
  }
}

/**
 * 键盘控制glb模型
 * @param {*} viewer 视图 - 地图viewer
 * 有问题, 有报错, 没找出原因
 */
export class KeyControlModel {
  constructor(viewer) {
    this.viewer = viewer;
  }
  add(center, url) {
    let headingPitchRoll = new HeadingPitchRoll();
    let fixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
      "north",
      "west"
    );
    let position = Cartesian3.fromDegrees(...center);
    let deltaRadians = CesiumMath.toRadians(5.0);
    // 速度
    let speed = 100;
    // 速度向量
    let speedVector = new Cartesian3();

    let airplaneModel = this.viewer.scene.primitives.add(
      Model.fromGltfAsync({
        url: url,
        scale: 1000,
        modelMatrix: Transforms.headingPitchRollToFixedFrame(
          position,
          headingPitchRoll,
          Ellipsoid.WGS84,
          fixedFrameTransform
        ),
        minimumPixelSize: 256,
      })
    );

    document.addEventListener("keydown", function (event) {
      const key = event.key.toUpperCase();
      //   console.log(key);
      switch (key) {
        case "ARROWUP":
          headingPitchRoll.patch += deltaRadians;
          if (headingPitchRoll.pitch > CesiumMath.TWO_PI) {
            headingPitchRoll.pitch -= CesiumMath.TWO_PI;
          }
          console.log(headingPitchRoll.pitch);
          break;
        case "ARROWDOWN":
          headingPitchRoll.patch -= deltaRadians;
          if (headingPitchRoll.pitch < -CesiumMath.TWO_PI) {
            headingPitchRoll.pitch += CesiumMath.TWO_PI;
          }
          break;
        case "ARROWLEFT":
          headingPitchRoll.heading -= deltaRadians;
          if (headingPitchRoll.heading < -CesiumMath.TWO_PI) {
            headingPitchRoll.heading += CesiumMath.TWO_PI;
          }
          break;
        case "ARROWRIGHT":
          headingPitchRoll.heading += deltaRadians;
          if (headingPitchRoll.heading > CesiumMath.TWO_PI) {
            headingPitchRoll.heading -= CesiumMath.TWO_PI;
          }
          break;
        case ",":
          headingPitchRoll.roll -= deltaRadians;
          if (headingPitchRoll.roll < -CesiumMath.TWO_PI) {
            headingPitchRoll.roll += CesiumMath.TWO_PI;
          }
          break;
        case ".":
          headingPitchRoll.roll += deltaRadians;
          if (headingPitchRoll.roll > CesiumMath.TWO_PI) {
            headingPitchRoll.roll -= CesiumMath.TWO_PI;
          }
          break;
        case "=":
        case "+":
          speed += 10;
          speed = Math.min(speed, 10000);
          break;
        case "-":
        case "_":
          speed -= 10;
          speed = Math.max(speed, 100);
          break;
      }
    });

    const pathPosition = new SampledPositionProperty();
    // const entityPath = this.viewer.entities.add({
    //     position: pathPosition,
    //     name: "飞行路线",
    //     path: {
    //         show: true,
    //         leadTime: 0,
    //         trailTime: 60,
    //         width: 10,
    //         resolution: 1,
    //         material: new PolylineGlowMaterialProperty({
    //             glowPower: 0.3,
    //             taperPower: 0.3,
    //             color: Color.YELLOW,
    //         }),
    //     }
    // })
    airplaneModel.readyPromise.then((model) => {
      console.log(model);
      this.viewer.scene.preUpdate.addEventListener(() => {
        speedVector = Cartesian3.multiplyByScalar(
          Cartesian3.UNIT_X,
          speed / 10,
          speedVector
        );
        console.log(airplaneModel);
        console.log(speedVector);
        console.log(position);
        position = Matrix4.multiplyByPoint(
          airplaneModel.modelMatrix,
          speedVector,
          position
        );

        pathPosition.addSample(JulianDate.now(), position);
        Transforms.headingPitchRollToFixedFrame(
          position,
          headingPitchRoll,
          Ellipsoid.WGS84,
          fixedFrameTransform,
          airplaneModel.modelMatrix
        );
      });
    });
  }
}

/**
 * @description: 将图片和文字合成新图标使用（参考Cesium源码）
 * @param {*} url：图片地址
 * @param {*} label：文字
 * @param {*} size：画布大小
 * @return {*} 返回canvas
 */
export function combineIconAndLabel(url, label, size) {
  // 创建画布对象
  let canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  let ctx = canvas.getContext("2d");

  let promise = new Resource.fetchImage(url).then((image) => {
    // 异常判断
    try {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.log(e);
    }

    // 渲染字体
    // font属性设置顺序：font-style, font-variant, font-weight, font-size, line-height, font-family
    ctx.fillStyle = Color.WHITE.toCssColorString();
    ctx.font = "bold 20px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, size / 2, size / 2);

    return canvas;
  });

  return promise;
}

/**
 * 点聚类
 * @param {*} viewer 视图 - 地图viewer
 */
export function initCluster(viewer, options) {
  new GeoJsonDataSource().load(options.GeoJSON).then((dataSource) => {
    viewer.dataSources.add(dataSource);

    // 设置聚合参数
    dataSource.clustering.enabled = true;
    dataSource.clustering.pixelRange = 60;
    dataSource.clustering.minimumClusterSize = 2;

    // foreach用于调用数组的每个元素，并将元素传递给回调函数。
    dataSource.entities.values.forEach((entity) => {
      // 将点拉伸一定高度，防止被地形压盖
      entity.position._value.z += 50.0;
      // 使用大小为64*64的icon，缩小展示poi
      entity.billboard = {
        image: options.defaultImage,
        width: 32,
        height: 32,
      };
      entity.label = {
        text: "POI",
        font: "bold 15px Microsoft YaHei",
        // 竖直对齐方式
        verticalOrigin: VerticalOrigin.CENTER,
        // 水平对齐方式
        horizontalOrigin: HorizontalOrigin.LEFT,
        // 偏移量
        pixelOffset: new Cartesian2(15, 0),
      };
    });

    // 添加监听函数
    dataSource.clustering.clusterEvent.addEventListener(function (
      clusteredEntities,
      cluster
    ) {
      // 关闭自带的显示聚合数量的标签
      cluster.label.show = false;
      cluster.billboard.show = true;
      cluster.billboard.verticalOrigin = VerticalOrigin.BOTTOM;

      // 根据聚合数量的多少设置不同层级的图片以及大小
      if (clusteredEntities.length >= 20) {
        cluster.billboard.image = combineIconAndLabel(
          options.level1Image,
          clusteredEntities.length,
          64
        );
        cluster.billboard.width = 72;
        cluster.billboard.height = 72;
      } else if (clusteredEntities.length >= 12) {
        cluster.billboard.image = combineIconAndLabel(
          options.level2Image,
          clusteredEntities.length,
          64
        );
        cluster.billboard.width = 56;
        cluster.billboard.height = 56;
      } else if (clusteredEntities.length >= 8) {
        cluster.billboard.image = combineIconAndLabel(
          options.level3Image,
          clusteredEntities.length,
          64
        );
        cluster.billboard.width = 48;
        cluster.billboard.height = 48;
      } else {
        cluster.billboard.image = combineIconAndLabel(
          options.level4Image,
          clusteredEntities.length,
          64
        );
        cluster.billboard.width = 40;
        cluster.billboard.height = 40;
      }
    });
  });
}

/**
 * 淹没分析函数，通过拉伸面的高度来进行分析
 * @param {*} viewer
 * @param {*} positions ：研究区域底部坐标数组
 * @param {*} waterHeight ：当前水位高度
 * @param {*} targertWaterHeight ：目标水位高度
 */
export function induationAnalysis(
  viewer,
  positions,
  waterHeight,
  targertWaterHeight
) {
  viewer.entities.add({
    polygon: {
      hierarchy: new PolygonHierarchy(Cartesian3.fromDegreesArray(positions)),
      perPositionHeight: true,
      // 使用回调函数Callback，直接设置extrudedHeight会导致闪烁
      extrudedHeight: new CallbackProperty(function () {
        waterHeight += 0.2;
        if (waterHeight > targertWaterHeight) {
          waterHeight = targertWaterHeight;
        }
        return waterHeight;
      }, false),
      material: new Color.fromBytes(64, 157, 253, 150),
    },
  });
}

/**
 * @description: 日照阴影效果模拟, 昼夜交替?
 * @param {*} _viewer
 * @param {*} _speed：变化速率
 * @return {*}
 */
export function lightingShadowInit(_viewer, _speed) {
  _viewer.scene.globe.enableLighting = true;
  _viewer.shadows = true;
  _viewer.clock.multiplier = _speed;
}

/**
 * @description: 等高线
 * @param {*} viewer
 */
export function contourLine(viewer) {
  let globe = viewer.scene.globe;

  let contourUniforms = {};

  // 使用等高线材质
  let material = Material.fromType("ElevationContour");
  contourUniforms = material.uniforms;

  // 线宽2.0px
  contourUniforms.width = 2.0;
  // 高度间隔为150米
  contourUniforms.spacing = 150;

  contourUniforms.color = Color.RED.withAlpha(0.5);

  // 设置材质
  globe.material = material;
}

/**
 *
 * @param {*} viewer 视图 - 地图viewer
 * @param {*} wmsurl wms服务地址
 * @param {*} wmslayer wms服务图层
 */
export function addWmsImagery(viewer, { wmsurl, wmslayer, params = {} }) {
  let wmsImage = new WebMapServiceImageryProvider({
    url: wmsurl, // （"http://127.0.0.1:8083/geoserver/cesium/wms",
    layers: wmslayer, //（cesium:图层）,
    fill: false,
    parameters: {
      service: "WMS",
      transparent: true,
      // format: "image/png",
      ...params,
    },
    // 4326 geojson
    // url: wmsurl, // （"http://127.0.0.1:8083/geoserver/cesium/wms",
    // layers: wmslayer, //（cesium:图层）,
    // fill: false,
    // parameters: {
    //     service: "WMS",
    //     format: "geojson",
    //     transparent: true,
    //     width: 768,
    //     height: 746,
    //     srs: 'EPSG:4326',
    // },
  });
  viewer.imageryLayers.addImageryProvider(wmsImage);
}

/**
 * @param {*} viewer 视图 - 地图viewer
 * @param {*} options { wmtsurl wmts服务地址, wmtslayer wmts服务图层 }
 */
export function addWmtsLayer(viewer, { wmtsurl, wmtslayer }) {
  const wmts = new WebMapTileServiceImageryProvider({
    url: wmtsurl, // "http://localhost:8080/geoserver/gwc/service/wmts"
    layer: wmtslayer, // "new_geoserver:china"
    style: "",
    format: "image/png",
    // 瓦片矩阵集的 ID
    tileMatrixSetID: "EPSG:900913",
    // 瓦片矩阵标识数组
    tileMatrixLabels: [
      "EPSG:900913:0",
      "EPSG:900913:1",
      "EPSG:900913:2",
      "EPSG:900913:3",
      "EPSG:900913:4",
      "EPSG:900913:5",
      "EPSG:900913:6",
      "EPSG:900913:7",
      "EPSG:900913:8",
      "EPSG:900913:9",
      "EPSG:900913:10",
      "EPSG:900913:11",
      "EPSG:900913:12",
      "EPSG:900913:13",
      "EPSG:900913:14",
      "EPSG:900913:15",
    ],
  });
  viewer.imageryLayers.addImageryProvider(wmts);
}
