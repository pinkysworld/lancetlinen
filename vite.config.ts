import { defineConfig } from 'vite';
import packageInfo from './package.json';

export default defineConfig({
  base: './',
  define: {
    // Keep the browser build and Electron package on one release number.
    __APP_VERSION__: JSON.stringify(packageInfo.version),
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    // Phaser itself is a deliberately isolated 1.38 MB minified runtime
    // chunk. Warn when a *larger* dependency appears, rather than treating
    // that known, independently cacheable renderer as an app-content failure.
    chunkSizeWarningLimit: 1400,
    // Phaser is the large, stable runtime behind every scene. Keeping it in
    // its own cacheable chunk means content patches no longer invalidate the
    // renderer download, while i18next stays out of the game-logic chunk too.
    // This is Rolldown's current replacement for Rollup's manualChunks.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'phaser', test: /node_modules[\\/]phaser[\\/]/, priority: 20 },
            { name: 'i18n', test: /node_modules[\\/]i18next[\\/]/, priority: 10 },
            // Scene groups mirror what players reach together. They keep the
            // content cacheable without a risky asynchronous Phaser scene
            // registry (Phaser must know every scene before boot completes).
            {
              // Vite can give source modules a query suffix during its
              // transform. A dynamic Rolldown group is therefore more robust
              // than filename-ending regular expressions here.
              name(moduleId) {
                const id = moduleId.split(String.fromCharCode(92)).join('/');
                if (!id.includes('/src/game/scenes/')) return null;
                if (/(Character|Dialogue|Hub|Treatment|TravelScene|DaySummary|ScenarioScene|LepraschauScene)/.test(id)) return 'scene-gameplay';
                if (/(MarketStudyScenes|PropertyScene|FeatureScenes|CorrespondenceScene|CivicScene|LexiconScene|RecipeScene|SaveSlotScene)/.test(id)) return 'scene-management';
                return 'scene-shell';
              },
              priority: 8,
            },
          ],
        },
      },
    },
  },
});
