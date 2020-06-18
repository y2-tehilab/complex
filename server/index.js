const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(function (req, res, next) {
  let date = new Date();
  console.log('\x1b[36m%s\x1b[34m', `${date.toLocaleString("he-IL", {hour12: false})}, dispatch request from ${req.ip} to route [${req.method}] ${req.url}`);
  next()
})

const mysql      = require('mysql');
const connection = mysql.createConnection({
  host     : keys.msHost,
  user     : keys.msUser,
  password : keys.msPassword,
  database : keys.msDatabase
});

connection.connect();

connection.query(`CREATE TABLE IF NOT EXISTS ${keys.msDatabase}.values(number INT)`, (error, results) => {
  if (error) throw error;
});

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req, res) => {
  res.send('Hi');
});

app.get('/values/all', async (req, res) => {
  connection.query(`SELECT * from ${keys.msDatabase}.values`, (error, results) => {
    if (error) throw error;
    res.send(results);
  });
});

app.get('/values/current', async (req, res) => {
  redisClient.hgetall('values', (err, values) => {
    res.send(values);
  });
});

app.post('/values', async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }

  redisClient.hset('values', index, 'Nothing yet!');
  redisPublisher.publish('insert', index);
  connection.query(`INSERT INTO ${keys.msDatabase}.values(number) VALUES(${index})`, (error, results) => {
    if (error) throw error;
    res.send({ working: true });
  });
});

app.listen(5000, () => {
  console.log('Listening');
});
