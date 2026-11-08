import { SafeAreaView } from "react-native-safe-area-context";
import { LoginScreen } from "../components/LoginScreen";
import { styles } from "../components/Screen";

export default function Login() {
  return (
    <SafeAreaView style={styles.safe}>
      <LoginScreen />
    </SafeAreaView>
  );
}
