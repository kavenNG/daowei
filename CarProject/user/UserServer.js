var http = require("http");
var express = require("express");
var path = require("path");
var app = express();
const url = require("url");
var fs = require("fs");
var qs = require("querystring");
var users = require("./connect")
var addresses = require("./addressesConnect")
var server = require("http").createServer(app);
var socket = require("socket.io");
var session = require("express-session");
var io = socket.listen(server)
var bodyParser = require('body-parser');
var cookieParser = require("cookie-parser");
var cookieSession = require("cookie-session");
var nodemailer = require("nodemailer")
var randomId = require("./randomId")
var cors = require("cors");
var requests = require("request")
var drivers  = require("./drivers")
let localPath = "";

app.use(cookieParser());
app.use(cors({
    origin:['http://localhost:8000'],
    methods:['GET','POST'],
    allowedHeaders:['Content-Type', 'Authorization'],
    withcredentials: true,
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
/*app.use(session({
    secret: '12345',
    name: 'testapp',   //这里的name值得是cookie的name，默认cookie的name是：connect.sid
    cookie: {maxAge: 80000, secure:true},
    resave: false,
    saveUninitialized: true
}))*/
app.use(cookieSession({
    name: 'session',
    keys: ["uuid"],
    //Cookie Options
    maxAge: 60*30*1000 //24hours
}))
// 创建 application/x-www-form-urlencoded 编码解析

var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.get("/regist", function(request, response) {
    response.sendFile(__dirname + "/public/zhuce1.html");
})

/*
返回当前用户登录状态
 */
app.get("/getState", function(req, res) {
    if(req.session.login) {
        let userId = req.session.login.uid;
        if(userId) {
            let conditions = {uid:userId}
            dbOpe.findByUid(conditions).then(function (data) {
                res.send(data)
            })
        }else {
            res.send(false)
        }
    }

})



/*
返回前端数据，刷新页面
 */
app.get("/redirect", function(request, response) {
    var lj = request.url
    var path = lj.substring(parseInt(lj.indexOf("=")) + 1);
    console.log(request.session.user);
    if(request.session.user) {
        console.log("fwefs");
        if(request.session.user.isActive) {
            console.log("active了")
            request.session.user = null;
            response.send(path);
        }
    }
})
/*
接收页面的用户名
 */
app.post("/post-name", urlencodedParser, function(request, response) {
    var user = {};
    console.log(request.body);
    let name = request.body.username;
    user.username = name;
    user.isReady = false;
    user.isActive = false;
    user.uid = randomId.create();
    console.log("name: " + name);
    dbOpe.findByUsername(user, request, response);
})
/*
接收用户的密码
 */
app.post("/post-password", urlencodedParser, function(request, response) {
    /*let user = request.cookies.isFilled;*/
    let user = request.session.user;

    console.log("username: " + user.username);
    let password = request.body.password;

    console.log(password)
    user.password = password;//此处需要把password插入到数据库中//
    response.send("");
    /*response.cookie("isFilled", user);*/
})
/*
接收用户的邮箱、电话
 */
app.post("/post-email", urlencodedParser, function(request, response) {
    var user = request.session.user;
    var phoneNum = request.body.phoneNum
    var email = request.body.email;
    user.email = email;
    user.phoneNum = phoneNum;
    console.log(email)
    console.log(phoneNum)
    dbOpe.findByEmailAndPhoneNum(user, request, response)
})
/*app.listen(8090, function() {*/
/*    console.log("chenggongjianting")*/
/*});*/

/*


 */


/*
login方法,
 */
app.post('/toLogin',urlencodedParser,function (req, res){
    var user = req.body,
        phoneReg =/^1([358][0-9]|4[579]|66|7[0135678]|9[89])[0-9]{8}$/,  //手机号正则
        emailReg = /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/; //邮箱正则
/*    console.log("user: " + user);*/
    if(phoneReg.test(user.username)){         //  手机号登录验证
        dbOpe.findBYPhoneNum(user, req, res);
    }else if(emailReg.test(user.username)){   // 邮箱登录验证
        dbOpe.findBYEmail(user, req, res)
    }else {//用户名登录验证
        console.log("username: " + user.username);
        /*dbOpe.findByUsername(user,req, res);*/
        dbOpe.findBYUsernameLogin(user, req, res).then(function(data) {
            console.log(data);
        })
    }
});
/*
用户退出
 */
app.get('/signOut',function (req, res) {
    if(req.session.login){
        req.session = null    }
    res.send(true);
});
/*
用户激活方法
 */
 app.get("/active", function(request, response) {
    /* var uu = url.parse(request.url).query;
     var uid = uu.substring(parseInt(uu.indexOf("=")) + 1);*/
     var uid = request.query.uid;
     request.session.user.isActive = true;
     dbOpe.activeHandler(uid, response);
/*     console.log("已收到来自用户的激活信息")
     console.log(uu);*/
 })

//点击邮件里的连接会跳转的页面
app.get("/findPwd", urlencodedParser, function(req,res) {
    let conditions={email:req.query.email};
    let updates = {$set:{isReady:true}};
    users.update(conditions,updates,function (err) {
        if(err){
            res.send('验证失败,请重新尝试');
        }
    });
    users.find(conditions,function (err,data) {
        if(data[0].isReady){
            res.redirect('http://localhost:8000/resetSuccess');
        }else {
            res.send('验证失败,请重新验证');
        }
    })
});

//重置密码    邮箱验证
app.post('/reset',urlencodedParser,function (req,res) {
    let email = req.body.email;
    users.find({email:email},function (err, data) {
        let userData = data[0];
        if(userData){
            let transporter = nodemailer.createTransport({
                service:'163',
                auth:{
                    user:'15122867936@163.com',
                    pass:'qjy681008'
                }
            });
            let con = "<h2>久久打车邮箱验证,如非本人，请勿操作:</h2><h3><a href="+"http://localhost:8090/findPwd?email="+email+">http://blog.csdn.net/zzwwjjdj1/article/details/51878392</a></h3>";
            let mailOptions = {
                from: '15122867936@163.com', // 发送者
                to: email, // 接受者,可以同时发送多个,以逗号隔开
                subject: '久久打车重置密码邮箱验证', // 标题
                //text: 'Hello world', // 文本
                html:con
            };
            transporter.sendMail(mailOptions, function (err, info) {
                if (err) {
                    console.log(err);
                    return;
                }
                console.log('发送成功');
            });
            /*req.session.email = email;*/
            res.send('true');
        }else {
            res.send('邮箱不存在')
        }
    })
});

//修改密码
app.post('/reLogin',urlencodedParser,function (req, res) {
    if(req.session.email) {
        let conditions = {email:req.session.email};
        let updates = {password:req.body.newPwd,isReady:false};
        users.find(conditions,function (err, data) {
            if(data[0].isReady){
                users.update(conditions,updates,function (err) {
                    if(err){
                        res.send('修改失败');
                    }else {
                        res.send('true');
                    }
                })
            }else {
                res.send('邮箱未验证,请先验证邮箱,否则无法更改密码');
            }
        });
    }else {
        res.send("请先去邮箱激活");
    }

});



/*
订单模块
 */
/*
查询常用地址
 */
app.get("/commonAddress", function(req, res) {
    let uid = req.session.login.uid;
    let p = new Promise(function(resolve, reject) {
        users.find({uid:uid}, {"commonAddress":1, "historyOrders":1, _id:0}, function(err, data) {
            var addressData = data
            resolve(addressData);
        })
    }).then(function(data) {
        res.send(data);
    })

})
/*
查询开放地址
 */
app.get("/findOpenAddress", function(req, res) {
    let p = new Promise(function(resolve, reject) {
        addresses.find({}, {"openAddress":1,"_id":0}, function(err, data) {
            var addressData = data[0]
            resolve(addressData);
        })
    }).then(function(data) {
        res.send(data);
    })
})

/**
 * 把上车地点存放到session中
 */
app.post("/toStep", urlencodedParser, function(req, res) {
    let onAddress = req.body.onAddress;
    console.log("onAddress: " + onAddress)
    console.log(req.body.onLng)
    console.log(req.body.onLat)
    if (req.session.login) {
        req.session.login.onAddress = onAddress;
        req.session.login.onLng = req.body.onLng
        req.session.login.onLat = req.body.onLat
        res.send("true");
    }

})
/**
 * 把上车地点存放到session中
 */
app.post("/toStep-off", urlencodedParser, function(req, res) {
    var offAddress = req.body.offAddress;
    let offLng = req.body.offLng;
    let offLat = req.body.offLat;
    if(req.session.login) {
        req.session.login.offAddress = offAddress;
        req.session.login.offLng = offLng;
        req.session.login.offLat = offLat;
        res.send("true");
    }
})
/*/!*
发送上车数据到step页面
*!/
app.get("/getOnAddress", function(req, res) {
    if(req.session.login.onAddress) {
        res.send(req.session.login.onAddress);
    }
})
/!*
发送下车数据到step页面
 *!/
app.get("/getOffAddress", function(req, res) {
    if(req.session.login.offAddress) {
        res.send(req.session.login.offAddress);
    }
})*/
/*
返回历史订单到自定义页面
*/
app.get("/custom", function(req, res) {
    if(req.session.login) {
        let p = new Promise(function(resolve, reject) {
            users.find({username:req.session.login.username},{"historyOrders":1,"commonAddress":1,"_id":0},function(err, data) {
                resolve(data[0])
            }).limit(3)
        }).then(function(data) {
            res.send(data);
        })
    }

})
/*
添加常用地址
 */
app.post("/addCommon", urlencodedParser, function(req, res) {
    var commonAddress = req.body;
    var conditions = {uid:req.session.login.uid};
    dbOpe.findData(conditions).then(function(data) {
        var userData = data;
        let commonAddressArr = userData.commonAddress;
        commonAddressArr.push(commonAddress)
        return commonAddressArr
    }).then(function(data) {
        var updates = {commonAddress: data}
        var conditions = {uid:req.session.login.uid};
        dbOpe.updateData(conditions, updates);
        res.send("true");
    })
})
/*
获取用户的城市信息
 */
app.get("/getCity", function(req, res) {
    if(req.session.login) {
        req.session.login.city = req.query.city;
        req.session.login.ip = req.query.ip;
        res.send("true")
    }
})
/*
向客户端发送用户地址相关信息
 */
app.get("/sendCityAndIp", function(req, res) {
    if(req.session.login) {
        let mes = {
            "city":req.session.login.city,
            "ip":req.session.login.ip
        }
        res.send(mes)
    }
})
/*
返回用户填写的上车地址
 */
/*
生成订单
 */
app.post("/order", urlencodedParser, function(req, res) {
    let userId = req.session.login.uid
    let onTime = req.body.onTime.trim().substring(11,24);
    let getOn = req.body.getOn;
    let getOff = req.body.getOff;
    let orders = [];
    let oid = randomId.create();
    let isBackAndForth = req.body.isBackAndForth;
    let onData = {
        onLng:req.session.login.onLng,
        onLat:req.session.login.onLat
    }
    let offData = {
        offLng:req.session.login.offLng,
        offLat:req.session.login.offLat
    }
    let order = {
        oid:oid,
        getOn:getOn,
        getOff:getOff,
        onData:onData,
        offData:offData,
        onTime:onTime,
        state:0, //订单状态 0:未接单、1：已接单、2：未出发、3：已出发、4、订单完成
        isOver:false,
        isBackAndForth:isBackAndForth
    }
    req.session.login.orders = [];
    costUtils.getData(onData, offData, req, res, orders, order)

 /*   req.session.login.orders = orders*/

})
/*
获取更多订单相关信息
 */
app.post("/getMoreMessages", urlencodedParser, function(req, res) {
    let pNum = req.body.pNum;
    let luggages = req.body.luggages;
    let other = req.body.other;
    let conditions = {
        uid:req.session.login.uid
    }
    let oid = req.body.oid
    for(var i = 0; i < req.session.login.orders.length; i++) {
        if(req.session.login.orders[i].oid == oid) {
            req.session.login.orders[i].pNum = pNum;
            req.session.login.orders[i].luggages = luggages;
            req.session.login.orders[i].other = other;
            res.send(req.session.login.orders[i]);
        }
    }
   /* dbOpe.pushToUsers(conditions, req.session.login.orders)*/

})
/*

 */
app.post("/getPredictCost", function(req,res) {
    let oid = req.body.oid
    if(req.session.login.orders) {
        for(var i = 0; i < req.session.login.orders.length; i++) {
            if(req.session.login.orders[i].oid == oid) {
                res.send(req.session.login.orders[i].predictCost)
            }
        }

    }
})
/*
将订单信息发送到确认订单页面
 */
app.post("/toEnsureOrders",urlencodedParser, function(req, res) {
    var oid = req.body.oid
    let origin = req.body.origin;
    if(origin === "normal") {
        if(req.session.login.orders) {
            console.log(req.session.login.orders)
            for(var i = 0; i < req.session.login.orders.length; i++) {
                if(req.session.login.orders[i].oid == oid) {
                    res.send(req.session.login.orders[i])
                }
            }
        }
    }
    if(origin === "pickUp") {
        if(req.session.login.pickUpOrders) {
            console.log(req.session.login.pickUpOrders)
            for(var i = 0; i < req.session.login.pickUpOrders.length; i++) {
                if(req.session.login.pickUpOrders[i].oid == oid) {
                    res.send(req.session.login.pickUpOrders[i])
                }
            }
        }
    }
    if(origin === "dropOff") {
        if(req.session.login.dropOffOrders) {
            console.log(req.session.login.dropOffOrders)
            for(var i = 0; i < req.session.login.dropOffOrders.length; i++) {
                if(req.session.login.dropOffOrders[i].oid == oid) {
                    res.send(req.session.login.dropOffOrders[i])
                }
            }
        }
    }

})
/*
将订单信息添加到数据库
 */
app.post("/ensureOrders", urlencodedParser, function(req, res) {
    let oid = req.body.oid;
    let payWay;
    if(req.body.payWay == 3) {
         payWay = "现金";
    }else if(req.body.payWay == 6) {
        payWay = "支付宝"
    }

    if(req.session.login.orders[0].oid == oid) {
        req.session.login.orders[0].payWay = payWay;
        let order = req.session.login.orders[0]

        dbOpe.findByUid({uid:req.session.login.uid}, req, res).then(function(data) {
            let p = new Promise(function(resolve, reject) {
                if(data) {
                    resolve(data)
                }
            })
           return p;
        }).then(function(data){
            io.sockets.on("connection", function(socket){
                socket.on("userConnect", function(data) {
                    console.log("user=========" + data)
                })
                socket.broadcast.emit("orderMessage", {order:order,user:data});
            })
            var conditions = {uid: req.session.login.uid};
            dbOpe.pushToUsers(conditions, req.session.login.orders)
            res.send(true)
        })
    }
})





/*
发送订单信息到noStatedOrder.vue
 */
app.get("/toNoStartedOrder", function(req, res) {
    let oid = req.query.oid;
    let origin = req.query.origin
    if(origin === "normal") {
        if(req.session.login.orders) {
            console.log(req.session.login.orders)
            for(var i = 0; i < req.session.login.orders.length; i++) {
                if(req.session.login.orders[i].oid == oid) {
                    res.send(req.session.login.orders[i])
                }
            }
        }
    }
    if(origin === "pickUp") {
        if(req.session.login.pickUpOrders) {
            console.log(req.session.login.pickUpOrders)
            for(var i = 0; i < req.session.login.pickUpOrders.length; i++) {
                if(req.session.login.pickUpOrders[i].oid == oid) {
                    res.send(req.session.login.pickUpOrders[i])
                }
            }
        }
    }
    if(origin === "dropOff") {
        if(req.session.login.dropOffOrders) {
            console.log(req.session.login.dropOffOrders)
            for(var i = 0; i < req.session.login.dropOffOrders.length; i++) {
                if(req.session.login.dropOffOrders[i].oid == oid) {
                    res.send(req.session.login.dropOffOrders[i])
                }
            }
        }
    }
})
/*
获取更多订单相关信息
 */
app.post("/getMoreMessages", urlencodedParser, function(req, res) {
    let pNum = req.body.pNum;
    let luggages = req.body.luggages;
    let other = req.body.other;
    let conditions = {
        username:req.session.login.username
    }
    let oid = req.body.oid
    for(var i = 0; i < req.session.login.orders.length; i++) {
        if(req.session.login.orders[i].oid == oid) {
            req.session.login.orders[i].pNum = pNum;
            req.session.login.orders[i].luggages = luggages;
            req.session.login.orders[i].other = other;
            res.send(req.session.login.orders[i]);
        }
    }
})
/*
                   接机
 */
/*
将
 */
/*
将订单信息保存到session中
 */
app.post("/pickUpOrder", urlencodedParser, function(req, res) {
    let user = req.session.login
    let onTime = req.body.onTime.trim().substring(11,24);
    console.log("onTime==========" + onTime)
    let getOn = req.body.getOn;
    let getOff = req.body.getOff;
    console.log(req.body)
    let orders = [];
    let oid = randomId.create();
    let flightNum = req.body.flightNum
    let flightDate = req.body.flightDate
    let isBackAndForth = req.body.isBackAndForth;
    let onData = {
        onLng:req.session.login.pickUpOnLng,
        onLat:req.session.login.pickUpOnLat
    }
    let offData = {
        offLng:req.session.login.pickUpOffLng,
        offLat:req.session.login.pickUpOffLat
    }

    let order = {
        oid:oid,
        getOn:getOn,
        getOff:getOff,
        onData:onData,
        offData:offData,
        onTime:onTime,
        flightNum:flightNum,
        flightDate:flightDate,
        state:0, //订单状态 0:未接单、1：已接单、2：未出发、3：已出发、4、订单完成
        isOver:false,
        isBackAndForth:isBackAndForth
    }
    req.session.pickUpOrders = orders;
    costUtils.getData(onData, offData, req, res, orders, order, req.session.login.pickUpOrders)
})
/**
 * 把接机上车地点（机场）存放到session中
 */
app.post("/toPickUpStep", urlencodedParser, function(req, res) {
    var onAddress = req.body.onAddress;
    let onLng = req.body.onLng;
    let onLat = req.body.onLat;
    if(req.session.login) {
        req.session.login.pickUpOnAddress = onAddress;
        req.session.login.pickUpOnLng = onLng;
        req.session.login.pickUpOnLat = onLat;
        res.send(true);
    }
})
/**
 * 把接机下车地点存放到session中
 */
app.post("/toPickUpStep-off", urlencodedParser, function(req, res) {
    var offAddress = req.body.offAddress;
    let offLng = req.body.offLng;
    let offLat = req.body.offLat;
    if(req.session.login) {
        req.session.login.pickUpOffAddress = offAddress;
        req.session.login.pickUpOffLng = offLng;
        req.session.login.pickUpOffLat = offLat;
        res.send(true);
    }
})
/*
发送上车数据到step页面
*/
app.get("/pickUpGetOnAddress", function(req, res) {
    if(req.session.login.pickUpOnAddress) {
        res.send(req.session.login.pickUpOnAddress);
    }
})
/*
发送下车数据到step页面
 */
app.get("/pickUpGetOffAddress", function(req, res) {
    if(req.session.login.pickUpOffAddress) {
        res.send(req.session.login.pickUpOffAddress);
    }
})
/*
返回预估价到pickUpstep1.vue
 */
app.post("/pickUpGetPredictCost", urlencodedParser, function(req, res) {
    let oid = req.body.oid
    if(req.session.login.pickUpOrders) {
        for(var i = 0; i < req.session.login.pickUpOrders.length; i++) {
            if(req.session.login.pickUpOrders[i].oid == oid) {
                res.send(req.session.login.pickUpOrders[i].predictCost)
            }
        }

    }
})
/*
获取更多订单相关信息
 */
app.post("/pickUpGetMoreMessages", urlencodedParser, function(req, res) {
    let pNum = req.body.pNum;
    let luggages = req.body.luggages;
    let other = req.body.other;
    let conditions = {
        username:req.session.login.username
    }
    let oid = req.body.oid
    for(var i = 0; i < req.session.login.pickUpOrders.length; i++) {
        console.log("进入循环。。。。")
        if(req.session.login.pickUpOrders[i].oid == oid) {
            req.session.login.pickUpOrders[i].pNum = pNum;
            req.session.login.pickUpOrders[i].luggages = luggages;
            req.session.login.pickUpOrders[i].other = other;
            res.send(req.session.login.pickUpOrders[i]);
        }
    }
})
/*
                        送机
 */
app.post("/dropOffOrder", urlencodedParser, function(req, res) {
    let user = req.session.login
    let onTime = req.body.onTime.trim().substring(11,24);
    console.log("onTime==========" + onTime)
    let getOn = req.body.getOn;
    let getOff = req.body.getOff;
    console.log(req.body)
    let orders = [];
    let oid = randomId.create();
    let flightNum = req.body.flightNum
    let flightDate = req.body.flightDate
    let isBackAndForth = req.body.isBackAndForth;
    let onData = {
        onLng:req.session.login.dropOffOnLng,
        onLat:req.session.login.dropOffOnLat
    }
    let offData = {
        offLng:req.session.login.dropOffOffLng,
        offLat:req.session.login.dropOffOffLat
    }

    let order = {
        oid:oid,
        getOn:getOn,
        getOff:getOff,
        onData:onData,
        offData:offData,
        onTime:onTime,
        flightNum:flightNum,
        flightDate:flightDate,
        state:0, //订单状态 0:未接单、1：已接单、2：未出发、3：已出发、4、订单完成
        isOver:false,
        isBackAndForth:isBackAndForth
    }
    req.session.dropOffOrders = orders;
    costUtils.getData(onData, offData, req, res, orders, order, req.session.login.dropOffOrders)
})
/**
 * 把接机上车地点（机场）存放到session中
 */
app.post("/toDropOffStep", urlencodedParser, function(req, res) {
    var onAddress = req.body.onAddress;
    let onLng = req.body.onLng;
    let onLat = req.body.onLat;
    if(req.session.login) {
        req.session.login.dropOffOnAddress = onAddress;
        req.session.login.dropOffOnLng = onLng;
        req.session.login.dropOffOnLat = onLat;
        res.send(true);
    }
})
/**
 * 把接机下车地点存放到session中
 */
app.post("/toDropOffStep-off", urlencodedParser, function(req, res) {
    var offAddress = req.body.offAddress;
    let offLng = req.body.offLng;
    let offLat = req.body.offLat;
    if(req.session.login) {
        req.session.login.dropOffOffAddress = offAddress;
        req.session.login.dropOffOffLng = offLng;
        req.session.login.dropOffOffLat = offLat;
        res.send(true);
    }
})
/*
发送上车数据到step页面
*/
app.get("/dropOffGetOnAddress", function(req, res) {
    if(req.session.login.dropOffOnAddress) {
        res.send(req.session.login.dropOffOnAddress);
    }
})
/*
发送下车数据到step页面
 */
app.get("/dropOffGetOffAddress", function(req, res) {
    if(req.session.login.dropOffOffAddress) {
        res.send(req.session.login.dropOffOffAddress);
    }
})
/*
返回预估价到dropOffstep1.vue
 */
app.post("/dropOffGetPredictCost", urlencodedParser, function(req, res) {
    let oid = req.body.oid
    if(req.session.login.dropOffOrders) {
        for(var i = 0; i < req.session.login.dropOffOrders.length; i++) {
            if (req.session.login.dropOffOrders[i].oid == oid) {
                res.send(req.session.login.dropOffOrders[i].predictCost)
            }
        }

    }
})
/*
获取更多订单相关信息
 */
app.post("/dropOffGetMoreMessages", urlencodedParser, function(req, res) {
    let pNum = req.body.pNum;
    let luggages = req.body.luggages;
    let other = req.body.other;
    let conditions = {
        username:req.session.login.username
    }
    let oid = req.body.oid
    for(var i = 0; i < req.session.login.dropOffOrders.length; i++) {
        if(req.session.login.dropOffOrders[i].oid == oid) {
            req.session.login.dropOffOrders[i].pNum = pNum;
            req.session.login.dropOffOrders[i].luggages = luggages;
            req.session.login.dropOffOrders[i].other = other;
            res.send(req.session.login.dropOffOrders[i]);
        }
    }
})

/*
***              个人中心
*/
//确认密码
app.post('/editPerInfo',urlencodedParser,function (req, res) {
    let user=req.session.login;
    if(req.body.password == user.password){
        res.cookie('edit',true,{maxAge:120000});
        res.send(true)
    }else {
        res.send(false)
    }
});
/*确认密码*/
app.post('/modify',urlencodedParser,function (req, res) {
    if(req.session.login.password == req.body.password){
        res.send(true);
    }else {
        res.send(false);
    }
});
//上传头像
app.post('/avatarUpload',urlencodedParser,function (req, res) {
    let uid = req.session.login.uid;
    let form = new multiparty.Form({uploadDir: './public/images/'});
    //上传完成后处理
    form.parse(req, function(err, fields, files) {
        if(err){
            console.log('parse error: ' + err);
        } else {
            let inputFile = files.file[0];
            let uploadedPath = inputFile.path;
            let url = uid + '.' + inputFile.originalFilename.split('.')[1];
            let dstPath = './public/avatar/' + url;
            //重命名文件名
            fs.rename(uploadedPath, dstPath, function(err) {
                if(err){
                    console.log('rename error: ' + err);
                } else {
                    console.log('rename ok');
                    let conditions = {uid:uid};
                    let updates = {avatar:url};
                    dbOpe.updateData(conditions,updates).then(data => {
                        req.session.login.avatar = url;
                        res.json({status:true,url:url});
                    }).catch(reason => {
                        res.json({status:false})
                    })
                }
            });
        }
    });
});
//修改用户名
app.post('/editUsername',function (req, res) {
    let username = req.session.login.username;
    let conditions = {username:username};
    let updates = {username:req.body.username};
    dbOpe.findData(updates).then((data) => {
        res.send('用户名已存在')
    }).catch((reason) => {
        dbOpe.updateData(conditions,updates).then((data) => {
            req.session.login.username = req.body.username;
            res.send('用户名修改成功');
        }).catch((reason) => {
            res.send('用户名修改失败');
        })
    })
});
//判断邮箱是否已被注册，是：返回‘邮箱已被注册’；否：发送邮件
app.post('/editEmail',function (req, res) {
    let email = req.body.email;
    let conditions = {email:email};
    dbOpe.findData(conditions).then((data) => {
        res.send('您输入的邮箱已被注册');
    }).catch((reason) => {
        let transporter = {
            service:'163',
            auth:{
                user:'15122867936@163.com',
                pass:'qjy681008'
            }
        };
        let newEmail = encodeURIComponent(email);
        let oldEmail = encodeURIComponent(req.session.login.email);
        let mailOptions = {
            from: '15122867936@163.com', // 发送者
            to: email, // 接受者,可以同时发送多个,以逗号隔开
            subject: '到位打车验证邮件', // 标题
            //text: 'Hello world', // 文本
            html:"<h2>欢迎使用到位打车:</h2><h3><a href=" + "http://localhost:8090/perCenEmail?newemail=" + newEmail + "&oldemail="+ oldEmail +">点击此处完成验证</a></h3>"
        };
        dbOpe.sendEmail(transporter,mailOptions).then((data) => {
            res.send('请验证邮箱');
        })
    })
});
//用户验证邮箱
app.get('/perCenEmail',function (req, res) {
    console.log(req.query.oldemail);
    let conditions = {email:req.query.oldemail};
    let updates = {email:req.query.newemail};
    dbOpe.updateData(conditions,updates).then((data) => {
        res.send('邮箱验证成功，已更换邮箱');
    })
});
//修改密码
app.post('/editPsw',function (req, res) {
    let psw = req.body;
    console.log(psw);
    console.log(req.session.login.password);
    if(psw.oldPassword==req.session.login.password){
        let conditions = {password:psw.oldPassword};
        let updates = {password:psw.newPassword};
        dbOpe.updateData(conditions,updates).then((data) => {
            console.log(111);
            req.session.login.password = psw.newPassword;
            res.send(true);
        })
    }else {
        res.send(false)
    }
});

//
// app.all('*',function (req, res) {
//     console.log('走的all:'+req.path);
//     res.sendFile(__dirname+'/public'+req.path);
// });

/*
连接数据库部分
 */
var dbOpe = {
    selectAll:function(username) {
        let p = new Promise(function(resolve, reject) {
            users.find({username: username}, function (err, data) {
                let userData = data[0];
                resolve(userData);
            })
        })
        return p
    },
    /*
    激活功能实现，根据用户id查找用户，如果存在则修改用的激活状态为true
     */
    activeHandler:function(uid, res) {
        users.find({uid:uid}, function(err, data) {

            if(data[0]) {
                var user = data[0];
                console.log("改过了的： " + user);
                dbOpe.modifyActive(user);
                res.redirect("http://localhost:8000/activeSuccess")
                /*res.send("恭喜你，激活成功，快去登录吧");*/
            }else {

                res.sendFile(__dirname + "/public/activeSuccess.html");
            }

        })
    },
    modifyActive:function(user) {
        users.update({uid:user.uid}, {isActive:true}, function(err) {
            if(err) {
                console.log("修改失败");
            }
        })
    },
    regist:function(user) {
        var monModel = new users(user);
        monModel.save(function(err){
            if(err) {
                console.log("数据插入失败")
            }else {
                console.log("插入成功");
            }
        })
    },
    findByUsername:function(user, req, res) {
        console.log("username: " + user.username)
        users.find({username:user.username},function(err, data){
            if(err) {
                console.log("数据库查询失败")
            }else {
                if(data[0]){
                    console.log("数据已经存在")
                    /*res.header("Access-Control-Allow-Credentials",true);*/
                    res.send("用户名已存在")
                }else {
                    console.log("数据不存在")
                    /*res.cookie("isFilled", user);*/
                    req.session.user = user;
                    res.send("true");
                }
            }
        })

    },
    findByEmailAndPhoneNum:function(user, req, res) {
        users.find({phoneNum:user.phoneNum},function(err, data){
            if(err) {
                console.log("数据库查询失败")
            }else {
                if(data[0]){
                    res.send("该电话已存在！")
                }else {
                    console.log("else");
                    users.find({email:user.email},function(err, data){
                        if(err) {
                            console.log("数据库查询失败")
                        }else {
                            if(data[0]){
                                res.send("该邮箱已存在！")
                            }else {
                                dbOpe.regist(user);
                                dbOpe.sendMail(user, req, res);
                            }
                        }
                    })
                }
            }

        })
    },
    findBYPhoneNum:function (user,req,res) {
    let p = new Promise(function (resolve, reject) {
        users.find({phoneNum: user.username}, function (err, data) {
            let userData = data[0];
            if (userData) {
                if (userData.password == user.password) {  //登录成功
                    if (userData.isActive) {
                        req.session.login.uid = userData.uid//设置cookie，maxAge为过期时长，毫秒为单位，此处设置一分钟
                        res.send("true");
                    } else {
                        res.send('对不起，您还未激活，不能登录');
                    }
                } else {         //登录失败
                    res.send('用户名或密码错误');
                }
            } else {            //登录失败
                res.send('用户名不存在');
            }
            resolve(userData);
        });
    });
    return p;
},
    findBYEmail:function (user,req,res) {
    let p = new Promise(function (resolve, reject) {
        users.find({email: user.username}, function (err, data) {
            let userData = data[0];
            if (userData) {
                if (userData.password == user.password) {  //登录成功
                    if (userData.isActive) {
                       /* res.cookie('islogin', encodeURI(userData.username));*///设置cookie，maxAge为过期时长，毫秒为单位，此处设置一分钟
                        req.session.login.uid = userData.uid;
                        res.send("true");
                    } else {
                        res.send('对不起，您还未激活，不能登录');
                    }
                } else {         //登录失败
                    res.send('用户名或密码错误');
                }
            } else {            //登录失败
                res.send('用户名不存在');
            }
            resolve(userData);
        });
    });
    return p;
},
    findBYUsernameLogin:function (user,req,res) {
    let p = new Promise(function (resolve, reject) {
        users.find({username:user.username},function (err,data){
            let userData = data[0];
            if(userData){
                console.log("password: " + userData.password)
                if(userData.password==user.password){  //登录成功
                    if(userData.isActive){
                        console.log("已激活")
                        req.session.login = {}
                        req.session.login.uid = userData.uid//设置cookie，maxAge为过期时长，毫秒为单位，此处设置一分钟
                        res.send("true");
                    }else {
                        res.send('对不起，您还未激活，不能登录');
                    }
                }else {         //登录失败
                    res.send('用户名或密码错误');
                }
            }else {            //登录失败
                res.send('用户名不存在');
            }
            resolve(userData);
        });
    });
    return p;
},
    sendMail:function(user, req, res) {
        var email = user.email;
        var transporter = nodemailer.createTransport({
            service:'163',
            auth:{
                user:'15122867936@163.com',
                pass:'qjy681008'
            }
        });
        let mailOptions = {
            from: '15122867936@163.com', // 发送者
            to: email, // 接受者,可以同时发送多个,以逗号隔开
            subject: '久久打车激活邮件', // 标题
            //text: 'Hello world', // 文本

            html:"<h2>欢迎使用九九打车:</h2><h3><a href=" + "http://localhost:8090/active?uid=" + user.uid + ">点击此处完成激活</a></h3>"
        };
        transporter.sendMail(mailOptions, function(err, info) {
            if (err) {
                console.log(err);
                return;
            }
            console.log('发送成功');
        });
       /* io.sockets.on("connection", function (socket) {
            socket.emit("registSucc", {"msg":"恭喜你，注册成功,快去邮箱激活吧!!"})
            socket.on("disconnect", function() {
                console.log("已断开连接");
            })
        })*/
        res.send("true");

    },
    findData:function (conditions, req) {
        let p = new Promise(function (resolve, reject) {
            users.find(conditions,function (err,data) {
                if(err){
                    console.log(err);
                }else {
                    if(data[0]){
                        resolve(data[0]);
                    }else {
                        reject(false)
                    }
                }
            })
        });
        return p;
    },
    updateData(conditions, updates) {
        let p = new Promise(function(resolve, reject) {
            users.update(conditions, updates, function(err) {
                if(err) {
                    console.log("修改失败")
                    reject(false)
                }else {
                    resolve(true)
                }
            })
        })
    },
    findArr(conditions, needed){
        let p = new Promise(function(resolve, reject) {
            users.find(conditions, needed, function(err, data){
                if(data) {
                    console.log(data)
                    resolve(data)
                }
            })
        })
        return p;
    },
    pushToUsers(conditions, what) {
        users.update(conditions, {$push:{orders:what}}, function(err) {
            if(err) {
                console.log("订单插入失败")
            }else {
                console.log("订单插入成功")
            }
        })
    },
    findByUid(conditions) {                      //根据用户id获取对象
        let p = new Promise(function(resolve, reject) {
            users.find(conditions, function(err, data) {
                let userData = data[0];
                if(userData) {
                    resolve(userData)
                }else {
                    reject(false);
                }
            })
        })
        return p;
    },
    findByDrivername:function(driver, req, res) {
        drivers.find({driver:driver.username},function(err, data){
            if(err) {
                console.log("数据库查询失败")
            }else {
                if(data[0]){
                    res.send("用户名已存在")
                }else {
                    res.send("true");
                }
            }
        })

    }, //注册时调用
    findByDriver(driver,conditions,  req, res) {
        let p = new Promise(function (resolve, reject) {
            drivers.find(conditions, function (err, data) {
                let driverData = data[0];
                if (driverData) {
                    if (driverData.password == driver.password) {  //登录成功
                        if (driverData.isActive) {
                            req.session.driver = {};
                            req.session.driver.did = driverData.did//设置cookie，maxAge为过期时长，毫秒为单位，此处设置一分钟
                            res.send("true");
                        } else {
                            res.send('对不起，您还未激活，不能登录');
                        }
                    } else {         //登录失败
                        res.send('用户名或密码错误');
                    }
                } else {            //登录失败
                    res.send('用户名不存在');
                }
                resolve(driverData);
            });
        });
        return p;
    },//登录时调用
    findDriver(conditions, req, res) {                 //查找driver方法
        let p = new Promise(function (resolve, reject) {
            drivers.find(conditions, function(err, data) {
                if(data){
                    resolve(data)
                }else {
                    reject(false)
                }
             })
        })
        return p
    },
    pushToDrivers(conditions, what) {
        let p  = new Promise(function(resolve, reject) {
            drivers.update(conditions, {$push:{orders:what}}, function(err) {
                if(err){
                    console.log("司机订单插入失败！！")
                }else {
                    resolve("司机订单插入成功!!")
                }
            })
        })
        return p;
    },
    driverRegist(driver) {
        let monModel = new drivers(driver)
        monModel.save(function(err) {
            if(err) {
                console.log("插入失败")
            }else {
                console.log("司机信息插入成功！！")
            }
        })
    },
    modifyUser(oldData, newData) {
        users.update(oldData, newData, function(err) {
            if(err) {
                console.log("用户信息修改失败")
            }else {
                console.log("用户信息已经修改")
            }
        })
    },
    findDriverArr(conditions, needed) {
        let p = new Promise(function(resolve, reject) {
            drivers.find(conditions, needed, function (err, data) {
                if(err) {
                    reject(false)
                }else {
                    resolve(data)
                }
            })
        })
        return p;
    }
}

let costUtils = {
    getData(onData, offData, req, res, orders, order) {
        let onLng = onData.onLng
        let onLat = onData.onLat
        let offLng = offData.offLng
        let offLat = offData.offLat
        let distanceStr = "";
        let distance = 0;
        let time = 0;
        let result;
        let duration;
        console.log("onlng: " + onLng + "onlat: " + onLat)
        console.log("offlng: " + offLng + "offlat: " + offLat)
        new Promise(function(resolve, reject) {
            requests(
                "http://api.map.baidu.com/routematrix/v2/driving?output=json&origins=" + onLat +
                "," + onLng + "&destinations=" + offLat + "," + offLng + "&ak=M1pZKOGy4myBv0Lh6jKsMZvoIopBYC1i",
                function (error, response, data) {
                    if (!error && response.statusCode == 200) {
                        distanceStr = JSON.parse(data).result[0].distance.text;
                        duration = JSON.parse(data).result[0].duration.text;
                        distance = parseFloat(distanceStr.substring(0, distanceStr.indexOf("公")));
                        console.log("distance: " + distance);
                        resolve({distance:distance,duration:duration})
                    }
                }
            )
        }).then(function(data) {
            result = costUtils.calculate(data.distance)
            if(result) {
                order.predictCost = result;
                order.distance = data.distance;
                order.duration = data.duration;
                orders.push(order);

                req.session.login.orders = orders;

                res.send(order)
            }else {
                res.send("您要去的地方太远了（大于100公里），没有人愿意载你!")
            }
        })
    },
    calculate(distance) {
        var initCost = 10;
        if (distance <= 3) {
            return {
                minCost: initCost - 3,
                maxCost: initCost + 3
            }
        } else if (distance > 3 && distance <= 5) {
            return {
                minCost: initCost + (distance - 3) * 1.5 - 5,
                maxCost: initCost + (distance - 3) * 1.5 + 5
            }
        } else if (distance > 5 && distance <= 10) {
            return {
                minCost: initCost + 2 * 1.5 + (distance - 5) * 2 - 10,
                maxCost: initCost + 2 * 1.5 + (distance - 5) * 2 + 10
            }
        } else if (distance > 10 && distance <= 30) {
            return {
                minCost: initCost + 2 * 1.5 + 5 * 2 + (distance - 10) * 3 - 15,
                maxCost: initCost + 2 * 1.5 + 5 * 2 + (distance - 10) * 3 + 15
            }
        } else if (distance > 30 && distance <= 60) {
            return {
                minCost: initCost + 2 * 1.5 + 5 * 2 + 20 * 3 + (distance - 30) * 5 - 20,
                maxCost: initCost + 2 * 1.5 + 5 * 2 + 20 * 3 + (distance - 30) * 5 + 20
            }
        } else if (distance > 60 && distance <= 100) {
            return {
                minCost: initCost + 2 * 1.5 + 5 * 2 + 20 * 3 + 30 * 5 + (distance - 60) - 30,
                maxCost: initCost + 2 * 1.5 + 5 * 2 + 20 * 3 + 30 * 5 + (distance - 60) + 30
            }
        } else {
            return false
        }
    },
    realCost(distance) {
        var initCost = 10;
        if (distance <= 3) {
            return initCost
        } else if (distance > 3 && distance <= 5) {
            return initCost + (distance - 3) * 1.5
        } else if (distance > 5 && distance <= 10) {
            return initCost + 2 * 1.5 + (distance - 5) * 2
        } else if (distance > 10 && distance <= 30) {
            return initCost + 2 * 1.5 + 5 * 2 + (distance - 10) * 3
        } else if (distance > 30 && distance <= 60) {
            return initCost + 2 * 1.5 + 5 * 2 + 20 * 3 + (distance - 30) * 5
        } else if (distance > 60 && distance <= 100) {
            return initCost + 2 * 1.5 + 5 * 2 + 20 * 3 + 30 * 5 + (distance - 60)
        } else {
            return false
        }
    }
}
let objUtils = {
    cloneObj:function(obj){
        let newObj;
        if(Object.prototype.toString.call(obj) === "[object Object]") {
            newObj = {};
        }else if(Object.prototype.toString.call(obj) === "[object Array]") {
            newObj = [];
        }
        for(var key in obj) {
            newObj[key] = typeof obj[key] === "object" ? cloneObj(obj[key]) : obj[key]
        }
        return newObj;
    }
}

//=====================================================商家模块=================================================
app.post("/driverRegist", urlencodedParser, function(request, response) {
    let driver = request.body;
    driver.isActive = false;
    driver.did = randomId.create();
    dbOpe.findByDrivername(driver, request, response);
    dbOpe.driverRegist(driver)
})
/*
login方法,
 */
app.post('/driverLogin',urlencodedParser,function (req, res){
    let driver = req.body,
        phoneReg =/^1([358][0-9]|4[579]|66|7[0135678]|9[89])[0-9]{8}$/,  //手机号正则
        emailReg = /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/; //邮箱正则
    /*    console.log("user: " + user);*/
    if(phoneReg.test(driver.username)){
        let conditions = {phoneNum:driver.phoneNum}//  手机号登录验证
        dbOpe.findByDriver(driver, conditions, req ,res)
    }else if(emailReg.test(driver.username)){   // 邮箱登录验证
        let conditions = {email:driver.email}//  手机号登录验证
        dbOpe.findByDriver(driver, conditions, req ,res)
    }else {//用户名登录验证
        let conditions = {username:driver.username}
        dbOpe.findByDriver(driver,conditions,  req, res).then(function(data) {
            /*console.log(data)*/;
        })
    }
});
/*
发送司机信息到司机客户端的主页
 */
app.get("/getDriver", function(req, res) {
    if(req.session.driver) {
        dbOpe.findDriver({did:req.session.driver.did}, req, res).then(function(data) {
            if(data[0]){
                res.send(data[0])
            }else {
                res.send(false)
            }
        })
    }
})
/*
与司机客户端的通信
 */
/*io.sockets.on("connection", function(socket) {
    console.log("socketId:    "+ socket.id);
    socket.on("orderTaken", function(data){
        console.log(data);
        dbOpe.findByUid({uid:data.order.uid}).then(function(data) {
            if(data) {
                let user = data;
                for(var i = 0;i < user.orders.length; i++) {
                    if(user.orders[i].oid === data.order.oid && user.orders[i].state == "0") {
                        let orders = []
                        orders.order = data.order;
                        dbOpe.pushToDrivers({did:data.did}, {$push:{orders:orders}}).then(function(data) {
                            console.log("driverTaken:=========")
                            console.log(data)
                            io.to(socket.id).emit("takeSuccess", "接单成功！请于指定时间内赶往上车地点")
                            socket.emit("takeError", "对不起，您的手速太慢，该订单已被别的师傅抢走了，气不气！！")
                        })
                    }
                }
            }
        })
    })
    return socket;
})*/
app.post("/takeOrder", urlencodedParser, function(req, res) {
    let flag = false;
    var order = req.body.order;
    order = JSON.parse(order)
    dbOpe.findByUid({uid:order.uid}).then(function(data) {
        if(data) {
            let user = data;
            for(var i = 0;i < user.orders.length; i++) {
                if(user.orders[i].oid === order.oid) {
                    flag = true;
                    if(user.orders[i].state == 0) {
                        user.orders[i].state = 1;
                        let orders = [];
                        order.state = 1;
                        order.realCost = costUtils.realCost(order.distance);
                        order.phoneNum = user.phoneNum;
                        orders.push(order);
                        let newData = {$set:{orders:user.orders}}
                        dbOpe.modifyUser({uid:order.uid}, newData)
                        let did = order.did;
                        dbOpe.pushToDrivers({did:did}, orders).then(function(data) {
                            return data
                        }).then(function(data) {
                            console.log(data)
                            dbOpe.findDriver({did:order.did}).then(function(data) {
                                console.log("司机信息：=====")
                                console.log(data);
                                /*io.sockets.on("connection", function(socket) {


                                    socket(socket.id).emit()
                                })*/
                                io.on("connection", function(socket) {
                                    console.log("服务器于用户端通信!!")
                                   /* socket.broadcast.emit("takenSuccess", {uid:order.uid,order:order});*/
                                    socket.broadcast.emit("takenSuccess", {uid:order.uid,order:order,
                                        dMessage:{
                                            name:data[0].username,
                                            phoneNum:data[0].phoneNum
                                        }
                                    })
                                })
                                res.send(order)

                            })
                        })


                    }else {
                        res.send("对不起，您的手速太慢，该订单已被别的师傅抢走了，气不气！！")
                    }
                }
            }
            if(!flag) {
                res.send("该订单已被取消")
            }

        }
    }).catch(reason=>{
        console.log(reason)
    })
})
/*
获取订单信息
 */
app.get("/getOrder", function(req, res) {
    let oid = req.query.oid;
    let did = req.session.driver.did;
    dbOpe.findDriverArr({did:did}, {"orders":1, "_id":0}).then(function(data) {
        for(var i = 0; i < data[0].orders.length; i++) {
            if(oid == data[0].orders[i].oid) {
                res.send(data[0].orders[i]);
            }
        }
    }).catch((reason) => {
        console.log(reason)
    })
})
/*
接收司机已到达的事件，将此信息转发给客户端
 */
app.get("/arrival", function(req, res) {
    var oid = req.query.oid;
    dbOpe.findDriver({did:req.session.driver.did}).then(function(data) {
        for(var i = 0; i < data[0].orders.length; i++) {
            if(data[0].orders[i].oid == oid) {
                let order = data[0].orders[i]
                io.on("connection", function(socket) {
                    console.log("服务器与用户端通信!!")
                    socket.broadcast.emit("arrival", {uid:order.uid})
                })
                res.send(true);
            }
        }
    }).catch(reason => {
        console.log(reason)
    })
})
server.listen(8090);