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
  user_id: String,
  description: String,
  duration: Number,
  date: Date
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
    let name = req.body.username;
    User.findOne({username: name}, (err, user) => {
      if (user) return res.send('Username already taken!');

      let newUser = User({username: name});
      newUser.save((err, user) => {
        if (err) return console.log(err);

        res.json({
          user_id: user._id,
          username: user.username
        });
      });
    });
  });

app.route('/api/exercise/add')
  .post((req, res) => {
    let id = req.body.userId;
    let desc = req.body.description;
    let duration = req.body.duration;
    let date = req.body.date === '' ? new Date() : new Date(req.body.date);
    
    User.findOne({_id: id}, (err, user) => {
      if (user) {
        let newExercise = Exercise({
          user_id: user._id,
          description: desc,
          duration: duration,
          date: date
        });

        newExercise.markModified(date);
        newExercise.save((err, exercise) => {
          if (err) return console.log(err);
          res.json({
            user_id: user._id,
            username: user.username,
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString()
          });
        });
      }  else {
        return res.send('This user does not exist.');
      }
    });
  });

app.route('/api/exercise/users')
  .get((req, res) => {
    User.find((err, users) => {
      if (err) return console.log(err);
      res.send(users);
    })
  });

app.route('/api/exercise/log')
  .get((req, res) => {
    let id = req.query.userId;
    let from = req.query.from;
    let to = req.query.to;
    let limit = req.query.limit === '' ? 0 : Math.abs(Number(req.query.limit));

    User.findOne({_id: id}, {__v: 0}, (err, user) => {
      if (user) {       
        let query = {user_id: user._id}; 
        if (from) {
          query = Object.assign({}, query, {'date': {'$gte': from}});  
        }

        if (to) {
          query = Object.assign({}, query, {'date': {'$lte': to}});
        }

        Exercise.find(query, {_id: 0, __v: 0}).limit(limit).exec((err, logs) => {
          if (logs) {
            logs = logs.map(log => {
              return {
                description: log.description,
                duration: log.duration,
                date: log.date.toDateString()
              };
            });
            res.json(Object.assign({}, user.toObject(), {
              count: logs.length,
              log: logs
            }));
          }
        });
      } else {
        return res.send('Unknown user id');
      }
    });
  });

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
