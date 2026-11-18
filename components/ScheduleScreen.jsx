import { View, Text, Pressable,ScrollView } from "react-native";
import {Plus} from "./Icons"
import { ScheduleCard } from "./ScheduleCard";
import {useState} from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {SegmentedProgressBar} from "./SegmentedProgressBar"
import {useRouter} from "expo-router"

export function ScheduleScreen(){
    const router = useRouter();

    const [almuerzoEnabled,setAlmuerzoEnabled] = useState(true);

    const datosGramo = [35,35,25]

    const handleCreateSchedule = () => {
        router.push('/createSchedule')
    }

    const insets = useSafeAreaInsets();
    return (
        <View className="w-full flex-1 mt-4 p-6">
            <View>
                <Text
                    className="font-titan text-4xl text-[#3A1508]"
                >
                    Horarios
                </Text>
            </View>

            <View
                className="bg-[#7A35B8] mt-6 rounded-2xl"
            >
                <View
                    className="flex-row justify-between pl-4 pr-4 pt-3 pb-2 items-center"
                >
                    <Text
                        className="font-calm text-lg text-[#FFFBE8]"
                    >
                        TOTAL DIARIO PROGRAMADO
                    </Text>
                    <Text
                        className="font-titan text-[#FFFBE8] text-4xl"
                    >
                        80g
                    </Text>
                </View>

                <View className="pr-4 pl-4 pb-2 pt-4">
                    <SegmentedProgressBar values={datosGramo}/>
                </View>
                
                <View className="pl-4 pr-4 pb-4 pt-2">
                    <Text className="font-calm text-white">
                        Recomendado 80g · límite por comida 40g
                    </Text>
                </View>
            </View>

            <ScrollView className="flex-1 mt-4" contentContainerStyle={{paddingBottom: insets.bottom + 50}} showsVerticalScrollIndicator={false}>
                <ScheduleCard
                    time="12:00"
                    portion="25g"
                    label="Almuerzo"
                    enabledDays={['L', 'M', 'X', 'J', 'V']}
                    enabled={almuerzoEnabled}
                    onToggleEnabled={setAlmuerzoEnabled}
                ></ScheduleCard>

                <View
                    className="flex items-center mt-6"
                >
                    <Pressable
                        className="flex-row items-center justify-center active:opacity-80 gap-x-2 bg-[#FFC93C] w-full rounded-full min-h-16"
                        onPress={handleCreateSchedule}
                    >
                        <Plus></Plus>
                        <Text
                            className="font-calm text-lg"
                        >
                            Agregar horario
                        </Text>
                    </Pressable>
                </View>

            </ScrollView>

        </View>
    )
}