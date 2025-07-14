/**
 * 토너먼트 관리 시스템 사용 예시
 * 
 * 이 파일은 tournaments-repository.ts와 matches-repository.ts의 
 * 사용 방법을 보여주는 예제입니다.
 */

// 예시: 4명 토너먼트 생성 및 관리
export async function createAndManageTournament(fastify: any) {
	try {
		// 1. 토너먼트 생성
		const tournamentId = await fastify.tournamentsRepository.createTournament();
		console.log(`토너먼트 생성됨: ${tournamentId}`);

		// 2. 참가자 등록 (user1, guest3)
		const player1Id = await fastify.tournamentsRepository.addTournamentParticipant(
			tournamentId, 
			'user', 
			1, // user_id
			undefined
		);

		const player2Id = await fastify.tournamentsRepository.addTournamentParticipant(
			tournamentId, 
			'guest', 
			undefined, 
			'guest1'
		);

		const player3Id = await fastify.tournamentsRepository.addTournamentParticipant(
			tournamentId, 
			'guest', 
			undefined, 
			'guest2'
		);

		const player4Id = await fastify.tournamentsRepository.addTournamentParticipant(
			tournamentId, 
			'guest', 
			undefined, 
			'guest3'
		);

		console.log(`참가자 등록 완료: ${player1Id}, ${player2Id}, ${player3Id}, ${player4Id}`);

		// 3. 초기 대진표 생성
		const gameIds = await fastify.tournamentsRepository.generateTournamentBracket(tournamentId);
		console.log(`대진표 생성 완료: 4강게임1=${gameIds[0]}, 4강게임2=${gameIds[1]}, 결승게임=${gameIds[2]}`);

		// 4. 토너먼트 정보 조회
		const tournamentDetails = await fastify.tournamentsRepository.getTournamentWithDetails(tournamentId);
		console.log('토너먼트 상세 정보:', JSON.stringify(tournamentDetails, null, 2));

		// 5. 매치 관리 예시
		const matches = await fastify.matchesRepository.getTournamentMatches(tournamentId);
		console.log(`토너먼트 매치 수: ${matches.length}`);

		// 6. 첫 번째 매치 시작
		if (matches.length > 0) {
			const firstMatch = matches[0];
			await fastify.matchesRepository.updateMatchStatus(firstMatch.id, 'playing');
			console.log(`첫 번째 매치 시작: ${firstMatch.id}`);

			// 스코어 업데이트 예시
			await fastify.matchesRepository.updateMatchScore(firstMatch.id, firstMatch.participants[0].id, 5);
			await fastify.matchesRepository.updateMatchScore(firstMatch.id, firstMatch.participants[1].id, 3);

			// 매치 종료
			await fastify.matchesRepository.updateMatchStatus(
				firstMatch.id, 
				'finished', 
				firstMatch.participants[0].id // 승자
			);
			console.log(`첫 번째 매치 종료: 승자 = ${firstMatch.participants[0].display_name}`);
		}

		// 7. 다음 대기 중인 매치 조회
		const nextMatch = await fastify.matchesRepository.getNextPendingMatch(tournamentId);
		if (nextMatch) {
			console.log(`다음 매치: ${nextMatch.id} (라운드 ${nextMatch.round_number})`);
		}

		return tournamentId;
	} catch (error) {
		console.error('토너먼트 생성 중 오류:', error);
		throw error;
	}
}

// 예시: 토너먼트 진행 상태 확인
export async function checkTournamentProgress(fastify: any, tournamentId: number) {
	try {
		// 토너먼트 상세 정보 조회
		const tournament = await fastify.tournamentsRepository.getTournamentWithDetails(tournamentId);
		
		if (!tournament) {
			console.log('토너먼트를 찾을 수 없습니다.');
			return;
		}

		console.log(`\n=== 토너먼트 ${tournamentId} 진행 상황 ===`);
		console.log(`상태: ${tournament.status}`);
		console.log(`참가자 수: ${tournament.participants.length}`);
		console.log(`매치 수: ${tournament.games.length}`);

		// 각 매치별 상태 출력
		tournament.games.forEach((game: any, index: number) => {
			console.log(`\n매치 ${index + 1} (ID: ${game.id}):`);
			console.log(`  라운드: ${game.round_number}`);
			console.log(`  상태: ${game.status}`);
			console.log(`  참가자: ${game.participants.map((p: any) => p.display_name || `User${p.user_id}`).join(' vs ')}`);
			
			if (game.winner_id) {
				const winner = game.participants.find((p: any) => p.id === game.winner_id);
				console.log(`  승자: ${winner?.display_name || `User${winner?.user_id}`}`);
			}
		});

		// 우승자 정보
		if (tournament.winner_player_id) {
			const winner = tournament.participants.find((p: any) => p.id === tournament.winner_player_id);
			console.log(`\n🏆 우승자: ${winner?.display_name || `User${winner?.user_id}`}`);
		}

	} catch (error) {
		console.error('토너먼트 진행 상황 확인 중 오류:', error);
		throw error;
	}
}

// 예시: 모든 토너먼트 목록 조회
export async function listAllTournaments(fastify: any) {
	try {
		const tournaments = await fastify.tournamentsRepository.getAllTournaments();
		
		console.log('\n=== 모든 토너먼트 목록 ===');
		tournaments.forEach((tournament: any) => {
			console.log(`ID: ${tournament.id} | 상태: ${tournament.status} | 생성일: ${tournament.created_at}`);
		});

		return tournaments;
	} catch (error) {
		console.error('토너먼트 목록 조회 중 오류:', error);
		throw error;
	}
}

// =================================================================
// 새로운 토너먼트 UX 기능 예시
// =================================================================

/**
 * 토너먼트 진행 상황 조회 (UX용)
 */
export async function getTournamentProgressForUX(fastify: any, tournamentId: number) {
	try {
		const progress = await fastify.tournamentsRepository.getTournamentProgress(tournamentId);
		
		if (!progress) {
			console.log('토너먼트를 찾을 수 없습니다.');
			return;
		}

		console.log(`\n=== 토너먼트 ${tournamentId} 진행 상황 (UX) ===`);
		console.log(`상태: ${progress.status}`);
		console.log(`참가자 수: ${progress.participants.length}`);

		// 현재 매치 정보
		if (progress.current_match) {
			console.log(`\n🎮 현재 진행 중인 매치:`);
			console.log(`  매치 ID: ${progress.current_match.id}`);
			console.log(`  라운드: ${progress.current_match.round_number}`);
			console.log(`  참가자: ${progress.current_match.participants.map(p => p.display_name).join(' vs ')}`);
			console.log(`  시작 시간: ${progress.current_match.started_at}`);
		}

		// 다음 매치들
		if (progress.next_matches.length > 0) {
			console.log(`\n⏭️ 다음 매치들:`);
			progress.next_matches.forEach((match, index) => {
				console.log(`  ${index + 1}. 라운드 ${match.round_number}: ${match.participants.map(p => p.display_name).join(' vs ')}`);
			});
		}

		// 완료된 매치들
		if (progress.completed_matches.length > 0) {
			console.log(`\n✅ 완료된 매치들:`);
			progress.completed_matches.forEach((match, index) => {
				const winner = match.participants.find(p => p.id === match.winner_id);
				console.log(`  ${index + 1}. 라운드 ${match.round_number}: ${match.participants.map(p => p.display_name).join(' vs ')} → 승자: ${winner?.display_name}`);
			});
		}

		// 참가자 현황
		console.log(`\n👥 참가자 현황:`);
		progress.participants.forEach(participant => {
			const status = participant.eliminated ? '❌ 탈락' : '✅ 진행 중';
			console.log(`  ${participant.display_name}: ${status}`);
		});

		return progress;
	} catch (error) {
		console.error('토너먼트 진행 상황 조회 중 오류:', error);
		throw error;
	}
}

/**
 * 매치 결과 처리 예시
 */
export async function processMatchResultExample(fastify: any, matchId: number, winnerId: number) {
	try {
		const result = await fastify.matchesRepository.processMatchResult(matchId, winnerId);
		
		if (result) {
			console.log(`\n🏆 매치 결과 처리 완료:`);
			console.log(`  매치 ID: ${result.match_id}`);
			console.log(`  라운드: ${result.round_number}`);
			console.log(`  승자: ${result.winner_name}`);
			console.log(`  패자: ${result.loser_name}`);
			
			if (result.round_number === 2) {
				console.log(`  🎉 토너먼트 우승자: ${result.winner_name}!`);
			} else {
				console.log(`  다음 라운드 진출: ${result.winner_name}`);
			}
		}

		return result;
	} catch (error) {
		console.error('매치 결과 처리 중 오류:', error);
		throw error;
	}
}

/**
 * 사용자 토너먼트 기록 조회 예시
 */
export async function getUserTournamentHistoryExample(fastify: any, userId: number) {
	try {
		const history = await fastify.tournamentsRepository.getUserTournamentHistory(userId);
		
		console.log(`\n=== 사용자 ${userId}의 토너먼트 기록 ===`);
		
		if (history.length === 0) {
			console.log('참가한 토너먼트가 없습니다.');
			return;
		}

		history.forEach((tournament, index) => {
			console.log(`\n${index + 1}. 토너먼트 ${tournament.tournament_id} (${tournament.tournament_date})`);
			console.log(`   참가자: ${tournament.participants.join(', ')}`);
			console.log(`   최종 순위: ${tournament.final_rank}위`);
			
			tournament.user_rounds.forEach(round => {
				const resultEmoji = round.result === 'champion' ? '🏆' : 
								   round.result === 'runner_up' ? '🥈' : 
								   round.result === 'win' ? '✅' : '❌';
				
				const resultText = round.result === 'champion' ? '우승' :
								  round.result === 'runner_up' ? '준우승' :
								  round.result === 'win' ? '승리' : '패배';
				
				console.log(`     라운드 ${round.round_number}: ${round.opponents.join(' vs ')} → ${resultEmoji} ${resultText}`);
			});
		});

		return history;
	} catch (error) {
		console.error('사용자 토너먼트 기록 조회 중 오류:', error);
		throw error;
	}
}

/**
 * 토너먼트 매치 시작 예시
 */
export async function startTournamentMatchExample(fastify: any, matchId: number) {
	try {
		// 매치 시작 (countdown 상태)
		await fastify.matchesRepository.startMatch(matchId);
		console.log(`매치 ${matchId} 시작됨 (카운트다운)`);

		// 잠시 후 실제 게임 시작
		setTimeout(async () => {
			await fastify.matchesRepository.updateMatchStatus(matchId, 'playing');
			console.log(`매치 ${matchId} 실제 게임 시작`);
		}, 3000); // 3초 후

	} catch (error) {
		console.error('매치 시작 중 오류:', error);
		throw error;
	}
}

/**
 * 토너먼트 전체 진행 시뮬레이션
 */
export async function simulateTournamentProgress(fastify: any, tournamentId: number) {
	try {
		console.log(`\n=== 토너먼트 ${tournamentId} 진행 시뮬레이션 ===`);

		// 1. 현재 진행 상황 확인
		let progress = await getTournamentProgressForUX(fastify, tournamentId);
		
		// 2. 첫 번째 매치 시작
		if (progress?.next_matches.length > 0) {
			const firstMatch = progress.next_matches[0];
			console.log(`\n🎮 첫 번째 매치 시작: ${firstMatch.participants.map(p => p.display_name).join(' vs ')}`);
			
			await startTournamentMatchExample(fastify, firstMatch.id);
			
			// 잠시 후 매치 결과 처리
			setTimeout(async () => {
				const winner = firstMatch.participants[0]; // 첫 번째 참가자가 승리
				await processMatchResultExample(fastify, firstMatch.id, winner.id);
				
				// 진행 상황 다시 확인
				progress = await getTournamentProgressForUX(fastify, tournamentId);
			}, 5000);
		}

	} catch (error) {
		console.error('토너먼트 진행 시뮬레이션 중 오류:', error);
		throw error;
	}
} 