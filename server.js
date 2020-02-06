require('dotenv').config();
const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', {useNewUrlParser: true, useUnifiedTopology: true});

let Schema = mongoose.Schema;
let userSchema = new Schema({
  username: String
});
let exerciseSchema = new Schema({
  children: [userSchema],
  description: String,
  duration: Number,
  data: Date
});

let User = mongoose.model('User', userSchema);
let Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${req.ip}`);
  next();
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

app.route('/api/exercise/new-user')
  .post((req, res) => {
    let name = req.body.username
    let findUsername = User.findOne({username: name}, (err, user) => {
      if (user) return res.send('Username already taken!');

      let newUser = User({username: name});
      newUser.save((err, user) => {
        if (err) return console.log(err);

        res.json({
          userId: user._id,
          username: user.username
        });
      });
    });
  });

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
