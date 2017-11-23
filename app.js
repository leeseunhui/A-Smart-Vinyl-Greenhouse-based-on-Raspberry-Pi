require('date-utils');

var schedule = require('node-schedule');
var rule = new schedule.RecurrenceRule();
rule.minute = [0,5,10,15,20,25,30,35,40,45,50];

var noble = require('./index');
var addr1 = '74f07dce51f3';
var addr2 = '74f07dce4b9f';
var addr3 = '74f07dce4f97';
var addr4 = '74f07dce346d';
var addr5 = '74f07dce3467';
var addr6 = '74f07dce50a4';
var addr7 = '74f07dce51d6';
var addr8 = '74f07dce366a';

var addr9 = '74f07dce527d';
var addr10 = '74f07dce4911';
var addr11 = '74f07dce52b8';
var addr12 = '74f07dce52b0';////////////
var addr13 = '74f07dce4abe';
var addr14 = '74f07dce4a19';
var addr15 = '74f07dce4cd6';
var addr16 = '74f07dce4d00';///////////
var addr17 = '74f07dce4cd2';
var addr18 = '74f07dce51b9';

var scan_num = 0;
var datas = new Array(15);
datas[2] = 1; datas[3] = '52b0';
datas[7] = 2; datas[8] = '4d00';

var datas2 = new Array(3);
datas2[2] = 'O';

var mysql = require('mysql');

var pool = mysql.createPool({
	host: "localhost",
	user: "root",
	password: "pi",
	database: "project",
	waitForConnections:true
});

var Options = {
	mode : 'photo',
	output : 'camera.jpg',
	e : 'jpg'
};

var Gpio = require('onoff').Gpio,
	buz = new Gpio(12,'out'),
	water = new Gpio(25,'out');

var camera = new require('raspicam')(Options);
camera.start();

var j = schedule.scheduleJob(rule, function() {
	noble.startScanning();
});

noble.on('discover', function(peripheral) {
	var serviceData = peripheral.advertisement.serviceData;
	if (peripheral.advertisement.manufacturerData) {
	if((peripheral.id == addr16) || (peripheral.id == addr12))
	{
	console.log();
        var data = JSON.stringify(peripheral.advertisement.manufacturerData.toString('hex'));
	var dt = new Date();
	var day = dt.toFormat('YYYY-MM-DD');
	var time = dt.toFormat('HH24:MI');
	var ad = peripheral.id;
	var addr = ad.substr(8, 4);
	var t2 = data.substr(1,2);var t1 = data.substr(3,2);
        var h2 = data.substr(5,2);var h1 = data.substr(7,2);
	var ba = data.substr(11,2);
	var thex = t1+t2;var hhex = h1+h2;
	var tdec = parseInt(thex,16);var hdec = parseInt(hhex,16);
	var temper = tdec/100;var humi = hdec/100;
	var battery = parseInt(ba,16);
	console.log("day: "+day+", time: "+time+", address :"+addr);
	console.log("temperature: "+temper+", humidity: "+humi+", battery: "+battery);

	datas[0] = day;
	datas[1] = time;
	var i = 0;
	if(addr == datas[3]) {i=1;}
	else if(addr == datas[8]) {i= 2;}

	datas[i*5-1] = temper;
	datas[i*5] = humi;
	datas[i*5+1] = battery;
	scan_num++;
	console.log("addr_num: "+i+",scan_num: "+scan_num);
	console.log();
	if(scan_num == 2)
	{
	pool.getConnection(function(err, connection)
	{
		if(err)	throw err;
		var sql = "insert into sensor2(day,ctime,num1,addr1,t1,h1,b1,num2,addr2,t2,h2,b2) values(?,?,?,?,?,?,?,?,?,?,?,?)";
		connection.query(sql,datas,function(err, rows) {
			if(err) { connection.release(); throw err; }
			console.log("mysql insert comlite");
			connection.release();
		});
	});
	scan_num = 0;
	}
	}
	}
});

// Add needed module
var wpi = require('wiring-pi');
var sleep = require('sleep');
var microtime = require('microtime');

// Set var
var TRIG, ECHO, P_Dis;

P_Dis = 10;
TRIG = 5;
ECHO = 4;

wpi.setup('gpio');
wpi.wiringPiSetup();

// Init pin mode
wpi.pinMode(TRIG, wpi.OUTPUT);
wpi.pinMode(ECHO, wpi.INPUT);


// getTime
function getTime()
{
    var now = new Date();

    var time = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate() + " "
               + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + " ";
    return time;
}

// Calc
var t = setInterval(function(){
    var Time = getTime();
    // Make a wave
    wpi.digitalWrite(TRIG, wpi.LOW);
    sleep.usleep(2);
    wpi.digitalWrite(TRIG, wpi.HIGH);
    sleep.usleep(20);
    wpi.digitalWrite(TRIG, wpi.LOW);

    // Check start time (echo == 1)
    while(wpi.digitalRead(ECHO) == wpi.LOW);
    var startTime = microtime.now();

    // Check end time (echo == 0)
    while(wpi.digitalRead(ECHO) == wpi.HIGH);
    var endTime = microtime.now();

    // Calc distance
    var distance = (endTime - startTime) / 58;
    var state = 0;
    if((P_Dis >= 30) && (P_Dis < 150))
	{ state = 1;}
    else if((P_Dis < 30) && (P_Dis > 0))
	{state = 0;}
    else 
	{state = 3;}

    // Print at console
    //console.log('[DISTANCE]:'+distance+'cm');
    if((state == 0) && (distance > 30) && (distance < 150))
    {
        console.log('---------------------'+Time + "Doors Open");

	var dt = new Date();
	var day = dt.toFormat('YYYY-MM-DD');
	var time = dt.toFormat('HH24:MI:SS');
	datas2[0] = day;
	datas2[1] = time;

	pool.getConnection(function(err, connection)
	{
		if(err)	throw err;
		var sql = "insert into admit2(day,ctime,admi) values(?,?,?)";
		connection.query(sql,datas2,function(err, rows) {
			if(err) { connection.release(); throw err; }
			console.log("mysql [enter]insert comlite");
			connection.release();
		});
	});
	buz.writeSync(1);
	sleep.sleep(1);
	buz.writeSync(0);
    }
    P_Dis = distance;

}, 1000);


var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');

var index = require('./routes/index');
var users = require('./routes/users');
var farm = require('./routes/farm');

var app = express(), server = http.createServer(app);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);
app.use('/farm', farm);


server.listen(8000,function(){
	console.log('server start! port num : 8000');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
