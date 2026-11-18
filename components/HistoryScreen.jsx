import {View,Text,Pressable} from "react-native"
import ConsumptionCard from "./ConsumptionCard"
import FilterButton from "./FilterButton"
import {useState} from "react"

export function HistoryScreen(){
    // Ejemplo utilizando useState para manejar qué datos renderizar
    const [activeTab, setActiveTab] = useState('week'); // 'day' | 'week' | 'month' | 'empty'

    // Datos según el modo
    const dataMap = {
        day: {
        '08h': 0,
        '10h': 25,
        '12h': 0,
        '14h': 40,
        '18h': 15,
        },
        week: {
        'L': 85,
        'M': 90,
        'X': 75,
        'J': 95,
        'V': 85,
        'S': 70,
        'D': 45,
        },
        month: {
        '1': 60, '2': 80, '3': 70, '4': 90, '5': 85, '6': 40, '7': 75,
        '8': 80, '9': 85, '10': 90, '11': 65, '12': 70, '13': 85, '14': 80,
        '15': 75, '16': 90, '17': 85, '18': 60, '19': 70, '20': 95, '21': 80,
        '22': 85, '23': 70, '24': 60, '25': 75, '26': 90, '27': 80, '28': 85,
        '29': 70, '30': 75,
        },
    };

    const getActiveData = () => {
        switch (currentMode) {
        case 'day': return dailyData;
        case 'week': return weeklyData;
        case 'month': return monthlyData;
        default: return null; // Para simular 'Sin datos registrados'
        }
    };

    // Configuración de las pestañas
    const tabs = [
        { id: 'week', label: 'Semana' },
        { id: 'day', label: 'Día' },
        { id: 'month', label: 'Mes' },
    ];

    // Título dinámico para la card según la vista
    const getCardTitle = () => {
        if (activeTab === 'day') return 'Consumo de hoy';
        if (activeTab === 'month') return 'Consumo mensual';
        return 'Consumo diario';
    };

    return (
        <View className="w-full flex-1 mt-4 p-6">
            <View>
                <Text className="font-titan text-4xl text-[#3A1508]">
                    Historial
                </Text>
            </View>

            <View className="flex-row gap-x-3 mt-6 bg-[#FFFBE8] min-h-16 rounded-full pl-4 pr-4 justify-center items-center">
                {tabs.map((tab) => (
                    <FilterButton
                        key={tab.id}
                        label={tab.label}
                        isActive={activeTab === tab.id}
                        onPress={() => setActiveTab(tab.id)}
                    />
                )
            )}

            </View>

            <ConsumptionCard 
                title={getCardTitle()}
                data={dataMap[activeTab]}
                mode={activeTab}
                targetValue={80}
            />

            <View className="mt-4 flex-row justify-between items-center min-h-12">
                <Text className="font-titan text-3xl">
                    Últimas comidas
                </Text>
                <Pressable>
                    <Text className="font-calm text-[#e76a03] text-lg">
                        Ver todo
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}