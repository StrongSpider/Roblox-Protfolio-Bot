const express = require('express')
var app = express();
var port = process.env.PORT || 8080;
const { updatePlayerData, getPlayerData } = require('./commands/functions/discordSave')

app.use(express.json());

app.post('/postdata', function (req, res) {
    updatePlayerData(req.body.token, req.body.data)
    res.send("Data Reseived")
})

app.post('/getdata', function (req, res) {
    getPlayerData(req.body.token, req.body.playerid).then(data => {
        if (data !== null) {
            res.contentType('application/json')
            res.send(data)
        } else {
            res.send("Failed to find player Data!")
        }
    });
})

app.post('/reqverify', function (req, res) {
    if (req.body.token === process.env.DEV_TOKEN){
        
        
    } else {
        res.send("Developer Token invalid! Informing the authorities...")
    }
})

app.use(function (err, req, res, next) {
    console.error(err.stack)
    sendErr(res, {
        error: 'Internal server error'
    })
})
app.listen(port, function () {
    console.log('Listening on port ' + port)
})