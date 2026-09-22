import {View,Text} from "react-native"
import { Main } from "../../components/Main"
import { SafeAreaView } from "react-native-safe-area-context"

export default function Index() {
    return (
        <SafeAreaView className="flex-1 items-center justify-center">
            <Main></Main>
        </SafeAreaView>
    )
}