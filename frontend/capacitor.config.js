// capacitor.config.js
// ⚠️  WARNING: Never ship a production APK/AAB with CAPACITOR_LIVE_RELOAD=true.
//    The dev-server URL (http://10.0.2.2:3000) is only reachable from the
//    Android emulator during local development. A production build must
//    serve from the bundled "build/" folder (the default behavior).

const isLiveReload = process.env.CAPACITOR_LIVE_RELOAD === 'true';

/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.hpi.fitness',
  appName: 'HPI',
  webDir: 'build',
  server: {
    // In live-reload mode, use http scheme and load from the React dev server
    // via the Android-emulator loopback alias. In production, omit these so
    // Capacitor serves the bundled build/ folder over its default https scheme.
    ...(isLiveReload && {
      androidScheme: 'http',
      cleartext: true,
      url: 'http://10.0.2.2:3000',
    }),
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0b10',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      keepShowSplit: true,
    },
  },
};

module.exports = config;
