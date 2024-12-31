/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onCall} from "firebase-functions/v2/https";

export const getKeys = onCall({
  secrets: ["OPENAI_KEY", "GOOGLE_KEY", "FBASE_KEY"],
}, async () => {
  const openaiKey = process.env.OPENAI_KEY;
  const googleKey = process.env.GOOGLE_KEY;
  const firebaseKey = process.env.FBASE_KEY;
  return {openAIKey: openaiKey, googleKey: googleKey, firebaseKey: firebaseKey};
});