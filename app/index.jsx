import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, View, Image, Text } from 'react-native';
import { router } from 'expo-router';
import { AuthProvider } from '../AuthContext';
import { images } from '../constants';
import CustomButton from '../components/CustomButton';
import RootLayout from './_layout.jsx';

export default function App() {
    return (
        <AuthProvider>
            <RootLayout />
            <SafeAreaView className="bg-[#92623a] h-full">
                <ScrollView contentContainerStyle={{ height: '100%' }}>
                    <View className="w-full justify-start items-center min-h-[85vh] px-4 mt-10">
                        <Image
                            source={images.hatchify}
                            className="w-[190px] h-[130px]"
                            resizeMode="contain"
                        />

                        <Image
                            source={images.cards}
                            className="-max-w-[380px] w-full h-[300px]"
                            resizeMode="contain"
                        />

                        <View className="relative mt-5">
                            <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 28, color: 'white', textAlign: 'center' }}>
                                Bring Every Egg to Life with
                            </Text>

                            <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 32, color: '#dda', textAlign: 'center' }}>
                                HATCHIFY
                            </Text>

                            <Image />
                        </View>

                        <CustomButton
                            title="Continue with Email"
                            handlePress={() => router.push('/sign-in')}
                            containerStyles="w-full mt-7"
                        />
                    </View>
                </ScrollView>

                <StatusBar backgroundColor="black" style="light" />
            </SafeAreaView>
        </AuthProvider>
    );
}
