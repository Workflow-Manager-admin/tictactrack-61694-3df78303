import React, { useEffect, useState } from "react";
import "./App.css";

// --- Configuration: Set Backend base URL here ---
const API_BASE = "https://vscode-internal-0-dev.dev01.cloud.kavia.ai:3001/api";

/**
 * Square component - a single cell in the Tic Tac Toe board
 * @param {object} props
 */
function Square({ value, onClick, disabled }) {
  return (
    <button
      className="ttt-square"
      onClick={onClick}
      disabled={disabled || !!value}
      aria-label={value ? `Cell ${value}` : `Empty cell`}
    >
      {value}
    </button>
  );
}

/**
 * Board component - the 3x3 Tic Tac Toe grid
 */
function Board({ board, onSquareClick, disabled }) {
  return (
    <div className="ttt-board">
      {board.map((row, rowIdx) =>
        row.map((cell, colIdx) => (
          <Square
            key={`${rowIdx}-${colIdx}`}
            value={cell}
            onClick={() => onSquareClick(rowIdx, colIdx)}
            disabled={disabled}
          />
        ))
      )}
    </div>
  );
}

/**
 * Sidebar panel for historical games
 */
function HistoryPanel({ history, onSelectGame, activeGameId }) {
  return (
    <aside className="ttt-history-panel">
      <h2>Game History</h2>
      {history.length === 0 ? (
        <div className="ttt-history-empty">No games played yet.</div>
      ) : (
        <ul>
          {history.map((game) => (
            <li
              key={game.game_id}
              className={`ttt-history-item ${
                activeGameId === game.game_id
                  ? "ttt-history-item--active"
                  : ""
              }`}
            >
              <button onClick={() => onSelectGame(game.game_id)}>
                Game #{game.game_id} <br />
                <span className="ttt-history-meta">
                  {game.status === "in_progress"
                    ? "In Progress"
                    : game.result
                    ? game.result
                    : "-"}
                  <br />
                  {game.timestamp
                    ? new Date(game.timestamp).toLocaleString()
                    : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

/**
 * Status message display for win/draw/current move
 */
function StatusMessage({ status, winner, currentPlayer, draw }) {
  if (status === "win") {
    return (
      <div className="ttt-status ttt-status--win">
        🎉 Player <strong>{winner}</strong> wins!
      </div>
    );
  }
  if (draw) {
    return (
      <div className="ttt-status ttt-status--draw">🤝 It's a draw!</div>
    );
  }
  return (
    <div className="ttt-status">
      Next move: <strong>{currentPlayer}</strong>
    </div>
  );
}

/**
 * Player selection - choose X or O
 * @param {object} props 
 */
function PlayerSelector({ onSelect, disabled }) {
  return (
    <div className="ttt-player-select">
      <button
        className="ttt-btn ttt-btn-x"
        onClick={() => onSelect("X")}
        disabled={disabled}
      >
        Play as X
      </button>
      <span> or </span>
      <button
        className="ttt-btn ttt-btn-o"
        onClick={() => onSelect("O")}
        disabled={disabled}
      >
        Play as O
      </button>
    </div>
  );
}

/**
 * Main Tic Tac Toe App component (PUBLIC_INTERFACE)
 */
function App() {
  // UI state
  const [theme, setTheme] = useState("light");
  const [selectingPlayer, setSelectingPlayer] = useState(true);

  // Game state
  const [playerMark, setPlayerMark] = useState(null); // X or O
  const [gameId, setGameId] = useState(null);
  const [board, setBoard] = useState([["", "", ""], ["", "", ""], ["", "", ""]]);
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [status, setStatus] = useState("in_progress");
  const [winner, setWinner] = useState(null);
  const [draw, setDraw] = useState(false);

  // Loading and error state
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  // Game history
  const [history, setHistory] = useState([]);
  const [viewingHistoricalGame, setViewingHistoricalGame] = useState(false);

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Load game history on mount & after play
  useEffect(() => {
    fetchHistory();
  }, []);

  // Helper to reset UI error state
  function resetErrors() {
    setApiError("");
  }

  // API Helper: Start new game with selected mark
  async function startNewGame(mark) {
    resetErrors();
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/game/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player: mark }),
      });
      if (!resp.ok) throw new Error("Failed to start new game.");
      const data = await resp.json();
      setGameId(data.game_id);
      setBoard(data.board);
      setCurrentPlayer(data.current_player);
      setStatus(data.status);
      setWinner(data.winner || null);
      setDraw(data.draw);
      setSelectingPlayer(false);
      setPlayerMark(mark);
      setViewingHistoricalGame(false);
      fetchHistory(); // update right panel
    } catch (err) {
      setApiError(err.message || "Unable to start game.");
    } finally {
      setLoading(false);
    }
  }

  // API Helper: Make move (row, col)
  async function makeMove(row, col) {
    resetErrors();
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/game/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: gameId, row, col }),
      });
      if (!resp.ok) throw new Error("Move failed.");
      const data = await resp.json();
      setBoard(data.board);
      setCurrentPlayer(data.current_player);
      setStatus(data.status);
      setWinner(data.winner || null);
      setDraw(data.draw);
      setViewingHistoricalGame(false);
      fetchHistory();
    } catch (err) {
      setApiError(err.message || "Move error.");
    } finally {
      setLoading(false);
    }
  }

  // API Helper: Fetch current game state (by id)
  async function fetchGame(game_id) {
    resetErrors();
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/game/state?game_id=${encodeURIComponent(game_id)}`);
      if (!resp.ok) throw new Error("Error loading game state.");
      const data = await resp.json();
      setGameId(data.game_id);
      setBoard(data.board);
      setCurrentPlayer(data.current_player);
      setStatus(data.status);
      setWinner(data.winner || null);
      setDraw(data.draw);
      setSelectingPlayer(false);
      setPlayerMark(data.starting_player);
      setViewingHistoricalGame(true); // disables new moves if finished
    } catch (err) {
      setApiError(err.message || "Unable to fetch game.");
    } finally {
      setLoading(false);
    }
  }

  // API Helper: Get history list
  async function fetchHistory() {
    try {
      const resp = await fetch(`${API_BASE}/game/history`);
      if (!resp.ok) return;
      const data = await resp.json();
      setHistory(data.games || []);
    } catch (err) {
      // Do not show history error interruptively
    }
  }

  // New Game Handler
  function handleRestart() {
    setSelectingPlayer(true);
    setPlayerMark(null);
    setGameId(null);
    setBoard([["", "", ""], ["", "", ""], ["", "", ""]]);
    setCurrentPlayer("X");
    setStatus("in_progress");
    setWinner(null);
    setDraw(false);
    setViewingHistoricalGame(false);
    resetErrors();
  }

  // Move click handler
  function handleSquareClick(rowIdx, colIdx) {
    if (
      status !== "in_progress" ||
      board[rowIdx][colIdx] !== "" ||
      loading ||
      viewingHistoricalGame
    )
      return;
    // Only allow user to play their assigned mark turn
    if (currentPlayer !== playerMark) return;
    makeMove(rowIdx, colIdx);
  }

  // User toggles light/dark theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Render: main
  return (
    <div className="App" style={{ minHeight: "100vh" }}>
      <header className="ttt-header">
        <h1>Tic Tac Toe</h1>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </header>

      <main className="ttt-container">
        <section className="ttt-game-panel">
          {selectingPlayer ? (
            <div className="ttt-start-panel">
              <h2>Choose your player</h2>
              <PlayerSelector
                onSelect={startNewGame}
                disabled={loading}
              />
              {apiError && <div className="ttt-error">{apiError}</div>}
            </div>
          ) : (
            <div>
              <div className="ttt-game-stats">
                <span>
                  You: <b>{playerMark}</b>
                  {" | "}Opponent: <b>{playerMark === "X" ? "O" : "X"}</b>
                </span>
                <button className="ttt-btn ttt-btn--restart" onClick={handleRestart}>
                  Restart Game
                </button>
              </div>
              <StatusMessage
                status={status}
                winner={winner}
                currentPlayer={currentPlayer}
                draw={draw}
              />
              <Board
                board={board}
                onSquareClick={handleSquareClick}
                disabled={
                  loading ||
                  status !== "in_progress" ||
                  viewingHistoricalGame ||
                  currentPlayer !== playerMark
                }
              />
              {apiError && <div className="ttt-error">{apiError}</div>}
              {viewingHistoricalGame && (
                <div className="ttt-info">
                  Viewing a historical game.
                  <button className="ttt-btn" onClick={handleRestart}>
                    Back to new game
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
        {/* Right hand panel: history */}
        <HistoryPanel
          history={history}
          onSelectGame={fetchGame}
          activeGameId={gameId}
        />
      </main>
      <footer className="ttt-footer">
        <span>
          Powered by React · FastAPI ·{" "}
          <a
            href="https://github.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            Source Code
          </a>
        </span>
      </footer>
      <style>{`
        .ttt-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          padding: 18px 0 10px 0;
        }
        .ttt-header h1 {
          font-size: 2.2rem;
          margin: 0;
        }

        .ttt-container {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          justify-content: center;
          width: 100%;
          margin: 0 auto;
          padding: 32px 10px 16px 10px;
          max-width: 950px;
          min-height: 80vh;
        }
        .ttt-game-panel {
          flex: 3;
          background: var(--bg-primary);
          border-radius: 10px;
          box-shadow: 0 3px 12px 0 rgba(0,0,0,0.04);
          padding: 28px 22px 24px 22px;
          min-width: 340px;
          margin-right: 38px;
        }

        .ttt-start-panel,
        .ttt-info {
          margin-top: 18px;
          font-size: 1.2rem;
        }
        .ttt-player-select {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          margin: 12px 0 10px 0;
        }
        .ttt-btn, .ttt-btn-x, .ttt-btn-o, .ttt-btn--restart {
          padding: 8px 24px;
          border: none;
          border-radius: 7px;
          cursor: pointer;
          margin: 5px 6px;
          font-size: 1.02rem;
          font-weight: 600;
          transition: background 0.15s, box-shadow 0.15s;
        }
        .ttt-btn-x {
          background: #1976d2;
          color: #fff;
        }
        .ttt-btn-o {
          background: #ffeb3b;
          color: #424242;
        }
        .ttt-btn--restart {
          background: #424242;
          color: #fff;
        }
        .ttt-btn--restart:hover {
          background: #6d6d6d;
        }
        .ttt-btn:hover {
          box-shadow: 0 3px 8px 0 rgba(40,40,50,0.10);
          opacity: 0.93;
        }
        .ttt-game-stats {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px; margin-top: 0;
        }
        .ttt-status {
          margin: 10px 0 22px 0;
          font-size: 1.16rem;
          color: #1976d2;
        }
        .ttt-status--win {
          color: #388e3c;
        }
        .ttt-status--draw {
          color: #c79500;
        }
        .ttt-board {
          display: grid;
          grid-template-columns: repeat(3, 84px);
          grid-template-rows: repeat(3, 84px);
          gap: 8px;
          margin: 18px auto 10px auto;
        }
        .ttt-square {
          width: 82px; height: 82px;
          background: var(--bg-secondary);
          border: 2.5px solid var(--border-color);
          border-radius: 7px;
          font-size: 2.48rem;
          color: #1976d2;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: bold;
          box-shadow: 0 2px 7px 0 rgba(30,50,80,0.055);
          transition: background 0.18s, color 0.18s;
        }
        .ttt-square:disabled {
          cursor: not-allowed;
          background: #eee;
          color: #aaa;
          opacity: 0.73;
        }

        .ttt-error {
          margin: 12px 0;
          color: #d32f2f;
          font-weight: bold;
        }
        .ttt-info {
          margin: 15px 0;
        }

        .ttt-history-panel {
          flex: 1.15;
          padding: 0 15px 0 8px;
          min-width: 222px;
          background: var(--bg-secondary);
          border-radius: 10px;
          box-shadow: 0 3px 14px 0 rgba(0,0,0,0.03);
        }
        .ttt-history-panel h2 {
          font-size: 1.13rem;
          color: var(--text-secondary);
        }
        .ttt-history-empty {
          color: #777;
          font-size: 1rem;
          margin-top: 16px;
        }
        .ttt-history-panel ul {
          list-style: none;
          padding: 0; margin: 0;
        }
        .ttt-history-item {
          margin: 8px 0;
          padding: 0;
        }
        .ttt-history-item button {
          width: 100%;
          background: none;
          border: none;
          text-align: left;
          font-size: 1rem;
          cursor: pointer;
          padding: 7px 0 7px 4px;
          color: var(--text-primary);
          border-left: 3px solid transparent;
          border-radius: 7px;
        }
        .ttt-history-item--active button {
          background: #1976d222;
          border-left: 3px solid #1976d2;
        }
        .ttt-history-meta {
          display: block; color: #677; font-size: 0.95em; margin-top: 2px;
          opacity: 0.84;
        }

        .ttt-footer {
          text-align: center; font-size: 1rem;
          margin: 32px 0 10px 0; color: #a0a0a0;
        }
        @media (max-width:840px) {
          .ttt-container {
            flex-direction: column;
            align-items: center;
            max-width: 98vw;
          }
          .ttt-game-panel { margin-right: 0; min-width: unset; width: 99vw; }
          .ttt-history-panel { margin-top: 38px; min-width: unset; width: 99vw; padding: 0 8vw; }
        }
        @media (max-width: 600px) {
          .ttt-board { grid-template-columns: repeat(3, 54px); grid-template-rows: repeat(3, 54px);}
          .ttt-game-panel, .ttt-history-panel { padding: 6vw 3vw; }
          .ttt-header h1 { font-size: 1.25rem; }
        }
      `}</style>
    </div>
  );
}

export default App;
