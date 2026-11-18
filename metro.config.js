const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// 1. Obtener la configuración predeterminada de Expo
const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

// 2. Aplicar la configuración para react-native-svg-transformer
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
};

// 3. Envolver el resultado final con NativeWind
module.exports = withNativeWind(config, { input: "./global.css" });