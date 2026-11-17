import {KeyboardAvoidingView,View,Text,TextInput,Pressable} from 'react-native'
import {Image} from 'expo-image'
import {Cat} from '../components/Icons'
import {useRouter} from 'expo-router'

export  function LoginScreen(){
    const router = useRouter();

    const  handleLogin = () => {
        router.replace('/(tabs)');
    };

    return (
        <KeyboardAvoidingView className="flex-1">
            <View className="flex-1">
                {/*Area de Imagen de Gatos*/}
                <View className="h-96 w-full items-center justify-end overflow-hidden pt-10 rounded-b-[60px]">
                    <Image
                        source={require('../assets/imagen_gatos.png')}
                        style={{ width:'100%', height: '100%',top:0,position:'relative'}}
                        contentFit='contain'
                    />
                </View>

                {/*Area para formulario y icono de pata de gato*/}
                <View className="flex-1 relative -mt-12">
                    <View className="absolute inset-0 bg-[#381008] rounded-t-[100%] scale-x-150 z-0"/>
                            
                    {/*Contenido para la franja cafe*/}     
                    <View className="flex-1 px-7 pt-12 pb-8 items-center justify-center z-10">
                        <View className="absolute -top-7 bg-[#FDFBEB] w-16 h-14 items-center justify-center elevation-5 shadow-lg z-20"
                                style={{
                                    borderRadius: 28,
                                    borderTopLeftRadius: 35,
                                    borderBottomRightRadius: 35,
                                    borderTopRightRadius: 25,
                                    borderBottomLeftRadius: 25,
                                }}
                        >
                            <Cat size={30} color="#381008"/>
                        </View>

                        <View className="w-full  items-center gap-y-6 ">
                            <Text className="mt-8 tracking-wider"
                                style={{fontFamily:'titan-one',color:'#F57302',fontSize:60}}
                            >
                                LOGIN
                            </Text>

                            {/*Formulario*/}
                            <View className="w-full gap-y-4 my-auto">
                                <View className="bg-[#FDFBEB] rounded-full h-16 px-5 justify-center ">
                                    <TextInput
                                        placeholder='Email o Username'
                                        placeholderTextColor="#8C736C"
                                        autoCapitalize='none'
                                        className="text-base text-[#381008] font-calm"
                                    />
                                </View>

                                <View className="bg-[#FDFBEB] rounded-full h-16 px-5 justify-center ">
                                    <TextInput
                                        placeholder='Contraseña'
                                        placeholderTextColor="#8C736C"
                                        
                                        className="text-base text-[#381008] font-calm"
                                    />
                                </View>

                                <Pressable
                                    onPress={handleLogin}
                                    android_ripple={{ color: 'rgba(56, 16, 8, 0.15)', borderless: false }}
                                    className="bg-[#FFFEDC] rounded-full h-16 justify-center mt-2 px-2 self-center overflow-hidden"
                                    style={({ pressed }) => [
                                        {
                                        transform: [{ scale: pressed ? 0.96 : 1 }],
                                        opacity: pressed ? 0.9 : 1,
                                        },
                                    ]}
                                    >
                                    {({ pressed }) => (
                                        <View className="flex-row items-center gap-4">
                                            {/* El icono rota un poco (5 grados) solo mientras se presiona */}
                                            <View
                                                className="bg-[#F57302] rounded-full w-[50px] h-[50px] items-center justify-center"
                                                style={{
                                                transform: [{ rotate: pressed ? '-8deg' : '0deg' }],
                                                }}
                                            >
                                                <Cat size={35} color="#FFFEDC" />
                                            </View>

                                            <View className="items-center justify-center pr-4">
                                                <Text className="font-titan text-[#381008] text-2xl">INGRESAR</Text>
                                            </View>
                                        </View>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                        
                    </View>
                    
                </View>
            </View>
        </KeyboardAvoidingView>
    )
}