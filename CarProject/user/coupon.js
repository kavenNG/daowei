var mongoose = require("./dbUtils");
var con = mongoose.connection;
con.on("error", function() {
    console.log("数据库连接失败");
});
con.on("connected", function() {
    console.log("数据库已连接成功");
});

var Schema = mongoose.Schema({
    effectiveTime:Number,
    type:Number,
    title:String,
    dec:String,
    discount:Number
});
var coupons = mongoose.model("coupon", Schema);
/*
查询所有信息
 */
module.exports = coupons;