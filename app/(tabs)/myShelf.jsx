import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Button, Linking, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import ModalDropdown from 'react-native-modal-dropdown';
import { OpenAI, OpenAIApi } from "openai";
import { OPENAI_KEY, GOOGLE_KEY } from "@env";


const MyShelf = () => {
  const openai = new OpenAI({
      apiKey: OPENAI_KEY,
  });
  const googleApiKey = GOOGLE_KEY;
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

  const searchBooksTBR = async () => {
    if (!searchQueryTBR.trim()) return;

    setSearchLoadingTBR(true);
    const apiBase = "https://www.googleapis.com/books/v1/volumes?q=";
    try {
      const response = await fetch(`${apiBase}${encodeURIComponent(searchQueryTBR)}&key=${googleApiKey}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      });
      
      const data = await response.json();
      const results = (data.items || []).map(item => {
        const volumeInfo = item.volumeInfo || {};
        return {
          title: volumeInfo.title || "Title not found",
          author: volumeInfo.authors?.[0] || "Author not available",
          thumbnail: volumeInfo.imageLinks?.thumbnail || null
        };
      });

      setSearchResultsTBR(results);
    } catch (error) {
      console.error("Error searching books:", error);
    } finally {
      setSearchLoadingTBR(false);
    }
  };

  const searchBooksFavorites = async () => {
    if (!searchQueryFavorites.trim()) return;

    setSearchLoadingFavorites(true);
    const apiBase = "https://www.googleapis.com/books/v1/volumes?q=";
    try {
      const response = await fetch(`${apiBase}${encodeURIComponent(searchQueryFavorites)}&key=${googleApiKey}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      });
      const data = await response.json();
      const results = (data.items || []).map(item => {
        const volumeInfo = item.volumeInfo || {};
        return {
          title: volumeInfo.title || "Title not found",
          author: volumeInfo.authors?.[0] || "Author not available",
          thumbnail: volumeInfo.imageLinks?.thumbnail || null,
        };
      });

      setSearchResultsFavorites(results);
    } catch (error) {
      console.error("Error searching books:", error);
    } finally {
      setSearchLoadingFavorites(false);
    }
  };

  const addBookToTBR = async (book) => {
    const { rating } = await fetchRatings(
      book.title || "Title not found",
      book.authors?.[0] || "Author not available"
    );
    setTbrBooks((prev) => [...prev, {
      title: book.title,
      author: book.author,
      thumbnail: book.thumbnail,
      rating: rating,
    }]);
    setSearchResultsTBR([]);
    setSearchQueryTBR('');
  };

  const addBookToFavorites = async (book) => {
    const { rating } = await fetchRatings(
      book.title || "Title not found",
      book.authors?.[0] || "Author not available"
    );
    setFavoritesBooks((prev) => [...prev, {
      title: book.title,
      author: book.author,
      thumbnail: book.thumbnail,
      rating: rating,
    }]);
    setSearchResultsFavorites([]);
    setSearchQueryFavorites('');
  };

  const removeBookFromTBR = (indexToRemove) => {
    setTbrBooks((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const removeBookFromFavorites = (indexToRemove) => {
    setFavoritesBooks((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const removeBookFromRecs = (indexToRemove) => {
    setRecommendations((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const fetchRatings = async (title, author) => {
    try {
      const prompt = `Rating to two decimal places from Goodreads for "${title}" by ${author}, separated by a space. For example: 4.7. Don't give me any other text.`;
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });
      const rating = response.choices[0].message.content.trim();
      console.log(title, rating)
      return { rating: rating || "N/A"};
    } catch (error) {
      console.error(`Error fetching ratings for ${title}:`, error);
      return { rating: "N/A"};
    }
  };

  const handleUploadGoodreadsCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });

      if (result.type === 'cancel') {
        console.log("Document selection was canceled.");
        return;
      }

      if (result.uri) {
        console.log("Selected file URI:", result.uri);

        const fileUri = `${FileSystem.cacheDirectory}${result.name}`;
        await FileSystem.copyAsync({
          from: result.uri,
          to: fileUri,
        });

        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        Papa.parse(fileContent, {
          header: true,
          complete: (parsedData) => {
            const booksToRead = parsedData.data.filter((book) => book['Exclusive Shelf'] === 'to-read');
            const formattedBooks = booksToRead.map((book) => ({
              title: book.Title || "Title not found",
              author: book.Author || "Author not available",
              thumbnail: null,
            }));
            setTbrBooks((prev) => [...prev, ...formattedBooks]);
          },
          error: (error) => {
            console.error("Error parsing CSV:", error);
          },
        });
      } else {
        console.error("Invalid file URI:", result);
      }
    } catch (error) {
      console.error("Error uploading Goodreads CSV:", error);
    }
  };

  const getRecommendations = async () => {
    console.log('Sending...')
    setLoading(true);
    const prompt = `Please recommend 5 books that someone may like if their favorite books are ${favoritesBooks.map(book => book.title).join(', ')} and they're looking for ${selectedGenre} genre. Just give me the 10 books in the format Title by Author seperated by new lines. Don't add any other text or number the books.`;
    console.log('Sending prompt: ', prompt)
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        store: true,
        messages: [
          { 
            "role": "user", 
            "content": prompt
          }
        ],
      });
      console.log('Resp: ', completion);
      console.log('Msg: ', completion.choices[0].message.content);
      const response = completion.choices[0].message.content;
      const bookLines = response.split('\n').filter(line => line.trim() !== '');

      const booksWithDetails = await Promise.all(bookLines.map(async (line) => {
        const [title, author] = line.split(' by ').map(part => part.trim());
        const searchQuery = `${title} ${author}`;

        const apiBase = "https://www.googleapis.com/books/v1/volumes?q=";
        const res = await fetch(`${apiBase}${encodeURIComponent(searchQuery)}&key=${googleApiKey}`, {
            method: 'GET',
            headers: {
                accept: 'application/json',
            },
        });

        const data = await res.json();
        const volumeInfo = data.items?.[0]?.volumeInfo || {};

        const { rating } = await fetchRatings(
          volumeInfo.title || "Title not found",
          volumeInfo.authors?.[0] || "Author not available"
        );

        return {
            title: volumeInfo.title || "Title not found",
            author: volumeInfo.authors?.[0] || "Author not available",
            thumbnail: volumeInfo.imageLinks?.thumbnail || null,
            rating: rating,
        };
      }));

      console.log('Books with details:', booksWithDetails);
      setRecommendations(booksWithDetails);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <FlatList
      data={[{}]}
      renderItem={() => (
        <View style={styles.container}>
          <Button
            title="Download Goodreads Data"
            onPress={() => {
              const url = "https://www.goodreads.com/review/import";
              Linking.openURL(url).catch((err) => console.error("Failed to open URL:", err));
            }}
          />
          <Button
            title="Upload Goodreads CSV"
            onPress={handleUploadGoodreadsCSV}
          />
          <Text style={styles.header}>TBR</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a book"
            value={searchQueryTBR}
            onChangeText={setSearchQueryTBR}
            onSubmitEditing={searchBooksTBR}
          />
          {searchLoadingTBR && <ActivityIndicator size="small" color="#0000ff" />}
          {searchResultsTBR.length > 0 && (
            <FlatList
              data={searchResultsTBR}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => addBookToTBR(item)} style={styles.searchResult}>
                  {item.thumbnail && (
                    <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                  )}
                  <View>
                    <Text style={styles.bookTitle}>{item.title}</Text>
                    <Text style={styles.bookAuthor}>{item.author}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tbrList}>
            {tbrBooks.map((book, index) => (
              <View key={index} style={styles.card}>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeBookFromTBR(index)}
                >
                  <Text style={styles.removeButtonText}>X</Text>
                </TouchableOpacity>
                {book.thumbnail && (
                  <Image source={{ uri: book.thumbnail }} style={styles.cardThumbnail} />
                )}
                <Text style={styles.cardTitle}>{book.title}</Text>
                <Text style={styles.cardAuthor}>{book.author}</Text>
                <View style={styles.ratingBox}>
                  <Text style={styles.ratings}>{book.rating}{' '}
                    <Text style={{ color: 'gold' }}>
                      {'\u2605'}
                    </Text>
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <Text style={styles.header}>Favorites</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a favorite book"
            value={searchQueryFavorites}
            onChangeText={setSearchQueryFavorites}
            onSubmitEditing={searchBooksFavorites}
          />
          {searchLoadingFavorites && <ActivityIndicator size="small" color="#0000ff" />}
          {searchResultsFavorites.length > 0 && (
            <FlatList
              data={searchResultsFavorites}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => addBookToFavorites(item)} style={styles.searchResult}>
                  {item.thumbnail && (
                    <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                  )}
                  <View>
                    <Text style={styles.bookTitle}>{item.title}</Text>
                    <Text style={styles.bookAuthor}>{item.author}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tbrList}>
            {favoritesBooks.map((book, index) => (
              <View key={index} style={styles.card}>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeBookFromFavorites(index)}
                >
                  <Text style={styles.removeButtonText}>X</Text>
                </TouchableOpacity>
                {book.thumbnail && (
                  <Image source={{ uri: book.thumbnail }} style={styles.cardThumbnail} />
                )}
                <Text style={styles.cardTitle}>{book.title}</Text>
                <Text style={styles.cardAuthor}>{book.author}</Text>
                <View style={styles.ratingBox}>
                  <Text style={styles.ratings}>{book.rating}{' '}
                    <Text style={{ color: 'gold' }}>
                      {'\u2605'}
                    </Text>
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <Text style={styles.header}>Recommendations</Text>
          <Text style={styles.comment}>Based on your favorite books, here are some books you may like!</Text>
          <View style={styles.select}>
            <View style={styles.row}>
              <Text style={styles.comment}>Genre: </Text>
              <ModalDropdown
                options={['Any', 'Fiction', 'Nonfiction', 'Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Thriller', 'Historical Fiction', 'Young Adult', 'Children’s Fiction', 'Horror', 'Literary Fiction', 'Biography', 'Self-Help']}
                onSelect={(index, value) => setSelectedGenre(value)}
                defaultValue="Any"
                style={styles.dropdown}
                textStyle={styles.dropdownText}
                dropdownStyle={styles.dropdownMenu}
              />
              <Button
                title="Refresh"
                onPress={getRecommendations}
                disabled={loading}
              />
            </View>
          </View>
          {loading && <Text>Loading...</Text>} 
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tbrList}>
            {recommendations.map((book, index) => (
              <View key={index} style={styles.card}>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeBookFromRecs(index)}
                >
                  <Text style={styles.removeButtonText}>X</Text>
                </TouchableOpacity>
                {book.thumbnail && (
                  <Image source={{ uri: book.thumbnail }} style={styles.cardThumbnail} />
                )}
                <Text style={styles.cardTitle}>{book.title}</Text>
                <Text style={styles.cardAuthor}>{book.author}</Text>
                <View style={styles.ratingBox}>
                  <Text style={styles.ratings}>{book.rating}{' '}
                    <Text style={{ color: 'gold' }}>
                      {'\u2605'}
                    </Text>
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      keyExtractor={(item, index) => index.toString()} 
      
    />
  );
};

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
});

export default MyShelf;
