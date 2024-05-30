import {
  ImageryLayer, ImageryProvider, DataSource, Globe,
} from 'cesium';

export class MapboxVectorTileImageryLayer extends ImageryLayer {
  constructor(imageryProvider, dataSource, globe, options) {
    super(imageryProvider, options);
    this.dataSource = dataSource;
    this.globe = globe;
    this.globe.tileLoadProgressEvent.addEventListener(this.handleTileLoadProgressEvent.bind(this)); 
  }

  // @ts-ignore
  handleTileLoadProgressEvent(tiles) {
    if (!tiles) {
      // @ts-ignore
      // eslint-disable-next-line no-underscore-dangle
      const ttr = this.globe._surface._tilesToRender;
      // @ts-ignore
      // eslint-disable-next-line no-underscore-dangle
      const maximumLevel = this._imageryProvider.maximumLevel;
      // @ts-ignore
      // eslint-disable-next-line no-underscore-dangle
      const level = ttr.map((tile) => tile._level).reduce((a, b) => Math.max(a, b), 0);
      if (!maximumLevel || level <= maximumLevel) {
        this.dataSource.entities.suspendEvents();

        // @ts-ignore
        // eslint-disable-next-line no-underscore-dangle
        const toKeep = ttr.map((tile) => `${tile._x}_${tile._y}_${tile._level}`);
        // @ts-ignore
        // eslint-disable-next-line no-underscore-dangle
          // console.log(this._imageryProvider);
          // debugger;
        Object.entries(this._imageryProvider.visibleTiles).forEach(([mggKey, entityArray]) => {
          // @ts-ignore
          entityArray.forEach((entity) => {
            entity.show = toKeep.includes(mggKey);
          });
        });

        this.dataSource.entities.resumeEvents();
        // @ts-ignore
        // eslint-disable-next-line no-underscore-dangle
        this.dataSource._changed.raiseEvent(this.dataSource);
      }
    }
  }

  // @ts-ignore
  removeImageryFromCache(imagery) {
    // @ts-ignore
    super.removeImageryFromCache(imagery);

    const mggKey = `${imagery.x}_${imagery.y}_${imagery.level}`;
    // @ts-ignore
    // eslint-disable-next-line no-underscore-dangle
    const entityArray = this._imageryProvider.visibleTiles[mggKey];
    if (entityArray) {
      this.dataSource.entities.suspendEvents();
      // @ts-ignore
      entityArray.forEach((entity) => {
        this.dataSource.entities.remove(entity);
      });

      // @ts-ignore
      // eslint-disable-next-line no-underscore-dangle
      delete this._imageryProvider.visibleTiles[mggKey];

      this.dataSource.entities.resumeEvents();

      // @ts-ignore
      // eslint-disable-next-line no-underscore-dangle
      this.dataSource._changed.raiseEvent(this.dataSource);
    }
  }
}
