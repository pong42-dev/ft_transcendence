#!/usr/bin/env ts-node-esm
import axios from 'axios';
import { parseArgs } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const API_BASE_URL = 'http://localhost:3000/api';
const TOKEN_FILE = path.join(process.cwd(), '.clitoken');

async function getAuthToken(): Promise<string | null> {
  try {
    const token = await fs.readFile(TOKEN_FILE, 'utf-8');
    return token.trim();
  } catch (error) {
    return null;
  }
}

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    }
});

api.interceptors.request.use(async (config) => {
    const token = await getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});


async function login(args: any) {
  try {
    const email = args.values.email;
    const password = args.values.password;

    if (!email || !password) {
      console.error('Error: --email and --password are required for login.');
      return;
    }

    const response = await api.post(`${API_BASE_URL}/users/login/local`, { email, password });
    
    if (response.data.success && response.data.data.token) {
      await fs.writeFile(TOKEN_FILE, response.data.data.token);
      console.log('Login successful. Token stored.');
    } else if (response.data.requires2FA) {
        console.log('2FA is required. Please use the web interface to log in for now.');
    }
    else {
      console.error('Login failed:', response.data.msg);
    }
  } catch (error: any) {
    if (error.response) {
      console.error('Error during login:', error.response.data);
    } else if (error.request) {
      console.error('Error during login: No response from server. Please check if the backend server is running.');
    } else {
      console.error('Error setting up login request:', error.message);
    }
  }
}

async function createGame(args: any) {
  try {
    const type = args.values.type;
    let body: any = { type: '' };

    if (type === 'local') {
      body.type = 'local_1v1';
      if (!args.values.opponent) {
        console.error('Error: --opponent is required for local games.');
        return;
      }
      body.opponents = [args.values.opponent];
    } else if (type === 'ai') {
      body.type = 'ai_1v1';
      if (args.values.difficulty) {
        body.aiSettings = { difficulty: args.values.difficulty };
      }
    } else {
      console.error('Invalid game type. Use "local" or "ai".');
      return;
    }

    const response = await api.post('/games', body);
    console.log('Game created successfully:');
    console.log(response.data);
  } catch (error: any) {
    if (error.response) {
      console.error('Error creating game:', error.response.data);
    } else if (error.request) {
      console.error('Error creating game: No response from server. Please check if the backend server is running.');
    } else {
      console.error('Error setting up create game request:', error.message);
    }
  }
}

async function getGameStatus(args: any) {
  try {
    const gameId = args.values.gameId;
    if (!gameId) {
      console.error('Error: --gameId is required.');
      return;
    }
    const response = await api.get(`/games/${gameId}`);
    console.log('Game status:');
    console.log(response.data);
  } catch (error: any) {
    if (error.response) {
      console.error('Error getting game status:', error.response.data);
    } else if (error.request) {
      console.error('Error getting game status: No response from server. Please check if the backend server is running.');
    } else {
      console.error('Error setting up get game status request:', error.message);
    }
  }
}

async function cancelGame(args: any) {
  try {
    const gameId = args.values.gameId;
    if (!gameId) {
      console.error('Error: --gameId is required.');
      return;
    }
    const response = await api.post(`/games/${gameId}/cancel`, {});
    console.log('Game canceled successfully:');
    console.log(response.data);
  } catch (error: any) {
    if (error.response) {
      console.error('Error canceling game:', error.response.data);
    } else if (error.request) {
      console.error('Error canceling game: No response from server. Please check if the backend server is running.');
    } else {
      console.error('Error setting up cancel game request:', error.message);
    }
  }
}


async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: game-cli <command> [options]');
    console.log('Commands: login, create, status, cancel');
    return;
  }

  const command = args[0];
  const commandArgs = parseArgs({
    args: args.slice(1),
    options: {
      type: { type: 'string' },
      opponent: { type: 'string' },
      difficulty: { type: 'string' },
      gameId: { type: 'string' },
      email: { type: 'string'},
      password: { type: 'string' },
    },
    allowPositionals: true,
  });


  switch (command) {
    case 'login':
        await login(commandArgs);
        break;
    case 'create':
      // The 'type' is a positional argument for the 'create' command
      const typeArg = commandArgs.positionals[0];
      if (!typeArg) {
        console.error('Error: Game type ("local" or "ai") is required for the "create" command.');
        return;
      }
      (commandArgs.values as any).type = typeArg;
      await createGame(commandArgs);
      break;
    case 'status':
      const statusGameId = commandArgs.positionals[0];
      if (!statusGameId) {
        console.error('Error: Game ID is required for the "status" command.');
        return;
      }
      (commandArgs.values as any).gameId = statusGameId;
      await getGameStatus(commandArgs);
      break;
    case 'cancel':
      const cancelGameId = commandArgs.positionals[0];
      if (!cancelGameId) {
        console.error('Error: Game ID is required for the "cancel" command.');
        return;
      }
      (commandArgs.values as any).gameId = cancelGameId;
      await cancelGame(commandArgs);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log('Available commands: login, create, status, cancel');
  }
}

main(); 