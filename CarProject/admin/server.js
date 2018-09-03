var http = require("http");
var express = require("express");
var path = require("path");
var app = express();
const url = require("url");
var fs = require("fs");
var qs = require("querystring");
var users = require("./connect") ,
    admins = require('./admins'),
    coupons = require('./coupon')
var server = require("http").createServer(app);
var socket = require("socket.io");
var session = require("express-session");
var io = socket.listen(server);
var bodyParser = require('body-parser');
var cookieParser = require("cookie-parser");
var cookieSession = require("cookie-session");
var nodemailer = require("nodemailer");
var cors = require("cors");
var requests = require("request");
var multiparty = require('multiparty');
let localPath = "";

app.use(cookieParser());
app.use(cors({
    origin:['http://localhost:8020','http://www.lh666.club:8099','http://fooldman.com:8010'],
    methods:['GET','POST'],
    allowedHeaders:['Content-Type', 'Authorization'],
    withcredentials: true,
}));
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
    maxAge: 7*24*60*60*1000 //24hours
}));
// 创建 application/x-www-form-urlencoded 编码解析

var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.post('/login',function (req, res) {
    let {username,password} = req.body;
    return new Promise((resolve,reject) => {
        let admin = null;
        setTimeout(() => {
            let conditions = {username:username,password:password};
            dbOpe.findadmin(conditions).then(data => {
               admin = data;
               admin.password = undefined;
               res.send({code: 200, msg: '请求成功', admin})
            }).catch(reason => {
                res.send({code: 500, msg: '账号或密码错误'})
            })
        },1000)
    })
});
app.get('/user/listpage',function (req, res) {
    console.log(req.query);
    setTimeout(()=>{
        if(req.query.username){
            let conditions = {username:req.query.username}
            dbOpe.findusers(conditions).then(data=>{
                let resData = {total:data.length,users:data};
                res.send(resData);
            }).catch(reason=>{
                res.send(null);
            })
        }else {
            users.find((err,data)=>{
                let resData = {total:data.length,users:data};
                res.send(resData);
            })
        }
    },1000)
})
app.get('/user/list',function (req, res) {
    console.log(req.query)
    if(req.query.username){
        let conditions = {username:req.query.username}
        dbOpe.findusers(conditions).then(data=>{
            let resData = {total:data.length,users:data};
            res.send(resData);
        }).catch(reason=>{
            res.send(null);
        })
    }else {
        users.find((err,data)=>{
            let resData = {total:data.length,users:data};
            res.send(resData);
        })
    }
})
app.get('/user/remove',(req,res)=>{
    console.log(req.query);
    let condistions = {_id:req.query.id}
    dbOpe.deleteUser(condistions).then(data=>{
        res.send(true);
    })
});
app.get('/user/batchremove',(req,res)=>{
    let _idArr = req.query.ids.split(',');
    let conditions = {_id:{$in:_idArr}};
    dbOpe.deleteUser(conditions).then(data=>{
        res.send(true);
    })
})
app.get('/user/edit',(req,res)=>{
    let conditions = {_id:req.query._id}
    let updates = {};
    res.send(true);
})
app.get('/user/add',(req,res)=>{
    console.log(req.query);
    let _user = new users(req.query);
    _user.save((err,data)=>{
        if(err){
            console.log('增加失败')
        }else {
            res.send(true);
        }
    })
})
app.get('/user/orders/remove',(req,res)=>{
    let conditions = {_id:req.query.id};
    let updates = {$set:{orders:[]}};
    setTimeout(()=>{
        dbOpe.updateData(conditions,updates).then(data=>{
            res.send(true);
        }).catch(reason => {
            res.send(false);
        })
    },500);
})

app.get('/coupon/addCoupon',(req,res)=>{
    console.log(req.query);
    let coupon = new coupons(req.query);
    dbOpe.addCoupon(coupon).then(data=>{
        res.send(data);
    })
});
app.get('/coupon/couponList',(req,res)=>{
    setTimeout(()=>{
        if(req.query.title){
            let conditions = {title:new RegExp(req.query.title)}
            dbOpe.findCoupons(conditions).then(data=>{
                let resData = {total:data.length,coupons:data};
                res.send(resData);
            }).catch(reason=>{
                res.send(null);
            })
        }else {
            coupons.find((err,data)=>{
                let resData = {total:data.length,coupons:data};
                res.send(resData);
            })
        }
    },1000)
});
app.get('/coupon/remove',(req,res)=>{
    let condistions = {_id:req.query.id}
    dbOpe.deleteCoupon(condistions).then(data=>{
        res.send(true);
    })
});
app.get('/coupon/edit',(req,res)=>{
    let conditions = {_id:req.query._id};
    let updates = new Object();
    for(let key in req.query){
        updates[key] = req.query[key];
    }
    dbOpe.updateCoupon(conditions,updates).then(data=>{
        res.send(true);
    }).catch(reason=>{
        res.send(false);
    })
});
app.get('/coupon/batchremove',(req,res)=>{
    let _idArr = req.query.ids.split(',');
    console.log(_idArr);
    let conditions = {_id:{$in:_idArr}};
    dbOpe.deleteCoupon(conditions).then(data=>{
        res.send(true);
    })
});

app.all('*',function (req, res) {
    console.log('走的all:'+req.path);
    res.send('404/NOT Found');
});

server.listen(8010);

/*
        连接数据库部分
 */
var dbOpe = {
    findadmin:function (conditions) {
        let p = new Promise(function (resolve, reject) {
            admins.find(conditions,function (err,data) {
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
    findusers:function (conditions) {
        let p = new Promise(function (resolve, reject) {
            users.find(conditions,function (err,data) {
                if(err){
                    console.log(err);
                }else {
                    if(data.length){
                        resolve(data);
                    }else {
                        reject(false)
                    }
                }
            })
        });
        return p;
    },
    deleteUser(conditions){
        return new Promise((resolve, reject) => {
            users.remove(conditions,err=>{
                if(err){
                    reject('删除失败')
                }else {
                    resolve('删除成功')
                }
            })
        })
    },
    addCoupon(content){
        return new Promise((resolve, reject) => {
            content.save(function () {
                resolve(true);
            })
        })
    },
    findCoupons(conditions){
        return new Promise((resolve, reject) => {
            coupons.find(conditions,function (err, data) {
                if(data.length){
                    resolve(data)
                }else {
                    reject(false)
                }
            })
        })
    },
    deleteCoupon(conditions){
        return new Promise((resolve, reject) => {
            coupons.remove(conditions,err=>{
                if(err){
                    reject('删除失败')
                }else {
                    resolve('删除成功')
                }
            })
        })
    },
    updateCoupon(conditions,updates){
        return new Promise((resolve, reject) => {
            coupons.update(conditions,updates,function (err) {
                if(err){
                    reject(false)
                }else {
                    resolve(true)
                }
            })
        })
    }
};



