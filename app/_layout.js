import { Slot, SplashScreen } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import "../global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "../components/Session";

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [loaded, error] = useFonts({
    "titan-one": require("../assets/fonts/TitanOne-Regular.ttf"),
    "keep-calm": require("../assets/fonts/KeepCalm-Medium.ttf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <Slot />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
