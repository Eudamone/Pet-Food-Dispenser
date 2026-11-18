import { SafeAreaView } from "react-native-safe-area-context";
import {SettingsScreen} from "../../components/SettingsScreen"

export default function Configuration() {
    return (
        <SafeAreaView className="flex-1">
            <SettingsScreen></SettingsScreen>
        </SafeAreaView>
    )
}