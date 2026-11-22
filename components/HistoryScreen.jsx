import { ScrollView, Text, View } from "react-native";

export function HistoryScreen({ records = [] }) {
    return (
        <ScrollView className="w-full flex-1 mt-4 p-6">
            <Text className="font-titan text-4xl text-[#3A1508]">
                Historial
            </Text>
            {records.length === 0 ? (
                <View className="bg-[#7A35B8] rounded-3xl mt-6 p-6">
                    <Text className="font-calm text-white">
                        Sin visitas registradas
                    </Text>
                </View>
            ) : (
                records.map((record) => (
                    <View key={record.id} className="bg-[#FFFBE8] rounded-3xl mt-4 p-4 gap-y-2">
                        <Text className="font-calm text-[#3A1508]">
                            {record.accountingDay}
                        </Text>
                        <Text className="font-calm text-[#3A1508]">
                            {record.status === "closed" ? "Visita finalizada" : "Visita interrumpida"}
                        </Text>
                        {record.openedAt && (
                            <Text className="font-calm text-[#6B4A3E]">
                                Entrada · {new Date(record.openedAt).toLocaleTimeString()}
                            </Text>
                        )}
                        {record.closedAt && (
                            <Text className="font-calm text-[#6B4A3E]">
                                Salida · {new Date(record.closedAt).toLocaleTimeString()}
                            </Text>
                        )}
                    </View>
                ))
            )}
        </ScrollView>
    );
}
