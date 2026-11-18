import {View, Text, Pressable} from "react-native"
import { UserAvatar } from "./UserAvatar";
import {Pencil,Next} from "./Icons"
import { useState } from "react";
import CustomSwitch from "./CustomSwitch"

export function SettingsScreen(){
    const [isEnabled,setIsEnabled] = useState(true);

    return (
        <View className="w-full flex-1 mt-4 p-6">
            <View>
                <Text className="font-titan text-4xl text-[#3A1508]">
                    Ajustes
                </Text>
            </View>

            <View className="flex-row bg-[#7A35B8] mt-4 rounded-3xl p-4 gap-x-4 justify-center items-center">
                <Pressable>
                    <UserAvatar id={"default"} size={60}></UserAvatar>
                </Pressable>

                <View className="justify-center flex-1">
                    <Text className="font-titan text-white text-3xl">
                        Pelusa
                    </Text>
                    <Text className="font-titan text-white text-sm tracking-wider">
                        Gato · 3 años · 4.2 kg
                    </Text>
                </View>

                <Pressable className="bg-[#F47A0B] rounded-full items-center justify-center min-w-14 min-h-14 h-14 w-14">
                    <Pencil size={20} color={"#3A1508"}></Pencil>
                </Pressable>
            </View>

            <View className="bg-[#3A1508] mt-4 p-4 rounded-3xl gap-y-3">
                

                <View className="flex-row justify-between items-center">
                    <View>
                        <Text className="text-[#F47A0B] font-titan uppercase text-xl">
                            dispositivo
                        </Text>

                        <Text className="text-white text-2xl font-titan -tracking-widest">
                            Alimentador de Pelusa
                        </Text>
                    </View>
                    <Pressable className="bg-[#F47A0B] rounded-full items-center justify-center min-w-14 min-h-14 h-14 w-14">
                        <Pencil size={20} color={"#3A1508"}></Pencil>
                    </Pressable>
                </View>

                <View className="flex-row gap-x-3">
                    <View className="flex-1 bg-[#52291A] rounded-3xl p-4 gap-y-1">
                        <Text className="text-[#F6C79A] font-calm text-lg">
                            Red Wi-fi
                        </Text>
                        <Pressable className="flex-row gap-x-2">
                            <Text className="text-white font-calm text-2xl">
                                Int_Hogar
                            </Text>
                            <Next size={18} color={"#F47A0B"}></Next>
                        </Pressable>
                    </View>

                    <View className="flex-1 bg-[#52291A] rounded-3xl p-4 gap-y-1">
                        <Text className="text-[#F6C79A] font-calm text-lg">
                            Zona horaria
                        </Text>
                        <Pressable className="flex-row gap-x-2">
                            <View>
                                <Text className="text-white font-calm text-2xl">
                                    Bogota
                                </Text>
                                <Text className="text-white font-calm text-sm">
                                    UTC-5
                                </Text>
                            </View>
                            <Next size={18} color={"#F47A0B"}></Next>
                        </Pressable>
                    </View>
                </View>
            </View>

            <View className="bg-[#FFFBE8] mt-4 p-4 rounded-3xl flex-row items-center justify-between">
                <View>
                    <Text className="font-titan text-[26px] text-[#3A1508]">
                        Notificaciones
                    </Text>

                    <Text className="font-calm text-base text-[#6B4A3E]">
                        Depósito bajo y fallas del dispensador
                    </Text>
                </View>

                <CustomSwitch width={70} height={38} value={isEnabled} onValueChange={setIsEnabled}></CustomSwitch>
            </View>

            <View className="mt-4 flex-1 items-center">
                <Pressable className="bg-[#C79BEA] w-[180px] h-14 items-center justify-center rounded-full">
                    <Text className="font-calm text-lg">
                        Cerrar sesión
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}