import { SafeAreaView } from "react-native-safe-area-context";
import {NotificationsScreen} from "./../components/NotificationsScreen"

export default function Notifications(){
    return (
        <SafeAreaView className="flex-1">
            <NotificationsScreen></NotificationsScreen>
        </SafeAreaView>
    );
}