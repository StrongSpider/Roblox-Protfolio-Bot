const { Client } = require('pg');
const axios = require("axios");
const { user } = require('pg/lib/defaults');

const client = new Client({
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionString: process.env.DB_CONNECTIONSTRING,
  ssl: { rejectUnauthorized: false }
})
client.connect()

let activeVerification = []

const rand = function () {
  return Math.random().toString(36).substr(2);
};

const getRoles = async function (groupId) {
  let res = null;
  try {
    const data = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}/roles`)
    res = data.data.roles;
  } finally {
    return res;
  }
}

const getVerificationStatus = function (userid) {
  const checkNumber = function () { return userid }
  if (typeof activeVerification.find(checkNumber) !== 'undefined') return true;
  return false;
}

const startVerification = function(userid) {
  if(!getVerificationStatus(userid)) activeVerification.push(userid);
}

const endVerification = function(userid) {
  if(getVerificationStatus(userid)){
    delete activeVerification[activeVerification.find(checkNumber)]
  } else {
    return null;
  }
}

const getRobloxId = async function (discordid) {
 let res = null;
 try {
    const data = await client.query("SELECT * FROM discordUsers WHERE discordid= " + discordid + ";")
    res = data.rows[0].robloxid
 } finally {
    return res;
 }
}

const setRobloxId = async function(discordid, robloxid) {
  try{
    await client.query("SELECT * FROM discordUsers WHERE discordid= " + discordid + ";")
    client.query("UPDATE discordUsers SET robloxid='" + robloxid + "' WHERE discordid=" + discordid + ";")
  } catch {
    client.query("INSERT INTO discordUsers VALUES (" + discordid + ", '" + robloxid + "');").catch();
  }
}

const getGroupData = async function (guildId) {
  let res = null;
  try {
    const data = await client.query("SELECT * FROM groupList WHERE guildid= " + guildId + ";")
    res = JSON.parse(data.rows[0].groupdata)
  } finally {
    return res;
  }
}

const setRoles = function(guildId, data){
  client.query("UPDATE groupList SET ranks='" + JSON.stringify(data).replace(/'/g, '`') + "' WHERE guildid=" + guildId + ";")
}

const getGroupRoles = async function(guildId){
  let res = null;
  try {
    const data = await client.query("SELECT * FROM groupList WHERE guildid= " + guildId + ";")
    res = JSON.parse(data.rows[0].ranks)
  } finally {
    return res;
  }
}

const setGroupData = async function(guildId, data) {
  let res = null;
  try {
    let ranksArray = []
    const roles = await getRoles(data.id)
    roles.forEach(roleData => ranksArray.push({ name: roleData.name, rank: roleData.rank, points: "LOCKED", status: "Default" }));
    client.query("UPDATE groupList SET ranks='" + JSON.stringify(ranksArray).replace(/'/g, '`') + "' WHERE guildid=" + guildId + ";")
    client.query("UPDATE groupList SET groupdata='" + JSON.stringify(data).replace(/'/g, '`') + "' WHERE guildid=" + guildId + ";")
  } finally {
    return res
  }
}

const createNewGroup = async function (guildId, groupData) {
  let res = null;
  try {
    const token = rand() + rand() + rand() + rand()

    let ranksArray = []
    const roles = await getRoles(groupData.id)
    roles.forEach(roleData => ranksArray.push({ name: roleData.name, rank: roleData.rank, points: "LOCKED", status: "Default" }));
    client.query("INSERT INTO groupList VALUES (" + guildId + ", '" + token + "', '" + JSON.stringify(groupData).replace(/'/g, '`') + "', '[]', '" + JSON.stringify(ranksArray) + "');")
    return token;
  } finally {
    return res;
  }
}

const generateNewAuthToken = function (guildId) {
  const token = rand() + rand() + rand() + rand()
  client.query("UPDATE groupList SET token='" + token + "' WHERE guildid=" + guildId + ";")
  return token;
}

const getAuthToken = async function (guildId) {
  let res = null;
  try {
    const data = await client.query("SELECT * FROM groupList WHERE guildid= " + guildId + ";")
    res = data.rows[0].token
  } finally {
    return res
  }
}

const updatePlayerData = function (token, newPlayerData) {
  client.query("SELECT * FROM groupList WHERE token LIKE '%" + token + "%';", (err, res) => {
    if (err) throw err
    if (res.rowCount === 0) return null;

    const playerID = newPlayerData.id

    let index
    let oldPlayerData = null;

    let data = JSON.parse(res.rows[0].playerdata)
    data.forEach((playerData, i) => {
      if (playerData.id == playerID) oldPlayerData = playerData; index = i;
    });

    if (oldPlayerData !== null) {
      data[index] = newPlayerData
    } else {
      data.push(newPlayerData)
    }

    client.query("UPDATE groupList SET playerdata='" + JSON.stringify(data) + "' WHERE token='" + token + "'")
  });
}

const getPlayerData = async function (token, playerID) {
  let resData = null;
  try {
    res = await client.query("SELECT * FROM groupList WHERE token LIKE '%" + token + "%';");
    const data = JSON.parse(res.rows[0].playerdata)
    data.forEach(playerData => {
      if (playerData.id == playerID) resData = playerData
    })
  } finally {
    return resData;
  }
}

module.exports = {
  startVerification,
  endVerification,
  getRobloxId,
  setRobloxId,
  setRoles,
  getRoles,
  getGroupData,
  setGroupData,
  createNewGroup,
  generateNewAuthToken,
  getAuthToken,
  getPlayerData,
  updatePlayerData
}