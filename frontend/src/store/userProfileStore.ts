// src/store/userProfileStore.ts
import { User, Friend } from '../types/types.js';

type Listener = () => void;

interface UserProfileState {
  userProfile: User | null;
  friends: Friend[];
  isLoading: boolean;
}

class UserProfileStore {
  private listeners: Listener[] = [];
  private state: UserProfileState = {
    userProfile: null,
    friends: [],
    isLoading: false
  };

  // Subscribe to state changes
  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Get current state
  getState(): UserProfileState {
    return { ...this.state };
  }

  // Get specific state properties
  getUserProfile(): User | null {
    return this.state.userProfile;
  }

  getFriends(): Friend[] {
    return [...this.state.friends];
  }

  getIsLoading(): boolean {
    return this.state.isLoading;
  }

  // Set loading state
  setLoading(isLoading: boolean): void {
    this.state.isLoading = isLoading;
    this.notifyListeners();
  }

  // Set user profile
  setUserProfile(user: User): void {
    this.state.userProfile = user;
    this.state.friends = user.friends || [];
    this.notifyListeners();
  }

  // Update user profile
  updateUserProfile(updates: Partial<User>): void {
    if (this.state.userProfile) {
      this.state.userProfile = { ...this.state.userProfile, ...updates };
      this.notifyListeners();
    }
  }

  // Add friend
  addFriend(friend: Friend): void {
    this.state.friends.push(friend);
    if (this.state.userProfile) {
      this.state.userProfile.friends = [...this.state.friends];
    }
    this.notifyListeners();
  }

  // Remove friend
  removeFriend(friendId: number): void {
    this.state.friends = this.state.friends.filter(f => f.id !== friendId);
    if (this.state.userProfile) {
      this.state.userProfile.friends = [...this.state.friends];
    }
    this.notifyListeners();
  }

  // Update friend status
  updateFriendStatus(friendId: number, status: 'online' | 'offline' | 'inGame'): void {
    const friend = this.state.friends.find(f => f.id === friendId);
    if (friend) {
      friend.status = status;
      if (this.state.userProfile) {
        this.state.userProfile.friends = [...this.state.friends];
      }
      this.notifyListeners();
    }
  }

  // Clear profile data (on logout)
  clearProfile(): void {
    this.state.userProfile = null;
    this.state.friends = [];
    this.state.isLoading = false;
    this.notifyListeners();
  }

  // Notify all listeners of state changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Export singleton instance
export const userProfileStore = new UserProfileStore();
