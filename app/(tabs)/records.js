import { SafeAreaView } from "react-native-safe-area-context";
import {HistoryScreen} from "../../components/HistoryScreen"

export default function Records() {
    return (
        <SafeAreaView className="flex-1">
            <HistoryScreen></HistoryScreen>
        </SafeAreaView>
    )
}