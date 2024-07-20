import mediumZoom from "medium-zoom";
import { useRoute } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { nextTick, onMounted, watch } from "vue";

import "./index.css";

export default {
  ...DefaultTheme,

  setup() {
    const route = useRoute();
    const initZoom = () => {
      new mediumZoom("[data-zoomable]", { background: "rgba(0, 0, 0, 0.7)" });
    };
    onMounted(() => {
      initZoom();
    });
    watch(
      () => route.path,
      () => nextTick(() => initZoom())
    );
  },
};
