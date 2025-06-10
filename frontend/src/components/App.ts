import { Terminal } from './Terminal';
import { PongGame } from './PongGame';
import { AuthService } from '../utils/AuthService';
import { UserProfile } from './UserProfile';
import { NotificationCenter } from './NotificationCenter';
import { FileModal } from './FileModal';
import { GameModal } from './GameModal';
import { GameEndModal } from './GameEndModal';
import { AppState, Notification, Friend } from '../models/Types';

interface Tab {
  id: string;
  title: string;
  type: 'main' | 'chat';
  chatWith?: string;
  terminal: Terminal;
}

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
  private tabs: Tab[] = [];
  private activeTabId: string = 'main';
  private terminalContainer: HTMLElement;
  private awaitingTwoFactorCode: boolean = false;
  private mainContent: HTMLElement;

  constructor() {
    this.appElement = document.getElementById('app') as HTMLElement;
    this.authService = new AuthService();
    this.pongGame = new PongGame((winner) => {
      if (this.state.isLoggedIn && this.state.isInGame) {
        this.handleGameEnd(winner);
      }
    });
    this.notificationCenter = new NotificationCenter(
      (notification: Notification) => {
        if (notification.type === 'game_invite') {
          const gameModal = new GameModal(
            (mode: string, invitedFriends: Friend[]) => {
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

    this.tabs.push({
      id: 'main',
      title: 'Main',
      type: 'main',
      terminal: new Terminal(this.handleCommand.bind(this)),
    });
  }

  public init(): void {
    this.render();
    if (!this.state.isLoggedIn) {
      this.pongGame.setGameMode('demo');
      this.pongGame.start();
    }
  }

  private handleGameEnd(winner: 'left' | 'right'): void {
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
      (mode: string, invitedFriends: Friend[]) => {
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

  private createChatTab(username: string): void {
    const tabId = `chat-${username}`;
    if (!this.tabs.find((tab) => tab.id === tabId)) {
      const chatTerminal = new Terminal(this.handleCommand.bind(this), 'chat');
      chatTerminal.appendOutput(`Chat session started with ${username}`);

      this.tabs.push({
        id: tabId,
        title: username,
        type: 'chat',
        chatWith: username,
        terminal: chatTerminal,
      });
    }
    this.activeTabId = tabId;
    this.renderTerminal();
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

    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'flex bg-terminal-black border-b border-terminal-gray';

    this.tabs.forEach((tab) => {
      const tabElement = document.createElement('div');
      const isActive = tab.id === this.activeTabId;
      tabElement.className = `
        px-3 py-1 flex items-center gap-2 cursor-pointer select-none
        ${
          isActive
            ? 'bg-terminal-gray bg-opacity-30 text-terminal-green'
            : 'text-terminal-green hover:bg-terminal-gray hover:bg-opacity-20'
        }
      `;

      const icon = tab.type === 'chat' 
        ? '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 17l6-6-6-6M12 19h8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      tabElement.innerHTML = `
        <span class="opacity-75">${icon}</span>
        <span>${tab.title}</span>
        ${
          tab.type !== 'main'
            ? '<button class="ml-1 w-5 h-5 flex items-center justify-center text-terminal-gray hover:text-terminal-darkGreen transition-colors text-lg">×</button>'
            : ''
        }
      `;

      if (!isActive) {
        tabElement.addEventListener('click', (e) => {
          if (!(e.target as HTMLElement).closest('button')) {
            this.activeTabId = tab.id;
            this.renderTerminal();
          }
        });
      }

      if (tab.type !== 'main') {
        const closeButton = tabElement.querySelector('button');
        if (closeButton) {
          closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.tabs = this.tabs.filter((t) => t.id !== tab.id);
            if (this.activeTabId === tab.id) {
              this.activeTabId = 'main';
            }
            this.renderTerminal();
          });
        }
      }

      tabsContainer.appendChild(tabElement);
    });

    this.terminalContainer.appendChild(tabsContainer);

    const activeTab = this.tabs.find((tab) => tab.id === this.activeTabId);
    if (activeTab) {
      const terminalWrapper = document.createElement('div');
      terminalWrapper.className = 'flex-1 overflow-auto';
      const terminalElement = activeTab.terminal.render();
      terminalWrapper.appendChild(terminalElement);
      this.terminalContainer.appendChild(terminalWrapper);
    }
  }

  private handleCommand(command: string): void {
    const cmd = command;
    const parts = command.trim().split(' ');
    const commandName = parts[0].toLowerCase();

    const activeTab = this.tabs.find((tab) => tab.id === this.activeTabId);
    if (!activeTab) return;

    if (this.awaitingTwoFactorCode) {
      const code = parts[0];
      if (code === '123456') {
        this.awaitingTwoFactorCode = false;
        if (this.state.currentUser) {
          const newStatus = !this.state.currentUser.twoFactorEnabled;
          this.state.currentUser.twoFactorEnabled = newStatus;
          activeTab.terminal.appendOutput(
            `2FA has been ${newStatus ? 'enabled' : 'disabled'} successfully.`
          );
          if (this.userProfile) {
            this.userProfile.updateUser(this.state.currentUser);
          }
          this.render();
        }
      } else {
        activeTab.terminal.appendOutput(
          'Invalid verification code. Please try again.'
        );
      }
      return;
    }

    switch (commandName) {
      case 'help':
        if (!this.state.isLoggedIn) {
          activeTab.terminal.appendOutput(
            'Available commands:\n' +
              '  help           - Display this help message\n' +
              '  login          - Login with email and password\n' +
              '  login google   - Login with Google\n' +
              '  register       - Create a new account\n' +
              '  clear          - Clear the terminal screen'
          );
        } else {
          activeTab.terminal.appendOutput(
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
            activeTab.terminal.appendOutput('Redirecting to Google login...');
            this.authService.loginWithGoogle('');
            return;
          }

          if (parts.length < 3) {
            activeTab.terminal.appendOutput('Usage: login <email> <password>');
            return;
          }

          const email = parts[1];
          const password = parts[2];

          if (!this.validateEmail(email)) {
            activeTab.terminal.appendOutput(
              'Invalid email format. Please use a valid email address.'
            );
            return;
          }

          activeTab.terminal.appendOutput(`Authenticating as ${email}...`);

          try {
            const user = this.authService.login(email, password);
            this.state.isLoggedIn = true;
            this.state.currentUser = user;
            activeTab.terminal.reset();
            activeTab.terminal.appendOutput(`Welcome back, ${email}!`);
            activeTab.terminal.appendOutput(
              'Type "help" to see available commands.'
            );
            this.render();
          } catch (error) {
            activeTab.terminal.appendOutput(
              'Invalid credentials. Please try again.'
            );
          }
        } else {
          activeTab.terminal.appendOutput(
            'You are already logged in. Type "logout" to sign out.'
          );
        }
        break;

      case 'register':
        if (this.state.isLoggedIn) {
          activeTab.terminal.appendOutput(
            'Please logout first to register a new account.'
          );
          return;
        }

        if (parts.length < 4) {
          activeTab.terminal.appendOutput(
            'Usage: register <email> <password> <nickname>'
          );
          return;
        }

        const email = parts[1];
        const password = parts[2];
        const nickname = parts.slice(3).join(' ');

        if (!this.validateEmail(email)) {
          activeTab.terminal.appendOutput(
            'Invalid email format. Please use a valid email address.'
          );
          return;
        }

        try {
          activeTab.terminal.appendOutput('Creating your account...');
          const user = this.authService.register(email, password, nickname);

          const fileModal = new FileModal((file: File) => {
            if (user) {
              const mockUrl = URL.createObjectURL(file);
              user.avatarUrl = mockUrl;
              this.state.isLoggedIn = true;
              this.state.currentUser = user;
              activeTab.terminal.reset();
              activeTab.terminal.appendOutput(`Welcome, ${nickname}!`);
              activeTab.terminal.appendOutput(
                'Type "help" to see available commands.'
              );
              this.render();
            }
          });
          fileModal.show();
        } catch (error) {
          activeTab.terminal.appendOutput(
            'Registration failed. Email already exists.'
          );
        }
        break;

      case 'clear':
        activeTab.terminal.clearOutput();
        break;

      case 'logout':
        if (this.state.isLoggedIn) {
          this.state.isLoggedIn = false;
          this.state.currentUser = null;
          this.state.isInGame = false;
          this.userProfile = null;
          this.tabs = this.tabs.filter((tab) => tab.type === 'main');
          this.activeTabId = 'main';
          activeTab.terminal.reset();
          this.render();
        }
        break;

      case 'play':
        if (!this.state.isLoggedIn) {
          activeTab.terminal.appendOutput(
            'Please login first to play the game.'
          );
          return;
        }

        const gameModal = new GameModal(
          (mode: string, invitedFriends: Friend[]) => {
            activeTab.terminal.appendOutput(`Starting ${mode} game...`);
            this.state.isInGame = true;
            this.pongGame.setMultiplayerMode(true);
            this.updateMainContent();
          },
          () => {
            activeTab.terminal.appendOutput('Game cancelled.');
            this.state.isInGame = false;
            this.updateMainContent();
          }
        );
        gameModal.show();
        break;

      case 'profile':
        if (!this.state.isLoggedIn) {
          activeTab.terminal.appendOutput(
            'Please login first to view profiles.'
          );
          return;
        }

        const targetNickname = parts.slice(1).join(' ');
        if (!targetNickname) {
          activeTab.terminal.appendOutput('Usage: profile <nickname>');
          return;
        }

        const targetUser = this.authService.getUser(targetNickname);
        if (!targetUser) {
          activeTab.terminal.appendOutput('User not found.');
          return;
        }

        if (
          targetUser.username !== this.state.currentUser?.username &&
          !this.authService.isFriend(
            this.state.currentUser?.username || '',
            targetNickname
          )
        ) {
          activeTab.terminal.appendOutput(
            'You can only view profiles of your friends.'
          );
          return;
        }

        const isCurrentUser =
          targetUser.username === this.state.currentUser?.username;
        this.userProfile = new UserProfile(targetUser, isCurrentUser);
        this.updateMainContent();
        activeTab.terminal.appendOutput(
          `Viewing profile: ${targetUser.nickname || targetUser.username}`
        );
        break;

      default:
        if (!this.state.isLoggedIn) {
          activeTab.terminal.appendOutput(
            'Please login first. Available commands: help, login, clear'
          );
          return;
        }

        switch (parts[0]) {
          case 'set':
            if (parts.length < 2) {
              activeTab.terminal.appendOutput(
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
                  activeTab.terminal.appendOutput(
                    'Usage: set nickname <new-nickname>'
                  );
                  return;
                }
                const newNickname = parts.slice(2).join(' ');
                if (this.state.currentUser) {
                  this.state.currentUser.nickname = newNickname;
                  activeTab.terminal.appendOutput(
                    `New nickname: ${newNickname}`
                  );
                  activeTab.terminal.appendOutput(
                    'Nickname updated successfully.'
                  );
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
                    activeTab.terminal.appendOutput(
                      'Avatar updated successfully.'
                    );
                    this.render();
                  }
                });
                fileModal.show();
                break;

              case '2fa':
                if (
                  parts.length < 3 ||
                  !['enable', 'disable'].includes(parts[2])
                ) {
                  activeTab.terminal.appendOutput(
                    'Usage: set 2fa <enable|disable>'
                  );
                  return;
                }

                const isEnabling = parts[2] === 'enable';
                if (this.state.currentUser?.twoFactorEnabled === isEnabling) {
                  activeTab.terminal.appendOutput(
                    `2FA is already ${isEnabling ? 'enabled' : 'disabled'}.`
                  );
                  return;
                }

                activeTab.terminal.appendOutput(
                  `Verification code sent to ${this.state.currentUser?.username}`
                );
                activeTab.terminal.appendOutput(
                  'Please enter the verification code:'
                );
                this.awaitingTwoFactorCode = true;
                break;

              default:
                activeTab.terminal.appendOutput(
                  'Invalid setting. Use "set" without arguments to see available settings.'
                );
            }
            break;

          case 'notify':
            const notificationTypes = [
              'friend_request',
              'game_invite',
              'chat',
            ] as const;
            const type =
              notificationTypes[
                Math.floor(Math.random() * notificationTypes.length)
              ];

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
              case 'chat':
                notification = {
                  id: Math.random().toString(36).substring(7),
                  type: 'chat',
                  title: 'New Message',
                  message: 'TestUser: Hey, want to play a game?',
                  sender: 'TestUser',
                  timestamp: Date.now(),
                  read: false,
                };
                break;
            }

            this.notificationCenter.addNotification(notification);
            activeTab.terminal.appendOutput('Test notification created!');
            break;

          case 'friend':
            if (parts.length < 2) {
              activeTab.terminal.appendOutput(
                'Usage: friend list/block/unblock/remove <username>'
              );
              return;
            }

            switch (parts[1]) {
              case 'list':
                if (this.state.currentUser) {
                  const friends = this.authService.getFriends(
                    this.state.currentUser.username
                  );
                  if (friends.length === 0) {
                    activeTab.terminal.appendOutput('No friends yet.');
                  } else {
                    activeTab.terminal.appendOutput(
                      'Friends List:\nUsername    Nickname    Status     Blocked\n----------------------------------------'
                    );
                    friends.forEach((friend) => {
                      const username = friend.username.padEnd(11);
                      const nickname = friend.nickname.padEnd(11);
                      const status = friend.status.padEnd(10);
                      const blocked = friend.blocked ? 'Yes' : 'No';
                      activeTab.terminal.appendOutput(
                        `${username}${nickname}${status}${blocked}`
                      );
                    });
                    activeTab.terminal.appendOutput(
                      '\nCommands:\n' +
                        '  friend block <username>   - Block user\n' +
                        '  friend unblock <username> - Unblock user\n' +
                        '  friend remove <username>  - Remove from friends\n' +
                        '  chat <username>          - Open chat'
                    );
                  }
                }
                break;

              case 'block':
                if (parts.length < 3) {
                  activeTab.terminal.appendOutput(
                    'Usage: friend block <username>'
                  );
                  return;
                }
                if (this.state.currentUser) {
                  this.authService.toggleBlockFriend(
                    this.state.currentUser.username,
                    parts[2]
                  );
                  activeTab.terminal.appendOutput(`Blocked ${parts[2]}`);
                }
                break;

              case 'unblock':
                if (parts.length < 3) {
                  activeTab.terminal.appendOutput(
                    'Usage: friend unblock <username>'
                  );
                  return;
                }
                if (this.state.currentUser) {
                  this.authService.toggleBlockFriend(
                    this.state.currentUser.username,
                    parts[2]
                  );
                  activeTab.terminal.appendOutput(`Unblocked ${parts[2]}`);
                }
                break;

              case 'remove':
                if (parts.length < 3) {
                  activeTab.terminal.appendOutput(
                    'Usage: friend remove <username>'
                  );
                  return;
                }
                if (this.state.currentUser) {
                  this.authService.removeFriend(
                    this.state.currentUser.username,
                    parts[2]
                  );
                  activeTab.terminal.appendOutput(
                    `Removed ${parts[2]} from friends`
                  );
                }
                break;

              default:
                activeTab.terminal.appendOutput(
                  'Usage: friend list/block/unblock/remove <username>'
                );
            }
            break;

          case 'chat':
            if (parts.length < 2) {
              activeTab.terminal.appendOutput('Usage: chat <username>');
              return;
            }
            const chatUsername = parts[1];
            this.createChatTab(chatUsername);
            break;

          default:
            activeTab.terminal.appendOutput(`Command not found: ${cmd}`);
        }
    }
  }
}