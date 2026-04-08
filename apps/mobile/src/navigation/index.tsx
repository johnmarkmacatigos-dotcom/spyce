import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/auth.store';
import { FeedScreen } from '../screens/FeedScreen';
import { ChallengesScreen } from '../screens/ChallengesScreen';
import { UploadScreen } from '../screens/UploadScreen';
import { MarketplaceScreen } from '../screens/MarketplaceScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { VideoPlayerScreen } from '../screens/VideoPlayerScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { BottomTabBar } from '../components/ui/BottomTabBar';
import { initializePiSDK } from '../services/piAuth';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <BottomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Challenges" component={ChallengesScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user, hasOnboarded, initAuth } = useAuthStore();

  useEffect(() => {
    initializePiSDK().catch(console.error);
    initAuth();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!user ? (
          <>
            {!hasOnboarded && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}