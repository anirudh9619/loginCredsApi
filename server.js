require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const utils = require('./utils');
const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://admin:admin@cluster0.mxtpw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
let userData
let collection
client.connect(async (err) => {
  if(err) {
    console.log(err)
  } else {
    console.log("connected")
  }
  collection = client.db("UsersData").collection("Users");
});
 async function getUserData () {
  userData = await collection.find({}).toArray()
  return userData
 }
const app = express();
const port = process.env.PORT || 4000;
 
// enable CORS
app.use(cors());
// parse application/json
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));


//middleware that checks if JWT token exists and verifies it if it does exist.
//In all future routes, this helps to know if the request is authenticated or not.
app.use(function (req, res, next) {
  // check header or url parameters or post parameters for token
  var token = req.headers['authorization'] || req.body.token;
  if (!token) return next(); //if no token, continue
 
  token = token.replace('Bearer ', '');
  jwt.verify(token, process.env.JWT_SECRET, function (err, user) {
    if (err) {
      return res.status(401).json({
        error: true,
        message: "Invalid user."
      });
    } else {
        console.log('user', user)
      req.user = user; // set the user to req so other routes can use it
      next();
    }
  });
});

 
// request handlers
app.get('/', (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Invalid user to access it./ Please provide token.' });
  res.send('Welcome to the Node.js api for login/users stuffs - ' + req.user.name);
});

// get all users from db
app.get('/getAllUsers', (req, res) => {
  var token = req.body.token || req.query.token;
  if (!token) {
    return res.status(400).json({
      error: true,
      message: "Token is required."
    });
  }
  // check token that was passed by decoding token using secret
  jwt.verify(token, process.env.JWT_SECRET, async function (err, user) {
    if (err) return res.status(401).json({
      error: true,
      message: "Invalid token."
    });
    let usersData = await getUserData()
    // get basic users details
    usersData = await collection.find({}).toArray()
    return res.json({ users: usersData })
  });
})

// validate the user credentials
app.post('/users/signin', async function (req, res) {
  const user = req.body.username;
  const pwd = req.body.password;
  const usersData = await getUserData()
  // return 400 status if username/password is not exist
  if (!user || !pwd) {
    return res.status(400).json({
      error: true,
      message: "Username or Password required."
    });
  }
 const userData = usersData.filter((usrs) => {
  return usrs.email === user
 })
 console.log(userData)
  // return 401 status if the credential is not match.
  if (user !== userData[0]?.email || pwd !== userData[0]?.password) {
    return res.status(401).json({
      error: true,
      message: "Username or Password is Wrong."
    });
  }
 
  // generate token
  const token = utils.generateToken(userData[0]);
  let userObj
  // get basic user details
  if (userData[0]?.role === 'EMPLOYEEE') {
    userObj = utils.getCleanUser(userData[0]);
  }
  // for admin user
  if (userData[0]?.role === 'ADMIN') {
    userObj = usersData
  }
  // return the token along with user details
  return res.json({ user: userObj, token });
});
 
app.listen(port, () => {
  console.log('Server started on: ' + port);
});