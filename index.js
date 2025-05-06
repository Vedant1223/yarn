import express from "express";
import dotenv from "dotenv";    
import testSearch from './routes/test.js'
import simpleGoogleApis from './routes/allfunction.js'
import newEnd from './routes/newEndpoints.js'


dotenv.config();
const app = express();
const PORT = 3000;

app.get('/', (req, res)=>{
    res.send("hello World");
});


app.use('/Search',testSearch);

app.use('/api/google', simpleGoogleApis);

app.use('/api/newEnd', newEnd);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Server error', message: err.message });
});

app.listen(PORT, ()=> {console.log(`Server is running on http://localhost:${PORT}`)});