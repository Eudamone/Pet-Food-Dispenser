import { Redirect, Tabs } from "expo-router";
import { Text, View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeIcon, Gear } from "../../components/Icons";
import { useSession } from "../../components/Session";

function CustomTabBar({ state, descriptors, navigation }) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        position: "absolute",
        bottom: Math.max(bottom, 12),
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
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            style={{
              width: "30%",
              height: 54,
              borderRadius: 18,
              backgroundColor: isFocused ? "#390301" : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Icon({ color: isFocused ? "#FA6F00" : "#333" })}
            <Text
              style={{ color: isFocused ? "#FFFEDC" : "#381008", fontSize: 10 }}
            >
              {options.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { session } = useSession();
  if (!session) return <Redirect href="/login" />;
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
        name="configuration"
        options={{
          title: "Horarios",
          tabBarIcon: ({ color }) => <Gear color={color} />,
        }}
      />
    </Tabs>
  );
}
