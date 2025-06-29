import knex from '../src/plugins/external/knex.js';

async function forceLogoutUser(userId: number) {
  try {
    console.log(`Force logging out user ID: ${userId}`);
    
    // user_tokens 테이블에서 해당 사용자의 모든 토큰 삭제
    const deletedTokens = await knex('user_tokens')
      .where('user_id', userId)
      .del();
    
    console.log(`Deleted ${deletedTokens} tokens for user ${userId}`);
    
    // tmp_tokens 테이블에서도 해당 사용자의 토큰 삭제
    const deletedTmpTokens = await knex('tmp_tokens')
      .where('user_id', userId)
      .del();
    
    console.log(`Deleted ${deletedTmpTokens} temporary tokens for user ${userId}`);
    
    console.log('Force logout completed successfully');
  } catch (error) {
    console.error('Error during force logout:', error);
  } finally {
    await knex.destroy();
  }
}

// 명령행 인수로 사용자 ID 받기
const userId = process.argv[2];
if (!userId) {
  console.error('Usage: npm run force-logout <userId>');
  process.exit(1);
}

forceLogoutUser(parseInt(userId)); 