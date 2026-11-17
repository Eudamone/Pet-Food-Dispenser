import { Tabs } from "expo-router";
import { View, TouchableOpacity } from "react-native";
import { HomeIcon, ClockRotate, Gear } from "../../components/Icons";

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        position: "absolute",
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: "#FFFEDC",
        borderRadius: 30,
        height: 70,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const Icon = options.tabBarIcon;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: isFocused ? "#390301" : "#ccc",
              alignItems: "center",
              justifyContent: "center", // 🔑 centra el ícono
            }}
          >
            {Icon({ color: isFocused ? "#FA6F00" : "#333" })}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: "Historial",
          tabBarIcon: ({ color }) => <ClockRotate color={color} />,
        }}
      />
      <Tabs.Screen
        name="configuration"
        options={{
          title: "Configuración",
          tabBarIcon: ({ color }) => <Gear color={color} />,
        }}
      />
    </Tabs>
  );
}
