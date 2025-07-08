// src/commands/CommandHandler.ts
import { ApiClient } from '../services/ApiClient.js';
import { Router } from '../utils/Router.js';
import { Terminal } from '../components/Terminal.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';
import { authStore } from '../store/index.js';
import { User } from '../types/types.js';
import { UserStateCache } from '../services/UserStateCache.js';
import i18next from '../services/i18n.js';

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
      // case 'tournament':
      //   this.handleTournamentCommand();
      //   break;
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
    const apiStatus = this.deps.apiClient.shouldUseMockData() ? i18next.t('common.mock_data') : i18next.t('common.live_api');
    const baseHelp = `${i18next.t('helpCommand.api_status')}: ${apiStatus}\n\n`;
    
    const isLoggedIn = authStore.getIsLoggedIn();
    
    const helpText = baseHelp + i18next.t(`helpCommand.full_help_text.${isLoggedIn}`);

    this.deps.terminal.appendOutput(helpText);
  }

  private async handleLoginCommand(): Promise<void> {
    if (authStore.getIsLoggedIn()) {
      this.deps.terminal.appendOutput(i18next.t('loginCommand.already_logged_in'));
      return;
    }
    
    try {
      await this.deps.onShowModal('login');
    } catch (error) {
      this.deps.terminal.appendOutput(i18next.t('loginCommand.failed_show_modal'));
    }
  }

  private async handleRegisterCommand(): Promise<void> {
    if (authStore.getIsLoggedIn()) {
      this.deps.terminal.appendOutput(i18next.t('registerCommand.logout_first'));
      return;
    }
    
    try {
      await this.deps.onShowModal('register');
    } catch (error) {
      this.deps.terminal.appendOutput(i18next.t('registerCommand.failed_show_modal'));
    }
  }

  private async handleLogoutCommand(): Promise<void> {
    if (!authStore.getIsLoggedIn()) {
      this.deps.terminal.appendOutput(i18next.t('logoutCommand.not_logged_in'));
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
    
    this.deps.terminal.appendOutput(i18next.t('logoutCommand.logged_out_success'));
  }

  private async handleFriendCommand(args?: string[]): Promise<void> {
    if (!authStore.getIsLoggedIn()) {
      this.deps.terminal.appendOutput(i18next.t('friendCommand.login_first'));
      return;
    }

    // If no arguments provided, show help
    if (!args || args.length === 0) {
      this.deps.terminal.appendOutput(i18next.t('friendCommand.usage'));
      this.deps.terminal.appendOutput(i18next.t('friendCommand.follow_usage'));
      this.deps.terminal.appendOutput(i18next.t('friendCommand.unfollow_usage'));
      this.deps.terminal.appendOutput(i18next.t('friendCommand.list_usage'));
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
        this.deps.terminal.appendOutput(i18next.t('friendCommand.unknown_command', { subCommand: subCommand }));
        this.deps.terminal.appendOutput(i18next.t('friendCommand.usage'));
    }
  }

  private async handleFriendFollow(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.deps.terminal.appendOutput(i18next.t('friendCommand.follow_usage'));
      return;
    }

    const username = args.join(' ').trim();
    if (!username) {
      this.deps.terminal.appendOutput(i18next.t('friendCommand.specify_username_to_follow'));
      return;
    }

    try {
      this.deps.terminal.appendOutput(i18next.t('friendCommand.following_user', { username: username }));
      await this.deps.apiClient.friend.addFriend(username);
      this.deps.terminal.appendOutput(i18next.t('friendCommand.follow_success', { username: username }));
    } catch (error) {
      this.deps.terminal.appendOutput(i18next.t('friendCommand.follow_failed', { username: username }));
      console.error('Friend follow error:', error);
    }
  }

  private async handleFriendUnfollow(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.deps.terminal.appendOutput(i18next.t('friendCommand.unfollow_usage'));
      return;
    }

    const username = args.join(' ').trim();
    if (!username) {
      this.deps.terminal.appendOutput(i18next.t('friendCommand.specify_username_to_unfollow'));
      return;
    }

    try {
      this.deps.terminal.appendOutput(i18next.t('friendCommand.unfollowing_user', { username: username }));
      
      // Get friend list to find the friend ID
      const friends = await this.deps.apiClient.friend.getFriends();
      const friend = friends.find(f => f.username === username);
      
      if (!friend || !friend.id) {
        this.deps.terminal.appendOutput(i18next.t('friendCommand.not_following', { username: username }));
        return;
      }

      await this.deps.apiClient.friend.removeFriend(friend.id);
      this.deps.terminal.appendOutput(i18next.t('friendCommand.unfollow_success', { username: username }));
    } catch (error) {
      this.deps.terminal.appendOutput(i18next.t('friendCommand.unfollow_failed', { username: username }));
      console.error('Friend unfollow error:', error);
    }
  }

  private async handleFriendList(): Promise<void> {
    try {
      this.deps.terminal.appendOutput(i18next.t('friendCommand.loading_friends'));
      const friends = await this.deps.apiClient.friend.getFriends();
      
      if (friends.length === 0) {
        this.deps.terminal.appendOutput(i18next.t('friendCommand.empty_friends_list'));
        this.deps.terminal.appendOutput(i18next.t('friendCommand.add_friends_hint'));
        return;
      }

      this.deps.terminal.appendOutput(i18next.t('friendCommand.your_friends', { count: friends.length }));
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
      this.deps.terminal.appendOutput(i18next.t('profileCommand.login_first'));
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
      this.deps.terminal.appendOutput(i18next.t('playCommand.login_first'));
      return;
    }

    try {
      // App.ts의 handlePlayGame 메서드 호출 - GameSetupModal이 처리됨
      await this.deps.onGameStart(null);
    } catch (error) {
      this.deps.terminal.appendOutput(i18next.t('playCommand.failed_start_game'));
      console.error('Play command error:', error);
    }
  }

  // test tournament modal 삭제 이슈로 일단 주석처리 해두었습니다!
  // private handleTournamentCommand(): void {
  //   try {
  //     this.deps.onShowModal('tournament');
  //   } catch (error) {
  //     this.deps.terminal.appendOutput(i18next.t('tournamentCommand.failed_open_modal'));
  //     console.error('Tournament command error:', error);
  //   }
  // }

  private async handle2FACommand(args: string[]): Promise<void> {
    if (!authStore.getIsLoggedIn()) {
      this.deps.terminal.appendOutput(i18next.t('twoFACommand.login_first'));
      return;
    }

    // Google OAuth 사용자에 대한 2FA 제한 확인
    const currentUser = authStore.getCurrentUser();
    if (currentUser?.provider === 'google') {
      this.deps.terminal.appendOutput(i18next.t('twoFACommand.google_2fa_not_available_1'));
      this.deps.terminal.appendOutput(i18next.t('twoFACommand.google_2fa_not_available_2'));
      this.deps.terminal.appendOutput(i18next.t('twoFACommand.google_2fa_not_available_3'));
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
        this.deps.terminal.appendOutput(i18next.t('twoFACommand.usage'));
        this.deps.terminal.appendOutput(i18next.t('twoFACommand.enable_usage'));
        this.deps.terminal.appendOutput(i18next.t('twoFACommand.disable_usage'));
        this.deps.terminal.appendOutput(i18next.t('twoFACommand.status_usage'));
    }
  }

  private async handle2FAEnable(): Promise<void> {
    const currentUser = authStore.getCurrentUser();
    if (currentUser?.twoFactorEnabled) {
      this.deps.terminal.appendOutput(i18next.t('twoFACommand.twofa_already_enabled'));
      return;
    }

    this.deps.terminal.appendOutput(i18next.t('twoFACommand.starting_setup'));
    
    try {
      // 모달을 통해 2FA 설정 처리 (초기화부터 완료까지 모달에서 처리)
      await this.deps.onShowModal('2fa', { 
        mode: 'enable',
        onComplete: async (_code: string) => {
          // 이 부분은 실제로는 TwoFAModal 내부에서 처리됨
          this.deps.terminal.appendOutput(i18next.t('twoFACommand.enable_success'));
          this.deps.terminal.appendOutput(i18next.t('twoFACommand.account_more_secure'));
          return true;
        },
        onCancel: () => {
          this.deps.terminal.appendOutput(i18next.t('twoFACommand.setup_cancelled'));
        }
      });
    } catch (error) {
      this.deps.terminal.appendOutput(i18next.t('twoFACommand.failed_start_setup'));
      console.error('2FA enable error:', error);
    }
  }

  private async handle2FADisable(): Promise<void> {
    const currentUser = authStore.getCurrentUser();
    if (!currentUser?.twoFactorEnabled) {
      this.deps.terminal.appendOutput(i18next.t('twoFACommand.twofa_already_disabled'));
      return;
    }

    this.deps.terminal.appendOutput(i18next.t('twoFACommand.starting_disable'));
    
    try {
      await this.deps.onShowModal('2fa', { 
        mode: 'disable',
        onComplete: async (_code: string) => {
          this.deps.terminal.appendOutput(i18next.t('twoFACommand.disable_success'));
          this.deps.terminal.appendOutput(i18next.t('twoFACommand.account_security_updated'));
          return true;
        },
        onCancel: () => {
          this.deps.terminal.appendOutput(i18next.t('twoFACommand.disable_cancelled'));
        }
      });
    } catch (error) {
      this.deps.terminal.appendOutput(i18next.t('twoFACommand.failed_start_disable'));
      console.error('2FA disable error:', error);
    }
  }

  private handle2FAStatus(): void {
    const currentUser = authStore.getCurrentUser();
    if (!currentUser) {
      this.deps.terminal.appendOutput(i18next.t('twoFACommand.status_unavailable'));
      return;
    }

    const status = currentUser.twoFactorEnabled ? i18next.t('common.enabled') : i18next.t('common.disabled');
    const statusIcon = currentUser.twoFactorEnabled ? '🔒' : '🔓';
    
    this.deps.terminal.appendOutput(i18next.t('twoFACommand.current_status', { statusIcon: statusIcon, status: status }));
    
    if (currentUser.twoFactorEnabled) {
      this.deps.terminal.appendOutput(i18next.t('twoFACommand.account_protected'));
    } else {
      this.deps.terminal.appendOutput(i18next.t('twoFACommand.consider_enabling'));
    }
  }

  private async handleSetCommand(args: string[]): Promise<void> {
    if (!authStore.getIsLoggedIn()) {
      this.deps.terminal.appendOutput(i18next.t('setCommand.login_first'));
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
        this.deps.terminal.appendOutput(i18next.t('setCommand.usage'));
        this.deps.terminal.appendOutput(i18next.t('setCommand.avatar_usage'));
        this.deps.terminal.appendOutput(i18next.t('setCommand.name_usage'));
    }
  }

  private async handleSetAvatar(): Promise<void> {
    try {
      await this.deps.onShowModal('file');
    } catch (error) {
      this.deps.terminal.appendOutput(i18next.t('setCommand.failed_open_avatar_upload'));
      console.error('Avatar upload error:', error);
    }
  }

  private async handleSetName(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.deps.terminal.appendOutput(i18next.t('setCommand.set_name_usage'));
      this.deps.terminal.appendOutput(i18next.t('setCommand.set_name_example'));
      return;
    }
    
    const newName = args.join(' ').trim();
    if (!newName) {
      this.deps.terminal.appendOutput(i18next.t('setCommand.provide_valid_name'));
      return;
    }
    
    try {
      this.deps.terminal.appendOutput(i18next.t('setCommand.updating_name', { newName: newName }));
      
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
      
      this.deps.terminal.appendOutput(i18next.t('setCommand.name_update_success', { nickname: updatedUser.nickname }));
      
    } catch (error) {
      this.deps.terminal.appendOutput(i18next.t('setCommand.failed_update_name'));
      console.error('Name update error:', error);
    }
  }

  private handleClearCommand(): void {
    this.deps.terminal.clearOutput();
  }
}
