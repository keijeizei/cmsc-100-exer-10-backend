const express = require('express');
const app = express();
const router = require('./router');
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
 	res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
 	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
 	next();
})

router(app);

app.listen(3001, () => { 
	console.log("Server started at port 3001");
});
