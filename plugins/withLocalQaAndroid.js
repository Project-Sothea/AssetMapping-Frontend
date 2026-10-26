const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withLocalQaAndroid(config, { enabled = false } = {}) {
  return withAndroidManifest(config, (result) => {
    const application = result.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error('The QA Android manifest must contain an application.');
    }
    application.$['android:usesCleartextTraffic'] = enabled ? 'true' : 'false';
    return result;
  });
};
