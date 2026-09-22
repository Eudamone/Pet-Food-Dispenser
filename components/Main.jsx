import { StatusBar } from "expo-status-bar";
import {View,Text} from "react-native"
import { Bell } from "./Icons";


export function Main() {

    return (
        <View className="w-full flex-1 mt-4 p-6">
            <StatusBar style="dark"></StatusBar>
            <View className="flex flex-row">
                <View className="flex flex-row flex-4 bg-[#FFFEDC] rounded-[50px] h-[60px] w-[270px] items-center">
                    <View className="w-[50px] h-[50px] bg-[#ccc] rounded-[50px] items-center justify-center">
                        <Text style={{fontFamily: 'titan-one', fontSize: 20}}>AD</Text>
                    </View>
                    <View className="ml-2">
                        <Text style={{fontFamily:'keep-calm', fontSize:12}}>Bienvenido</Text>
                        <Text style={{fontFamily: 'titan-one', fontSize: 25}}>Adrian Daza</Text>
                    </View>
                </View>
                <View className="flex-1 items-end">
                    <View className="w-[50px] h-[50px] bg-[#390301] rounded-full items-center justify-center">
                        <Bell color="#FA6F00"/>
                    </View>
                </View>
            </View>
            
        </View>
    );
}