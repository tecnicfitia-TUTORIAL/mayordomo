
import axios from 'axios';
import { UserProfile, PillarStatus, SubscriptionTier, ChatMessage, Attachment } from "../types";

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project';
const REGION = 'us-central1';
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const BASE_URL = IS_LOCAL 
    ? `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}`
    : `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

export const generateChatResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  currentMessage: string,
  pillars: PillarStatus[],
  profile?: UserProfile,
  attachments?: Attachment[]
): Promise<string> => {
  try {
    const response = await axios.post(`${BASE_URL}/generateChatResponse`, {
      history,
      currentMessage,
      pillars,
      profile,
      attachments,
      locale: navigator.language || 'es-ES'
    });

    return response.data.text;

  } catch (error) {
    console.error("Gemini Error:", error);
    return "Lo siento, mis sistemas de comunicación están experimentando interferencias.";
  }
};
