import React, { useState, useEffect, useRef, createContext, useContext } from 'react';


const [keys, setKeys] = useState({});

useEffect(() => {
    const callFn = async () => {
        const functions = getFunctions(app);
        const getKeys = httpsCallable(functions, "getKeys");
        try {
            const resp = await getKeys(); 
            console.log('AAAAA', resp.data);
            setKeys(resp.data);
        } catch (e) {
            console.log(`Error! ${e}`);
            setKeys('error');
        }
    }

    callFn();
}, []);

export default {
    apiKey: keys.firebaseKey,
    authDomain: "shelfsurf-ccb51.firebaseapp.com",
    projectId: "shelfsurf-ccb51",
    storageBucket: "shelfsurf-ccb51.firebasestorage.app",
    messagingSenderId: "51443686872",
    appId: "1:51443686872:web:66e05fab88a1e90f1d26ad",
    measurementId: "G-D2CYHYHZ3Z"
};