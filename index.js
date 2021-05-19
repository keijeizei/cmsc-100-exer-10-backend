const express = require('express');
const cookieParser = require("cookie-parser");
const router = require('./router');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended:false }));
app.use(cookieParser());
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "http://localhost:3000");
 	res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
 	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
	res.setHeader("Access-Control-Allow-Credentials","true"); 
	next();
})

router(app);

app.listen(3001, (err) => { 
	if (err) { console.log(err); }
	else { console.log("Server started at port 3001"); }
});
