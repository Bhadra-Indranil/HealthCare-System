const mongoose = require('mongoose');

function getDB() {
  return mongoose.connection.db;
}

module.exports = { getDB };
