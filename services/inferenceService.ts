
import axios from 'axios';
import { UserProfile, LifeObligation } from "../types";

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project';
const REGION = 'us-central1';
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const BASE_URL = IS_LOCAL 
    ? `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}`
    : `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

export const InferenceEngine = {
  
  /**
   * Deduces the critical life obligations for a user based on their profile.
   * This replaces static task lists with dynamic, AI-generated contexts.
   */
  inferObligations: async (profile: UserProfile): Promise<LifeObligation[]> => {
    try {
      const response = await axios.post(`${BASE_URL}/inferObligations`, { profile });
      return response.data;

    } catch (error) {
      console.error("Inference Engine Error:", error);
      // Fallback: Empty list (User will see manual entry)
      return [];
    }
  }
};
