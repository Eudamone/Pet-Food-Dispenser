import {Slot,SplashScreen,Stack} from "expo-router"
import {useFonts} from "expo-font"
import {useEffect} from "react"
import "../global.css"
import { SafeAreaProvider } from "react-native-safe-area-context";
import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Previene que la pantalla de splash se oculte automáticamente
SplashScreen.preventAutoHideAsync();

configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false,
});

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
        <GestureHandlerRootView style={{flex: 1}}>
            <SafeAreaProvider>
                <Stack screenOptions={{headerShown:false}}>
                    {/* Login: Deshabilitamos el gesto de volver atrás en iOS/Android */}
                    <Stack.Screen
                        name="login"
                        options={{gestureEnabled:false}}
                    />

                    {/* Flujo de Tabs */}
                    <Stack.Screen
                        name="(tabs)"
                        options={{gestureEnabled:false}}
                    />
                    
                    <Stack.Screen
                        name="createSchedule"
                        options={{}}
                    />
                </Stack>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    )
}