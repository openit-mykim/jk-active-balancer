import { AppRegistry } from "react-native";
import { installCrashHandler } from "./src/crash-store";
import { App } from "./src/App";
import { name as appName } from "./app.json";

// Before anything else can throw (wiki mobile standard 7: crash collection, local only).
installCrashHandler();

AppRegistry.registerComponent(appName, () => App);
