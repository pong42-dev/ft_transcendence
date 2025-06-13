import { Terminal } from './Terminal';
import { PongGame } from './PongGame';
import { AuthService } from '../utils/AuthService';
import { UserProfile } from './UserProfile';
import { NotificationCenter } from './NotificationCenter';
import { FileModal } from './FileModal';
import { GameModal } from './GameModal';
import { GameEndModal } from './GameEndModal';
import { AppState, Notification, Friend } from '../models/Types';
import { apiService } from '../services/ApiService';

export class App {
  private appElement: HTMLElement;
  private pongGame: PongGame;
  private userProfile: UserProfile | null = null;
  private notificationCenter: NotificationCenter;
  private authService: AuthService;
  private state: AppState = {
    isLoggedIn: false,
    currentUser: null,
    isInGame: false,
  };
  private terminal: Terminal;
  private terminalContainer: HTMLElement;
  private awaitingTwoFactorCode: boolean = false;
  private mainContent: HTMLElement;

  constructor() {
    this.appElement = document.getElementById('app') as HTMLElement;
    this.authService = new AuthService();
    
    // 기존 토큰으로 자동 로그인 시도
    this.tryAutoLogin();
    
    this.pongGame = new PongGame((winner) => {
      if (this.state.isLoggedIn && this.state.isInGame) {
        this.handleGameEnd(winner);
      }
    });
    this.notificationCenter = new NotificationCenter(
      (notification: Notification) => {
        if (notification.type === 'game_invite') {
          const gameModal = new GameModal(
            (_mode: string, _invitedFriends: Friend[]) => {
              this.state.isInGame = true;
              this.pongGame.setMultiplayerMode(true);
              this.updateMainContent();
            },
            () => {
              this.state.isInGame = false;
              this.pongGame.stop();
              this.updateMainContent();
            }
          );
          gameModal.show();
        }
      }
    );
    this.terminalContainer = document.createElement('div');
    this.mainContent = document.createElement('div');
    this.terminal = new Terminal(this.handleCommand.bind(this));
  }

  public init(): void {
    this.render();
    if (!this.state.isLoggedIn) {
      this.pongGame.setGameMode('demo');
      this.pongGame.start();
    }
  }

  private handleGameEnd(_winner: 'left' | 'right'): void {
    if (!this.state.isInGame) return;

    const isTournament = this.pongGame.gameMode === 'tournament';
    const isFinal = this.pongGame.isTournamentFinal;

    const gameEndModal = new GameEndModal(
      isTournament,
      isFinal,
      () => {
        this.state.isInGame = false;
        this.updateMainContent();
      },
      () => {
        if (isTournament && !isFinal) {
          this.showTournamentBracket();
        }
      }
    );

    gameEndModal.show();
  }

  private showTournamentBracket(): void {
    const modal = new GameModal(
      (_mode: string, _invitedFriends: Friend[]) => {
        this.state.isInGame = true;
        this.pongGame.setMultiplayerMode(true);
        this.updateMainContent();
      },
      () => {
        this.state.isInGame = false;
        this.pongGame.stop();
        this.updateMainContent();
      }
    );
    modal.show();
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private updateMainContent(): void {
    this.mainContent.innerHTML = '';
    if (this.state.isLoggedIn && this.state.currentUser) {
      if (this.state.isInGame) {
        this.pongGame.setGameMode('regular');
        this.mainContent.appendChild(this.pongGame.render());
        this.pongGame.start();
      } else if (!this.userProfile) {
        this.userProfile = new UserProfile(this.state.currentUser, true);
        this.mainContent.appendChild(this.userProfile.render());
      } else {
        this.mainContent.appendChild(this.userProfile.render());
      }
    } else {
      this.pongGame.setGameMode('demo');
      this.mainContent.appendChild(this.pongGame.render());
      this.pongGame.start();
    }
  }

  private render(): void {
    this.appElement.innerHTML = '';

    const appContainer = document.createElement('div');
    appContainer.className =
      'flex flex-col h-full border border-terminal-gray rounded-lg overflow-hidden relative';

    const headerElement = document.createElement('div');
    headerElement.className =
      'flex items-center p-2 bg-terminal-black border-b border-terminal-gray';
    headerElement.innerHTML = `
      <div class="flex space-x-2 ml-2">
        <div class="w-3 h-3 rounded-full bg-terminal-red"></div>
        <div class="w-3 h-3 rounded-full bg-terminal-yellow"></div>
        <div class="w-3 h-3 rounded-full bg-terminal-lightGreen"></div>
      </div>
      <div class="flex-grow text-center text-gray-400 text-sm">PONG-CLI v1.0.0</div>
    `;
    appContainer.appendChild(headerElement);

    this.mainContent.className =
      'h-[800px] bg-terminal-black border-b border-terminal-gray overflow-hidden';
    this.updateMainContent();
    appContainer.appendChild(this.mainContent);

    this.terminalContainer.className =
      'flex flex-col h-[240px] min-h-[240px] max-h-[240px]';

    appContainer.appendChild(this.terminalContainer);

    const statusBar = document.createElement('div');
    statusBar.className =
      'h-[30px] min-h-[30px] max-h-[30px] flex justify-between items-center px-4 bg-terminal-black border-t border-terminal-gray';

    const userInfo = document.createElement('div');
    userInfo.className = 'flex items-center gap-2';

    if (this.state.isLoggedIn && this.state.currentUser) {
      userInfo.innerHTML = `
        <div class="w-2 h-2 rounded-full bg-terminal-green"></div>
        <span class="text-sm">${this.state.currentUser.nickname}</span>
      `;
      const notificationButton = this.notificationCenter.renderButton();
      statusBar.appendChild(userInfo);
      statusBar.appendChild(notificationButton);
    } else {
      userInfo.innerHTML = `
        <div class="w-2 h-2 rounded-full bg-terminal-red"></div>
        <span class="text-sm text-terminal-gray">Not logged in</span>
      `;
      statusBar.appendChild(userInfo);
    }

    appContainer.appendChild(statusBar);
    this.appElement.appendChild(appContainer);
    this.renderTerminal();
  }

  private renderTerminal(): void {
    this.terminalContainer.innerHTML = '';

    // Create tabs container with only Main tab
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'flex bg-terminal-black border-b border-terminal-gray';

    const mainTabElement = document.createElement('div');
    mainTabElement.className = 'px-3 py-1 flex items-center gap-2 bg-terminal-gray bg-opacity-30 text-terminal-green';

    const icon = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 17l6-6-6-6M12 19h8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    mainTabElement.innerHTML = `
      <span class="opacity-75">${icon}</span>
      <span>Main</span>
    `;

    tabsContainer.appendChild(mainTabElement);
    this.terminalContainer.appendChild(tabsContainer);

    const terminalWrapper = document.createElement('div');
    terminalWrapper.className = 'flex-1 overflow-auto';
    const terminalElement = this.terminal.render();
    terminalWrapper.appendChild(terminalElement);
    this.terminalContainer.appendChild(terminalWrapper);
  }

  private async handleCommand(command: string): Promise<void> {
    const parts = command.trim().split(' ');
    const commandName = parts[0].toLowerCase();

    if (this.awaitingTwoFactorCode) {
      const code = parts[0];
      if (code === '123456') {
        this.awaitingTwoFactorCode = false;
        if (this.state.currentUser) {
          const newStatus = !this.state.currentUser.twoFactorEnabled;
          this.state.currentUser.twoFactorEnabled = newStatus;
          this.terminal.appendOutput(
            `2FA has been ${newStatus ? 'enabled' : 'disabled'} successfully.`
          );
          if (this.userProfile) {
            this.userProfile.updateUser(this.state.currentUser);
          }
          this.render();
        }
      } else {
        this.terminal.appendOutput(
          'Invalid verification code. Please try again.'
        );
      }
      return;
    }

    switch (commandName) {
      case 'help':
        if (!this.state.isLoggedIn) {
          this.terminal.appendOutput(
            'Available commands:\n' +
              '  help           - Display this help message\n' +
              '  login          - Login with email and password\n' +
              '  login google   - Login with Google\n' +
              '  register       - Create a new account\n' +
              '  clear          - Clear the terminal screen'
          );
        } else {
          this.terminal.appendOutput(
            'Available commands:\n' +
              '  help           - Display this help message\n' +
              '  notify         - Create a test notification\n' +
              '  clear          - Clear the terminal screen\n' +
              '  logout         - Log out of current session\n' +
              '  set            - Manage user settings\n' +
              '  friend         - Manage friends list\n' +
              '  play           - Start a game of Pong\n' +
              '  profile        - View user profile (profile <username>)'
          );
        }
        break;

      case 'login':
        if (!this.state.isLoggedIn) {
          if (parts[1] === 'google') {
            await this.handleGoogleLogin();
            return;
          }

          if (parts.length < 3) {
            this.terminal.appendOutput('Usage: login <email> <password>');
            return;
          }

          const email = parts[1];
          const password = parts[2];

          if (!this.validateEmail(email)) {
            this.terminal.appendOutput(
              'Invalid email format. Please use a valid email address.'
            );
            return;
          }

          await this.handleLogin(email, password);
        } else {
          this.terminal.appendOutput(
            'You are already logged in. Type "logout" to sign out.'
          );
        }
        break;

      case 'register':
        if (this.state.isLoggedIn) {
          this.terminal.appendOutput(
            'Please logout first to register a new account.'
          );
          return;
        }

        if (parts.length < 4) {
          this.terminal.appendOutput(
            'Usage: register <email> <password> <nickname>'
          );
          return;
        }

        const registerEmail = parts[1];
        const registerPassword = parts[2];
        const nickname = parts.slice(3).join(' ');

        if (!this.validateEmail(registerEmail)) {
          this.terminal.appendOutput(
            'Invalid email format. Please use a valid email address.'
          );
          return;
        }

        await this.handleRegister(registerEmail, registerPassword, nickname);
        break;

      case 'clear':
        this.terminal.clearOutput();
        break;

      case 'logout':
        if (this.state.isLoggedIn) {
          await this.handleLogout();
        }
        break;

      case 'play':
        if (!this.state.isLoggedIn) {
          this.terminal.appendOutput(
            'Please login first to play the game.'
          );
          return;
        }

        const gameModal = new GameModal(
          (_mode: string, _invitedFriends: Friend[]) => {
            this.terminal.appendOutput(`Starting ${_mode} game...`);
            this.state.isInGame = true;
            this.pongGame.setMultiplayerMode(true);
            this.updateMainContent();
          },
          () => {
            this.terminal.appendOutput('Game cancelled.');
            this.state.isInGame = false;
            this.updateMainContent();
          }
        );
        gameModal.show();
        break;

      case 'profile':
        if (!this.state.isLoggedIn) {
          this.terminal.appendOutput(
            'Please login first to view profiles.'
          );
          return;
        }

        const targetNickname = parts.slice(1).join(' ');
        if (!targetNickname) {
          this.terminal.appendOutput('Usage: profile <nickname>');
          return;
        }

        const targetUser = this.authService.getUser(targetNickname);
        if (!targetUser) {
          this.terminal.appendOutput('User not found.');
          return;
        }

        if (
          targetUser.username !== this.state.currentUser?.username &&
          !this.authService.isFriend(
            this.state.currentUser?.username || '',
            targetNickname
          )
        ) {
          this.terminal.appendOutput(
            'You can only view profiles of your friends.'
          );
          return;
        }

        const isCurrentUser =
          targetUser.username === this.state.currentUser?.username;
        this.userProfile = new UserProfile(targetUser, isCurrentUser);
        this.updateMainContent();
        this.terminal.appendOutput(
          `Viewing profile: ${targetUser.nickname || targetUser.username}`
        );
        break;

      default:
        if (!this.state.isLoggedIn) {
          this.terminal.appendOutput(
            'Please login first. Available commands: help, login, clear'
          );
          return;
        }

        // Handle logged-in user commands
        await this.handleLoggedInCommands(parts);
    }
  }

  private async handleLoggedInCommands(parts: string[]): Promise<void> {
    switch (parts[0]) {
      case 'set':
        this.handleSetCommand(parts);
        break;

      case 'notify':
        this.handleNotifyCommand();
        break;

      case 'friend':
        this.handleFriendCommand(parts);
        break;

      default:
        this.terminal.appendOutput(`Command not found: ${parts.join(' ')}`);
    }
  }

  private handleSetCommand(parts: string[]): void {
    if (parts.length < 2) {
      this.terminal.appendOutput(
        'Usage: set <setting> <value>\n' +
          'Available settings:\n' +
          '  nickname     - Change your nickname\n' +
          '  avatar      - Change your avatar image\n' +
          '  2fa         - Enable/disable 2FA (enable/disable)'
      );
      return;
    }

    switch (parts[1]) {
      case 'nickname':
        if (parts.length < 3) {
          this.terminal.appendOutput('Usage: set nickname <new-nickname>');
          return;
        }
        const newNickname = parts.slice(2).join(' ');
        if (this.state.currentUser) {
          this.state.currentUser.nickname = newNickname;
          this.terminal.appendOutput(`New nickname: ${newNickname}`);
          this.terminal.appendOutput('Nickname updated successfully.');
          this.render();
        }
        break;

      case 'avatar':
        const fileModal = new FileModal((file: File) => {
          if (this.state.currentUser) {
            const mockUrl = URL.createObjectURL(file);
            this.state.currentUser.avatarUrl = mockUrl;
            if (this.userProfile) {
              this.userProfile.updateUser(this.state.currentUser);
            }
            this.terminal.appendOutput('Avatar updated successfully.');
            this.render();
          }
        });
        fileModal.show();
        break;

      case '2fa':
        if (parts.length < 3 || !['enable', 'disable'].includes(parts[2])) {
          this.terminal.appendOutput('Usage: set 2fa <enable|disable>');
          return;
        }

        const isEnabling = parts[2] === 'enable';
        if (this.state.currentUser?.twoFactorEnabled === isEnabling) {
          this.terminal.appendOutput(
            `2FA is already ${isEnabling ? 'enabled' : 'disabled'}.`
          );
          return;
        }

        this.terminal.appendOutput(
          `Verification code sent to ${this.state.currentUser?.username}`
        );
        this.terminal.appendOutput('Please enter the verification code:');
        this.awaitingTwoFactorCode = true;
        break;

      default:
        this.terminal.appendOutput(
          'Invalid setting. Use "set" without arguments to see available settings.'
        );
    }
  }

  private handleNotifyCommand(): void {
    const notificationTypes = ['friend_request', 'game_invite'] as const;
    const type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];

    let notification: Notification;

    switch (type) {
      case 'friend_request':
        notification = {
          id: Math.random().toString(36).substring(7),
          type: 'friend_request',
          title: 'Friend Request',
          message: 'TestUser wants to be your friend',
          sender: 'TestUser',
          timestamp: Date.now(),
          read: false,
        };
        break;
      case 'game_invite':
        notification = {
          id: Math.random().toString(36).substring(7),
          type: 'game_invite',
          title: 'Game Invitation',
          message: 'TestUser invited you to a game',
          sender: 'TestUser',
          timestamp: Date.now(),
          read: false,
        };
        break;
    }

    this.notificationCenter.addNotification(notification);
    this.terminal.appendOutput('Test notification created!');
  }

  private handleFriendCommand(parts: string[]): void {
    if (parts.length < 2) {
      this.terminal.appendOutput(
        'Usage: friend list/block/unblock/remove <username>'
      );
      return;
    }

    switch (parts[1]) {
      case 'list':
        if (this.state.currentUser) {
          const friends = this.authService.getFriends(this.state.currentUser.username);
          if (friends.length === 0) {
            this.terminal.appendOutput('No friends yet.');
          } else {
            this.terminal.appendOutput(
              'Friends List:\nUsername    Nickname    Status     Blocked\n----------------------------------------'
            );
            friends.forEach((friend) => {
              const username = friend.username.padEnd(11);
              const nickname = friend.nickname.padEnd(11);
              const status = friend.status.padEnd(10);
              const blocked = friend.blocked ? 'Yes' : 'No';
              this.terminal.appendOutput(`${username}${nickname}${status}${blocked}`);
            });
            this.terminal.appendOutput(
              '\nCommands:\n' +
                '  friend block <username>   - Block user\n' +
                '  friend unblock <username> - Unblock user\n' +
                '  friend remove <username>  - Remove from friends'
            );
          }
        }
        break;

      case 'block':
        if (parts.length < 3) {
          this.terminal.appendOutput('Usage: friend block <username>');
          return;
        }
        if (this.state.currentUser) {
          this.authService.toggleBlockFriend(this.state.currentUser.username, parts[2]);
          this.terminal.appendOutput(`Blocked ${parts[2]}`);
        }
        break;

      case 'unblock':
        if (parts.length < 3) {
          this.terminal.appendOutput('Usage: friend unblock <username>');
          return;
        }
        if (this.state.currentUser) {
          this.authService.toggleBlockFriend(this.state.currentUser.username, parts[2]);
          this.terminal.appendOutput(`Unblocked ${parts[2]}`);
        }
        break;

      case 'remove':
        if (parts.length < 3) {
          this.terminal.appendOutput('Usage: friend remove <username>');
          return;
        }
        if (this.state.currentUser) {
          this.authService.removeFriend(this.state.currentUser.username, parts[2]);
          this.terminal.appendOutput(`Removed ${parts[2]} from friends`);
        }
        break;

      default:
        this.terminal.appendOutput('Usage: friend list/block/unblock/remove <username>');
    }
  }

  // 자동 로그인 시도 (토큰이 있을 경우)
  private async tryAutoLogin(): Promise<void> {
    const token = apiService.getToken();
    if (token) {
      try {
        const response = await apiService.auth.getCurrentUser();
        if (response.success && response.data) {
          this.state.isLoggedIn = true;
          this.state.currentUser = {
            ...response.data,
            gamesPlayed: 0,
            gamesWon: 0,
            achievements: [],
            notifications: [],
            friends: [],
            matchHistory: []
          };
          console.log('Auto login successful');
        } else {
          // 토큰이 유효하지 않으면 제거
          apiService.setToken(null);
        }
      } catch (error) {
        console.error('Auto login failed:', error);
        apiService.setToken(null);
      }
    }
  }

  // Mock 데이터 사용 여부에 따른 로그인 처리
  private async handleLogin(email: string, password: string): Promise<void> {
    if (apiService.shouldUseMockData()) {
      // Mock 데이터 사용 (기존 방식)
      try {
        const user = this.authService.login(email, password);
        this.state.isLoggedIn = true;
        this.state.currentUser = user;
        this.terminal.reset();
        this.terminal.appendOutput(`Welcome back, ${email}!`);
        this.terminal.appendOutput('Type "help" to see available commands.');
        this.render();
      } catch (error) {
        this.terminal.appendOutput('Invalid credentials. Please try again.');
      }
    } else {
      // 실제 API 사용
      this.terminal.appendOutput(`Authenticating as ${email}...`);
      
      const response = await apiService.auth.login(email, password);
      
      if (response.success && response.data) {
        this.state.isLoggedIn = true;
        this.state.currentUser = {
          ...response.data.user,
          gamesPlayed: 0,
          gamesWon: 0,
          achievements: [],
          notifications: [],
          friends: [],
          matchHistory: []
        };
        this.terminal.reset();
        this.terminal.appendOutput(`Welcome back, ${email}!`);
        this.terminal.appendOutput('Type "help" to see available commands.');
        this.render();
      } else {
        this.terminal.appendOutput(`Login failed: ${response.error || 'Unknown error'}`);
      }
    }
  }

  // Mock 데이터 사용 여부에 따른 회원가입 처리
  private async handleRegister(email: string, password: string, nickname: string): Promise<void> {
    if (apiService.shouldUseMockData()) {
      // Mock 데이터 사용 (기존 방식)
      try {
        this.terminal.appendOutput('Creating your account...');
        const user = this.authService.register(email, password, nickname);

        const fileModal = new FileModal((file: File) => {
          if (user) {
            const mockUrl = URL.createObjectURL(file);
            user.avatarUrl = mockUrl;
            this.state.isLoggedIn = true;
            this.state.currentUser = user;
            this.terminal.reset();
            this.terminal.appendOutput(`Welcome, ${nickname}!`);
            this.terminal.appendOutput('Type "help" to see available commands.');
            this.render();
          }
        });
        fileModal.show();
      } catch (error) {
        this.terminal.appendOutput('Registration failed. Email already exists.');
      }
    } else {
      // 실제 API 사용
      this.terminal.appendOutput('Creating your account...');
      
      const response = await apiService.auth.register(email, password, nickname);
      
      if (response.success && response.data) {
        this.state.isLoggedIn = true;
        this.state.currentUser = {
          ...response.data.user,
          gamesPlayed: 0,
          gamesWon: 0,
          achievements: [],
          notifications: [],
          friends: [],
          matchHistory: []
        };
        this.terminal.reset();
        this.terminal.appendOutput(`Welcome, ${nickname}!`);
        this.terminal.appendOutput('Type "help" to see available commands.');
        this.render();
      } else {
        this.terminal.appendOutput(`Registration failed: ${response.error || 'Unknown error'}`);
      }
    }
  }

  // Google 로그인 처리
  private async handleGoogleLogin(): Promise<void> {
    if (apiService.shouldUseMockData()) {
      // Mock 처리
      this.terminal.appendOutput('Google login not available in mock mode');
      return;
    }

    this.terminal.appendOutput('Redirecting to Google login...');
    // 실제 Google OAuth 구현은 추후 추가
    this.terminal.appendOutput('Google login implementation pending...');
  }

  // 로그아웃 처리
  private async handleLogout(): Promise<void> {
    if (!apiService.shouldUseMockData() && this.state.isLoggedIn) {
      // 실제 API 로그아웃 호출
      await apiService.auth.logout();
    }
    
    // 로컬 상태 초기화
    this.state.isLoggedIn = false;
    this.state.currentUser = null;
    this.state.isInGame = false;
    this.userProfile = null;
    this.terminal.reset();
    this.render();
  }
}
