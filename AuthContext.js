import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in
                setUser(user);
                await AsyncStorage.setItem('userSession', JSON.stringify({
                    email: user.email,
                    uid: user.uid,
                }));
            } else {
                // User is signed out
                setUser(null);
                await AsyncStorage.removeItem('userSession');
            }
            setLoading(false);
        }, (error) => {
            console.error('Error checking auth state:', error);
            setLoading(false); // Stop loading on error
        });

        return () => unsubscribe();
    }, []);

    // Function to set the current user manually
    const setCurrentUser = (currentUser) => {
        setUser(currentUser);
    };

    return (
        <AuthContext.Provider value={{ user, loading, setCurrentUser }}>
            {!loading && children} 
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
