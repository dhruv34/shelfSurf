import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useAppContext } from './AppContext';
import { OpenAI, OpenAIApi } from "openai";
import { OPENAI_KEY, GOOGLE_KEY, FIREBASE_KEY } from "@env";



const Bookmark = () => {
  const openai = new OpenAI({
      apiKey: OPENAI_KEY,
  });
  const googleApiKey = GOOGLE_KEY;

  const { resp } = useAppContext();

  const parseBooks = (response) => {
    if (!response) return [];
    const lines = response.split('\n');
    const bookLines = lines.slice(1);
    return bookLines.filter(line => line.trim() !== '');
  };

  const books = useMemo(() => parseBooks(resp), [resp]);

  const [bookDetails, setBookDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchRating = async (title, author) => {
    try {
      const prompt = `Rating to two decimal places from Goodreads for "${title}" by ${author}, separated by a space. For example: 4.7. Don't give me any other text.`;
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });
      const rating = response.choices[0].message.content.trim();
      console.log(title, rating)
      // return { rating: rating || "N/A"};
      return rating || 'N/A';
    } catch (error) {
      console.error(`Error fetching ratings for ${title}:`, error);
      // return { rating: "N/A"};
      return 'N/A';
    }
  };

  useEffect(() => {
    async function fetchBookDetails() {
      const apiBase = "https://www.googleapis.com/books/v1/volumes?q=";
      try {
        const fetchPromises = books.map(async (book) => {
          const encodedBook = encodeURIComponent(book);
          const response = await fetch(`${apiBase}${encodedBook}&key=${googleApiKey}`, {
            method: 'GET',
            headers: {
              accept: 'application/json',
            },
          });

          const data = await response.json();
          const firstItem = data.items?.[0]?.volumeInfo || {};
          console.log(firstItem)
          const title = firstItem.title || "Title not found";
          const author = firstItem.authors?.[0] || "Author not available";
          const thumbnail = firstItem.imageLinks?.thumbnail || null;
          const description = firstItem.description || "Description not available.";
          const categories = firstItem.categories || [];
          const rating = await fetchRating(title, author);
          console.log('Rating for ', title, ': ', rating)
          return { title, author, thumbnail, description, categories, rating };
        });
        const results = await Promise.all(fetchPromises);
        setBookDetails(results);
      } catch (error) {
        console.error("Error fetching book details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBookDetails();
  }, [books]);

  const searchBooks = async () => {
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    const apiBase = "https://www.googleapis.com/books/v1/volumes?q=";
    try {
      const response = await fetch(`${apiBase}${encodeURIComponent(searchQuery)}&key=${googleApiKey}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      });

      const data = await response.json();
      const results = (data.items || []).slice(0, 5).map(item => {
        const volumeInfo = item.volumeInfo || {};
        return {
          title: volumeInfo.title || "Title not found",
          author: volumeInfo.authors?.[0] || "Author not available",
          thumbnail: volumeInfo.imageLinks?.thumbnail || null,
          description: volumeInfo.description || "Description not available.",
          categories: volumeInfo.categories || [],
        };
      });

      setSearchResults(results);
    } catch (error) {
      console.error("Error searching books:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const addBookToList = async (book) => {
    const rating = await fetchRating(
      book.title || "Title not found",
      book.author || "Author not available"
    );
    setBookDetails((prev) => [...prev, {
      title: book.title,
      author: book.author,
      thumbnail: book.thumbnail,
      description: book.description,
      categories: book.categories,
      rating: rating,
    }]);
    setSearchResults([]);
    setSearchQuery('');
  };

  const removeBook = (indexToRemove) => {
    setBookDetails((prevBookDetails) => prevBookDetails.filter((_, index) => index !== indexToRemove));
  };

  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading book details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manual Search</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search for a book to add"
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmitEditing={searchBooks}
      />
      {searchLoading && <ActivityIndicator size="small" color="#0000ff" />}
      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => addBookToList(item)} style={styles.searchResult}>
              {item.thumbnail && (
                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
              )}
              <View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardAuthor}>{item.author}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      <Text style={styles.title}>Bookmarked Books</Text>
      <FlatList
        data={bookDetails}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            {item.thumbnail && (
              <Image
                source={{ uri: item.thumbnail }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            )}
            <View style={styles.cardContent}>
              <View style={styles.headerRow}>
                <View style={styles.textContent}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardAuthor}>{item.author}</Text>
                  <Text style={styles.categories}>
                    {item.categories.join(", ")}
                  </Text>
                </View>
                <View style={styles.ratingBox}>
                  <Text style={styles.ratings}>
                    <Text>
                      {item.rating}{' '}
                    </Text>
                    <Text style={{ color: 'gold', fontSize: 16 }}>
                      {'\u2605'}
                    </Text>
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => toggleExpand(index)}
                style={styles.dropdownButton}
              >
                <Text style={styles.dropdownButtonText}>
                  {expandedIndex === index ? "Hide" : "Expand"}
                </Text>
              </TouchableOpacity>
              {expandedIndex === index && (
                <Text style={styles.description}>{item.description}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => removeBook(index)}
            >
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View> 
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
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
  thumbnail: {
    width: 80,
    height: 120,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardAuthor: {
    fontSize: 14,
    color: '#555',
  },
  categories: {
    fontSize: 12,
    color: '#777',
    marginVertical: 4,
  },
  description: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
  },
  dropdownButton: {
    marginTop: 8,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#0066cc',
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ff6b6b',
    padding: 3,
    borderRadius: 50,
    zIndex: 1,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ratings: {
    fontSize: 16,
    textAlign: 'center',
  },
  ratingBox: {
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
});

export default Bookmark;
