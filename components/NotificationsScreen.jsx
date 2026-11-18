import {View,Text,Pressable} from "react-native"
import {useRouter} from "expo-router"
import {Back} from "./Icons"

export function NotificationsScreen(){
    const router = useRouter();

    return (
        <View className="w-full flex-1 mt-4 p-6">
            <View className="flex-row gap-x-4 items-center">
                <Pressable className="bg-[#FFFBE8] min-w-14 min-h-14 rounded-full items-center justify-center shadow-md"
                    onPress={() => {router.back()}}
                >
                    <Back></Back>
                </Pressable>
                <Text className="font-titan text-4xl tracking-wider">
                    Notificaciones
                </Text>
            </View>

            <View className="mt-4">
                <Text className="font-titan text-xl">
                    Hoy
                </Text>
            </View>
        </View>
    )
}