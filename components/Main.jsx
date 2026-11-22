import {View,Text,Pressable} from "react-native"
import { Bell,Pause } from "./Icons";
import { UserAvatar } from "./UserAvatar";
import {useRouter} from "expo-router"

export function Main() {
    const router = useRouter();

    const handleNotificationsScreen = () => {
        router.push('/notifications')
    }

    return (
        <View className="w-full flex-1 mt-4 p-6">
            <View className="flex flex-row items-center">
                <View className="flex flex-row flex-4 bg-[#FFFEDC] rounded-[50px] h-[60px] w-[270px] items-center">
                    <UserAvatar id={"default"} size={60}></UserAvatar>
                    <View className="ml-2">
                        <Text style={{fontFamily:'keep-calm', fontSize:12}}>Bienvenido</Text>
                        <Text style={{fontFamily: 'titan-one', fontSize: 25}}>Adrian Daza</Text>
                    </View>
                </View>
                <View className="flex-1 items-end">
                    <Pressable className="w-[60px] h-[60px] bg-[#390301] rounded-full items-center justify-center"
                        onPress={handleNotificationsScreen}
                    >
                        <Bell color="#FA6F00"/>
                    </Pressable>
                </View>
            </View>

            <View className="flex bg-[#7A35B8] mt-6 rounded-2xl">
                <View className="flex flex-row p-4 justify-between items-center">
                    <Text className="font-titan text-4xl text-white">Pelusa</Text>
                    <View className="flex flex-row items-center gap-1 bg-[#FFC93C] rounded-full min-w-28 min-h-8 justify-center">
                        <View className="w-4 h-4 bg-green-400 rounded-full"></View>
                        <Text className="font-calm text-base">En Linea</Text>
                    </View>
                </View>
                <View className="flex flex-row pt-2 pl-4 pr-4 pb-0 gap-x-3">
                    <View className="flex-1 p-3 bg-[#5E2593] rounded-3xl min-w-24 min-h-10">
                        <Text className="font-calm text-white">Compuerta</Text>
                        <Text className="font-titan text-white text-2xl">Cerrada</Text>
                    </View>
                </View>
                <View className="flex flex-row pt-2 pl-5 pr-4 pb-2">
                    <Text className="font-calm text-white ">Ultima conexión hace - min</Text>
                </View>
            </View>

            <View className="flex flex-row pt-5 gap-x-4">
                <View className="flex flex-1 bg-[#FFC93C] rounded-3xl p-3 justify-between shadow-md">
                    <Text className="font-bold text-[#3A1508] text-lg tracking-wider">PRÓXIMA COMIDA</Text>
                    <Text className="font-titan text-7xl my-1">18:00</Text>
                    <View className="w-full border-t-2 border-dashed border-[#3A1508]"></View>
                    <Text className="font-calm text-lg">Porción programada · 25 g</Text>
                </View>
                <Pressable
                    className="flex bg-[#fff] rounded-3xl p-4 items-center justify-center shadow-md"
                    onPress={() => router.push('/(tabs)/records')}
                >
                    <Text className="font-calm text-[#3A1508]">Ver historial</Text>
                </Pressable>
            </View>

            <View className="flex-row items-center pt-5 gap-x-3">
                <Pressable
                    className="flex-1 bg-[#2C140E] active:opacity-80 py-4 px-3 rounded-full items-center justify-center shadow-md elevation-2"
                    onPress={() => console.log('Dispensar')}
                >
                    <Text 
                        className="text-white font-bold text-lg tracking-wide"
                    >
                        Dispensar
                    </Text>
                </Pressable>
                    
                <Pressable
                    className="flex-1 bg-[#FFC93C] active:opacity-80 py-4 px-3 rounded-full items-center justify-center shadow-md elevation-2"
                    onPress={() => console.log('Omitir')}
                >
                    <Text className="text-[#3A1508] font-bold text-lg tracking-wide text-center">
                        Omitir proxima
                    </Text>
                </Pressable>

                <Pressable
                    className="bg-[#CDB4DB] w-14 h-14 active:opacity-80 rounded-full items-center justify-center shadow-md elevation-2"
                    onPress={() => console.log('Pausar')}
                >
                    <Pause color="#3A1508" size={20}></Pause>
                </Pressable>
            </View>
        </View>
    );
}