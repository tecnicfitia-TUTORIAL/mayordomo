import { db } from './firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { SupportUserStatus, SubscriptionTier } from '../types';
import { COLLECTIONS } from './firestoreSchema';

export const UserService = {
  async getAllUsers(): Promise<SupportUserStatus[]> {
    // Check if DB is initialized
    if (!db) {
      console.error("[UserService] DB not initialized");
      return []; 
    }

    // Allow execution even if _isMock is true, but warn.
    if ((db as any)._isMock) {
        console.warn("[UserService] DB is in Mock Mode. This may return empty results if no mock data is provided.");
    }

    try {
      const usersCol = collection(db, COLLECTIONS.USERS);
      const snapshot = await getDocs(usersCol);
      
      console.log(`[UserService] Found ${snapshot.size} users in '${COLLECTIONS.USERS}' collection.`);

      if (snapshot.empty) {
          console.warn("[UserService] Collection is empty. Ensure users have logged in at least once to create their profile.");
          return [];
      }

      return snapshot.docs.map(doc => {
        const data = doc.data();
        // Map Firestore data to SupportUserStatus
        // We handle missing fields gracefully
        return {
          uid: doc.id,
          email: data.email || 'unknown@user.com',
          tier: data.subscriptionTier || SubscriptionTier.FREE,
          systemHealth: data.systemHealth || 'OPTIMAL',
          fraudRisk: data.fraudRisk || 'LOW',
          aiTokensUsed: data.aiTokensUsed || 0,
          // Handle Firestore Timestamp or Date string
          lastActive: data.lastActive?.toDate ? data.lastActive.toDate() : (data.lastActive ? new Date(data.lastActive) : new Date())
        } as SupportUserStatus;
      });
    } catch (error) {
      console.error("[UserService] Error fetching users:", error);
      return [];
    }
  },

  async updateUserTier(uid: string, newTier: SubscriptionTier): Promise<void> {
    if (!db || (db as any)._isMock) {
        console.warn("[UserService] Cannot update tier: DB is mock");
        return;
    }
    
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            subscriptionTier: newTier
        });
        console.log(`[UserService] Updated user ${uid} to tier ${newTier}`);
    } catch (error) {
        console.error(`[UserService] Error updating tier for ${uid}:`, error);
        throw error;
    }
  }
};
