import { StyleSheet, Text, View } from 'react-native';
import { SplashScreen, Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
    const [fontsLoaded, error] = useFonts({
        "Poppins-Black": require("../assets/fonts/Poppins-Black.ttf"),
        "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
        "Poppins-ExtraBold": require("../assets/fonts/Poppins-ExtraBold.ttf"),
        "Poppins-ExtraLight": require("../assets/fonts/Poppins-ExtraLight.ttf"),
        "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
        "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
        "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
        "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
        "Poppins-Thin": require("../assets/fonts/Poppins-Thin.ttf"),
    });

    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            try {
                const sessionData = await AsyncStorage.getItem('userSession');
                if (sessionData) {
                    console.log("User is logged in:", JSON.parse(sessionData));
                    router.replace('(tabs)/home'); // Redirect to home if logged in
                } else {
                    console.log("No user session found.");
                }
            } catch (error) {
                console.error("Error retrieving session data:", error);
            }
        };

        if (fontsLoaded) {
            checkSession(); // Call session checking only after fonts are loaded
            SplashScreen.hideAsync();
        }
        if (error) throw error;
    }, [fontsLoaded, error, router]);

    if (!fontsLoaded && !error) return null;

    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
    );
}

export default RootLayout;
