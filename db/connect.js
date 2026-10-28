const mongoose = require('mongoose')

const connectDB = (url) => {
  return mongoose.connect(url); // Clean & modern connection call
};

module.exports = connectDB;