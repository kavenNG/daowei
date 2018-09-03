var mongoose = require("./dbUtils");
var con = mongoose.connection;
con.on("error", function() {
    console.log("fefaew");
})
con.on("connected", function() {
    console.log("addressesConnect已连接成功");
})
var Schema = mongoose.Schema({
    openAddress:[]
})
var addresses = mongoose.model("addresses", Schema);

module.exports = addresses;