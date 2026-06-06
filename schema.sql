CREATE TABLE IF NOT EXISTS quizzes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  title     TEXT NOT NULL,
  description TEXT DEFAULT '',
  time_limit INTEGER DEFAULT 0,   -- seconds, 0 = no limit
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id     INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  options     TEXT NOT NULL,       -- JSON array of strings
  answer      INTEGER NOT NULL,    -- 0-based index of correct option
  explanation TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS scores (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id        INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  player_name    TEXT NOT NULL,
  score          INTEGER NOT NULL,
  total          INTEGER NOT NULL,
  duration       INTEGER NOT NULL, -- seconds taken
  wrong_ids      TEXT DEFAULT '[]',-- JSON array of question ids
  created_at     TEXT DEFAULT (datetime('now'))
);

-- Demo quiz
INSERT INTO quizzes (title, description, time_limit) VALUES
  ('程式設計基礎', '測試你對基本程式概念的了解', 300);

INSERT INTO questions (quiz_id, body, options, answer, explanation) VALUES
  (1, '下列哪個是 JavaScript 的資料型別？',
   '["String","Vector","DataFrame","Channel"]', 0,
   'JavaScript 基本型別包含 String、Number、Boolean、Null、Undefined 等。'),
  (1, 'HTML 中用來定義超連結的標籤是？',
   '["<link>","<a>","<href>","<url>"]', 1,
   '<a href="..."> 是 HTML 定義超連結的標準標籤。'),
  (1, 'CSS 中 display: flex 的用途是？',
   '["設定字體","設定彈性盒排版","設定動畫","設定背景"]', 1,
   'Flexbox 是 CSS 的彈性盒模型，用於一維排版。'),
  (1, 'Git 指令中，提交變更使用？',
   '["git push","git pull","git commit","git merge"]', 2,
   'git commit 將暫存區的變更記錄為一個新的提交。'),
  (1, '下列哪個是合法的 Python 變數名稱？',
   '["2name","my-var","_count","class"]', 2,
   'Python 變數名稱可以用底線開頭，不能以數字開頭，不能使用保留字。');
