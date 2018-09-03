let http = require("http");
let fs = require("fs");
let express = require("express");
let path = require("path");
let app = express();
const url = require("url");
let qs = require("querystring");
let users = require("./connect")
let addresses = require("./addressesConnect")
let server = http.createServer(app);
let socket = require("socket.io");
let session = require("express-session");
let io = socket.listen(server);
let bodyParser = require('body-parser');
let cookieParser = require("cookie-parser");
let cookieSession = require("cookie-session");
let nodemailer = require("nodemailer");
let randomId = require("./randomId");
let cors = require("cors");
let requests = require("request");
let multiparty = require('multiparty');
let localPath = "";
let drivers = require('./drivers');
let coupons = require('./coupon');


app.use(cookieParser());
app.use(cors({
    origin:['http://localhost:8000','http://localhost:8008'],
    methods:['GET','POST'],
    allowedHeaders:['Content-Type', 'Authorization'],
    withcredentials: true,
}));

app.use("/static/css/static/img",express.static(__dirname + "/dist/static/img"));
app.use(express.static(__dirname + "/dist"));
app.use("/driver",express.static(__dirname + "/driverDist"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

/*app.use(express.static(path.join(__dirname,"/dist")));
app.use("/driver",express.static(path.join(__dirname,"/driverDist")));*/
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
    maxAge: 7*24*60*60*1000 //24hours
}));
// 创建 application/x-www-form-urlencoded 编码解析

let  urlencodedParser = bodyParser.urlencoded({ extended: false });
app.use(urlencodedParser)


let url1 = 'http://fooldman.com:8090';
let url2 = 'http://lh666.club:8090'
let url3 = 'http://192.168.10.139:8090'
let url4 = 'http://192.168.0.136:8090'
let baseUrl = url1


app.get("/regist", function(request, response) {
    response.sendFile(__dirname + "/public/zhuce1.html");
})

/*
返回当前用户登录状态
 */
app.get("/getState", function(req, res) {
    let user = req.session.login;
    if(user) {
        let userId = user.uid;
        if(userId) {
            let conditions = {uid:userId}
            dbOpe.findByUid(conditions).then(function (data) {
                if(data.loginID==user.loginID){
                    res.send(data)
                }else {
                    req.session = null;
                    res.send(false)
                }
            })
        }else {
            res.send(false)
        }
    }else {
        res.send(false)
    }
});
/*
返回前端数据，刷新页面
 */
app.get("/redirect", function(request, response) {
    let lj = request.url;
    let path = lj.substring(parseInt(lj.indexOf("=")) + 1);
    if(request.session.user) {
        if(request.session.user.isActive) {
            request.session.user = null;
            response.send(path);
        }else {
		response.send(false)
	}
    }else {
	    response.send(false)
	}
});
/*
接收页面的用户名
 */
app.post("/post-name", urlencodedParser, function(request, response) {
    let user = {};
    let name = request.body.username;
    user.username = name;
    user.isReady = false;
    user.isActive = false;
    user.uid = randomId.create();
    user.avatar = 'touxiang_03.png';
    user.star='1';
    user.invitationCode = randomId.create();
    dbOpe.findByUsername(user, request, response);
})
/*
接收用户的密码
 */
app.post("/post-password", urlencodedParser, function(request, response) {
    /*let user = request.cookies.isFilled;*/
    let user = request.session.user;
    let password = request.body.password;
    user.password = password;//此处需要把password插入到数据库中//
    response.send("");
    /*response.cookie("isFilled", user);*/
})
/*
接收用户的邮箱、电话
 */
app.post("/post-email", urlencodedParser, function(request, response) {
    let user = request.session.user;
    let phoneNum = request.body.phoneNum
    let email = request.body.email;
    user.email = email;
    user.phoneNum = phoneNum;
    user.star = '5';
    user.loginID = '';
    user.orders=[];
    user.historyOrders=[];
    user.avatar = 'touxiang_03.png';
    user.uid = randomId.create();
    dbOpe.findByEmailAndPhoneNum(user, request, response)
})
/*app.listen(8090, function() {*/
/*    console.log("chenggongjianting")*/
/*});*/

/*
login方法
 */
app.post('/toLogin',urlencodedParser,function (req, res){
    let user = req.body,
        phoneReg =/^1([358][0-9]|4[579]|66|7[0135678]|9[89])[0-9]{8}$/,  //手机号正则
        emailReg = /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/; //邮箱正则
    if(phoneReg.test(user.username)){         //  手机号登录验证
        dbOpe.findBYPhoneNum(user, req, res);
    }else if(emailReg.test(user.username)){   // 邮箱登录验证
        dbOpe.findBYEmail(user, req, res)
    }else {//用户名登录验证
        /*dbOpe.findByUsername(user,req, res);*/
        dbOpe.findBYUsernameLogin(user, req, res).then(function(data) {
        })
    }
});
/*
用户退出
 */
app.get('/signOut',function (req, res) {
    if(req.session.login){
        req.session = null;
        res.send(true);
    }else {
        res.send(false)
    }
});
/*
用户激活方法
 */
app.get("/active", function(request, response) {
    /* let uu = url.parse(request.url).query;
     let uid = uu.substring(parseInt(uu.indexOf("=")) + 1);*/
    let uid = request.query.uid;
    let conditions = {uid:uid};
    dbOpe.activeHandler(uid, response);
    /*     console.log("已收到来自用户的激活信息")
         console.log(uu);*/
});

//点击邮件里的连接会跳转的页面
app.get("/findPwd", urlencodedParser, function(req,res) {
    let conditions={email:req.query.email};
    let updates = {$set:{isReady:true}};
    users.update(conditions,updates,function (err) {
        if(err){
            res.send('验证失败,请重新尝试');
        }else {
		
	}
    });
    users.find(conditions,function (err,data) {
        if(data[0].isReady){
            res.redirect(baseUrl+'/resetSuccess');
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
            let con = "<h2>久久打车邮箱验证,如非本人，请勿操作:</h2><h3><a href="+baseUrl+"/findPwd?email="+email+">http://blog.csdn.net/zzwwjjdj1/article/details/51878392</a></h3>";
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
            req.session.email = email;
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
		if(data) {
			 let addressData = data;
            		resolve(addressData);
		}else {
			reject(false)
		}
            
        })
    }).then(function(data) {
        res.send(data);
    }).catch(reason => {
		console.log(reason)
		res.send(false)
	})
})
/*
查询开放地址
 */
app.get("/findOpenAddress", function(req, res) {
    let p = new Promise(function(resolve, reject) {
        addresses.find({}, {"openAddress":1,"_id":0}, function(err, data) {
		if(data[0]) {
			let addressData = data[0];
            		resolve(addressData);
		}else {
			reject(false)
		}
           
        })
    }).then(function(data) {
        res.send(data);
    }).catch(reason => {
		console.log(reason)
		res.send(false)
	})
})

/**
 * 把上车地点存放到session中
 */
app.post("/toStep", urlencodedParser, function(req, res) {
    let onAddress = req.body.onAddress;
    if (req.session.login) {
        req.session.login.onAddress = onAddress;
        req.session.login.onLng = req.body.onLng;
        req.session.login.onLat = req.body.onLat;
        res.send(true);
    }else {
		res.send(false)
	}
})
/**
 * 把上车地点存放到session中
 */
app.post("/toStep-off", urlencodedParser, function(req, res) {
    let offAddress = req.body.offAddress;
    let offLng = req.body.offLng;
    let offLat = req.body.offLat;
    if(req.session.login) {
        req.session.login.offAddress = offAddress;
        req.session.login.offLng = offLng;
        req.session.login.offLat = offLat;
        res.send("true");
    }else {
		res.send(false)
	}
})
/*
发送上车数据到step页面
 */
/*app.get("/getOnAddress", function(req, res) {
    if(req.session.login.onAddress) {
        res.send(req.session.login.onAddress);
    }else {
		res.send(false)
	}
})
/!*
发送下车数据到step页面
 *!/
app.get("/getOffAddress", function(req, res) {
    if(req.session.login.offAddress) {
        res.send(req.session.login.offAddress);
    }else {
		res.send(false)
	}
});*/
/*
返回历史订单到自定义页面
*/
app.get("/custom", function(req, res) {
    if(req.session.login) {
        let p = new Promise(function(resolve, reject) {
            users.find({uid:req.session.login.uid},{"historyOrders":1,"commonAddress":1,"_id":0},function(err, data) {
		if(data[0]) {
			resolve(data[0])
		}else {
			reject(false)
		}
                
            }).limit(3)
        }).then(function(data) {
            res.send(data);
        }).catch(reason => {
		console.log(reason)
		res.send(false)
	})
    }else {
		res.send(false)
	}

});
/*
添加常用地址
 */
app.post("/addCommon", urlencodedParser, function(req, res) {
    let commonAddress = req.body;
    let conditions = {uid:req.session.login.uid};
    dbOpe.findData(conditions).then(function(data) {
        let userData = data;
        let commonAddressArr = userData.commonAddress;
        commonAddressArr.push(commonAddress)
        return commonAddressArr
    }).then(function(data) {
        let updates = {commonAddress: data}
        let conditions = {uid:req.session.login.uid};
        dbOpe.updateData(conditions, updates);
        res.send("true");
    }).catch(reason => {
		console.log(reason)
		res.send(false)
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
    }else {
		res.send(false)
	}
});
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
    }else {
		res.send(false)
	}
})
/*
返回用户填写的上车地址
 */
/*
生成订单
 */
app.post("/order", urlencodedParser, function(req, res) {
    let userId = req.session.login.uid;
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
返回预估价到step1.vue
 */
app.post("/getPredictCost", urlencodedParser, function(req, res) {
    let oid = req.body.oid
    if(req.session.login.orders) {
        for(let i = 0; i < req.session.login.orders.length; i++) {
            if(req.session.login.orders[i].oid == oid) {
                res.send(req.session.login.orders[i].predictCost)
            }
        }
    }else {
		res.send(false)
	}
})
/*
获取更多订单相关信息
 */
/*app.post("/getMoreMessages", urlencodedParser, function(req, res) {
    let pNum = req.body.pNum;
    let luggages = req.body.luggages;
    let other = req.body.other;
    let conditions = {
        username:req.session.login.username
    }
    let oid = req.body.oid
    console.log("请求到了。。。。")
    console.log("oid.........." + oid)
    for(let i = 0; i < req.session.login.orders.length; i++) {
        console.log("进入循环。。。。")
        if(req.session.login.orders[i].oid == oid) {
            console.log("相等了。。。。")
            req.session.login.orders[i].pNum = pNum;
            req.session.login.orders[i].luggages = luggages;
            req.session.login.orders[i].other = other;
            res.send(req.session.login.orders[i]);
        }
    }
    /!* dbOpe.pushToUsers(conditions, req.session.login.orders)*!/

})*/
/*
将订单信息发送到确认订单页面
 */
app.post("/toEnsureOrders",urlencodedParser, function(req, res) {
    let oid = req.body.oid
    let origin = req.body.origin;
    if(req.session.login.orders) {

        for(let i = 0; i < req.session.login.orders.length; i++) {
            if(req.session.login.orders[i].oid == oid) {
                res.send(req.session.login.orders[i])
            }
        }
    }else {
		res.send(false)
	}

    /*if(origin === "pickUp") {
        if(req.session.login.pickUpOrders) {
            for(let i = 0; i < req.session.login.pickUpOrders.length; i++) {
                if(req.session.login.pickUpOrders[i].oid == oid) {
                    res.send(req.session.login.pickUpOrders[i])
                }
            }
        }
    }
    if(origin === "dropOff") {
        if(req.session.login.dropOffOrders) {
            for(let i = 0; i < req.session.login.dropOffOrders.length; i++) {
                if(req.session.login.dropOffOrders[i].oid == oid) {
                    res.send(req.session.login.dropOffOrders[i])
                }
            }
        }
    }*/

})
/*
将订单信息添加到数据库
 */
app.post("/ensureOrders", urlencodedParser, function(req, res) {
    let oid = req.body.oid;
    let isSend = true;
    let payWay = req.body.payWay;
    if(req.session.login.orders[0].oid == oid) {
        req.session.login.orders[0].payWay = payWay;
        let order = req.session.login.orders[0]

        dbOpe.findByUid({uid:req.session.login.uid}, req, res).then(function(data) {
            let p = new Promise(function(resolve, reject) {
                if(data) {
                    resolve(data)
                }else {
			reject(false)
		}
            })
            return p;
        }).then(function(data){
            /*io.on("connection", function(socket){
                if(isSend) {
                    socket.broadcast.emit("orderMessage", {order:order,user:data,taking:true});
                    isSend = false;
                }
            })*/
            let conditions = {uid: req.session.login.uid};
            dbOpe.pushToUsers(conditions, req.session.login.orders)
            res.send(true)
        }).catch(reason => {
		console.log(reason)
		res.send(false)
	})
    }
})


/*
发送订单信息到noStatedOrder.vue
 */
app.get("/toNoStartedOrder", function(req, res) {
    let oid = req.query.oid;
    let origin = req.query.origin

    if(req.session.login.orders) {
        for(let i = 0; i < req.session.login.orders.length; i++) {
            if(req.session.login.orders[i].oid == oid) {
                res.send(req.session.login.orders[i])
            }
        }
    }else {
		res.send(false)
	}

    /*if(origin === "pickUp") {
        if(req.session.login.pickUpOrders) {
            for(let i = 0; i < req.session.login.pickUpOrders.length; i++) {
                if(req.session.login.pickUpOrders[i].oid == oid) {
                    res.send(req.session.login.pickUpOrders[i])
                }
            }
        }
    }
    if(origin === "dropOff") {
        if(req.session.login.dropOffOrders) {
            for(let i = 0; i < req.session.login.dropOffOrders.length; i++) {
                if(req.session.login.dropOffOrders[i].oid == oid) {
                    res.send(req.session.login.dropOffOrders[i])
                }
            }
        }
    }*/
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
    for(let i = 0; i < req.session.login.orders.length; i++) {
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
                   接机
 */
/*
将
 */
/*
将订单信息保存到session中
 */
app.post("/pickUpOrder", urlencodedParser, function(req, res) {
    let uid = req.session.login.uid
    let onTime = req.body.onTime.trim().substring(11,24);
    let getOn = req.body.getOn;
    let getOff = req.body.getOff;
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
    costUtils.getData(onData, offData, req, res, orders, order)
})
/**
 * 把接机上车地点（机场）存放到session中
 */
app.post("/toPickUpStep", urlencodedParser, function(req, res) {
    let onAddress = req.body.onAddress;
    let onLng = req.body.onLng;
    let onLat = req.body.onLat;

    if(req.session.login) {
        req.session.login.pickUpOnAddress = onAddress;
        req.session.login.pickUpOnLng = onLng;
        req.session.login.pickUpOnLat = onLat;
        res.send(true);
    }else {
		res.send(false)
	}
})
/**
 * 把接机下车地点存放到session中
 */
app.post("/toPickUpStep-off", urlencodedParser, function(req, res) {
    let offAddress = req.body.offAddress;
    let offLng = req.body.offLng;
    let offLat = req.body.offLat;
    if(req.session.login) {
        req.session.login.pickUpOffAddress = offAddress;
        req.session.login.pickUpOffLng = offLng;
        req.session.login.pickUpOffLat = offLat;
        res.send(true);
    }else {
		res.send(false)
	}
})
/*
发送上车数据到step页面
*/
app.get("/pickUpGetOnAddress", function(req, res) {
    if(req.session.login.pickUpOnAddress) {
        res.send(req.session.login.pickUpOnAddress);
    }else {
		res.send(false)
	}
})
/*
发送下车数据到step页面
 */
app.get("/pickUpGetOffAddress", function(req, res) {
    if(req.session.login.pickUpOffAddress) {
        res.send(req.session.login.pickUpOffAddress);
    }else {
		res.send(false)
	}
})
/*
返回预估价到pickUpstep1.vue
 */
app.post("/pickUpGetPredictCost", urlencodedParser, function(req, res) {
    let oid = req.body.oid
    if(req.session.login.pickUpOrders) {
        for(let i = 0; i < req.session.login.pickUpOrders.length; i++) {
            if(req.session.login.pickUpOrders[i].oid == oid) {
                res.send(req.session.login.pickUpOrders[i].predictCost)
            }
        }
    }else {
		res.send(false)
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
        uid:req.session.login.uid
    }
    let oid = req.body.oid
    for(let i = 0; i < req.session.login.pickUpOrders.length; i++) {
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
    let getOn = req.body.getOn;
    let getOff = req.body.getOff;
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
    costUtils.getData(onData, offData, req, res, orders, order)
})
/**
 * 把接机上车地点（机场）存放到session中
 */
app.post("/toDropOffStep", urlencodedParser, function(req, res) {
    let onAddress = req.body.onAddress;
    let onLng = req.body.onLng;
    let onLat = req.body.onLat;
    if(req.session.login) {
        req.session.login.dropOffOnAddress = onAddress;
        req.session.login.dropOffOnLng = onLng;
        req.session.login.dropOffOnLat = onLat;
        res.send(true);
    }else {
		res.send(false)
	}
})
/**
 * 把接机下车地点存放到session中
 */
app.post("/toDropOffStep-off", urlencodedParser, function(req, res) {
    let offAddress = req.body.offAddress;
    let offLng = req.body.offLng;
    let offLat = req.body.offLat;
    if(req.session.login) {
        req.session.login.dropOffOffAddress = offAddress;
        req.session.login.dropOffOffLng = offLng;
        req.session.login.dropOffOffLat = offLat;
        res.send(true);
    }else {
		res.send(false)
	}
})
/*
发送上车数据到step页面
*/
app.get("/dropOffGetOnAddress", function(req, res) {
    if(req.session.login.dropOffOnAddress) {
        res.send(req.session.login.dropOffOnAddress);
    }else {
		res.send(false)
	}
})
/*
发送下车数据到step页面
 */
app.get("/dropOffGetOffAddress", function(req, res) {
    if(req.session.login.dropOffOffAddress) {
        res.send(req.session.login.dropOffOffAddress);
    }else {
		res.send(false)
	}
})
/*
返回预估价到dropOffstep1.vue
 */
app.post("/dropOffGetPredictCost", urlencodedParser, function(req, res) {
    let oid = req.body.oid
    if(req.session.login.dropOffOrders) {
        for(let i = 0; i < req.session.login.dropOffOrders.length; i++) {
            if (req.session.login.dropOffOrders[i].oid == oid) {
                res.send(req.session.login.dropOffOrders[i].predictCost)
            }
        }
    }else {
		res.send(false)
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
        uid:req.session.login.uid
    }
    let oid = req.body.oid
    for(let i = 0; i < req.session.login.dropOffOrders.length; i++) {
        if(req.session.login.dropOffOrders[i].oid == oid) {
            req.session.login.dropOffOrders[i].pNum = pNum;
            req.session.login.dropOffOrders[i].luggages = luggages;
            req.session.login.dropOffOrders[i].other = other;
            res.send(req.session.login.dropOffOrders[i]);
        }
    }
})
/*
用户取消订单
 */
app.get("/cancelOrder", function(req, res) {
    let oid = req.query.oid;
    let driverName = req.query.driverName
    dbOpe.findByUid({uid:req.session.login.uid}).then(function(data) {
        let result;
        for(let i = 0; i < data.orders.length; i++) {
            if(oid ==  data.orders[i].oid) {
                if (data.orders[i].state == 0) {
                    let order = {}
                    order.oid=data.orders[i].oid
                    order.onAddress=data.orders[i].getOn
                    order.offAddress=data.orders[i].getOff
                    order.onTime=data.orders[i].onTime
                    order.distance=data.orders[i].distance
                    order.status=false
                    preserveToHistory(data, order)
                    data.orders.splice(i, 1);
                    result = data;
                } else if (data.orders[i].state == 1){
                    let order = {
                        oid: data.orders[i].oid,
                        onAddress: data.orders[i].getOn,
                        offAddress: data.orders[i].getOff,
                        onTime: data.orders[i].onTime,
                        realCost:data.orders[i].realCost.toFixed(2),
                        driverName:data.orders[i].driverName,
                        driverPhoneNum:data.orders[i].driverPhoneNum,
                        distance:data.orders[i].distance,
                        driverAvatar:"touxiang_03.png",
                        status: false
                    }
                    preserveToHistory(data, order);
                    data.orders.splice(i, 1)
                    dbOpe.modifyUser({uid:req.session.login.uid}, {$set:{orders:data.orders}})
                    dbOpe.findDriver({username:driverName}).then(function(driverData){
                        for(var i = 0;i < driverData[0].orders.length; i++) {
                            if(driverData[0].orders[i].oid == oid) {
                                driverData[0].orders.splice(i, 1)
                            }
                        }
                        return driverData[0].orders
                    }).then(function(driverData) {
                        dbOpe.updateDriver({username:driverName}, {$set:{orders:driverData}}).catch(reason => {
				console.log(reason)
				res.send(false)
			})
                    }).catch(reason => {
				console.log(reason)
				res.send(false)
			})
                    result = data
                }else {
                    result = false
                }
            }
        }

        return result
    }).then(function(data) {
        if(data) {
            dbOpe.modifyUser({uid:req.session.login.uid}, {$set:{orders:data.orders}});
            return data
        }else {
            return "对不起，司机已经到达，不能取消"
        }
    }).then(function(data) {
        res.send(true)
    }).catch(reason => {
        console.log(reason)
	res.send(false)
    })
    function preserveToHistory(data, order) {
        dbOpe.addToUsers({uid: req.session.login.uid}, order)
    }
})
/*
用户订单完成，将用户的订单状态设为3“已完成”
 *
 */
app.post("/complete", urlencodedParser, function(req, res) {
    let oid = req.body.oid;
    let driverName = req.body.driverName;
    let commentScore = req.body.commentScore;
    let realCost = req.body.realCost
    let discount = req.body.discount;
    dbOpe.findByUid({uid:req.session.login.uid}).then(function(data) {
        return data
    }).then(function(data) {
        let rOrder = {};
        for (var i = 0; i < data.orders.length; i++) {
            if (oid == data.orders[i].oid) {
                data.orders[i].commentScore = commentScore;
                data.orders[i].realCost = data.orders[i].realCost.toFixed(2)
                let order = {
                    oid: data.orders[i].oid,
                    onAddress: data.orders[i].getOn,
                    offAddress: data.orders[i].getOff,
                    onTime: data.orders[i].onTime,
                    carCode: data.orders[i].carCode,
                    realCost: data.orders[i].realCost.toFixed(2),
                    driverName: data.orders[i].driverName,
                    commentScore: data.orders[i].commentScore,
                    driverPhoneNum: data.orders[i].driverPhoneNum,
                    distance: data.orders[i].distance,
                    driverAvatar: "touxiang_03.png",
                    discount: discount,
                    status: true
                }
                dbOpe.addToUsers({uid: req.session.login.uid}, order).catch(reason => {
                    console.log(reason)
                    res.send("添加历史订单失败")
                })
                rOrder = data.orders.splice(i, 1)
                let newData = {$set: {orders: data.orders}}
                dbOpe.modifyUser({uid: req.session.login.uid}, newData).catch(function (reason) {
                    console.log(reason)
                    res.send("删除失败")
                })
                console.log("rOrders....................")
                console.log(rOrder)
                dbOpe.updateDriver({username:driverName}, {$push:{historyOrders:rOrder}}).then(function(data) {
                    console.log(data)
                    res.send(true)
                }).catch(function (reason) {
                    console.log(reason)
                    res.send("插入司机历史行程失败")
                })
            }
        }

    })/*.then(function(data) {
        if(data) {
            let newData = {$push:{historyOrders:data}}
                dbOpe.updateDriver({username:driverName}, newData)
        }else {
            res.send("该订单已被删除")
        }
    })*/.catch(reason => {
        console.log(reason)
	    res.send(false)
    })
    /*dbOpe.findByUid({uid:req.session.login.uid}).then(function(data) {
        return data
    }).then(function(data) {
        for(var i = 0; i < data.orders.length; i++) {
            if(oid == data.orders[i].oid) {
                data.orders.splice(i, 1)
            }
        }
        let newData = {$set:{orders:data.orders}}
        dbOpe.modifyUser({uid:req.session.login.uid}, newData).then(function(data) {
		res.send(true)
	}).catch(reason => {
		console.log(reason)
		res.send(false)
	})
    }).catch(reason => {
        console.log(reason)
	res.send(false)
    })*/
 
})

/*/!*
将取消信息发送到司机端
 *!/
app.post("/sendCancel", urlencodedParser, function(req, res) {
    let cancelIsSend = true;
    let user = {
        driverName: req.body.driverName,
        username: req.body.username,
        getOn: req.body.getOn,
        getOff: req.body.getOff,
        onTime: req.body.onTime
    }
})*/
/*
***              个人中心
*/
//确认密码
app.post('/editPerInfo',urlencodedParser,function (req, res) {
    let uid=req.session.login.uid;
    let conditions = {uid:uid};
    dbOpe.findByUid(conditions).then(data=>{
        if(req.body.password == data.password){
            /*res.cookie('edit',true,{maxAge:120000});*/
            res.send(true)
        }else {
            res.send(false)
        }
    }).catch(reason=>{res.send(false)})
});
/*确认密码*/
app.post('/modify',urlencodedParser,function (req, res) {
    let uid=req.session.login.uid;
    let conditions = {uid:uid}
    dbOpe.findByUid(conditions).then(data=>{
        if(req.body.password == data.password){
            res.send(true)
        }else {
            res.send(false)
        }
    }).catch(reason=>{res.send(false)})
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
            let picName = randomId.create();
            let inputFile = files.file[0];
            let uploadedPath = inputFile.path;
            let url = picName + '.' + inputFile.originalFilename.split('.')[1];
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
    let uid=req.session.login.uid;
    let conditions = {uid:uid};
    let updates = {username:req.body.username};
    dbOpe.findData(updates).then((data) => {
        res.send('用户名已存在')
    }).catch((reason) => {
        dbOpe.updateData(conditions,updates).then((data) => {
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
            html:"<h2>欢迎使用到位打车:</h2><h3><a href=" + baseUrl+"/perCenEmail?newemail=" + newEmail + "&oldemail="+ oldEmail +">点击此处完成验证</a></h3>"
        };
        dbOpe.sendEmail(transporter,mailOptions).then((data) => {
            res.send('请验证邮箱');
        })
    })
});
//用户验证邮箱
app.get('/perCenEmail',function (req, res) {
    let conditions = {email:req.query.oldemail};
    let updates = {email:req.query.newemail};
    dbOpe.updateData(conditions,updates).then((data) => {
        res.send('邮箱验证成功，已更换邮箱');
    }).catch(reason => {
		console.log(reason)
		res.send(false);
	}) 
});
//修改密码
app.post('/editPsw',function (req, res) {
    let psw = req.body;
    let uid = req.session.login.uid;
    dbOpe.findByUid({uid:uid}).then(data=>{
        if(psw.oldPassword==data.password){
            let conditions = {password:psw.oldPassword};
            let updates = {password:psw.newPassword};
            dbOpe.updateData(conditions,updates).then((data) => {
                res.send(true);
            }).catch(reason=>{res.send(false)})
        }else {
            res.send(false)
        }
    }).catch(reason => {
		console.log(reason)
		res.send(false)
	})
});

/*
* 历史行程
* */
/*
* 查看历史订单详情详情
* */

app.get('/getCoupon',function (req, res) {
    let conditions = {uid:req.session.login.uid}
    dbOpe.findCoupon({_id:req.query._id}).then(data=>{
        dbOpe.findData(conditions).then(userData => {
            for(let i=0;i<userData.coupon.length;i++){
                if(userData.coupon[i]._id==req.query._id){
                    res.json({status:false,msg:'您已经领取该优惠券'})
                    return false;
                }
            }
            let nowDate = new Date();
            let toDate = new Date(nowDate)
            toDate.setDate(nowDate.getDate()+data.effectiveTime);
            let resData =new Object();
            resData._id = data._id;
            resData.type = data.type;
            resData.title = data.title;
            resData.dec = data.dec;
            resData.discount = data.discount;
            resData.toDate = toDate.getFullYear()+'-'+(toDate.getMonth()+1)+'-'+toDate.getDate();
            let updates = {$push:{coupon:resData}};
            dbOpe.updateData(conditions,updates).then(result=>{
                res.json({status:true});
            }).catch(reason => {
			console.log(reason)
			res.json({status:false,msg:'优惠码添加失败'})
		})
        }).catch(reason => {
		console.log(reason)
		res.json({status:false,msg:'先登录才能领取哦!'})
	})
    }).catch(reason => {
        res.json({status:false,msg:'该优惠码不存在'});
    })
});

//删除订单
app.get('/removeExitOrder',function (req, res) {
    let uid = req.session.login.uid;

    let index = req.query.ind;
    dbOpe.findData({uid:uid}).then(data=>{
        let orders = data.orders;
        if(req.query.ind>=0){
            orders.splice(index,1);
        }else {
            orders = [];
        }
        dbOpe.updateData({uid:uid},{$set:{orders:orders}}).then(result=>{
            res.send(orders);
        }).catch(reason => {
		console.log(reason)
		res.send(false)
	})
    }).catch(reason => {
		console.log(reason)
		res.send(false)
	})
});
//删除历史订单
app.get('/removeHisOrder',function (req, res) {
    let uid = req.session.login.uid;
    console.log(req.query.ind);
    let index = req.query.ind;
    dbOpe.findData({uid:uid}).then(data=>{
        let hisOrders = data.historyOrders;
        if(req.query.ind>=0){
            hisOrders.splice(index,1);
        }else {
            hisOrders = [];
        }
        dbOpe.updateData({uid:uid},{$set:{historyOrders:hisOrders}}).then(result=>{
            res.send(hisOrders);
        }).catch(reason => {
		console.log(reason)
		res.send(false)
	})
    }).catch(reason => {
		console.log(reason)
		res.send(false)
	})
});
//批量删除
app.post('/removeHisOrders',function (req, res) {
    let oids = req.body;
    let uid = req.session.login.uid;

    dbOpe.findData({uid:uid}).then(userData=>{
        let hisOrders = userData.historyOrders;
        for(let i=hisOrders.length-1;i>=0;i--){
            for(let j=0;j<oids.length;j++){
                if(hisOrders[i].oid==oids[j]){
                    hisOrders.splice(i,1)
                    break;
                }
            }
        }
        dbOpe.updateData({uid:uid},{historyOrders:hisOrders}).then(data=>{
            res.send(hisOrders);
        }).catch(reason => {
		console.log(reason)
		res.send(false)
	})
    }).catch(reason=>{
            console.log(reason);
		res.send(false);
        }
    )
})
//使用优惠券
app.post('/useCoupon',urlencodedParser, (req,res)=>{
    let conditions = {uid:req.session.login.uid};
    let index = req.body.index;
    let cost = req.body.realCost;

    if(index){
        dbOpe.findData(conditions).then(userData => {
            let coupon = userData.coupon;
            let type = coupon[index-1].type;
            let discount = coupon[index-1].discount;
            coupon.splice(index-1,1);
            dbOpe.updateData(conditions,{$set:{coupon:coupon}}).then(upData=>{
                let realCost = 0;
                if(type==1){
                    realCost = cost * discount;
                }else {
                    realCost = cost - discount;
                }
                res.send({status:true,realCost:realCost});
            }).catch(reason=>{
                res.send({status:false})
            })
        }).catch(reason => {
            res.send({status:false});
        })
    }else {
        res.send({status:false})
    }
});

//添加遗失物品
app.post('/addLost',(req,res)=>{
    let para = req.body;
    let uid = req.session.login.uid;
    let conditions = {uid:uid};
    let needed = {'historyOrders':1,_id:0};
    dbOpe.findArr(conditions,needed).then(data=>{
        let hisOrders = data[0].historyOrders

        for(let i=0;i<hisOrders.length;i++){
            if(hisOrders[i].oid == para.oid){
                hisOrders[i].lost={};
                hisOrders[i].lost.content = para.content;
                hisOrders[i].lost.username = para.username;
                break;
            }
        }
        dbOpe.updateData(conditions,{historyOrders:hisOrders}).then(data => {
            res.send(true)
        }).catch(reason => {
            res.send(false)
        })
    }).catch(reason => {
        res.send(false)
    })
});

/*
app.all('*',function (req, res) {
    console.log('走的all:'+req.path);
    res.sendFile(__dirname+'/public'+req.path);
});
*/


/*
        连接数据库部分
 */
let dbOpe = {
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
                let user = data[0];
                dbOpe.modifyActive(user);
                res.send("恭喜你，激活成功，快去登录吧");
            }else {
                res.send('激活失败');
            }
        })
    },
    modifyActive:function(user) {
        users.update({uid:user.uid}, {isActive:true}, function(err) {
            if(err) {
                console.log("修改失败");
            }else {
			
		}
        })
    },
    regist:function(user) {
        let monModel = new users(user);
        monModel.save(function(err){
            if(err) {
                console.log("数据插入失败")
            }else {
                console.log("插入成功");
            }
        })
    },
    findByUsername:function(user, req, res) {
        //console.log("username: " + user.username)
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
                            req.session.login = {}
                            req.session.login.uid = userData.uid//设置cookie，maxAge为过期时长，毫秒为单位，此处设置一分钟
                            let loginID = randomId.create();
                            req.session.login.loginID = loginID;
                            dbOpe.updateData({phoneNum: user.username},{loginID:loginID});
                            /* res.cookie("isLogin", true);*/
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
                            req.session.login = {}
                            req.session.login.uid = userData.uid
                            let loginID = randomId.create();
                            req.session.login.loginID = loginID;
                            dbOpe.updateData({email: user.username},{loginID:loginID});
                           /* res.cookie("isLogin", true);*/
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

                    if(userData.password==user.password){  //登录成功

                        if(userData.isActive){
                            req.session.login = {}
                            req.session.login.uid = userData.uid//设置cookie，maxAge为过期时长，毫秒为单位，此处设置一分钟
                            let loginID = randomId.create();
                            req.session.login.loginID = loginID;
                            dbOpe.updateData({username: user.username},{loginID:loginID});
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
        let email = user.email;
        let transporter = nodemailer.createTransport({
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

            html:"<h2>欢迎使用九九打车:</h2><h3><a href=" +baseUrl+ "/active?uid=" + user.uid + ">点击此处完成激活</a></h3>"
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
    findData:function (conditions) {
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
                    console.log("修改失败");
                    reject(false)
                }else {
                    resolve(true)
                }
            })
        });
        return p;
    },
    findArr(conditions, needed){
        let p = new Promise(function(resolve, reject) {
            users.find(conditions, needed, function(err, data){
                if(data) {
                    console.log(data)
                    resolve(data)
                }else {
			reject(false)
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
    addToUsers(conditions, what) {
      let p = new Promise(function(resolve, reject) {
          users.update(conditions, {$push:{historyOrders:what}}, function(err) {
              if(err) {
                  console.log("订单插入失败")
		            reject(false)
              }else {
                  console.log("订单插入成功")
              }
          })

      })
    return p
    },
    findByUid(conditions) {                      //根据用户id获取对象
        let p = new Promise(function(resolve, reject) {
            users.find(conditions, function(err, data) {
                let userData = data[0];
                if(userData) {
                    resolve(userData)
                }else {
                    console.log("false")
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
                    console.log("数据已经存在")
                    res.send("用户名已存在")
                }else {
                    console.log("数据不存在")
                    res.send("true");
                }
            }
        })
    }, //注册时调用
    validateDriver(conditions) {
        let p = new Promise(function(resolve, reject) {
            drivers.find(conditions, function(err, data) {
                if(data[0]) {
                    reject(false)
                }else {
                    resolve(data[0])

                }
            })
        })
        return p;
    },
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
        let p = new Promise(function(resolve, reject) {
            drivers.update(conditions, {$push:{orders:what}}, function(err) {
                if(err){
                    reject(false)
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
                //console.log("司机信息插入成功！！")
            }
        })
    },
    modifyUser(oldData, newData) {
	let p = new Promise(function(resolve, reject) {
		users.update(oldData, newData, function(err) {
            		if(err) {
				reject(false);
                		console.log("用户信息修改失败")
				
            		}else {
                		//console.log("用户信息已经修改")
            		}
        	})
	})
        return p;
    },
    sendEmail(transport,mailOptions){
        let p = new Promise((resolve, reject) => {
            let transporter = nodemailer.createTransport(transport);
            transporter.sendMail(mailOptions, function(err, info) {
                if (err) {
                    console.log(err);
                    reject(false)
                }else {
                    console.log('发送成功');
                    resolve(info);
                }
            });
        });
        return p;
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
    },
    updateDriver(conditions, updates) {
        let p = new Promise(function(resolve, reject) {
            drivers.update(conditions, updates, function(err) {
                if(err) {
                    reject(false)
                }else {
                    resolve("修改司机订单信息成功")
                }
            })
        })
        return p;
    },
    findCoupon(conditions) {
        return new Promise((resolve, reject) => {
            coupons.find(conditions,function (err,data) {
                if(err){
                    reject(false)
                }else {
                    if(data[0]){
                        resolve(data[0])
                    }else {
                        reject(false)
                    }
                }
            })
        })
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
        new Promise(function(resolve, reject) {
            requests(
                "http://api.map.baidu.com/routematrix/v2/driving?output=json&origins=" + onLat +
                "," + onLng + "&destinations=" + offLat + "," + offLng + "&ak=M1pZKOGy4myBv0Lh6jKsMZvoIopBYC1i",
                function (error, response, data) {
                    if (!error && response.statusCode == 200) {
			if(data.status != 2) {
				distanceStr = JSON.parse(data).result[0].distance.text;
                        	duration = JSON.parse(data).result[0].duration.text;
                        	distance = parseFloat(distanceStr.substring(0, distanceStr.indexOf("公")));
                        	resolve({distance:distance,duration:duration})
			}else {
				reject(false)
			}
                        
                    }else {
				reject(false)
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
        }).catch(reason => {
		console.log(reason)
		res.send(false)
	})
    },
    calculate(distance) {
        let initCost = 10;
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
        let initCost = 10;
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
        for(let key in obj) {
            newObj[key] = typeof obj[key] === "object" ? cloneObj(obj[key]) : obj[key]
        }
        return newObj;
    }
}

//=====================================================商家模块=================================================
app.post("/driver/driverRegist", function(request, response) {
    let driver = request.body;
/*console.log("driverRegist........")
console.log(driver)*/
    driver.isActive = true;
    driver.did = randomId.create();
    dbOpe.validateDriver({username:driver.username}).then(function(data) {
        console.log("用户名不存在")
        return data;
    }).catch(reason => {
        response.send("用户名已存在")
        return new Promise(()=>{})
    }).then(function(data) {
        dbOpe.validateDriver({email:driver.email}).then(function(data) {
            console.log("邮箱不存在")
            return data;
        }) .catch(reason => {
            response.send("该邮箱已存在，请重新填写")
            return new Promise(()=>{})
        }).then(function(data) {
            dbOpe.validateDriver({phoneNum:driver.phoneNum}).then(function(data) {
                console.log("电话号码不存在")
                return data;
            }).catch(reason => {
                response.send("该电话号码已存在")
                return new Promise(()=>{})
            }).then(function(data) {
                dbOpe.validateDriver({carCode:driver.carCode}).then(function(data) {
                    console.log("车牌号不存在")
                    dbOpe.driverRegist(driver)
                    response.send("true")
                    return data;
                }).catch(reason => {
                    response.send("车牌号已存在")
                })
            })
        })
    })
})
/*
login方法,
 */
app.post('/driver/driverLogin',urlencodedParser,function (req, res){
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
app.get("/driver/getDriver", function(req, res) {
    if(req.session.driver) {
        dbOpe.findDriver({did:req.session.driver.did}, req, res).then(function(data) {
            if(data[0]){
                res.send(data[0])
            }else {
                res.send(false)
            }
        })
    }else {
	res.send(false)
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
                for(let i = 0;i < user.orders.length; i++) {
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
app.post("/driver/takeOrder", urlencodedParser, function(req, res) {
    let flag = false;
    let order = req.body.order;
    order = JSON.parse(order)

    dbOpe.findByUid({uid:order.uid}).then(function(data) {
        if(data) {
            let user = data;
            for(let i = 0;i < user.orders.length; i++) {
                if(user.orders[i].oid === order.oid) {
                    flag = true;
                    if(user.orders[i].state == 0) {
                        let orders = [];
                        order.state = 1;
                        order.realCost = costUtils.realCost(order.distance);
                        order.phoneNum = user.phoneNum;
                        orders.push(order);
                        let did = order.did;
                        dbOpe.pushToDrivers({did:did}, orders).then(function(data) {
                            return data
                        }).then(function(data) {
                            dbOpe.findDriver({did:order.did}).then(function(data) {
                                user.orders[i].state = 1;
                                user.orders[i].realCost = order.realCost
                                user.orders[i].driverName = data[0].username
                                user.orders[i].carCode = data[0].carCode
                                user.orders[i].driverPhoneNum = data[0].phoneNum
                                let newData = {$set:{orders:user.orders}}
                                dbOpe.modifyUser({uid:order.uid}, newData)
                                res.send(order)
                            }).catch(reason => {
					console.log(reason)
					res.send(false)
				})
                        }).catch(reason => {
				console.log(reason)
				res.send(false)
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
	res.send("抱歉，服务器出差了")
    })
})
/*
获取订单信息
 */
app.get("/driver/getOrder", function(req, res) {
    let oid = req.query.oid;
	let did = '';
    if(req.session.driver.did) {
        did = req.session.driver.did;
    }

    dbOpe.findDriverArr({did:did}, {"orders":1, "_id":0}).then(function(data) {
        for(let i = 0; i < data[0].orders.length; i++) {
            if(oid == data[0].orders[i].oid) {
                res.send(data[0].orders[i]);
            }
        }
    }).catch((reason) => {
        console.log(reason)
	res.send(false)
    })
})
/*
获取用户订单信息
 */
app.post("/driver/getUserOrder", urlencodedParser, function(req, res) {
    let oid = req.body.oid; 
    let uid = req.body.uid;
    dbOpe.findArr({uid:uid}, {"orders":1, "_id":0}).then(function(data) {
        for(let i = 0; i < data[0].orders.length; i++) {
            if(oid == data[0].orders[i].oid) {
                res.send(data[0].orders[i]);
            }
        }
    }).catch((reason) => {
        console.log(reason)
	res.send(false)
    })
})
/*
获取车主订单信息
 */
app.get("/getDriverOrder", function(req, res) {
    let driverName = req.query.driverName;
    let oid = req.query.oid;
    dbOpe.findDriverArr({username:driverName}, {"orders":1, "_id":0}).then(function(data) {
        for(var i = 0; i < data[0].orders.length; i++) {
            if(data[0].orders[i].oid == oid) {
                res.send(data[0].orders[i])
            }
         }
    }).catch((reason) => {
        console.log(reason)
	res.send(false)
    })
})
/*
接收司机已到达的事件，将此信息转发给客户端
 */
app.get("/driver/arrival", function(req, res) {
    let oid = req.query.oid;
    let uid = req.query.uid
    dbOpe.findArr({uid:uid}, {"orders":1, "_id":0}).then(function(data) {
        for(let i = 0; i < data[0].orders.length; i++) {
            if(data[0].orders[i].oid == oid) {
                data[0].orders[i].state = 2;
                dbOpe.modifyUser({uid:uid}, {$set:{orders:data[0].orders}})
            }
        }
    }).then(function(data) {
        res.send(true);
    }).catch(reason => {
        console.log(reason)
	res.send(false)
    })
})

/*
接收订单完成的信息
 */
app.get("/driver/finish", function(req, res) {
    let oid = req.query.oid;
    dbOpe.findDriver({did:req.session.driver.did}).then(function(data) {
        for(let i = 0; i < data[0].orders.length; i++) {
            if (data[0].orders[i].oid == oid) {
                let order = data[0].orders[i]
                data[0].orders.splice(i, 1);

                return data[0].orders
            }
        }
    })/*then(function(data) {
        new Promise(function(resolve,reject){
            io.on("connection", function (socket) {
                socket.broadcast.emit("over", {uid: data.uid})
                resolve("finishChengogn ")
            })
        }).then(function(data) {
            return data
        })
    })*/.then(function(data) {
        dbOpe.updateDriver({did:req.session.driver.did}, {$set:{orders:data}}).then(function(data) {
            res.send(true);
        }).catch((reason) => {
        	console.log(reason)
		res.send(false)
    	})
    })
})
/*
车主端退出登录按钮
*/
app.get('/driver/signOut',(req,res)=>{
    
	if(req.session.driver.did) {
		req.session = null;
   
		 res.send(true);


	}else {
		res.send(false);
	}
});

/*
车主用户聊天
 */

let arrayUtils = {
    indexOf(arr, element) {
        for(let i = 0; i < arr.length; i++) {
            if(arr[i] === element) {
                return i;
            }
        }
    },
    remove(arr, element) {
        arr.splice(this.indexOf(arr, element), 1)
    }
}

io.sockets.on("connection", function(socket) {
    socket.on("groupId", function(data) {

        let _id = data;
        socket.on(_id + "chatGroup", function(data) {

            socket.join(_id + "chatGroup")
        })
        socket.on("userMessage", function(data) {

            socket.broadcast.to(_id + "chatGroup").emit("userMessage", data)
        })
        socket.on("driverMessage", function(data) {

            socket.broadcast.to(_id + "chatGroup").emit("driverMessage", data)
        })
        socket.on("orderCancel",function(data) {

            socket.broadcast.to(_id + "chatGroup").emit("orderCancel", data)
        })
        socket.on("orderData", function(data) {


            socket.broadcast.emit("orderData", data)
        })
        socket.on("takenSuccess", function(data) {

            socket.broadcast.to(_id + "chatGroup").emit("takenSuccess", data)
        })
        socket.on("arrival", function(data) {

            socket.broadcast.to(_id + "chatGroup").emit("arrival", data)
        })
        socket.on("over", function(data) {

            socket.broadcast.to(_id + "chatGroup").emit("over", data)
        })
        socket.on("commentMsg", function(data) {

            socket.broadcast.to(_id + "chatGroup").emit("commentMsg", data);
        })
        //司机尚未接单，用户点击取消订单，将此信息发送给所有的司机
        socket.on("orderCancelToAll", function(data) {

            socket.broadcast.emit("orderCancelToAll", data);
        })
    })
})

server.listen(8090);

