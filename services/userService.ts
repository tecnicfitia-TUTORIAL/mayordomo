import { db } from './firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { SupportUserStatus, SubscriptionTier } from '../types';

export const UserService = {
  async getAllUsers(): Promise<SupportUserStatus[]> {
    // Check if DB is initialized and not a mock
    if (!db || (db as any)._isMock) {
      console.warn("[UserService] Using Mock DB or DB not initialized");
      return []; 
    }

    try {
      const usersCol = collection(db, 'users');
      const snapshot = await getDocs(usersCol);
      
      if (snapshot.empty) {
          console.log("[UserService] No users found in 'users' collection.");
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
