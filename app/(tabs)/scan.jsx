import { Camera, CameraView, CameraType, useCameraPermissions, takePictureAsync, onPictureSaved } from 'expo-camera';
import { Image, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { OpenAI, OpenAIApi } from "openai";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { useAppContext } from './AppContext';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native';
import { OPENAI_KEY, GOOGLE_KEY, FIREBASE_KEY } from "@env";


const Scan = () => {
    const { facing, setFacing } = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);
    const [ capturedPhoto, setCapturedPhoto ] = useState(null);
    const { setResp } = useAppContext();
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);

    const firebaseConfig = {
        apiKey: FIREBASE_KEY,
        authDomain: "shelfsurf-ccb51.firebaseapp.com",
        projectId: "shelfsurf-ccb51",
        storageBucket: "shelfsurf-ccb51.firebasestorage.app",
        messagingSenderId: "51443686872",
        appId: "1:51443686872:web:66e05fab88a1e90f1d26ad",
        measurementId: "G-D2CYHYHZ3Z"
    };
    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);

    async function uploadImage(uri) {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const imageRef = ref(storage, 'images/' + new Date().toISOString() + '.jpg');
            
            await uploadBytes(imageRef, blob);
            const downloadURL = await getDownloadURL(imageRef);
            
            console.log("Image URL: ", downloadURL);
            return downloadURL;
        } catch (error) {
            console.log("Firebase error: ", error);
            return 'Fail'
        }
    }

    const openai = new OpenAI({
        apiKey: OPENAI_KEY,
    });


    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission} title="grant permission" />
            </View>
        );
    }

    async function takePicture () {
        let photo = await cameraRef.current.takePictureAsync();
        console.log('uri: ', photo.uri);
        setCapturedPhoto(photo.uri);
    };


    async function handleSend() {
        setLoading(true);
        console.log('Pic being sent: ', capturedPhoto);
        const photoURL = await uploadImage(capturedPhoto);
        console.log('URL being sent: ', photoURL);

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                store: true,
                messages: [
                    { 
                        "role": "user", 
                        "content": [
                            {type: "text", text: "Give me a list of all of the books shown in the format BookName by AuthorName seperated by new lines. Please don't return any text other than that."},
                            {type: "image_url", image_url: {"url": photoURL}},
                        ] 
                    },
                ],
            });
            console.log('Resp: ', completion);
            console.log('Msg: ', completion.choices[0].message.content)
            setResp(completion.choices[0].message.content);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
            navigation.navigate('bookmark');
        }
    }

    //// Code for Picking image from camera roll:
    // const { image, setImage } = useState<String | null>(null);
    // const pickImage = async () => {
    //   // No permissions request is necessary for launching the image library
    //   let result = await ImagePicker.launchImageLibraryAsync({
    //     mediaTypes: ['images', 'videos'],
    //     allowsEditing: true,
    //     aspect: [4, 3],
    //     quality: 1,
    //   });
    //   console.log(result);
    //   if (!result.canceled) {
    //     setImage(result.assets[0].uri);
    //   }
    // };
    // return (
    //   <View style={styles.container}>
    //     <Button title="Pick an image from camera roll" onPress={pickImage} />
    //     {image && <Image source={{ uri: image }} style={styles.image} />}
    //   </View>
    // );


    return (
        <View style={styles.container} key={capturedPhoto}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0000ff" /> 
                    <Text>Processing...</Text>
                </View>
            ) : capturedPhoto ? (
                <View style={styles.photoContainer}>
                    <Image source={{ uri: capturedPhoto }} style={styles.photo} />
                    <Button title="Retake" onPress={() => setCapturedPhoto(null)} />
                    <Button title="Use Photo ->" onPress={handleSend} />
                </View>
            ) : (
                <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.button} onPress={takePicture}>
                            <Text style={styles.text}>Take Pic</Text>
                        </TouchableOpacity>
                    </View>
                </CameraView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
    flex: 1,
    justifyContent: 'center',
    },
    camera: {
    flex: 1,
    },
    buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
    },
    button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
    },
    text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    },
    photoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photo: {
        width: '100%',
        height: '80%',
        resizeMode: 'contain',
    },
    loadingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
});

export default Scan;
