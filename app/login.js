import { SafeAreaView } from "react-native-safe-area-context";
import { View,Text } from "react-native";
import {LoginScreen} from "../components/LoginScreen"

export default function Login(){
    return (
        <SafeAreaView className="flex-1">
            <LoginScreen></LoginScreen>
        </SafeAreaView>
    );
}