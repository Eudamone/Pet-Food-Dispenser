import {Slot,SplashScreen} from "expo-router"
import {useFonts} from "expo-font"
import {useEffect} from "react"
import "../global.css"
import { SafeAreaProvider } from "react-native-safe-area-context";

// Previene que la pantalla de splash se oculte automáticamente
SplashScreen.preventAutoHideAsync();

export default function Layout() {
    const [loaded, error] = useFonts({
    'titan-one': require('../assets/fonts/TitanOne-Regular.ttf'),
    'keep-calm': require('../assets/fonts/KeepCalm-Medium.ttf'),
    });

    useEffect(() => {
        if (loaded || error) {
        SplashScreen.hideAsync();
        }
    }, [loaded, error]);

    if (!loaded && !error) {
        return null; // Mantiene la pantalla de carga nativa hasta que la fuente esté lista
    }


    return (
        <SafeAreaProvider>
            <Slot></Slot>
        </SafeAreaProvider>
    )
}