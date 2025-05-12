import { View, Text, SafeAreaView, ScrollView, Alert } from 'react-native';
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { Link, useRouter } from 'expo-router';

const SignIn = () => {
  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const submit = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Error', 'Please fill in all the fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user; //success login

      // new logic test sa verification to
      if (!user.emailVerified) {
        Alert.alert('Verification Required', 'Please check your email to verify your account.');
        return; // cut na yung process, return
      }

      // para sa AsyncStorage
      await AsyncStorage.setItem('userSession', JSON.stringify({
          email: user.email,
          uid: user.uid,
      }));
      console.log("Session data set:", {
          email: user.email,
          uid: user.uid,
      });
    

      Alert.alert("Success", "User signed in successfully");
      router.replace('/home'); // redirection
    } catch (error) {
      Alert.alert('Error', 'Incorrect Username or Password!'); // prompt pag unsuccessful
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-[#92623a] h-full">
      <ScrollView>
        <View className="w-full justify-center min-h-[90vh] px-4 my-6">
          <Text className="text-2xl text-white text-semibold mt-20 font-psemibold"> Login to Hatchify </Text>

          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({ ...form, email: e })}
            otherStyles="mt-7"
            keyboardType="email-address"
          />

          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e) => setForm({ ...form, password: e })}
            otherStyles="mt-7"
          />

        
          <View className="flex-row justify-end">
            <Link href="/(auth)/forgot-pass" className="text-lg font-psemibold text-secondary mt-4 underline">
              Forgot Password
            </Link>
          </View>


          <CustomButton
            title="Login"
            handlePress={submit}
            containerStyles="mt-7"
            isLoading={isSubmitting}
          />

          <View className="justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-100 font-pregular">
              Don't have an account?
            </Text>
            <Link href="sign-up" className='text-lg font-psemibold text-secondary underline'> Sign Up </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;
