var mongoose = require("./dbUtils");
var con = mongoose.connection;
con.on("error", function() {
    console.log("fefaew");
})
con.on("connected", function() {
    console.log("数据库已连接成功");

})
var Schema = mongoose.Schema({
    did:String,
    username:String,
    password:String,
    phoneNum:String,
    email:String,
    isActive:Boolean, //激活状态
    isReady:Boolean, //是否可以修改密码 commonAddress:[]
    commonAddress:[],
    orders:[],
    commentScore:Number,
    carCode:String,
    historyOrders:[]
})
var drivers = mongoose.model("drivers", Schema);

module.exports = drivers;