var mongoose = require("./dbUtils");
var con = mongoose.connection;
con.on("error", function() {
    console.log("数据库连接失败");
});
con.on("connected", function() {
    console.log("users已连接成功");
});

var Schema = mongoose.Schema({
    uid:String,
    username:String,
    password:String,
    phoneNum:String,
    email:String,
    orders:[],
    avatar:String,     //头像
    commonAddress:[],  //常用地址
    historyOrders:[],       //历史订单
    isActive:Boolean,   //是否已邮箱验证
    isReady:Boolean ,   //是否可以修改密码
});


var users = mongoose.model("users", Schema);
/*
查询所有信息
 */
module.exports = users;