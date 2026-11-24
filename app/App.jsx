import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PetFeederApp from './components/PetFeederApp';
import { SessionProvider } from './components/Session';
import { Loading } from './components/ui';

export default function App() {
  const [loaded, error] = useFonts({
    'titan-one': require('./assets/fonts/TitanOne-Regular.ttf'),
    'keep-calm': require('./assets/fonts/KeepCalm-Medium.ttf'),
  });
  if (!loaded && !error) return <Loading />;
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <PetFeederApp />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
