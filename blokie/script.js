"use strict";
import { blokie } from "./blokie.js";

// Переопределение window.Worker для контроля активных воркеров
const OriginalWorker = window.Worker;

const activeWorkers = new Set();

window.Worker = function(scriptURL, options) {
    console.log(`Создаём воркер для: ${scriptURL}`);
    const worker = new OriginalWorker(scriptURL, options);
    activeWorkers.add(worker);
    console.log("Добавлен новый Worker:", worker);
    worker.addEventListener('message', (e) => {
        console.log("Сообщение от Worker:", e.data);
    });
    worker.addEventListener('error', (e) => {
        console.error("Ошибка в Worker:", e);
    });
    worker.terminate = (function(originalTerminate) {
        return function() {
            console.log("Worker остановлен.");
            activeWorkers.delete(worker);
            originalTerminate.call(worker);
        };
    })(worker.terminate);
    return worker;
};

function stopAllWorkers() {
    for (const worker of activeWorkers) {
        worker.terminate();
    }
    console.log("Все воркеры остановлены.");
}

document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        console.log("Пробел нажат. Останавливаем все Worker'ы...");
        stopAllWorkers();
    }
});

function getNewGameState() {
    return {
        previous_game_state: blokie.getNewGame(),
        game: blokie.getNewGame(),
        queued_game_states: [],
        piece_set:blokie.getRandomPieceSet() ,
    };
}

let state = {
    game_state: getNewGameState(),
    // UI состояние
    mouse_down: false,
    last_dragged_board_cell: null,
    active_worker_id: 0,
    isPaused: false, // Добавляем состояние паузы
};

document.addEventListener("DOMContentLoaded", function (event) {
    const slider = document.getElementById('speed');
    slider.addEventListener("input", (event) => {
        resetAIOnHumanInterferance();
    });

    // Обработчики событий для мыши
    document.addEventListener('mouseup', () => {
        state.last_dragged_board_cell = null;
        state.mouse_down = false;
    });
    document.addEventListener('touchend', () => {
        state.mouse_down = false;
        state.last_dragged_board_cell = null;
    });

    // Обработчик кликов по игровому полю
    var board_table = document.getElementById('game-board');
    board_table.addEventListener("click", () => {
        if (!gameIsActive()) {
            onNewGame();
        }
    });
    board_table.addEventListener("mouseover", (event) => {
        if (state.mouse_down) {
            onBoardCellClick(event.target);
        }
    });
    board_table.addEventListener("touchmove", (event) => {
        processCellDrag(event, onBoardCellClick);
    });
    board_table.addEventListener('mousedown', (event) => {
        onBoardCellClick(event.target);
        state.mouse_down = true;
    });
    board_table.addEventListener('touchstart', (event) => {
        if (!gameIsActive()) {
            return;
        }
        onBoardCellClick(event.target);
        state.last_dragged_board_cell = event.target;
        state.mouse_down = true;
        event.preventDefault();
    });

    // Обработчики для элементов набора фигур
    const pieces_on_deck_container = document.getElementById('pieces-on-deck-container');
    pieces_on_deck_container.addEventListener('touchstart', (event) => {
        onPieceCellClick(event.target);
        state.last_dragged_board_cell = event.target;
        state.mouse_down = true;
        event.preventDefault();
    });
    pieces_on_deck_container.addEventListener('touchmove', (event) => {
        processCellDrag(event, onPieceCellClick);
    });
    pieces_on_deck_container.addEventListener('mousedown', (event) => {
        onPieceCellClick(event.target);
        state.mouse_down = true;
    });
    pieces_on_deck_container.addEventListener('mouseover', (event) => {
        if (state.mouse_down) {
            onPieceCellClick(event.target);
        }
    });

    // Обработчик кнопки паузы
    const pauseButton = document.getElementById('pause-button');
    pauseButton.addEventListener('click', () => {
        togglePause();
    });

    onNewGame();
});

function gameIsActive() {
    return state.game_state.queued_game_states.length === 0 || !blokie.isOver(state.game_state.queued_game_states[0]);
}

function processCellDrag(event, call) {
    event.preventDefault();
    const location = event.touches[0];
    const cell = document.elementFromPoint(location.clientX, location.clientY);
    if (cell.nodeName !== 'TD') {
        return;
    }
    if (cell === state.last_dragged_board_cell) {
        return;
    }
    state.last_dragged_board_cell = cell;
    if (state.mouse_down) {
        call(cell);
    }
}

async function onNewGame() {
    state.game_state = getNewGameState();
    resetAIOnHumanInterferance();
}

function onBoardCellClick(cell) {
    if (!gameIsActive() || cell.nodeName !== 'TD') {
        return;
    }
    const table = cell.closest('table');
    if (table.id !== 'game-board') {
        return;
    }
	
	// Автоматическая пауза
	if (!state.isPaused) {
		state.isPaused = true;
		const pauseButton = document.getElementById('pause-button');
		pauseButton.innerText = "Выставить";
		pauseButton.classList.add('pause-active');
		pauseButton.classList.remove('pause-inactive');
	}
	
    state.game_state.game.board = blokie.toggleSquare(state.game_state.game.board, cell.parentNode.rowIndex, cell.cellIndex);
    //resetAIOnHumanInterferance();
}

function onPieceCellClick(cell) {
    if (!gameIsActive() || cell.nodeName !== 'TD') {
        return;
    }
    const table = cell.closest('table');
    if (table.className !== 'pieces-on-deck') {
        return;
    }
	
	// Автоматическая пауза
	if (!state.isPaused) {
		state.isPaused = true;
		const pauseButton = document.getElementById('pause-button');
		pauseButton.innerText = "Выставить";
		pauseButton.classList.add('pause-active');
		pauseButton.classList.remove('pause-inactive');
	}

    const piece_table_id = parseInt(cell.closest('table').id.slice(-1));
    state.game_state.piece_set[piece_table_id] = blokie.toggleSquare(state.game_state.piece_set[piece_table_id], cell.parentNode.rowIndex, cell.cellIndex);
    //resetAIOnHumanInterferance();
}

let ai_worker = null;

function resetAIOnHumanInterferance() {
    if (ai_worker != null) {
        ai_worker.terminate();
    }

    state.game_state.queued_game_states = [];
    state.active_worker_id++;
    ai_worker = new Worker('ai-worker.js', { type: 'module' });
    ai_worker.postMessage({
        delay_ms: getDelayMs(),
        game_state: state.game_state,
        id: state.active_worker_id,
    });
    ai_worker.onmessage = (e) => {
        if (e.data.id == state.active_worker_id && !state.isPaused) {
            state.game_state = e.data.game_state;
        }
    };
}

// Функция паузы
function togglePause() {
    state.isPaused = !state.isPaused;
    const pauseButton = document.getElementById('pause-button');
    if (state.isPaused) {
        pauseButton.innerText = "Выставить"; // Меняем текст на кнопке на "Выставить"
        pauseButton.classList.add('pause-active'); // Добавляем класс для активного состояния
        pauseButton.classList.remove('pause-inactive'); // Убираем класс для неактивного состояния
    } else {
        pauseButton.innerText = "Рисовать"; // Меняем текст на кнопке на "Рисовать"
        pauseButton.classList.add('pause-inactive'); // Добавляем класс для неактивного состояния
        pauseButton.classList.remove('pause-active'); // Убираем класс для активного состояния
        resetAIOnHumanInterferance(); // Перезапускаем ИИ, если игра возобновляется
    }
}

// Рендеринг игры
let last_rendered_state_json = '';
function render() {
    const state_json = JSON.stringify(state);
    if (last_rendered_state_json !== state_json) {
        renderImpl();
    }
    last_rendered_state_json = state_json;
    window.requestAnimationFrame(render);
}
window.requestAnimationFrame(render);

function renderImpl() {
    let board_table = document.getElementById('game-board');
    let pieces_on_deck_div = document.getElementById('pieces-on-deck-container');
    if (gameIsActive()) {
        if (state.game_state.queued_game_states.length === 0) {
            drawGame(board_table, pieces_on_deck_div, state.game_state.game.board, blokie.getEmptyPiece(), state.game_state.piece_set);
            updateScore(state.game_state.game.score);
        } else {
            const next_game_state = state.game_state.queued_game_states[0];
            updateScore(next_game_state.score);
            const piece_set_to_render = state.game_state.piece_set.map(p => p === next_game_state.previous_piece ? blokie.getEmptyPiece() : p);
            drawGame(board_table, pieces_on_deck_div, state.game_state.game.board, next_game_state.previous_piece_placement, piece_set_to_render);
        }
    } else {
        drawGame(board_table, pieces_on_deck_div, state.game_state.game.board, blokie.getEmptyPiece(), state.game_state.piece_set);
        updateScore("Final score: " + state.game_state.game.score.toString());
    }
}

function aiPlayGame() {
    if (state.isPaused) return; // Останавливаем AI, если игра на паузе

	if (state.game_state.piece_set.every(p => blokie.isEmpty(p))) {
		return true;
	}
    if (state.game_state.queued_game_states.length === 0) {
        if (state.game_state.piece_set.every(p => blokie.isEmpty(p))) {
            //state.game_state.piece_set = blokie.getRandomPieceSet();
        }
        state.game_state.queued_game_states = blokie.getAIMove(state.game_state.game, state.game_state.piece_set).new_game_states;
        state.game_state.game.previous_piece_placement = blokie.getEmptyPiece();
        return false;
    }
    if (blokie.isOver(state.game_state.queued_game_states[0])) {
        return true;
    }

    const new_game_state = state.game_state.queued_game_states.shift();
    const piece_used = new_game_state.previous_piece;
    const used_piece_index = state.game_state.piece_set.indexOf(piece_used);
    if (used_piece_index >= 0) {
        state.game_state.piece_set[used_piece_index] = blokie.getEmptyPiece();
    }
    state.game_state.previous_game_state = state.game_state.game;
    state.game_state.game = new_game_state;
    return false;
}

function getSpeedSlider() {
    return document.getElementById('speed');
}

function getDelayMs() {
    const slider = getSpeedSlider();
	const del_res = slider.value == slider.max ? 0 : (6000.0 / (1 * slider.value));
	console.log(del_res,slider.value,slider.max);
    return del_res;
}

function updateScore(score) {
    const score_el = document.getElementById('score');
    score_el.innerText = score;
}

function drawGame(board_table, pieces_on_deck_div, board, placement, piece_set) {
    for (let r = 0; r < 9; ++r) {
        for (let c = 0; c < 9; ++c) {
            const td = board_table.rows[r].cells[c];
            if (blokie.at(placement, r, c)) {
                td.className = 'piece-pending';
            } else if (blokie.at(board, r, c)) {
                td.className = 'has-piece';
            } else {
                td.className = null;
            }
        }
    }

    for (let i = 0; i < 3; ++i) {
        for (let r = 0; r < 5; ++r) {
            for (let c = 0; c < 5; ++c) {
                const td = pieces_on_deck_div.children[i].rows[r].cells[c];
                td.className = blokie.at(piece_set[i], r, c) ? 'has-piece' : null;
            }
        }
    }
}

