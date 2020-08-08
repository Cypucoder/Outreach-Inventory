var express = require('express');
var app = express();
var mysql = require('mysql');
var server = require('http').createServer(app);
var io = require ('socket.io')(server);
var bodyParser = require('body-parser');
var nodemailer = require("nodemailer");
var sharp = require('sharp');
var fs = require('fs');

//Necessary for email
var smtpTransport = nodemailer.createTransport("SMTP",{
host: 'email.domain.org',
port: 25,
domain:'domain.org',
tls: {ciphers:'SSLv3'}
//auth: {
//user: "itrequest@business.org",
//pass: "pass"
//}
});

//Links mySQL database to the Node server
var db = mysql.createPool({
    host: 'localhost', 
    user: 'root', 
    password: 'pass', 
    database: 'outreachinv'
    //port: 3000;
});

var socket;

//This connects to the service that sends and returns live data
io.on('connection', function(socket){
    //Lets the admin know when a user is connected. Only states when a connection is made to the login/landing page.
    console.log('A user connected');    
    
    socket.on('add_item', function(item){
        console.log(item);
        
        add_item(item, function(res){
            if(res){
                socket.broadcast.emit('new_Item', (item));
            } else {
                io.emit('error');
                console.log('there was an error under socket.on add_item');
            }
        });
    });    
    
    socket.on('update_item', function(item){
        console.log(item);
        
        update_item(item, function(res){
            if(res){
                console.log("Success!");
                socket.emit("Upd", "a");
            } else {
                io.emit('error');
                console.log('there was an error under socket.on send_requests');
            }
        });
    });     
    
    socket.on('delete_item', function(item){
        console.log(item);
        
        delete_item(item, function(res){
            if(res){
                console.log("Success!");
                //socket.emit("Upd", "a");
            } else {
                io.emit('error');
                console.log('there was an error under socket.on delete_item');
            }
        });
    });    
    
    socket.on('send_requests', function(item){
        console.log(item);
        
        send_requests(item, function(res){
            if(res){
                console.log("Success!");
                socket.emit("Sent", "a");
            } else {
                io.emit('error');
                console.log('there was an error under socket.on send_requests');
            }
        });
    });
    
    //disconnects link to server to prevent too many connections to the server
    socket.on('disconnect', function() {
     //Code inserted in here will run on user disconnect. 
     console.log('A user has disconnected');
        socket.disconnect();
        
    });
    
    

});

//used to start and run the server
server.listen(3011, function(){
    console.log("listening on *:3011");
});

app.use(express.static('files'));
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

app.get('/', function(req, res){
        res.sendFile(__dirname + '/files/index.html');
});

app.get('/getItems/:id', function(req, res){
        db.query('SELECT * FROM `outreachinv`.`items` WHERE `items`.`type`="'+req.params.id+'";', function(err, rows){
            if (err) console.log(err);
            res.send(JSON.stringify(rows));
        });
});

var add_item = function(item, callback) {
    console.log("add_item function started");
    var sanitized = [item.title, item.type]
    db.getConnection(function(err, connection){
        if(err){
            console.log('there was an issue in at the add_item section');
            connection.release();
            callback(false);
            return;
        }
        connection.query("INSERT INTO `outreachinv`.`items` (`title`, `img`, `type`) VALUES (?,'placeholder', ?)", sanitized, function(err, rows){
            if(err) {
                console.log(err);
            }
            var data = item.img;
            //console.log(Item.nFile);

            function decodeBase64Image(dataString) {
                var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
                    response = {};
                
                if (matches.length !== 3) {
                    return new Error('Invalid input string');
                }

                response.type = matches[1];
                response.data = new Buffer(matches[2], 'base64');
                
                return response;
            }

            var imageBuffer = decodeBase64Image(data);

            fs.writeFile("files/assets/img/uploads/"+rows.insertId+".jpg", imageBuffer.data, function(err) {
                if(err){
                    console.log("failed to write image");
                }else{
                    connection.query("UPDATE `outreachinv`.`items` set `img`='assets/img/uploads/"+rows.insertId+".jpg' WHERE v_id = '"+rows.insertId+"'", function(err, rows2){
                        console.log(err);
                    })
                    callback("success"); 
                    console.log("succesfully wrote image");
                    
                }
            });   
        });
        
        //res.send(JSON.stringify("a"));
        
        connection.on('error', function(err) {
            console.log("insert issue found");
            //callback(false);
            return;
        });
        connection.release();  
    });
}

var update_item = function(item, callback) {
    console.log("update_item function started");
    var sanitized = [item.title, item.type, item.v_id]
    db.getConnection(function(err, connection){
        if(err){
            console.log('there was an issue in the update_item section');
            connection.release();
            callback(false);
            return;
        }
        connection.query("UPDATE `outreachinv`.`items` SET `title`=?, `type`=?  WHERE `v_id`=?", sanitized, function(err, rows){
            if(err) {
                console.log(err);
            }

            var strthing = item.img;
            /*var resp = strthing.match("/^(uploads)$/g"), response = {};*/
            //console.log("RESP: "+resp.length);
            console.log(strthing)
            console.log(strthing.match(/uploads/g));
            if(!strthing.match(/uploads/g)){
                var data = item.img;
                //console.log(Item.nFile);

                function decodeBase64Image(dataString) {
                    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
                        response = {};

                    if (matches.length !== 3) {
                        return new Error('Invalid input string');
                    }

                    response.type = matches[1];
                    response.data = new Buffer(matches[2], 'base64');

                    return response;
                }
                var imageBuffer = decodeBase64Image(data);

                fs.writeFile("files/assets/img/uploads/"+item.v_id+".jpg", imageBuffer.data, function(err) {
                    if(err){
                        console.log("failed to write image");
                    }else{
                        callback("success"); 
                        console.log("succesfully wrote image");

                    }
                });
            } else {
                callback("success");
                console.log("Success without image");
            }
        });
        
        //res.send(JSON.stringify("a"));
        
        connection.on('error', function(err) {
            console.log("insert issue found");
            //callback(false);
            return;
        });
        connection.release();  
    });
}

var delete_item = function(item, callback) {
    console.log("update_item function started");
    var sanitized = [item.v_id]
    db.getConnection(function(err, connection){
        if(err){
            console.log('there was an issue in the update_item section');
            connection.release();
            callback(false);
            return;
        }
        connection.query("DELETE FROM `outreachinv`.`items` WHERE `v_id`=?", sanitized, function(err, rows){
            if(err) {
                console.log(err);
            }
            callback("a");
        });
        
        //res.send(JSON.stringify("a"));
        
        connection.on('error', function(err) {
            console.log("insert issue found");
            //callback(false);
            return;
        });
        connection.release();  
    });
}

var send_requests = function(item, callback) {
    console.log("sending requests");
    var subject = "";
    var arr = JSON.parse(item.Cart);
    console.log(arr);
    //arr.forEach(createBody(item, index));
    
    for (var i in arr){
        //console.log(arr[i]);
        subject += arr[i].title+"<br>";
        console.log(subject);
    }
    console.log(item);
    /*=============Mail to Outreach===============*/        
        var mailOptions={
            to : 'Outreach <outreach@business.org>',
            subject : " Outreach Request",
            html : "Location: <br>"+item.Req.location+"<br><br>Items requested:<br>"+subject+"<br><br>Other Comments: <br>"+item.Req.other,
            from: 'OutreachInv <'+item.Req.email+'>'
        }

        console.log(mailOptions);
        smtpTransport.sendMail(mailOptions, function(error, response){
            if(error){
                console.log(error);
            }else{
                console.log("Message sent: " + response.message);
            }
        });

    /*=============Mail Confirmation==========*/        
        var mailOptions={
            to : 'Outreach <'+item.Req.email+'>',
            subject : " Outreach Request",
            html : "Location: <br>"+item.Req.location+"<br><br>Items requested:<br>"+subject+"<br><br>Other Comments: <br>"+item.Req.other,
            from: 'OutreachInv <noreply@business.org>'
        }

        console.log(mailOptions);
        smtpTransport.sendMail(mailOptions, function(error, response){
            if(error){
                console.log(error);
            }else{
                console.log("Message sent: " + response.message);
            }
        });
    
    callback("a")
    
}