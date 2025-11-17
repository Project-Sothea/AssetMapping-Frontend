export default function (api) {
  api.cache(true);
  let plugins = [['inline-import', { extensions: ['.sql'] }]];

  return {
    presets: ['babel-preset-expo'],

    plugins,
  };
}
