const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const neo4j = require('neo4j-driver');
require('dotenv').config();

const nodeRoutes = require('./routes/node.routes');
const motiveRoutes = require('./routes/motive.routes');
const movementRoutes = require('./routes/movement.routes');
const accountRoutes = require('./routes/account.routes');
const actionRoutes = require('./routes/action.routes');
const relationRoutes = require('./routes/relation.routes');

const app = express();

// Middleware
app.use(cors());
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    express.json({
      strict: true,
      limit: '1mb',
      verify: (req, res, buf, encoding) => {
        try {
          JSON.parse(buf.toString());
        } catch (e) {
          console.error('Invalid JSON payload:', buf.toString());
          throw new Error('Invalid JSON payload');
        }
      }
    })(req, res, next);
  } else {
    next();
  }
});
app.use(morgan('dev'));

// Neo4j Connection
const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || '20071028'
  )
);

// Test database connection
const testConnection = async () => {
  const session = driver.session();
  try {
    await session.run('RETURN 1');
    console.log('Successfully connected to Neo4j database');
  } catch (error) {
    console.error('Neo4j connection error:', error);
  } finally {
    await session.close();
  }
};

testConnection();

// Routes
app.use('/api', nodeRoutes);
app.use('/api/motives', motiveRoutes);
app.use('/api/actions/movement', movementRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/actions', relationRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Express Neo4j API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON payload',
      details: err.message,
      payload: req.body
    });
  }
  
  res.status(500).json({ 
    error: 'Something went wrong!',
    details: err.message 
  });
});

const PORT = process.env.PORT || 5432;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 