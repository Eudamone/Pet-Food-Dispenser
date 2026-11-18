import { SafeAreaView } from "react-native-safe-area-context";
import {CreateScheduleScreen} from "../components/CreateScheduleScreen"

export default function createSchedule(){
    return (
            <SafeAreaView className="flex-1">
                <CreateScheduleScreen></CreateScheduleScreen>
            </SafeAreaView>
        );
}