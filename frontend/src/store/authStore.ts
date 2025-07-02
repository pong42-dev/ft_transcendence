// src/store/authStore.ts
import { User } from '../types/types.js';

type Listener = () => void;

interface AuthState {
  currentUser: User | null;
  isLoggedIn: boolean | null; // null = checking, true = logged in, false = logged out
  isCheckingAuth: boolean;
}

class AuthStore {
  private listeners: Listener[] = [];
  private state: AuthState = {
    currentUser: null,
    isLoggedIn: null, // Start in checking state
    isCheckingAuth: false
  };

  // Subscribe to state changes
  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Get current state
  getState(): AuthState {
    return { ...this.state };
  }

  // Get specific state properties
  getCurrentUser(): User | null {
    return this.state.currentUser;
  }

  getIsLoggedIn(): boolean | null {
    return this.state.isLoggedIn;
  }

  getIsCheckingAuth(): boolean {
    return this.state.isCheckingAuth;
  }

  // Set authentication checking state
  setCheckingAuth(isChecking: boolean): void {
    this.state.isCheckingAuth = isChecking;
    this.notifyListeners();
  }

  // Login user
  login(user: User): void {
    this.state.currentUser = user;
    this.state.isLoggedIn = true;
    this.state.isCheckingAuth = false;
    this.notifyListeners();
  }

  // Logout user
  logout(): void {
    this.state.currentUser = null;
    this.state.isLoggedIn = false;
    this.state.isCheckingAuth = false;
    this.notifyListeners();
  }

  // Set logged out state (for timeout scenarios)
  setLoggedOut(): void {
    this.state.currentUser = null;
    this.state.isLoggedIn = false;
    this.state.isCheckingAuth = false;
    this.notifyListeners();
  }

  // Update user data
  updateUser(user: User): void {
    if (this.state.currentUser) {
      this.state.currentUser = user;
      this.notifyListeners();
    }
  }

  // Notify all listeners of state changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Export singleton instance
export const authStore = new AuthStore();
