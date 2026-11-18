import {View, Text, Pressable, Switch} from "react-native";

const DAYS = [
    {label: 'L' , key: 'L'},
    {label: 'M' , key: 'M'},
    {label: 'X' , key: 'X'},
    {label: 'J' , key: 'J'},
    {label: 'V' , key: 'V'},
    {label: 'S' , key: 'S'},
    {label: 'D' , key: 'D'},
];

export const ScheduleCard = ({
    time,
    portion,
    label,
    enabledDays = [],
    enabled,
    onToggleEnabled,
    isNextMeal = false,
    onPress,
    isFirstItem = false,
    isLastItem = false,
}) => {
    return (
        <View className="flex-row items-stretch w-full my-2">
            {/* Elemento Decorativo (Línea conectora continua) */}
            <View className="w-6 mr-3 items-center relative">
                {/* Línea vertical continua que ocupa exactamente el 100% de la altura */}
                <View className="absolute top-0 bottom-0 w-[2px] bg-[#E8DECE]" />

                {/* Oculta la parte superior de la línea si es el primer elemento */}
                {isFirstItem && (
                    <View className="absolute top-0 h-1/2 w-[2px] bg-[#F5EFE3] z-10" />
                )}

                {/* Oculta la parte inferior de la línea si es el último elemento */}
                {isLastItem && (
                    <View className="absolute bottom-0 h-1/2 w-[2px] bg-[#F5EFE3] z-10" />
                )}

                {/* Círculo conector (siempre centrado verticalmente por encima de la línea) */}
                <View
                    className={`w-4 h-4 rounded-full border-2 bg-[#FDF8EB] items-center justify-center z-20 ${
                        isNextMeal ? 'border-[#F06A0A]' : 'border-[#4A2619]'
                    }`}
                >
                    {isNextMeal && <View className="w-2 h-2 rounded-full bg-[#F06A0A]" />}
                </View>
            </View>
            
            {/*Tarjeta principal */}
            <Pressable
                onPress={onPress}
                className={`flex-1 bg-[#FDF8EB] rounded-3xl p-4 border-2 shadow-sm ${
                    isNextMeal ? 'border-[#F06A0A]' : 'border-transparent'
                }`}
            >
                <View className="flex-row items-center justify-between">
                    <Text className="text-3xl font-titan text-[#3A1508]">
                        {time}
                    </Text>

                    <Switch
                        value={enabled}
                        onValueChange={onToggleEnabled}
                        trackColor={{false: '#E2D9C8', true: '#F06A0A'}}
                        thumbColor="#FFFFFF"
                    ></Switch>
                </View>

                <View className="flex-row items-center mt-1 mb-3">
                    <Text className="text-sm font-calm text-[#6B4A3E]">
                        {portion}
                    </Text>
                    <Text className="text-sm font-calm text-[#6B4A3E] mx-1">•</Text>
                    <Text className="text-sm font-calm text-[#6B4A3E]">
                        {label}
                    </Text>
                </View>

                <View className="flex-row justify-between items-center mt-1">
                    {DAYS.map((day) => {
                        const isActive = enabledDays.includes(day.key);
                        return (
                            <View
                                key={day.key}
                                className={`w-7 h-7 rounded-full items-center justify-center ${
                                    isActive ? 'bg-[#2B170B]' : 'bg-[#ECE2D0]'
                                }`}
                            >
                                <Text
                                    className={`text-xs font-bold ${
                                        isActive ? 'text-white' : 'text-[#665448]'
                                    }`}
                                >
                                    {day.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </Pressable>
        </View>
    );
};