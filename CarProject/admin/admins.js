var mongoose = require("./dbUtils");
var con = mongoose.connection;
con.on("error", function() {
    console.log("admin连接错误");
})
con.on("connected", function() {
    console.log("admin已连接成功");
})
var Schema = mongoose.Schema({
    id:Number,
    username:String,
    password:String,
    avatar:'',
    name:String
})

var admins = mongoose.model('admin',Schema);

module.exports = admins;