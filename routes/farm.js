var express = require('express');
var router = express.Router();
var fs = require('fs');
var sleep = require('sleep');
var mysql = require('mysql');

var pool = mysql.createPool({
	host: "localhost",
	user: "root",
	password: "pi",
	database: "project",
	waitForConnections:true
});

var Gpio = require('onoff').Gpio,
	fan = new Gpio(18,'out'),
	led = new Gpio(22,'out'),
	water = new Gpio(25,'out'),
	buz = new Gpio(12,'out');

var PCF8591 = require('pcf8591');
var pcf8591 = new PCF8591();

pcf8591.configure(0x48);

var ground = 0;
var output = 0x00;
setInterval(function(){
    output ^= 0xff;
    pcf8591.write(output);
    pcf8591.readBytes(4, function(error, buffer){
	var soil = buffer[0].toString(10);
	console.log(buffer[0].toString(10));
        console.log( (( (153-soil)/153)*100) + '%');
	ground = ((153-soil)/153)*100;
        if( (soil=='153') ) 
	{
		water.writeSync(1);
		sleep.sleep(3);
		water.writeSync(0);
	}
        else water.writeSync(0);
    });
}, 500);

var Options = {
	mode : 'photo',
	output : 'camera.jpg',
	e : 'jpg'
};

var camera = new require('raspicam')(Options);

router.get('/', function(req, res, next) {
  camera.start();
  pool.getConnection(function(err, connection)
{
	var sql = "select * from sensor2";
	connection.query(sql, function(err, rows) {
		if (err) console.console.error("err : " + err);
		console.log("rows : "+ JSON.stringify(rows));
		res.render('farm', {title: ground, rows: rows});
		connection.release();
	});
});
});

router.post('/',function(req,res){
	var state1 = req.body.fan;
	if(state1 == 'on'){	fan.writeSync(1);	}
	else{	fan.writeSync(0);	}

	var state2 = req.body.led;
	if(state2 == 'on'){	led.writeSync(1);	}
	else{	led.writeSync(0);	}

	var state3 = req.body.water;
	if(state3 == 'on')
	{	water.writeSync(1);
		sleep.sleep(3);
		water.writeSync(0);
	}
	else{	water.writeSync(0);	}

	console.log(' Fan | LED | water ');
	console.log(state1+' | '+state2+' | '+state3);
	res.redirect('/farm');
});

router.get('/enter', function(req, res, next) {
  camera.start();
  pool.getConnection(function(err, connection)
{
	var sql = "select * from admit2";
	connection.query(sql, function(err, rows) {
		if (err) console.console.error("err : " + err);
		console.log("rows : "+ JSON.stringify(rows));
		res.render('enter', {title: 'admittance', rows: rows});
		connection.release();
	});
});
});

router.get('/camera',function(req,res){
	fs.readFile('camera.jpg', function(err,data)
	{	
		if(err) {console.log(' img read err');}
		res.writeHead(200, {'Content-Type':'image/jpeg'});
		res.end(data);
	});
});


module.exports = router;
