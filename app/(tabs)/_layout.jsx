import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Tabs, Redirect } from 'expo-router';
import Home from './home';
import { icons } from '../../constants';
import { Image } from 'react-native';


const TabIcon = ({ icon, color, name, focused }) => {
    return (
        <View className="items-center justify-center gap -2">
            <Image 
                source={icon}
                resizeMode="contain"
                tintColor={color}
                className="w-6 h-6"
            />
            <Text className={`${focused ? 'fontFamily: Poppins-SemiBold' : 'fontFamily: Poppins-Regular'} fontSize: 15`} style={{ color: color}}>
                {name}
            </Text>
        </View>
    );
}

const TabsLayout = () => {
  return (
    <>
        <Tabs
            screenOptions={{
                tabBarShowLabel: false,
                tabBarActiveTintColor: '#c19a6b',
                tabBarInactiveTintColor: '#5f432c',
                tabBarStyle: {
                    backgroundColor: '#e0cda9',
                    borderTopWidth: 1,
                    borderTopColor: '#c19a6b',
                    height: 55,
                }
            }}
        >
            <Tabs.Screen 
                name="home"
                options={{
                    title: 'Home',
                    headerShown: false,
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon
                            icon={icons.home}
                            color={color}
                            name="Home"
                            focused={focused}
                        />
                    )
                }}
            />
            <Tabs.Screen 
                name="createbatch"
                options={{
                    title: 'Create Batch',
                    headerShown: false,
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon
                            icon={icons.plus}
                            color={color}
                            name="Create Batch"
                            focused={focused}
                        />
                    )
                }}
            />
            <Tabs.Screen 
                name="profile"
                options={{
                    title: 'Profile',
                    headerShown: false,
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon
                            icon={icons.profile}
                            color={color}
                            name="Profile"
                            focused={focused}
                        />
                    )
                }}
            />
        </Tabs>
    </>
  )
}

export default TabsLayout

const styles = StyleSheet.create({})