import { SafeAreaView } from "react-native-safe-area-context"
import { ScheduleScreen } from "../../components/ScheduleScreen"

export default function Schedule() {
    return (
        <SafeAreaView className="flex-1 items-center justify-center">
            <ScheduleScreen></ScheduleScreen>
        </SafeAreaView>
    )
}