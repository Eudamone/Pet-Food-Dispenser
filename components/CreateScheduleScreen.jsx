import {View,Text,Pressable,TextInput} from "react-native"
import {Back} from "./Icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import TimePickerSlide from "./TimePicker"
import Counter from "./Counter"

const BUTTONSDAYS = [
    {id: 1, label: 'L'},
    {id: 2, label: 'M'},
    {id: 3, label: 'X'},
    {id: 4, label: 'J'},
    {id: 5, label: 'V'},
    {id: 6, label: 'S'},
    {id: 7, label: 'D'},
];

export function CreateScheduleScreen(){
    const router = useRouter();
    const [selectedIds,setSelectedIds] = useState({});

    const toggleButton = (id) => {
        setSelectedIds((prev) => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    return (
        <View className="w-full flex-1 mt-4 p-6">
            <View className="flex-row gap-x-4 items-center">
                <Pressable className="bg-[#FFFBE8] min-w-14 min-h-14 rounded-full items-center justify-center shadow-md"
                    onPress={() => {router.push('/(tabs)/schedule')}}
                >
                    <Back></Back>
                </Pressable>

                <Text className="font-titan text-4xl tracking-wider">
                    Nuevo horario
                </Text>
            </View>

            <View className="bg-[#7A35B8] mt-4 items-center pt-4 pb-4 rounded-xl gap-y-3">
                <Text className="font-calm text-white">
                    HORA DE LA COMIDA
                </Text>

                <TimePickerSlide
                    itemHeight={80}
                    itemWidth={120}
                    fontSize={64}
                    fontClassName="font-titan"
                ></TimePickerSlide>

                <Text className="font-calm text-white text-sm">
                    Hora local · UTC-5
                </Text>
            </View>

            <View className="bg-[#FFFBE8] mt-4 pl-4 pr-4 pt-4 pb-4 gap-y-2 rounded-3xl shadow-md">
                <Text className="font-calm ">
                    NOMBRE
                </Text>

                <TextInput className="bg-[#EADFB8] rounded-2xl min-h-14 pl-4 pr-4 font-calm">
                    Snack 1
                </TextInput>
            </View>


            <View className="bg-[#FFFBE8] mt-4 pl-4 pr-4 pt-4 pb-4 rounded-3xl gap-y-3">
                <Text className="font-calm">
                    PORCIÓN PROGRAMADA
                </Text>

                <Counter
                    init={5}
                    step={1}
                    min={0}
                    max={40}
                ></Counter>

                <View className="bg-[#FFC93C] rounded-3xl items-center min-h-8 justify-center">
                    <Text className="font-calm text-sm">
                        Cantidad solicitada por horario
                    </Text>
                </View>
            </View>


            <View className="bg-[#FFFBE8] mt-4 pl-4 pr-4 pt-4 pb-4 rounded-3xl">
                <Text className="font-calm">
                    DÍAS
                </Text>

                <View className="flex-row pt-3 gap-x-2">
                    {BUTTONSDAYS.map((item) => {
                        const isSelected = Boolean(selectedIds[item.id]);

                        return (
                            <Pressable
                                key={item.id}
                                onPress={() => toggleButton(item.id)}
                                className={`px-4 py-3 min-w-12 min-h-10 items-center justify-center rounded-3xl transition-colors ${
                                    isSelected ? 'bg-[#3A1508]' : 'bg-[#EADFB8]'
                                }`}
                            >
                                <Text
                                    className={`font-medium ${
                                        isSelected ? 'text-white' : 'text-black'
                                    }`}
                                >
                                    {item.label}
                                </Text>
                            </Pressable>
                        )
                    })}
                </View>
            </View>

            <View className="absolute bottom-0 left-0 right-0 p-4 ">
                <Pressable className="bg-[#3A1508] min-h-16 justify-center items-center rounded-full">
                    <Text className="font-calm text-white text-lg">
                        Guardar horario
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}