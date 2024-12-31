import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Button, Linking, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import ModalDropdown from 'react-native-modal-dropdown';
import { OpenAI, OpenAIApi } from "openai";
import { OPENAI_KEY, GOOGLE_KEY, FIREBASE_KEY } from "@env";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, initializeAuth, getReactNativePersistence, onAuthStateChanged } from 'firebase/auth';
// import firebaseConfig from '../../firebaseConfig';
import { initializeApp, getApps, getApp } from 'firebase/app';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';


const firebaseConfig = { 
  apiKey: FIREBASE_KEY,
  authDomain: "shelfsurf-ccb51.firebaseapp.com",
  projectId: "shelfsurf-ccb51",
  storageBucket: "shelfsurf-ccb51.firebasestorage.app",
  messagingSenderId: "51443686872",
  appId: "1:51443686872:web:66e05fab88a1e90f1d26ad",
  measurementId: "G-D2CYHYHZ3Z"
};
console.log(!getApps().length)
let app;
let auth;
// Initialize Firebase app if not already initialized
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} else {
  app = getApps()[0];
  auth = getAuth(app);
}


const profile = () => {

  const [searchQueryTBR, setSearchQueryTBR] = useState('');
  const [searchResultsTBR, setSearchResultsTBR] = useState([]);
  const [tbrBooks, setTbrBooks] = useState([]);
  const [searchLoadingTBR, setSearchLoadingTBR] = useState(false);

  const [searchQueryFavorites, setSearchQueryFavorites] = useState('');
  const [searchResultsFavorites, setSearchResultsFavorites] = useState([]);
  const [favoritesBooks, setFavoritesBooks] = useState([]);
  const [searchLoadingFavorites, setSearchLoadingFavorites] = useState(false);

  const [selectedGenre, setSelectedGenre] = useState('Any');

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Login info
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user); // Set the user from the authentication state
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
      console.log(user.email);
    });
    
    return () => unsubscribe(); // Cleanup the listener on component unmount
  }, []);

  // Fetch data when the user logs in
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        const { tbrBooks, favoritesBooks } = await getUserData(user.uid);
        console.log('USER: ', user.email)
        console.log('GOT FAVS: ', favoritesBooks)
        setTbrBooks(tbrBooks);
        setFavoritesBooks(favoritesBooks);
      };
      fetchData();
    }
  }, [user]);

  // Update Firestore whenever tbrBooks or favoritesBooks changes
  useEffect(() => {
    if (user) {
      console.log('SAVE FAVS: ', favoritesBooks.length, favoritesBooks)
      saveUserData(user.uid, tbrBooks, favoritesBooks);
    }
  }, [tbrBooks, favoritesBooks]);


  const handleLogin = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        setUser(userCredential.user);
        setIsLoggedIn(true);
        console.log("Success", "You are now logged in!");
      })
      .catch((error) => {
        console.log("Login Error", error.message);
      });
  };

  const handleSignUp = () => {
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        setUser(userCredential.user);
        setIsLoggedIn(true);
        console.log("Success", "Account created and logged in!");
      })
      .catch((error) => {
        console.log("Signup Error", error.message);
      });
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.header}>Login to MyShelf</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button title="Login" onPress={handleLogin} />
        <Button title="Sign Up" onPress={handleSignUp} />
      </View>
    );
  }


  return (
    <View>
      <Text>profile</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dropdown: {
    width: 150,
    padding: 2,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  dropdownText: {
    fontSize: 16,
  },
  comment: {
    fontSize: 16,
    marginBottom: 8,
  },
  select: {
    padding: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tbrList: {
    marginBottom: 16,
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  thumbnail: {
    width: 60,
    height: 90,
    marginRight: 8,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  bookAuthor: {
    fontSize: 12,
    color: '#555',
  },
  ratings: {
    fontSize: 16,
  },
  ratingBox: {
    marginTop: 8,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingTop: 4,
    paddingRight: 8,
    paddingBottom: 4,
    paddingLeft: 8,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 16,
  },
  card: {
    width: 120,
    marginRight: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 1,
    flexWrap: 'wrap',
    paddingTop: 24,
    padding: 5
  },
  cardThumbnail: {
    width: 80,
    height: 120,
    marginBottom: 8,
    alignSelf: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardAuthor: {
    fontSize: 12,
    color: '#555',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 4,
    borderRadius: 50,
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  recCard: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  recThumbnail: {
    width: 80,
    height: 120,
  },
  recCardContent: {
    flex: 1,
    padding: 12,
  },
  recCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  recCardAuthor: {
    fontSize: 14,
    color: '#555',
  },
  recDescription: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
  },
  recHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  recTextContent: {
    flex: 1,
    marginRight: 8,
  },
  recRatings: {
    fontSize: 16,
    textAlign: 'center',
  },
  recRatingBox: {
    marginTop: 24,
    marginRight: 24,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingTop: 4,
    paddingRight: 8,
    paddingBottom: 4,
    paddingLeft: 8,
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  recDropdownButton: {
    marginTop: 8,
  },
  recDropdownButtonText: {
    fontSize: 14,
    color: '#0066cc',
  },
  recCloseButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ff6b6b',
    padding: 3,
    borderRadius: 50,
    zIndex: 1,
  },
  recCloseButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default profile