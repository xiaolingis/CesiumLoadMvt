<template>
  <!-- <render /> -->
  <div></div>
</template>

<script>
import * as Cesium from "cesium";

export default {
  data() {
    return {
      needNewDataSource: false,
      dataSource: undefined,
    };
  },
  props: {
    csEvents: null,
    name: null,
    index: null,
    show: null,
  },
  mounted() {
    this.updateDataSource();
  },
  methods: {
    updateDataSource() {
      this.dataSource = new Cesium.CustomDataSource(this.name);
      this.csEvents.updateDataSource(this.dataSource, this.index);
      this.needNewDataSource = false;
    },
  },
  watch: {
    needNewDataSource(newValue) {
      if (!this.needNewDataSource && newValue) {
        this.updateDataSource();
      }
    },
    index() {
      this.needNewDataSource = true;
    },
    name(newValue) {
      if (newValue === undefined) {
        this.needNewDataSource = true;
      } else if (this.dataSource) {
        this.dataSource.name = newValue;
      }
    },
    show(newValue) {
      if (newValue === undefined) {
        this.needNewDataSource = true;
      } else if (this.dataSource) {
        this.dataSource.show = newValue;
      }
    },
  },
  // render(h) {
  //   return h('div', [h('my-component')]);
  // },
};
</script>
