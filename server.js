const express=require('express');
const session=require('express-session');
const path=require('path');
const axios = require('axios');
const bcrypt=require('bcrypt');
const bodyparser=require('body-parser');
const app=express();
const port=5000;
const admin = require('firebase-admin');

const serviceAccount=require('./key2.json');


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.set('view engine','ejs');

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:true}));

app.use(session({
    secret:'secrect',
    resave:false,
    saveUninitialized:true
}));
//using static file
app.use('/static',express.static(path.join(__dirname,'public')));


//signup page
app.get('/signup',function(req,res){
    res.render('signup');
});

//signup route
app.post('/signup',async(req,res)=>{
    const {username,email,password}=req.body;
    const hashing=await bcrypt.hash(password,10);
    await db.collection('401').doc(email).set({
        username,
        email,
        password:hashing,
    });
    res.redirect('/login')
});

//login page
app.get('/login',function(req,res){
    res.render('login');
});

//loginroute
app.post('/login',async (req,res)=>{
    const {email,password}=req.body;
    const userinfo=await db.collection('401').doc(email).get();
    if(!userinfo.exists){
        res.send('user does not exist ');
    };
    const doc=userinfo.data();
    const match= await bcrypt.compare(password,doc.password);
    if(match){
        req.session.userId=userinfo.id;
        req.session.username=userinfo.username;
        res.redirect('/dashboard');
    }else{
        res.send('Incorrect password');
    }
});


app.get('/',(req,res)=>{
    res.redirect('login')
});

app.get('/dashboard',(req,res)=>{
    if(!req.session.userId){
        res.redirect('/login');
    }
    else{
        res.render('index');
    }
});
app.post('/search', async (req, res) => {
  const movieName = req.body.movieName;
  const apiUrl = `http://www.omdbapi.com/?t=${encodeURIComponent(movieName)}&apikey=96995c67`;

  try {
    // Log the search term and API URL for debugging
    console.log('Search Term:', movieName);  
    console.log('API URL:', apiUrl);    
    const response = await axios.get(apiUrl);
    
    // Log the full API response for debugging
    console.log('Full API Response:', response.data);

    const movieData = response.data;

    if (movieData.Response === 'True') {
      const movieDetails = {
        title: movieData.Title || '',
        year: movieData.Year || '',
        rated: movieData.Rated || '',
        released: movieData.Released || '',
        runtime: movieData.Runtime || '',
        genre: movieData.Genre || '',
        director: movieData.Director || '',
        writer: movieData.Writer || '',
        actors: movieData.Actors || '',
        plot: movieData.Plot || ''
      };

      // Log the extracted movie details for debugging
      console.log('Extracted movie data:', movieDetails);

      await db.collection('movies').add(movieDetails);

      res.render('search', { movies: [movieDetails] });
    } else {
      res.render('search', { movies: [] });
    }
  } catch (error) {
    console.error('Error fetching data from OMDB API:', error);
    res.render('search', { movies: [] });
  }
});
app.listen(5000);