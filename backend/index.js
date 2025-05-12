// backend/index.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// PostgreSQL pool config
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'health_services',
  password: 'kani',
  port: 5432,
});

// API: Get printed history
app.get('/history', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM printed_history ORDER BY printed_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// API: Add a new printed card
app.post('/history', async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('INSERT INTO printed_history (name) VALUES ($1)', [name]);
    res.send('Inserted');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

