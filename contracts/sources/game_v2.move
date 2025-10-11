module cash_trading_game::game_safe {
    use std::signer;
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::account;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;

    // Error codes
    const E_INVALID_BET_AMOUNT: u64 = 1;
    const E_INVALID_SEED: u64 = 2;
    const E_GAME_NOT_FOUND: u64 = 3;
    const E_SEED_MISMATCH: u64 = 4;

    // Constants
    const MIN_BET_AMOUNT: u64 = 1000000; // 0.01 APT
    const MAX_BET_AMOUNT: u64 = 1000000000; // 10 APT
    const MAX_PROFIT_MULTIPLIER: u64 = 2; // 2x max (can only win 2x your bet)

    struct ActiveGame has store, drop {
        player: address,
        bet_amount: u64,
        seed: vector<u8>,
    }

    struct ActiveGames has key {
        games: vector<ActiveGame>,
    }

    struct GameStartEvent has drop, store {
        player: address,
        bet_amount: u64,
        seed: vector<u8>,
        timestamp: u64,
    }

    struct GameEndEvent has drop, store {
        player: address,
        bet_amount: u64,
        profit: u64,
        loss: u64,
        payout: u64,
        timestamp: u64,
    }

    struct EventHandles has key {
        game_start_events: event::EventHandle<GameStartEvent>,
        game_end_events: event::EventHandle<GameEndEvent>,
    }

    struct GameTreasury has key {
        signer_cap: account::SignerCapability,
    }

    fun init_module(account: &signer) {
        let (treasury_signer, signer_cap) = account::create_resource_account(account, b"treasury_v2");
        coin::register<AptosCoin>(&treasury_signer);

        move_to(account, GameTreasury { signer_cap });
        move_to(account, EventHandles {
            game_start_events: account::new_event_handle(account),
            game_end_events: account::new_event_handle(account),
        });
        move_to(account, ActiveGames { games: vector::empty<ActiveGame>() });
    }

    public entry fun start_game(
        account: &signer,
        bet_amount: u64,
        seed: vector<u8>
    ) acquires ActiveGames, EventHandles, GameTreasury {
        let player = signer::address_of(account);
        assert!(bet_amount >= MIN_BET_AMOUNT && bet_amount <= MAX_BET_AMOUNT, E_INVALID_BET_AMOUNT);
        assert!(!vector::is_empty(&seed), E_INVALID_SEED);

        let treasury = borrow_global<GameTreasury>(@cash_trading_game);
        let treasury_address = account::get_signer_capability_address(&treasury.signer_cap);
        coin::transfer<AptosCoin>(account, treasury_address, bet_amount);

        let active_games = borrow_global_mut<ActiveGames>(@cash_trading_game);
        upsert_active_game(&mut active_games.games, player, bet_amount, seed);

        event::emit_event(&mut borrow_global_mut<EventHandles>(@cash_trading_game).game_start_events, GameStartEvent {
            player, bet_amount, seed, timestamp: aptos_framework::timestamp::now_microseconds()
        });
    }

    /// SAFE VERSION: Caps profit at 2x bet to prevent treasury bankruptcy
    public entry fun complete_game(
        account: &signer,
        seed: vector<u8>,
        is_profit: bool,
        amount: u64
    ) acquires ActiveGames, EventHandles, GameTreasury {
        let player = signer::address_of(account);
        let bet_amount = verify_seed_and_extract_bet(player, &seed);

        // CAP PROFIT AT 2X BET (prevents treasury drain)
        let (payout, profit, loss) = if (is_profit) {
            let max_profit = bet_amount * MAX_PROFIT_MULTIPLIER;
            let capped_profit = if (amount > max_profit) { max_profit } else { amount };
            (bet_amount + capped_profit, capped_profit, 0)
        } else {
            if (amount >= bet_amount) {
                (0, 0, bet_amount)
            } else {
                (bet_amount - amount, 0, amount)
            }
        };

        if (payout > 0) {
            let treasury = borrow_global<GameTreasury>(@cash_trading_game);
            let treasury_signer = account::create_signer_with_capability(&treasury.signer_cap);
            coin::transfer<AptosCoin>(&treasury_signer, player, payout);
        };

        event::emit_event(&mut borrow_global_mut<EventHandles>(@cash_trading_game).game_end_events, GameEndEvent {
            player, bet_amount, profit, loss, payout, timestamp: aptos_framework::timestamp::now_microseconds()
        });
    }

    fun verify_seed_and_extract_bet(player: address, seed: &vector<u8>): u64 acquires ActiveGames {
        let active_games = borrow_global_mut<ActiveGames>(@cash_trading_game);
        let (found, index) = find_game_index(&active_games.games, player);
        assert!(found, E_GAME_NOT_FOUND);

        let game = vector::borrow(&active_games.games, index);
        assert!(seed == &game.seed, E_SEED_MISMATCH);

        let bet_amount = game.bet_amount;
        vector::remove(&mut active_games.games, index);
        bet_amount
    }

    fun upsert_active_game(games: &mut vector<ActiveGame>, player: address, bet_amount: u64, seed: vector<u8>) {
        let (found, index) = find_game_index(games, player);
        let new_game = ActiveGame { player, bet_amount, seed };
        if (found) {
            *vector::borrow_mut(games, index) = new_game;
        } else {
            vector::push_back(games, new_game);
        };
    }

    fun find_game_index(games: &vector<ActiveGame>, player: address): (bool, u64) {
        let i = 0;
        let len = vector::length(games);
        while (i < len) {
            if (vector::borrow(games, i).player == player) {
                return (true, i)
            };
            i = i + 1;
        };
        (false, 0)
    }
}
