import { User, Friend } from '../models/Types';

export class AuthService {
  private users: Record<string, User> = {};

  constructor() {
    this.users = {
      'player1': {
        id: '1',
        username: 'player1',
        gamesPlayed: 42,
        gamesWon: 28,
        twoFactorEnabled: false,
        achievements: [
          { id: 'first-victory', name: 'First Victory', description: 'Win your first game' },
          { id: 'win-streak', name: 'Win Streak', description: 'Win 5 games in a row' }
        ],
        notifications: [],
        friends: [
          { username: 'gameMaster', nickname: 'GameMaster', status: 'online', blocked: false },
          { username: 'proGamer', nickname: 'ProGamer', status: 'in-game', blocked: false },
          { username: 'pongKing', nickname: 'PongKing', status: 'offline', blocked: true }
        ]
      },
      'gameMaster': {
        id: '2',
        username: 'gameMaster',
        nickname: 'GameMaster',
        gamesPlayed: 156,
        gamesWon: 132,
        twoFactorEnabled: true,
        achievements: [
          { id: 'first-victory', name: 'First Victory', description: 'Win your first game' },
          { id: 'win-streak', name: 'Win Streak', description: 'Win 5 games in a row' },
          { id: 'master', name: 'Pong Master', description: 'Win 100 games' }
        ],
        notifications: [],
        friends: []
      },
      'proGamer': {
        id: '3',
        username: 'proGamer',
        nickname: 'ProGamer',
        gamesPlayed: 89,
        gamesWon: 67,
        twoFactorEnabled: false,
        achievements: [
          { id: 'first-victory', name: 'First Victory', description: 'Win your first game' },
          { id: 'win-streak', name: 'Win Streak', description: 'Win 5 games in a row' }
        ],
        notifications: [],
        friends: []
      }
    };

    // Add default friends for all users
    Object.values(this.users).forEach(user => {
      if (user.username !== 'gameMaster') {
        user.friends.push({ username: 'gameMaster', nickname: 'GameMaster', status: 'online', blocked: false });
      }
      if (user.username !== 'proGamer') {
        user.friends.push({ username: 'proGamer', nickname: 'ProGamer', status: 'in-game', blocked: false });
      }
    });
  }

  public register(email: string, password: string, nickname: string): User {
    if (this.users[email]) {
      throw new Error('User already exists');
    }

    const newUser: User = {
      id: Math.random().toString(36).substring(2, 9),
      username: email,
      nickname,
      password,
      gamesPlayed: 0,
      gamesWon: 0,
      twoFactorEnabled: false,
      achievements: [],
      notifications: [],
      friends: [
        { username: 'gameMaster', nickname: 'GameMaster', status: 'online', blocked: false },
        { username: 'proGamer', nickname: 'ProGamer', status: 'in-game', blocked: false }
      ]
    };

    this.users[email] = newUser;
    return newUser;
  }

  public login(username: string, password?: string): User {
    const user = this.users[username];
    
    if (!user) {
      if (password) {
        throw new Error('Invalid credentials');
      }
      return this.register(username, '', username);
    }

    if (password && user.password !== password) {
      throw new Error('Invalid credentials');
    }
    
    return user;
  }

  public loginWithGoogle(email: string): User {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&scope=email%20profile`;
    window.location.href = googleAuthUrl;
    return this.login(email);
  }

  public getUser(usernameOrNickname: string): User | null {
    // First try to find by username
    if (this.users[usernameOrNickname]) {
      return this.users[usernameOrNickname];
    }

    // Then try to find by nickname
    const user = Object.values(this.users).find(
      u => u.nickname?.toLowerCase() === usernameOrNickname.toLowerCase()
    );
    return user || null;
  }

  public getUserByNickname(nickname: string): User | null {
    return Object.values(this.users).find(
      u => u.nickname?.toLowerCase() === nickname.toLowerCase()
    ) || null;
  }

  public getFriends(username: string): Friend[] {
    return this.users[username]?.friends || [];
  }

  public addFriend(username: string, friendUsername: string): void {
    if (!this.users[username]) return;
    
    const friend: Friend = {
      username: friendUsername,
      nickname: friendUsername,
      status: 'offline',
      blocked: false
    };

    this.users[username].friends.push(friend);
  }

  public removeFriend(username: string, friendUsername: string): void {
    if (!this.users[username]) return;
    
    this.users[username].friends = this.users[username].friends.filter(
      f => f.username !== friendUsername
    );
  }

  public toggleBlockFriend(username: string, friendUsername: string): void {
    if (!this.users[username]) return;
    
    const friend = this.users[username].friends.find(f => f.username === friendUsername);
    if (friend) {
      friend.blocked = !friend.blocked;
    }
  }

  public isFriend(username: string, targetUsername: string): boolean {
    if (!this.users[username]) return false;
    
    // Check if target user exists
    const targetUser = this.getUser(targetUsername);
    if (!targetUser) return false;

    // Check if they are friends and not blocked
    return this.users[username].friends.some(
      f => (f.username === targetUser.username || f.nickname?.toLowerCase() === targetUsername.toLowerCase()) && !f.blocked
    );
  }
}