// src/commands/CommandHandler.ts
import { ApiClient } from '../services/ApiClient.js';
import { Router } from '../utils/Router.js';
import { Terminal } from '../components/Terminal.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';
import { authStore } from '../store/index.js';
import { User, Player } from '../types/types.js';
import { UserStateCache } from '../services/UserStateCache.js';

export interface CommandHandlerDependencies {
  apiClient: ApiClient;
  router: Router;
  terminal: Terminal;
  errorHandler: ErrorHandler;
  onGameStart: (gameConfig: any) => void;
  onShowModal: (modalType: string, options?: any) => Promise<any>;
  onUserStateUpdate: (user: User) => void;
}

export class CommandHandler {
  private deps: CommandHandlerDependencies;

  constructor(dependencies: CommandHandlerDependencies) {
    this.deps = dependencies;
  }

  public async execute(command: string): Promise<void> {
    const parts = command.trim().split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (commandName) {
      case 'help':
        this.handleHelpCommand();
        break;
      case 'login':
        await this.handleLoginCommand();
        break;
      case 'register':
        await this.handleRegisterCommand();
        break;
      case 'logout':
        await this.handleLogoutCommand();
        break;
      case 'friend':
        await this.handleFriendCommand(args);
        break;
      case 'profile':
        this.handleProfileCommand(args);
        break;
      case 'play':
        await this.handlePlayCommand();
        break;
      case 'tournament':
        this.handleTournamentCommand();
        break;
      case '2fa':
        await this.handle2FACommand(args);
        break;
      case 'set':
        await this.handleSetCommand(args);
        break;
      case 'clear':
        this.handleClearCommand();
        break;
      default:
        this.deps.terminal.appendOutput(`Unknown command: ${commandName}. Type "help" for available commands.`);
    }
  }

  private handleHelpCommand(): void {
    const apiStatus = this.deps.apiClient.shouldUseMockData() ? 'MOCK DATA' : 'LIVE API';
    const baseHelp = `API Status: ${apiStatus}\n\n`;
    
    const isLoggedIn = authStore.getIsLoggedIn();
    
    const helpText = isLoggedIn
      ? baseHelp + 'Available commands:\n' +
        '  help       - Display this help message\n' +
        '  profile    - View user profile (profile <username>)\n' +
        '  play       - Start a game of Pong\n' +
        '  tournament - Open tournament test modal\n' +
        '  logout     - Log out of current session\n' +
        '  friend     - Manage friends (friend follow|unfollow|list)\n' +
        '  2fa        - Manage two-factor authentication (2fa enable|disable|status)\n' +
        '  set        - Update profile settings (set avatar|name)\n' +
        '  clear      - Clear the terminal screen'
      : baseHelp + 'Available commands:\n' +
        '  help       - Display this help message\n' +
        '  login      - Log into your account\n' +
        '  register   - Create a new account\n' +
        '  clear      - Clear the terminal screen';

    this.deps.terminal.appendOutput(helpText);
  }

  private async handleLoginCommand(): Promise<void> {
    if (authStore.getIsLoggedIn()) {
      this.deps.terminal.appendOutput('You are already logged in.');
      return;
    }
    
    try {
      await this.deps.onShowModal('login');
    } catch (error) {
      this.deps.terminal.appendOutput('Failed to show login modal.');
    }
  }

  private async handleRegisterCommand(): Promise<void> {
    if (authStore.getIsLoggedIn()) {
      this.deps.terminal.appendOutput('Please logout first to register a new account.');
      return;
    }
    
    try {
      await this.deps.onShowModal('register');
    } catch (error) {
      this.deps.terminal.appendOutput('Failed to show register modal.');
    }
  }

  private async handleLogoutCommand(): Promise<void> {
    if (!authStore.getIsLoggedIn()) {
      this.deps.terminal.appendOutput('You are not logged in.');
      return;
    }

    try {
      await this.deps.apiClient.auth.logout();
    } catch (error) {
      // Logout locally even if server request fails
      console.warn('Server logout failed, logging out locally:', error);
    }

    authStore.logout();
    UserStateCache.clear();
    this.deps.terminal.reset();
    this.deps.router.navigate('/');
    
    this.deps.terminal.appendOutput('You have been logged out.');
  }

  private async handleFriendCommand(args?: string[]): Promise<void> {
    if (!authStore.getIsLoggedIn()) {
      this.deps.terminal.appendOutput('Please login first to manage friends.');
      return;
    }

    // If no arguments provided, show help
    if (!args || args.length === 0) {
      this.deps.terminal.appendOutput('Usage: friend <follow|unfollow|list> [username]');
      this.deps.terminal.appendOutput('  friend follow <username>   - Follow a user');
      this.deps.terminal.appendOutput('  friend unfollow <username> - Unfollow a user');
      this.deps.terminal.appendOutput('  friend list                - Show friends list');
      return;
    }

    const subCommand = args[0].toLowerCase();

    switch (subCommand) {
      case 'follow':
        await this.handleFriendFollow(args.slice(1));
        break;
      case 'unfollow':
        await this.handleFriendUnfollow(args.slice(1));
        break;
      case 'list':
        await this.handleFriendList();
        break;
      default:
        this.deps.terminal.appendOutput(`Unknown friend command: ${subCommand}`);
        this.deps.terminal.appendOutput('Usage: friend <follow|unfollow|list> [username]');
    }
  }

  private async handleFriendFollow(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.deps.terminal.appendOutput('Usage: friend follow <username>');
      return;
    }

    const username = args.join(' ').trim();
    if (!username) {
      this.deps.terminal.appendOutput('Please specify a username to follow.');
      return;
    }

    try {
      this.deps.terminal.appendOutput(`Following user: ${username}...`);
      await this.deps.apiClient.friend.addFriend(username);
      this.deps.terminal.appendOutput(`✅ Successfully followed ${username}.`);
    } catch (error) {
      this.deps.terminal.appendOutput(`❌ Failed to follow ${username}. User may not exist or you may already be following them.`);
      console.error('Friend follow error:', error);
    }
  }

  private async handleFriendUnfollow(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.deps.terminal.appendOutput('Usage: friend unfollow <username>');
      return;
    }

    const username = args.join(' ').trim();
    if (!username) {
      this.deps.terminal.appendOutput('Please specify a username to unfollow.');
      return;
    }

    try {
      this.deps.terminal.appendOutput(`Unfollowing user: ${username}...`);
      
      // Get friend list to find the friend ID
      const friends = await this.deps.apiClient.friend.getFriends();
      const friend = friends.find(f => f.username === username);
      
      if (!friend || !friend.id) {
        this.deps.terminal.appendOutput(`You are not following ${username}.`);
        return;
      }

      await this.deps.apiClient.friend.removeFriend(friend.id);
      this.deps.terminal.appendOutput(`✅ Successfully unfollowed ${username}.`);
    } catch (error) {
      this.deps.terminal.appendOutput(`❌ Failed to unfollow ${username}. You may not be following this user.`);
      console.error('Friend unfollow error:', error);
    }
  }

  private async handleFriendList(): Promise<void> {
    try {
      this.deps.terminal.appendOutput('Loading friends list...');
      const friends = await this.deps.apiClient.friend.getFriends();
      
      if (friends.length === 0) {
        this.deps.terminal.appendOutput('📝 Your friends list is empty.');
        this.deps.terminal.appendOutput('   Use "friend follow <username>" to add friends.');
        return;
      }

      this.deps.terminal.appendOutput(`📋 Your Friends (${friends.length}):`);
      friends.forEach((friend: any, index: number) => {
        const statusIcon = friend.status === 'online' ? '🟢' : 
                          friend.status === 'inGame' ? '🎮' : '⚫';
        const blockedStatus = friend.blocked ? ' (blocked)' : '';
        this.deps.terminal.appendOutput(`  ${index + 1}. ${statusIcon} ${friend.nickname}${blockedStatus}`);
      });
    } catch (error) {
      this.deps.terminal.appendOutput('❌ Failed to load friends list. Please try again.');
      console.error('Friend list error:', error);
    }
  }

  private handleProfileCommand(args: string[]): void {
    if (!authStore.getIsLoggedIn()) {
      this.deps.terminal.appendOutput('Please login first to view profiles.');
      return;
    }

    if (args.length > 0) {
      const username = args.join(' ');
      this.deps.router.navigate(`/profile/${username}`);
    } else {
      this.deps.router.navigate('/profile');
    }
  }

  private async handlePlayCommand(): Promise<void> {
    if (!authStore.getIsLoggedIn()) {
      this.deps.terminal.appendOutput('Please login first to play the game.');
      return;
    }

    try {
      // Stop any existing game first
      const gameConfig = await this.deps.onShowModal('gameSetup');
      
      if (gameConfig) {
        const { mode, opponents } = gameConfig;
        this.deps.terminal.appendOutput(`Starting ${mode} game...`);

        const currentUser = authStore.getCurrentUser();
        if (currentUser) {
          const player1: Player = {
            nickname: currentUser.nickname || currentUser.username,
            avatarUrl: currentUser.avatarUrl,
          };

          // Set up game configuration
          let gameData;
          if (mode === 'vs ai') {
            gameData = {
              mode: 'regular',
              players: [{ nickname: 'AI' }, player1],
              multiplayer: false
            };
          } else if (mode === 'local') {
            const opponent = opponents[0];
            gameData = {
              mode: 'regular',
              players: [player1, { nickname: opponent.nickname }],
              multiplayer: true
            };
          } else if (mode === 'tournament') {
            const opponent = opponents[0];
            gameData = {
              mode: 'tournament',
              players: [player1, { nickname: opponent.nickname }],
              multiplayer: true
            };
          }

          if (gameData) {
            this.deps.onGameStart(gameData);
            this.deps.router.navigate('/game');
          }
        }
      } else {
        this.deps.terminal.appendOutput('Game cancelled.');
      }
    } catch (error) {
      this.deps.terminal.appendOutput('❌ Failed to start game. Please try again.');
      console.error('Play command error:', error);
    }
  }

  private handleTournamentCommand(): void {
    try {
      this.deps.onShowModal('tournament');
    } catch (error) {
      this.deps.terminal.appendOutput('❌ Failed to open tournament modal. Please try again.');
      console.error('Tournament command error:', error);
    }
  }

  private async handle2FACommand(args: string[]): Promise<void> {
    if (!authStore.getIsLoggedIn()) {
      this.deps.terminal.appendOutput('Please login first to manage 2FA settings.');
      return;
    }

    // Google OAuth 사용자에 대한 2FA 제한 확인
    const currentUser = authStore.getCurrentUser();
    if (currentUser?.provider === 'google') {
      this.deps.terminal.appendOutput('❌ 2FA is not available for Google OAuth users.');
      this.deps.terminal.appendOutput('Google accounts already use secure OAuth authentication.');
      this.deps.terminal.appendOutput('Additional 2FA setup is not required.');
      return;
    }

    const subCommand = args[0]?.toLowerCase();

    switch (subCommand) {
      case 'enable':
        await this.handle2FAEnable();
        break;
      case 'disable':
        await this.handle2FADisable();
        break;
      case 'status':
        this.handle2FAStatus();
        break;
      default:
        this.deps.terminal.appendOutput('Usage: 2fa <enable|disable|status>');
        this.deps.terminal.appendOutput('  2fa enable  - Enable two-factor authentication');
        this.deps.terminal.appendOutput('  2fa disable - Disable two-factor authentication');
        this.deps.terminal.appendOutput('  2fa status  - Check current 2FA status');
    }
  }

  private async handle2FAEnable(): Promise<void> {
    const currentUser = authStore.getCurrentUser();
    if (currentUser?.twoFactorEnabled) {
      this.deps.terminal.appendOutput('2FA is already enabled. Use "2fa disable" to disable it first.');
      return;
    }

    this.deps.terminal.appendOutput('Starting 2FA setup process...');
    
    try {
      // 모달을 통해 2FA 설정 처리 (초기화부터 완료까지 모달에서 처리)
      await this.deps.onShowModal('2fa', { 
        mode: 'enable',
        onComplete: async (_code: string) => {
          // 이 부분은 실제로는 TwoFAModal 내부에서 처리됨
          this.deps.terminal.appendOutput('✅ 2FA has been successfully enabled!');
          this.deps.terminal.appendOutput('Your account is now more secure.');
          return true;
        },
        onCancel: () => {
          this.deps.terminal.appendOutput('2FA setup cancelled.');
        }
      });
    } catch (error) {
      this.deps.terminal.appendOutput('❌ Failed to start 2FA setup. Please try again.');
      console.error('2FA enable error:', error);
    }
  }

  private async handle2FADisable(): Promise<void> {
    const currentUser = authStore.getCurrentUser();
    if (!currentUser?.twoFactorEnabled) {
      this.deps.terminal.appendOutput('2FA is already disabled.');
      return;
    }

    this.deps.terminal.appendOutput('Starting 2FA disable process...');
    
    try {
      await this.deps.onShowModal('2fa', { 
        mode: 'disable',
        onComplete: async (_code: string) => {
          this.deps.terminal.appendOutput('✅ 2FA has been successfully disabled!');
          this.deps.terminal.appendOutput('Your account security has been updated.');
          return true;
        },
        onCancel: () => {
          this.deps.terminal.appendOutput('2FA disable cancelled.');
        }
      });
    } catch (error) {
      this.deps.terminal.appendOutput('❌ Failed to start 2FA disable process. Please try again.');
      console.error('2FA disable error:', error);
    }
  }

  private handle2FAStatus(): void {
    const currentUser = authStore.getCurrentUser();
    if (!currentUser) {
      this.deps.terminal.appendOutput('Unable to check 2FA status - user data not available.');
      return;
    }

    const status = currentUser.twoFactorEnabled ? 'Enabled' : 'Disabled';
    const statusIcon = currentUser.twoFactorEnabled ? '🔒' : '🔓';
    
    this.deps.terminal.appendOutput(`${statusIcon} Two-Factor Authentication: ${status}`);
    
    if (currentUser.twoFactorEnabled) {
      this.deps.terminal.appendOutput('Your account is protected with 2FA.');
    } else {
      this.deps.terminal.appendOutput('Consider enabling 2FA for better security. Use "2fa enable" to set it up.');
    }
  }

  private async handleSetCommand(args: string[]): Promise<void> {
    if (!authStore.getIsLoggedIn()) {
      this.deps.terminal.appendOutput('Please login first to update profile settings.');
      return;
    }

    const subCommand = args[0]?.toLowerCase();

    switch (subCommand) {
      case 'avatar':
        await this.handleSetAvatar();
        break;
      case 'name':
        await this.handleSetName(args.slice(1));
        break;
      default:
        this.deps.terminal.appendOutput('Usage: set <avatar|name> [value]');
        this.deps.terminal.appendOutput('  set avatar        - Upload a new avatar image');
        this.deps.terminal.appendOutput('  set name <name>   - Update your display name');
    }
  }

  private async handleSetAvatar(): Promise<void> {
    try {
      await this.deps.onShowModal('file');
    } catch (error) {
      this.deps.terminal.appendOutput('❌ Failed to open avatar upload. Please try again.');
      console.error('Avatar upload error:', error);
    }
  }

  private async handleSetName(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.deps.terminal.appendOutput('Usage: set name <new_name>');
      this.deps.terminal.appendOutput('Example: set name "John Doe"');
      return;
    }
    
    const newName = args.join(' ').trim();
    if (!newName) {
      this.deps.terminal.appendOutput('Please provide a valid name.');
      return;
    }
    
    try {
      this.deps.terminal.appendOutput(`Updating name to: "${newName}"...`);
      
      // Call API to update name
      const updatedUser = await this.deps.apiClient.user.updateName(newName);
      
      // Update user state
      const currentUser = authStore.getCurrentUser();
      if (currentUser) {
        const updatedUserState = {
          ...currentUser,
          nickname: updatedUser.nickname,
          username: updatedUser.username
        };
        authStore.updateUser(updatedUserState);
        this.deps.onUserStateUpdate(updatedUserState);
        
        // Update cache
        const userToCache = { ...updatedUserState };
        delete (userToCache as any).twoFactorEnabled;
        UserStateCache.cache(userToCache);
      }
      
      this.deps.terminal.appendOutput(`✅ Name updated successfully to: "${updatedUser.nickname}"`);
      
    } catch (error) {
      this.deps.terminal.appendOutput('❌ Failed to update name. Please try again.');
      console.error('Name update error:', error);
    }
  }

  private handleClearCommand(): void {
    this.deps.terminal.clearOutput();
  }
}
