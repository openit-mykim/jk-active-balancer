const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

// apps/mobile is a standalone npm project (decision D005 / D013): the shared
// workspace packages are consumed as TypeScript source straight from
// ../../packages, mapped by name below.
const repoRoot = path.resolve(__dirname, "../..");
const shared = ["jk-protocol", "device-model", "ble-core", "ble-react-native", "ui-common"];

const config = {
  watchFolders: [path.join(repoRoot, "packages")],
  resolver: {
    extraNodeModules: Object.fromEntries(
      shared.map((name) => [`@jk-active-balancer/${name}`, path.join(repoRoot, "packages", name)]),
    ),
    // Only this app's node_modules: never pick up the web app's React.
    nodeModulesPaths: [path.join(__dirname, "node_modules")],
    blockList: [/packages\/[^/]+\/node_modules\/.*/],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
