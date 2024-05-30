import Vue from 'vue';
import VueRouter from 'vue-router';
import HomeView from '../views/HomeView.vue';

Vue.use(VueRouter);

const routes = [
  // {
  //   path: '/',
  //   name: 'home',
  //   component: HomeView
  // },
  {
    path: '/',
    name: 'about',
    component: () => import(/* webpackChunkName: "about" */ '../views/AboutView.vue')
  },
];

// const router = new VueRouter({
//   mode: 'history',
//   base: process.env.BASE_URL,
//   routes
// });
const router = new VueRouter({
  routes,
});
const originalPush = VueRouter.prototype.push;

VueRouter.prototype.push = function push (location) {
  return originalPush.call(this, location).catch(err => err);
};

export default router;
